# Is OSM up-to-date?

This application helps you find which nodes have not been edited for a long time.

Demo: https://is-osm-uptodate.frafra.eu/

## Dependencies

- [Python 3](https://www.python.org/)
  - [hug](http://www.hug.rest/)
  - [uWSGI](https://uwsgi-docs.readthedocs.io/)
- [spatialite-tools](https://www.gaia-gis.it/fossil/spatialite-tools/index)

## How to use

### Web interface

```
$ uwsgi --ini uwsgi.ini
```

Open http://localhost:8000. Try to change the location and click on the refresh button in order to get the nodes for the new bounding box.

### Command line interface

Example:

```
$ ./is-osm-uptodate.py -h
usage: is-osm-uptodate.py [-h] [-o OUTPUT] minx maxx miny maxy

positional arguments:
  minx                  A float number
  maxx                  A float number
  miny                  A float number
  maxy                  A float number

optional arguments:
  -h, --help            show this help message and exit
  -o OUTPUT, --output OUTPUT
$ ./is-osm-uptodate.py 9.073334 9.106293 45.795177 45.817913
```
