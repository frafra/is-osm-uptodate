import urllib.parse
import urllib.request

import aiohttp.web_request
import mercantile
import pygeos
import shapely.geometry
import simplejson as json

from . import METADATA, __version__, cache


def generateHeaders(referer):
    return {
        "User-Agent": "Is-OSM-uptodate/%s" % __version__,
        "Referer": referer,
        "Accept-Encoding": "gzip",
    }


def timestamp_shortener(timestamp):
    return (
        timestamp.replace("-", "")
        .rstrip("Z")
        .replace(":00", "")
        .replace(":", "")
        .rstrip("T")
    )


def lonlat_in_bbox(bbox, lon, lat):
    return bbox.left <= lon <= bbox.right and bbox.bottom <= lat <= bbox.top


@cache.cached(timeout=60 * 60 * 24)
def get_updated_metadata():
    metadata = json.load(urllib.request.urlopen(METADATA))
    temporal_extent = metadata["extractRegion"]["temporalExtent"]
    start = temporal_extent["fromTimestamp"]
    end = temporal_extent["toTimestamp"]
    end = end.rstrip("Z") + ":00Z"
    return start, end


def ensure_range(value, value_min=0, value_max=1):
    if value < value_min:
        value = value_min
    elif value > value_max:
        value = value_max
    return value


def request_to_bbox(request):
    """Round to 7 decimal https://wiki.openstreetmap.org/wiki/Node#Structure"""
    bbox = []
    try:
        for arg in ("minx", "miny", "maxx", "maxy"):
            bbox.append(round(float(request.rel_url.query.get(arg)), 7))
    except TypeError:
        return None
    return bbox


async def request_to_multipolygon(request):
    multipolygon = shapely.geometry.MultiPolygon()

    # geojson
    post = await request.post()
    geojson = post.get("geojson")
    if geojson:
        if isinstance(geojson, aiohttp.web_request.FileField):
            geojson = geojson.file.read()
        geometry = pygeos.from_geojson(geojson)
        multipolygon = pygeos.to_shapely(geometry)

    # tile or bbox
    bbox_polygon = shapely.geometry.Polygon()
    try:
        z = int(request.match_info["z"])
        x = int(request.match_info["x"])
        y = int(request.match_info["y"])
    except KeyError:
        bbox = request_to_bbox(request)
        if bbox:
            bbox_polygon = shapely.geometry.box(*bbox)
    else:
        tile = mercantile.Tile(x, y, z)
        bbox_polygon = shapely.geometry.box(*mercantile.bounds(tile))

    if bbox_polygon.is_empty:
        return multipolygon
    elif multipolygon.is_empty:
        return bbox_polygon
    else:
        return multipolygon.intersection(bbox_polygon)


def shape_contains_feature(shape, feature):
    point = shapely.geometry.Point(feature[0], feature[1])
    return shape.contains(point)
