# Is OSM up-to-date?

This application helps you find which nodes have not been edited for a long time.

Demo: https://is-osm-uptodate.frafra.eu/

Page on OSM wiki: https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date

## Dependencies

- [Python 3](https://www.python.org/)
  - [hug](http://www.hug.rest/)
  - [uWSGI](https://uwsgi-docs.readthedocs.io/)
- [spatialite-tools](https://www.gaia-gis.it/fossil/spatialite-tools/index)

## Setup

### uwsgi

```
$ uwsgi --ini uwsgi.ini
```

It could be needed to export `PYTHONPATH` before running uwsgi. Example:
```
$ export PYTHONPATH="/usr/local/lib/python3.6/site-packages"
```

### Docker image

```
$ docker build --tag=is-osm-uptodate .
$ docker run --publish 8000:8000 --detach is-osm-uptodate
```

## How to use

### Web interface

Open http://localhost:8000. Try to change the location and click on the refresh button in order to get the nodes for the new bounding box.

### Command line interface

Example:

```
$ ./is-osm-uptodate.py -h
usage: is-osm-uptodate.py [-h] [-r REFERER] [-o OUTPUT] minx miny maxx maxy

positional arguments:
  minx                  A float number
  miny                  A float number
  maxx                  A float number
  maxy                  A float number

optional arguments:
  -h, --help            show this help message and exit
  -r REFERER, --referer REFERER
  -o OUTPUT, --output OUTPUT
$ ./is-osm-uptodate.py 9.188295196 45.4635324507 9.1926242813 45.4649771956
```

## Common issues

### Error - Please try again

Try a smaller region or wait for a while. Be sure to have a stable connection.
