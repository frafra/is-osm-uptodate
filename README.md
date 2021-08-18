# Is OSM up-to-date?

[![CircleCI](https://img.shields.io/circleci/build/github/frafra/is-osm-uptodate.svg)](https://circleci.com/gh/frafra/is-osm-uptodate)
[![Docker Cloud Build Status](https://img.shields.io/docker/cloud/build/frafra/is-osm-uptodate.svg)](https://hub.docker.com/r/frafra/is-osm-uptodate)
[![pdm-managed](https://img.shields.io/badge/pdm-managed-blueviolet)](https://pdm.fming.dev)

This application helps you find which nodes have not been edited for a long time.

Demo: https://is-osm-uptodate.frafra.eu/

Page on OSM wiki: https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date

# Dependencies

- [Python 3](https://www.python.org/) (3.8 or greater)
- [PDM](https://pdm.fming.dev/)
- [uWSGI](https://uwsgi-docs.readthedocs.io/)
- [npm](https://www.npmjs.com/)

## Optional

- Docker

# Run

# With Docker

```
pdm run docker_build
pdm run docker
```

# Without Docker

## Setup

```
pdm install --no-self --production
pdm run npm # Download dependencies for the web app
```

## Run

```
chmod +x $(pdm info --packages)/bin/*
pdm run web
```

## Docker image

### Ready to use

```
docker run --publish 8000:8000 frafra/is-osm-uptodate
```

### Custom image

```
pdm run docker
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
pdm run develop
```

## Testing

```
seleniumbase install geckodriver
pdm run test
```

You can also run dockerized tests:

```
./scripts/run_tests.sh
```

# Common issues

## Error - Please try again

Try a smaller region or wait for a while. Be sure to have a stable connection.
