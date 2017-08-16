# Is OSM up-to-date?

## Dependencies

- [Python 3](https://www.python.org/)
  - [hug](http://www.hug.rest/)
- [spatialite-tools](https://www.gaia-gis.it/fossil/spatialite-tools/index)

## How to use

```
$ hug -f is-osm-uptodate.py &
$ cd web
$ python3 -m http.server 8001
```

Open http://localhost:8001 and click on the refresh button.
