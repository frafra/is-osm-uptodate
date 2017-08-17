#!/usr/bin/env python3

import hug

import json
import tempfile
import shlex
import shutil
import sqlite3
import subprocess

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
 ON node_id = id;
"""

COMMAND_TEMPLATE = """
spatialite_osm_overpass
-mode RAW
-minx {minx}
-miny {miny}
-maxx {maxx}
-maxy {maxy}
-d {path}
"""

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
    with tempfile.NamedTemporaryFile() as db:
        path = db.name
        command = shlex.split(COMMAND_TEMPLATE.format(**locals()))
        subprocess.run(command, stdout=subprocess.DEVNULL, check=True)
        with sqlite3.connect(db.name) as conn:
            conn.enable_load_extension(True)
            conn.load_extension('mod_spatialite')
            cursor = conn.cursor()
            cursor.execute(QUERY)
            result = cursor.fetchone()[0]
    return json.loads(result)

if __name__ == '__main__':
    getNodes.interface.cli()
