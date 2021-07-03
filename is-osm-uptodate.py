#!/usr/bin/env python3

__version__ = "1.5"

import hug
import requests

import json
import sqlite3
import time

API = "https://api.ohsome.org/v1/elementsFullHistory/geometry"
METADATA = "https://api.ohsome.org/v1/metadata"
CACHE_REFRESH = 60*60*24

QUERY = """
  with flat as (
    select json_extract(value, '$.properties.@osmId') as osmid,
           json_extract(value, '$.geometry.coordinates') as coordinates,
           json_extract(value, '$.properties.@validFrom') as validfrom,
           json_extract(value, '$.properties.@validTo') as validto,
           json_extract(value, '$.properties.@version') as version
      from json_each(json_extract(?, '$.features'))
     ), grouped as (
    select json_object(
               'type', 'Feature',
               'geometry', json_object(
                   'type', 'Point',
                   'coordinates', coordinates
               ),
               'properties', json_object(
                   'id', trim(osmid, 'node/'),
                   'version', version,
                   'created', min(validfrom),
                   'lastedit', max(validfrom),
                   'average_update_days', (
                       julianday(date('now'))-julianday(min(validfrom))
                       )/max(version)
                )
           ) as feature
      from flat
     group by osmid
    having max(validto) == ?
    )
select json_object(
           'type', 'FeatureCollection',
           'features', json_group_array(json(feature))
       ) as geojson
  from grouped
group by true
;
"""

def generateHeaders(referer):
    return {
        "User-Agent":"Is-OSM-uptodate/%s" % __version__,
        "Referer":referer,
        "Accept-Encoding":"gzip",
    }

@hug.get('/api/getDataMinimal')
def getDataMinimal(
        minx: hug.types.float_number,
        miny: hug.types.float_number,
        maxx: hug.types.float_number,
        maxy: hug.types.float_number,
        referer="http://localhost:8000/"):
    if type(referer) is not str:
        referer = referer.headers.get('REFERER')
    result = requests.get(
        API,
        headers=generateHeaders(referer),
        params={
            "bboxes": f"{minx},{miny},{maxx},{maxy}",
            "properties": "metadata",
            "showMetadata": "true",
            "time": f"{start},{end}",
            "types": "node",
        },
    ).text
    return result

featuresTime = time.time()
start, end = None, None

# TODO: ERROR HANDLING
#'{\n  "timestamp" : "2021-07-03T12:13:20.122893",\n  "status" : 400,\n  "message" : "The provided time parameter is not ISO-8601 conform.",\n  "requestUrl" : "https://api.ohsome.org/v1/elementsFullHistory/geometry?bboxes=9.188295196%2C45.4635324507%2C9.1926242813%2C45.4649771956&properties=metadata&showMetadata=true&time=None%2CNone&types=node"\n}'

@hug.cli(output=hug.output_format.json)
@hug.get('/api/getData')
def getData(
        minx: hug.types.float_number,
        miny: hug.types.float_number,
        maxx: hug.types.float_number,
        maxy: hug.types.float_number,
        referer="http://localhost:8000/"):
    global features, featuresTime, start, end
    if type(referer) is not str:
        referer = referer.headers.get('REFERER')
    args = [minx, miny, maxx, maxy]
    if time.time()-featuresTime > CACHE_REFRESH or not start or not end:
        metadata = requests.get(METADATA).json()
        temporal_extent = metadata["extractRegion"]["temporalExtent"]
        start = temporal_extent["fromTimestamp"]
        end = temporal_extent["toTimestamp"]
        end = end.rstrip('Z') + ":00Z" # WORKAROUND
        featuresTime = time.time()
    result = getDataMinimal(*args, referer=referer)
    conn = sqlite3.connect(':memory:')
    result = conn.execute(QUERY, (result, end)).fetchone()[0]
    return json.loads(result)

if __name__ == '__main__':
    getData.interface.cli()
