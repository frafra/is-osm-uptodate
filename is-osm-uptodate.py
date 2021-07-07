#!/usr/bin/env python3

__version__ = "1.6"

import flask
from jsonslicer import JsonSlicer
import simplejson as json

import gzip
import datetime
import urllib.request
import urllib.parse
import time

API = "https://api.ohsome.org/v1/elementsFullHistory/geometry"
METADATA = "https://api.ohsome.org/v1/metadata"
CACHE_REFRESH = 60*60*24

def generateHeaders(referer):
    return {
        "User-Agent":"Is-OSM-uptodate/%s" % __version__,
        "Referer":referer,
        "Accept-Encoding":"gzip",
    }

featuresTime = time.time()
start, end = None, None

# TODO: ERROR HANDLING
#'{\n  "timestamp" : "2021-07-03T12:13:20.122893",\n  "status" : 400,\n  "message" : "The provided time parameter is not ISO-8601 conform.",\n  "requestUrl" : "https://api.ohsome.org/v1/elementsFullHistory/geometry?bboxes=9.188295196%2C45.4635324507%2C9.1926242813%2C45.4649771956&properties=metadata&showMetadata=true&time=None%2CNone&types=node"\n}'

app = flask.Flask(__name__)

def process(group, end):
    first, last = group[0], group[-1]
    if last['properties']['@validTo'] != end:
        return # feature has been deleted
    feature = {
        "type": "Feature",
        "geometry": last['geometry'],
        "properties": {
            "id": first['properties']['@osmId'].split('/')[1],
            "created": first['properties']['@validFrom'],
            "lastedit": last['properties']['@validFrom'],
            "version": last['properties']['@version'],
        }
    }
    lastedit = datetime.datetime.strptime(feature["properties"]["lastedit"], '%Y-%m-%dT%H:%M:%SZ')
    now = datetime.datetime.now().utcnow()
    feature["properties"]["average_update_days"] = \
        (now-lastedit).days/feature["properties"]["version"]
    return feature

def process_group(group, end):
    if processed := process(group, end):
        return json.dumps(processed, use_decimal=True)

@app.route('/api/getData')
def getData():
    minx = flask.request.args.get('minx')
    miny = flask.request.args.get('miny')
    maxx = flask.request.args.get('maxx')
    maxy = flask.request.args.get('maxy')
    referer = flask.request.headers.get('REFERER', "http://localhost:8000/")
    global featuresTime, start, end
    if time.time()-featuresTime > CACHE_REFRESH or not start or not end:
        metadata = json.load(urllib.request.urlopen(METADATA))
        temporal_extent = metadata["extractRegion"]["temporalExtent"]
        start = temporal_extent["fromTimestamp"]
        end = temporal_extent["toTimestamp"]
        end = end.rstrip('Z') + ":00Z" # WORKAROUND
        featuresTime = time.time()
    def generate():
        params = urllib.parse.urlencode({
            "bboxes": f"{minx},{miny},{maxx},{maxy}",
            "properties": "metadata",
            "showMetadata": "true",
            "time": f"{start},{end}",
            "filter": "type:node",
        })
        req = urllib.request.Request(API+'?'+params)
        for key, value in generateHeaders(referer).items():
            req.add_header(key, value)
        with urllib.request.urlopen(req) as resp_gzipped:
            resp = gzip.GzipFile(fileobj=resp_gzipped)
            slicer = JsonSlicer(resp, ('features', None))
            yield '{"type": "FeatureCollection", "features": ['
            first = True
            group = []
            for feature in slicer:
                osmid = feature['properties']['@osmId']
                if len(group) == 0:
                    group.append(feature)
                elif group[0]['properties']['@osmId'] == osmid:
                    group.append(feature)
                else:
                    if processed := process_group(group, end):
                        if first:
                            first = False
                        else:
                            yield ','
                        yield processed
                    group = [feature]
            if len(group) > 0:
                if processed := process_group(group, end):
                    if not first:
                        yield ','
                    yield processed
        yield ']}'
    return app.response_class(generate(), mimetype='application/json')

