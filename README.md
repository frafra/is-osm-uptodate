# Is OSM up-to-date?

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

Open http://localhost:8000.

### Command line interface

Example:

```
$ ./is-osm-uptodate.py 9.073334 9.106293 45.795177 45.817913
```
