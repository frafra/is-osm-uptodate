This file is for users that are not interested in using Docker.

# Dependencies

## Redis

Install and start [Redis](https://redis.io/docs/getting-started/).

## YAJI

[YAJI](https://lloyd.github.io/yajl/) is a fast JSON parsing library, required by [JsonSlicer](https://pypi.org/project/jsonslicer/).

Install YAJI library:
- Debian/Ubuntu users: `apt-get install libyajl-dev`
- Fedora users: `dnf install yajl-devel`

## GEOS

Shapely requires `geos_c.h`, which is provided by `geos-devel` in Fedora.

## Additional Python dependencies

Python headers could be needed, whic are provided by `python-devel` in Fedora.

## PDM

[PDM](https://pdm.fming.dev/) is a Python package manager, that can be installed using `pip` or `pipx`:

```bash
pipx install pdm
```

## Backend

```bash
pdm install --no-self --production
```

## Frontend

```bash
cd web
npm ci
npm run build
cd -
```

### Testing

```bash
pdm run seleniumbase install geckodriver
```

# Run

```bash
pdm run gunicorn is-osm-uptodate:webapp --bind 0.0.0.0:8000 --worker-class aiohttp.GunicornWebWorker --timeout 300
```

# Develop

```bash
(cd web && npm run develop) &
pdm run gunicorn is-osm-uptodate:webapp --bind 0.0.0.0:8000 --reload --worker-class aiohttp.GunicornWebWorker
```

# Testing

```bash
pytest --browser=firefox --save_screenshot tests/
```
