#!/usr/bin/env python3

__version__ = "1.9"

import datetime
import gzip
import os
import time
import urllib.parse
import urllib.request

import flask
import mercantile
import simplejson as json
from jsonslicer import JsonSlicer
from walrus import Database

API = "https://api.ohsome.org/v1/elementsFullHistory/geometry"
METADATA = "https://api.ohsome.org/v1/metadata"
CACHE_REFRESH = 60 * 60 * 24
Z_TARGET = 15
API_OSM = "https://www.openstreetmap.org/api/0.6"
DEFAULT_FILTER = "type:node"


def generateHeaders(referer):
    return {
        "User-Agent": "Is-OSM-uptodate/%s" % __version__,
        "Referer": referer,
        "Accept-Encoding": "gzip",
    }


featuresTime = time.time()
start, end = None, None

app = flask.Flask(__name__, static_folder="web/dist", static_url_path="")
db = Database(host=os.environ.get("REDIS_HOST", "localhost"))


def process(group, end):
    first, last = group[0], group[-1]
    if last["properties"]["@validTo"] != end:
        return  # feature has been deleted
    firstedit = datetime.datetime.strptime(
        first["properties"]["@validFrom"], "%Y-%m-%dT%H:%M:%SZ"
    )
    lastedit = datetime.datetime.strptime(
        last["properties"]["@validFrom"], "%Y-%m-%dT%H:%M:%SZ"
    )
    average_update_days = (
        datetime.datetime.now().utcnow() - lastedit
    ).days / last["properties"]["@version"]
    return (
        last["geometry"]["coordinates"][0],
        last["geometry"]["coordinates"][1],
        int(first["properties"]["@osmId"].split("/")[1]),
        firstedit.timestamp(),
        lastedit.timestamp(),
        last["properties"]["@version"],
        average_update_days,
    )


def processed_to_geojson(processed):
    for feature in processed:
        yield {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [feature[0], feature[1]],
            },
            "properties": {
                "id": feature[2],
                "created": str(datetime.datetime.utcfromtimestamp(feature[3])),
                "lastedit": str(
                    datetime.datetime.utcfromtimestamp(feature[4])
                ),
                "version": feature[5],
                "average_update_days": feature[6],
            },
        }


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


def get_tile_data(quadkey, start, end, *filters, **headers):
    filters = " and ".join(filter(None, filters))
    cache = db.cache()
    cache_key = f"{quadkey}-{start}-{end}-{filters}"
    if result := cache.get(cache_key):
        return result
    bbox = mercantile.bounds(mercantile.quadkey_to_tile(quadkey))
    params = urllib.parse.urlencode(
        {
            "bboxes": "|".join(map(str, bbox)),
            "properties": "metadata",
            "showMetadata": "true",
            "time": f"{start},{end}",
            "filter": filters,
        }
    )
    req = urllib.request.Request(API + "?" + params)
    for key, value in headers.items():
        req.add_header(key, value)
    with urllib.request.urlopen(req) as resp_gzipped:
        resp = gzip.GzipFile(fileobj=resp_gzipped)
        result = list(stream_to_processed(resp))
    cache.set(cache_key, result)
    return result


def get_tile_features(quadkey, start, end, *filters, **headers):
    return list(
        processed_to_geojson(
            get_tile_data(quadkey, start, end, *filters, **headers)
        )
    )


def generate(bbox, start, end, *filters, **headers):
    bbox = mercantile.Bbox(*bbox)
    yield ""  # signal
    yield '{"type": "FeatureCollection", "features": ['
    first = True
    for tile in bbox_tiles(bbox, Z_TARGET):
        quadkey = mercantile.quadkey(tile)
        for feature in get_tile_features(
            quadkey, start, end, *filters, **headers
        ):
            if feature_in_bbox(bbox, feature):
                feature_json = json.dumps(feature, use_decimal=True)
                if not first:
                    yield ", "
                if first and feature_json:
                    first = False
                yield feature_json
    yield "]}"


@app.route("/api/getData")
def getData():
    # Round to 7 decimal https://wiki.openstreetmap.org/wiki/Node#Structure
    bbox = []
    for arg in ("minx", "miny", "maxx", "maxy"):
        bbox.append(round(float(flask.request.args.get(arg)), 7))
    referer = flask.request.headers.get("REFERER", "http://localhost:8000/")
    headers = generateHeaders(referer)
    filters = flask.request.args.get("filter")
    filters = [filters, DEFAULT_FILTER]
    global featuresTime, start, end
    if time.time() - featuresTime > CACHE_REFRESH or not start or not end:
        metadata = json.load(urllib.request.urlopen(METADATA))
        temporal_extent = metadata["extractRegion"]["temporalExtent"]
        if (
            start != temporal_extent["fromTimestamp"]
            or end != temporal_extent["toTimestamp"]
        ):
            pass  # invalidate cache?
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
    generated = generate(bbox, start, end, *filters, **headers)
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
    app.run(debug=True, port=8000)
