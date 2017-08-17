#!/usr/bin/env python3

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
        'node_id', node_id,
        'timestamp', timestamp,
        'version', version,
        'attributes', json(attributes)))))
 FROM osm_nodes
 INNER JOIN
      (SELECT node_id AS id,
              json_group_object(k, v) AS attributes
         FROM osm_node_tags
        GROUP BY node_id)
 ON node_id = id
WHERE MbrWithin(Geometry, BuildMbr(?, ?, ?, ?));
"""

REQUEST_TEMPLATE = ("https://api.openstreetmap.org"
    "/api/0.6/map?bbox={minx},{miny},{maxx},{maxy}")
COMMAND_TEMPLATE = "spatialite_osm_raw -o {} -d {}"

executable = COMMAND_TEMPLATE.split()[0]
if not shutil.which(executable):
    raise FileNotFoundError("{} is missing".format(executable))

@hug.cli()
@hug.get('/api/getNodes')
def getNodes(minx: hug.types.float_number,
        maxx: hug.types.float_number,
        miny: hug.types.float_number,
        maxy: hug.types.float_number,
        output=hug.output_format.json):
    with NamedTemp() as db, NamedTemp(suffix='.osm') as osm:
        request = urllib.request.Request(
            REQUEST_TEMPLATE.format(**locals()),
            headers={"Accept-Encoding":"gzip"})
        with urllib.request.urlopen(request) as response:
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
    getNodes.interface.cli()
