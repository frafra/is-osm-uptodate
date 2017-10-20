# Is OSM up-to-date?

This application helps you find which nodes have not been edited for a long time.

Demo: https://is-osm-uptodate.frafra.eu/

Page on OSM wiki: https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date

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
usage: is-osm-uptodate.py [-h] [-r REFERER] [-o OUTPUT] minx maxx miny maxy

positional arguments:
  minx                  A float number
  maxx                  A float number
  miny                  A float number
  maxy                  A float number

optional arguments:
  -h, --help            show this help message and exit
  -r REFERER, --referer REFERER
  -o OUTPUT, --output OUTPUT
$ ./is-osm-uptodate.py 9.073334 9.106293 45.795177 45.817913
```
