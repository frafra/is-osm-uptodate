#!/usr/bin/env python3

__version__ = "1.0"

import hug

import gzip
import shlex
import shutil
import sqlite3
import subprocess
from tempfile import NamedTemporaryFile as NamedTemp
import urllib.request

QUERY = """
  WITH nodes_attrs AS
       (SELECT node_id, json_group_object(k, v) AS attributes
          FROM osm_node_tags
         GROUP BY node_id),
       ways_attrs AS
       (SELECT way_id, json_group_object(k, v) AS attributes
          FROM osm_way_tags
         GROUP BY way_id),
       ways_lines AS
       (SELECT way_id, MakeLine(Geometry) AS Geometry
          FROM osm_way_refs
               JOIN osm_nodes
               ON osm_nodes.node_id = osm_way_refs.node_id
         GROUP BY way_id)
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
  (SELECT osm_nodes.node_id AS id, uid, user,
          timestamp, version, Geometry, attributes
     FROM nodes_attrs
          INNER JOIN osm_nodes
          ON osm_nodes.node_id = nodes_attrs.node_id
    WHERE MbrWithin(Geometry, BuildMbr(?, ?, ?, ?))
    UNION ALL
   SELECT ways_lines.way_id, uid, user,
          timestamp, version, Geometry, attributes
     FROM ways_lines
          JOIN osm_ways
          ON ways_lines.way_id = osm_ways.way_id
          LEFT JOIN ways_attrs
          ON ways_lines.way_id = ways_attrs.way_id
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
        osm.flush()
        command = shlex.split(COMMAND_TEMPLATE.format(osm.name, db.name))
        subprocess.run(command, stdout=subprocess.DEVNULL, check=True)
        with sqlite3.connect(db.name) as conn:
            conn.enable_load_extension(True)
            conn.load_extension('mod_spatialite')
            cursor = conn.cursor()
            cursor.execute(QUERY, (minx, miny, maxx, maxy))
            result = cursor.fetchone()[0]
    return result

if __name__ == '__main__':
    getData.interface.cli()
