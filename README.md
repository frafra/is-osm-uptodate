# Is OSM up-to-date?

[![CircleCI](https://img.shields.io/circleci/build/github/frafra/is-osm-uptodate.svg)](https://circleci.com/gh/frafra/is-osm-uptodate)
[![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/frafra/is-osm-uptodate.svg)](https://hub.docker.com/r/frafra/is-osm-uptodate)

This application helps you find which nodes have not been edited for a long time.

Demo: https://is-osm-uptodate.frafra.eu/

Page on OSM wiki: https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date

# Dependencies

- [Python 3](https://www.python.org/)
  - [hug](http://www.hug.rest/)
  - [uWSGI](https://uwsgi-docs.readthedocs.io/)
- [npm](https://www.npmjs.com/)

# Setup

## Download dependencies for the web app

```
$ cd web
$ npm ci
$ cd -
```

## uwsgi

```
$ uwsgi --ini uwsgi.ini
```

It could be needed to export `PYTHONPATH` before running uwsgi. Example:
```
$ export PYTHONPATH="/usr/local/lib/python3.9/site-packages"
```

## Docker image

### Ready to use

```
$ docker run --publish 8000:8000 --detach frafra/is-osm-uptodate
```

### Custom image

```
$ docker build --tag=is-osm-uptodate-custom .
$ docker run --publish 8000:8000 --detach is-osm-uptodate-custom
```

# How to use

## Web interface

Open http://localhost:8000. Try to change the location and click on the refresh button in order to get the nodes for the new bounding box.

## Command line interface

Example:

```
$ ./is-osm-uptodate.py -h
usage: is-osm-uptodate.py [-h] [-r REFERER] minx miny maxx maxy

positional arguments:
  minx                  A float number
  miny                  A float number
  maxx                  A float number
  maxy                  A float number

optional arguments:
  -h, --help            show this help message and exit
  -r REFERER, --referer REFERER
$ ./is-osm-uptodate.py 9.188295196 45.4635324507 9.1926242813 45.4649771956
```

# Common issues

## Error - Please try again

Try a smaller region or wait for a while. Be sure to have a stable connection.
