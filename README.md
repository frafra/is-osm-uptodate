# Is OSM up-to-date?

[![CircleCI](https://img.shields.io/circleci/build/github/frafra/is-osm-uptodate.svg)](https://circleci.com/gh/frafra/is-osm-uptodate)
[![pdm-managed](https://img.shields.io/badge/pdm-managed-blueviolet)](https://pdm.fming.dev)

This application helps you find which nodes have not been edited for a long time, by using on [Ohsome API](https://api.ohsome.org/) and various softwares and libraries, such as [Leaflet](https://leafletjs.com/), [React](https://reactjs.org), [Python](https://www.python.org/), [Redis](https://redis.io/) and others.

Demo: [is-osm-uptodate.frafra.eu](https://is-osm-uptodate.frafra.eu/)

Page on OSM wiki: [wiki.openstreetmap.org/wiki/Is_OSM_up-to-date](https://wiki.openstreetmap.org/wiki/Is_OSM_up-to-date)

# How to use

## Web interface

Open [is-osm-uptodate.frafra.eu](https://is-osm-uptodate.frafra.eu/) (or your local instance). Move, zoom or find and select a new location in order to get the nodes for the new bounding box.

## Tiles and QGIS

QGIS supports XYZ/TMS layers natively. Create a new `XYZ Tiles` connection using these parameters:

- `https://is-osm-uptodate.frafra.eu/tiles/{z}/{x}/{y}.png?upscale=256`
- `min_zoom_level`: 12
- `max_zoom_level`: 17 (recomended)

The tiles URL can be also configured with additional parameters, such as:
- `resolution`: each tile has `resolution x resolution` pixels (deafult: 8)
- `filter`
- `mode`, which can be set to:
  - `creation`
  - `lastedit` (default)
  - `revisions`
  - `frequency`
- `scale_min`
- `scale_max`

Here is another example:
```
https://is-osm-uptodate.frafra.eu/tiles/{z}/{x}/{y}.png?upscale=256&filter=amenity=*&mode=revisions&scale_max=10
```

## Command line

Example:

```
$ curl 'https://is-osm-uptodate.frafra.eu/api/getData?minx=9.188295196&miny=45.4635324507&maxx=9.1926242813&maxy=45.4649771956' -o milan-duomo.json
$ curl -X POST -F geojson=@boundary.geojson 'https://is-osm-uptodate.frafra.eu/api/getStats' -o stats.json
```

# Common issues

## Error - Please try again

Try a smaller region or wait for a while. Be sure to have a stable connection.

## Bad performance with many concurrent users

Increase `WORKERS` in `docker-compose.yml`.

See: [Gunicorn - How Many Workers?](https://docs.gunicorn.org/en/latest/design.html#how-many-workers).

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
docker compose --profile dev build \
    --build-arg UID=$(id -u) --build-arg GID=$(id -g)
docker compose --profile dev up
docker compose --profile dev down
```

## Test

```bash
docker compose --profile test run test
docker compose --profile test down
```
