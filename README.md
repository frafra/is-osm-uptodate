# Is OSM up-to-date?

[![CircleCI](https://img.shields.io/circleci/build/github/frafra/is-osm-uptodate.svg)](https://circleci.com/gh/frafra/is-osm-uptodate)
[![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/frafra/is-osm-uptodate.svg)](https://hub.docker.com/r/frafra/is-osm-uptodate)

This application helps you find which nodes have not been edited for a long time.

Demo: https://is-osm-uptodate.frafra.eu/

Page on OSM wiki: https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date

# Dependencies

- [Python 3](https://www.python.org/) (3.8 or greater)
  - [flask](https://flask.palletsprojects.com/)
  - [uWSGI](https://uwsgi-docs.readthedocs.io/)
  - [jsonslicer](https://github.com/AMDmi3/jsonslicer)
- [npm](https://www.npmjs.com/)

## Optional

- [PDM](https://pdm.fming.dev/)
- Docker

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

## Command line

Example:

```
$ curl 'http://localhost:8000/api/getData?minx=9.188295196&miny=45.4635324507&maxx=9.1926242813&maxy=45.4649771956' -o milan-duomo.json
```

# How to develop

```
pipx install pdm
pdm install --no-self
pdm run uwsgi --ini uwsgi.ini py-autoreload=3
```

You can also run dockerized tests:

```
./run_tests.sh
```

# Common issues

## Error - Please try again

Try a smaller region or wait for a while. Be sure to have a stable connection.
