#!/usr/bin/env python3

__version__ = "1.0"

import hug

import gzip
import json
import shlex
import shutil
import sqlite3
import subprocess
from tempfile import NamedTemporaryFile as NamedTemp
import urllib.request

QUERY = """
SELECT json_object(
  'type', 'FeatureCollection',
  'features', json_group_array(json_object(
      'geometry', json(asGeoJSON(Geometry)),
      'type', 'Feature',
      'properties', json_object(
        'uid', uid,
        'user', user,
        'id', id,
        'timestamp', timestamp,
        'version', version,
        'attributes', json(attributes)))))
 FROM
    (SELECT node_id AS id, uid, user, timestamp, version, Geometry, attributes
      FROM osm_nodes
     INNER JOIN
          (SELECT node_id AS id,
                  json_group_object(k, v) AS attributes
             FROM osm_node_tags
            GROUP BY node_id)
     ON node_id = id
    WHERE MbrWithin(Geometry, BuildMbr(?, ?, ?, ?))
    UNION ALL
    SELECT w.way_id AS id, uid, user, timestamp, version, Geometry, attributes
      FROM
        (SELECT way_id as wr, MakeLine(Geometry) AS Geometry
           FROM
            (SELECT way_id, n.node_id, Geometry
               FROM osm_way_refs AS wr
               JOIN osm_nodes AS n
                 ON n.node_id = wr.node_id)
         GROUP BY way_id)
     JOIN osm_ways AS w
     ON w.way_id = wr
    LEFT JOIN
          (SELECT way_id AS id,
                  json_group_object(k, v) AS attributes
             FROM osm_way_tags
            GROUP BY way_id)
     ON w.way_id = id
     ORDER BY timestamp DESC)
"""

REQUEST_TEMPLATE = ("https://api.openstreetmap.org"
    "/api/0.6/map?bbox={minx},{miny},{maxx},{maxy}")
COMMAND_TEMPLATE = "spatialite_osm_raw -o {} -d {}"

executable = COMMAND_TEMPLATE.split()[0]
if not shutil.which(executable):
    raise FileNotFoundError("{} is missing".format(executable))

@hug.cli()
@hug.get('/api/getData')
def getData(
        minx: hug.types.float_number,
        maxx: hug.types.float_number,
        miny: hug.types.float_number,
        maxy: hug.types.float_number,
        referer="http://localhost:8000/",
        output=hug.output_format.json):
    if type(referer) is not str:
        referer = referer.headers.get('REFERER')
    with NamedTemp() as db, NamedTemp(suffix='.osm') as osm:
        customRequest = urllib.request.Request(
            REQUEST_TEMPLATE.format(**locals()),
            headers={
                "User-Agent":"Is-OSM-uptodate/%s" % __version__,
                "Referer":referer,
                "Accept-Encoding":"gzip",
            })
        with urllib.request.urlopen(customRequest) as response:
            gzipFile = gzip.GzipFile(fileobj=response)
            shutil.copyfileobj(gzipFile, osm)
        command = shlex.split(COMMAND_TEMPLATE.format(osm.name, db.name))
        subprocess.run(command, stdout=subprocess.DEVNULL, check=True)
        with sqlite3.connect(db.name) as conn:
            conn.enable_load_extension(True)
            conn.load_extension('mod_spatialite')
            cursor = conn.cursor()
            cursor.execute(QUERY, (minx, miny, maxx, maxy))
            result = cursor.fetchone()[0]
    return json.loads(result)

if __name__ == '__main__':
    getData.interface.cli()
