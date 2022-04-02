#!/usr/bin/env python3

__version__ = "1.9"

import collections
import datetime
import gzip
import time
import urllib.parse
import urllib.request

import flask
import mercantile
import simplejson as json
from jsonslicer import JsonSlicer

API = "https://api.ohsome.org/v1/elementsFullHistory/geometry"
METADATA = "https://api.ohsome.org/v1/metadata"
CACHE_REFRESH = 60 * 60 * 24
Z_TARGET = 15
API_OSM = "https://www.openstreetmap.org/api/0.6"
DEFAULT_FILTER = "type:node"
STORAGE_SOFT_LIMIT = 50

storage = collections.defaultdict(list)


def store(processed):
    lon, lat = processed["geometry"]["coordinates"]
    tile = mercantile.bounding_tile(lon, lat, lon, lat)
    quadkey = mercantile.quadkey(tile)[:Z_TARGET]
    storage[quadkey].append(processed)


def generateHeaders(referer):
    return {
        "User-Agent": "Is-OSM-uptodate/%s" % __version__,
        "Referer": referer,
        "Accept-Encoding": "gzip",
    }


featuresTime = time.time()
start, end = None, None

app = flask.Flask(__name__, static_folder="web/dist", static_url_path="")


def process(group, end):
    first, last = group[0], group[-1]
    if last["properties"]["@validTo"] != end:
        return  # feature has been deleted
    feature = {
        "type": "Feature",
        "geometry": last["geometry"],
        "properties": {
            "id": first["properties"]["@osmId"].split("/")[1],
            "created": first["properties"]["@validFrom"],
            "lastedit": last["properties"]["@validFrom"],
            "version": last["properties"]["@version"],
        },
    }
    lastedit = datetime.datetime.strptime(
        feature["properties"]["lastedit"], "%Y-%m-%dT%H:%M:%SZ"
    )
    now = datetime.datetime.now().utcnow()
    feature["properties"]["average_update_days"] = (
        now - lastedit
    ).days / feature["properties"]["version"]
    return feature


def process_group(group, end):
    if processed := process(group, end):
        return processed


def timestamp_shortener(timestamp):
    return (
        timestamp.replace(":", "")
        .replace("-", "")
        .rstrip("Z")
        .rstrip("0")
        .rstrip("T")
    )


def bbox_tiles(bbox, z_target, *tiles):
    if not tiles:
        tile = mercantile.bounding_tile(*bbox)
        while tile.z > z_target:
            tile = mercantile.parent(tile)
        tiles = (tile,)
    for tile in tiles:
        bounds = mercantile.bounds(tile)
        if (
            bounds.east < bbox.left
            or bbox.right < bounds.west
            or bounds.north < bbox.bottom
            or bbox.top < bounds.south
        ):
            continue
        if tile.z >= z_target:
            yield tile
        else:
            yield from bbox_tiles(bbox, z_target, *mercantile.children(tile))


def feature_in_bbox(bbox, feature):
    lon, lat = feature["geometry"]["coordinates"]
    return bbox.left <= lon <= bbox.right and bbox.bottom <= lat <= bbox.top


def stream_to_processed(resp):
    slicer = JsonSlicer(resp, ("features", None))
    group = []
    for feature in slicer:
        osmid = feature["properties"]["@osmId"]
        if len(group) == 0:
            group.append(feature)
        elif group[0]["properties"]["@osmId"] == osmid:
            group.append(feature)
        else:
            if processed := process_group(group, end):
                yield processed
            group = [feature]
    if len(group) > 0:
        if processed := process_group(group, end):
            yield processed


def generate(bbox, start, end, filters, referer):
    bbox = mercantile.Bbox(*bbox)
    cached, new_bboxes = [], []
    for tile in bbox_tiles(bbox, Z_TARGET):
        quadkey = mercantile.quadkey(tile)
        if quadkey in storage and not filters:
            cached.append(quadkey)
        else:
            new_bboxes.append(",".join(map(str, mercantile.bounds(tile))))
    json_start = '{"type": "FeatureCollection", "features": ['
    first = True
    if new_bboxes:
        filters = [filters, DEFAULT_FILTER]
        params = urllib.parse.urlencode(
            {
                "bboxes": "|".join(new_bboxes),
                "properties": "metadata",
                "showMetadata": "true",
                "time": f"{start},{end}",
                "filter": " and ".join(filter(None, filters)),
            }
        )
        req = urllib.request.Request(API + "?" + params)
        for key, value in generateHeaders(referer).items():
            req.add_header(key, value)
        with urllib.request.urlopen(req) as resp_gzipped:
            yield ""  # Connection with ohsome API worked
            resp = gzip.GzipFile(fileobj=resp_gzipped)
            yield json_start
            for processed in stream_to_processed(resp):
                store(processed)
                if feature_in_bbox(bbox, processed):
                    if first:
                        first = False
                    else:
                        yield ","
                    processed_json = json.dumps(processed, use_decimal=True)
                    yield processed_json
    else:
        yield ""  # signal
        yield json_start
    for quadkey in cached:
        for processed in storage[quadkey]:
            if feature_in_bbox(bbox, processed):
                if first:
                    first = False
                else:
                    yield ","
                processed_json = json.dumps(processed, use_decimal=True)
                yield processed_json
    while len(storage) > STORAGE_SOFT_LIMIT:
        storage.popitem()
    yield "]}"


@app.route("/api/getData")
def getData():
    # Round to 7 decimal https://wiki.openstreetmap.org/wiki/Node#Structure
    bbox = []
    for arg in ("minx", "miny", "maxx", "maxy"):
        bbox.append(round(float(flask.request.args.get(arg)), 7))
    referer = flask.request.headers.get("REFERER", "http://localhost:8000/")
    filters = flask.request.args.get("filter")
    global featuresTime, start, end
    if time.time() - featuresTime > CACHE_REFRESH or not start or not end:
        metadata = json.load(urllib.request.urlopen(METADATA))
        temporal_extent = metadata["extractRegion"]["temporalExtent"]
        if (
            start != temporal_extent["fromTimestamp"]
            or end != temporal_extent["toTimestamp"]
        ):
            storage.clear()
        start = temporal_extent["fromTimestamp"]
        end = temporal_extent["toTimestamp"]
        end = end.rstrip("Z") + ":00Z"  # WORKAROUND
        featuresTime = time.time()

    start_short = timestamp_shortener(start)
    end_short = timestamp_shortener(end)
    bbox_str = "_".join(map(str, bbox))
    filename = (
        f"is-osm-uptodate_{bbox_str}_{start_short}_{end_short}.json".replace(
            ":", ""
        )
    )
    generated = generate(bbox, start, end, filters, referer)
    try:
        next(generated)  # peek
    except urllib.error.HTTPError as error:
        if error.code == 503:
            return "ohsome", error.code
        else:
            return error.reason, error.code
    except Exception:
        return "", 500
    else:
        return app.response_class(
            generated,
            mimetype="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            },
        )


@app.route("/api/getFeature")
def getFeature():
    feature_type = flask.request.args.get(
        "feature_type", default="node", type=str
    )
    feature_id = flask.request.args.get("feature_id", type=int)
    referer = flask.request.headers.get("REFERER", "http://localhost:8000/")
    request = urllib.request.Request(
        f"{API_OSM}/{feature_type}/{feature_id}.json",
        headers=generateHeaders(referer),
    )
    with urllib.request.urlopen(request) as resp_gzipped:
        resp = gzip.GzipFile(fileobj=resp_gzipped)
        return resp.read()


@app.route("/")
def entry():
    return flask.send_file("web/dist/index.html")


if __name__ == "__main__":
    app.run(debug=True)
