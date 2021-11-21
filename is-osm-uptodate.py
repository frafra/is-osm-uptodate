#!/usr/bin/env python3

__version__ = "1.9"

import datetime
import gzip
import time
import urllib.parse
import urllib.request

import flask
import simplejson as json
from jsonslicer import JsonSlicer

API = "https://api.ohsome.org/v1/elementsFullHistory/geometry"
METADATA = "https://api.ohsome.org/v1/metadata"
CACHE_REFRESH = 60 * 60 * 24
API_OSM = "https://www.openstreetmap.org/api/0.6"


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
        return json.dumps(processed, use_decimal=True)


def timestamp_shortener(timestamp):
    return (
        timestamp.replace(":", "")
        .replace("-", "")
        .rstrip("Z")
        .rstrip("0")
        .rstrip("T")
    )


@app.route("/api/getData")
def getData():
    # Round to 7 decimal https://wiki.openstreetmap.org/wiki/Node#Structure
    bbox = []
    for arg in ("minx", "miny", "maxx", "maxy"):
        bbox.append(str(round(float(flask.request.args.get(arg)), 7)))
    referer = flask.request.headers.get("REFERER", "http://localhost:8000/")
    filters = [flask.request.args.get("filter"), "type:node"]
    global featuresTime, start, end
    if time.time() - featuresTime > CACHE_REFRESH or not start or not end:
        metadata = json.load(urllib.request.urlopen(METADATA))
        temporal_extent = metadata["extractRegion"]["temporalExtent"]
        start = temporal_extent["fromTimestamp"]
        end = temporal_extent["toTimestamp"]
        end = end.rstrip("Z") + ":00Z"  # WORKAROUND
        featuresTime = time.time()

    def generate():
        params = urllib.parse.urlencode(
            {
                "bboxes": ",".join(bbox),
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
            slicer = JsonSlicer(resp, ("features", None))
            yield '{"type": "FeatureCollection", "features": ['
            first = True
            group = []
            for feature in slicer:
                osmid = feature["properties"]["@osmId"]
                if len(group) == 0:
                    group.append(feature)
                elif group[0]["properties"]["@osmId"] == osmid:
                    group.append(feature)
                else:
                    if processed := process_group(group, end):
                        if first:
                            first = False
                        else:
                            yield ","
                        yield processed
                    group = [feature]
            if len(group) > 0:
                if processed := process_group(group, end):
                    if not first:
                        yield ","
                    yield processed
        yield "]}"

    start_short = timestamp_shortener(start)
    end_short = timestamp_shortener(end)
    bbox_str = "_".join(bbox)
    filename = (
        f"is-osm-uptodate_{bbox_str}_{start_short}_{end_short}.json".replace(
            ":", ""
        )
    )
    generated = generate()
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
