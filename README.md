# Is OSM up-to-date?

[![CircleCI](https://img.shields.io/circleci/build/github/frafra/is-osm-uptodate.svg)](https://circleci.com/gh/frafra/is-osm-uptodate)
[![pdm-managed](https://img.shields.io/badge/pdm-managed-blueviolet)](https://pdm.fming.dev)

This application helps you find which nodes have not been edited for a long time, by using on [Ohsome API](https://api.ohsome.org/) and various softwares and libraries, such as [Leaflet](https://leafletjs.com/), [React](https://reactjs.org), [Python](https://www.python.org/), [Redis](https://redis.io/) and others.

Demo: [is-osm-uptodate.frafra.eu](https://is-osm-uptodate.frafra.eu/)

Page on OSM wiki: [iki.openstreetmap.org/wiki/Is_OSM_up-to-date](https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date)

# How to use

## Web interface

Open [is-osm-uptodate.frafra.eu](https://is-osm-uptodate.frafra.eu/) (or your local instance). Try to change the location and click on the refresh button in order to get the nodes for the new bounding box.
Enable the experimental `Tiles` layer to load data grouped by tile.

## Command line

Example:

```
$ curl 'http://is-osm-uptodate.frafra.eu/api/getData?minx=9.188295196&miny=45.4635324507&maxx=9.1926242813&maxy=45.4649771956' -o milan-duomo.json
```

# Common issues

## Error - Please try again

Try a smaller region or wait for a while. Be sure to have a stable connection.

## Tiles/page not loading

Increase `processes`/`threads` in `uwsgi.ini`.

# Run

This application can be deployed, developed and tested using [Docker](https://docs.docker.com) (with [BuiltKit](https://docs.docker.com/develop/develop-images/build_enhancements/#to-enable-buildkit-builds) enabled).

Look at `docs/INSTALL.md` if you wish not to use Docker.

## Deploy

```bash
docker compose --profile prod up # optional: add --build
docker compose --profile prod down
```

## Develop

```bash
docker compose --profile dev up
docker compose --profile dev down
```

## Test

```bash
docker compose --profile test run test
docker compose --profile test down
```
