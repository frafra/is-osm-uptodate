import datetime
import gzip
import urllib.request
import zlib

import mercantile
import simplejson as json
from jsonslicer import JsonSlicer

from . import API, Z_TARGET, db
from .utils import get_updated_metadata


def generate_raw(bbox, start, end, *filters, **headers):
    bbox = mercantile.Bbox(*bbox)
    for tile in bbox_tiles(bbox, Z_TARGET):
        quadkey = mercantile.quadkey(tile)
        for feature in get_tile_data(quadkey, start, end, *filters, **headers):
            if lonlat_in_bbox(bbox, feature[0], feature[1]):
                yield feature


def generate(bbox, start, end, *filters, **headers):
    yield ""  # signal
    yield '{"type": "FeatureCollection", "features": ['
    first = True
    for feature in generate_raw(bbox, start, end, *filters, **headers):
        feature_geojson = feature_to_geojson(feature)
        if not first:
            yield ", "
        if first and feature_geojson:
            first = False
        yield feature_geojson
    yield "]}"


def bbox_tiles(bbox, z_target, *tiles):
    if not tiles:
        tile = mercantile.bounding_tile(*bbox)
        while tile.z > z_target:
            tile = mercantile.parent(tile)
        tiles = (tile,)
    for tile in tiles:
        bounds = mercantile.bounds(tile)
        if (
            bounds.east < bbox.left
            or bbox.right < bounds.west
            or bounds.north < bbox.bottom
            or bbox.top < bounds.south
        ):
            continue
        if tile.z >= z_target:
            yield tile
        else:
            yield from bbox_tiles(bbox, z_target, *mercantile.children(tile))


def lonlat_in_bbox(bbox, lon, lat):
    return bbox.left <= lon <= bbox.right and bbox.bottom <= lat <= bbox.top


def stream_to_processed(resp):
    slicer = JsonSlicer(resp, ("features", None))
    start, end = get_updated_metadata()
    group = []
    for feature in slicer:
        osmid = feature["properties"]["@osmId"]
        if len(group) == 0:
            group.append(feature)
        elif group[0]["properties"]["@osmId"] == osmid:
            group.append(feature)
        else:
            if processed := process_group(group, end):
                yield processed
            group = [feature]
    if len(group) > 0:
        if processed := process_group(group, end):
            yield processed


def get_tile_data(quadkey, start, end, *filters, **headers):
    filters = " and ".join(filter(None, filters))
    cache = db.cache()
    cache_key = f"{quadkey}_{start}_{end}_{filters}"
    with db.lock(cache_key, ttl=300000):
        result = cache.get(cache_key)
        if not result:
            bbox = mercantile.bounds(mercantile.quadkey_to_tile(quadkey))
            params = urllib.parse.urlencode(
                {
                    "bboxes": "|".join(map(str, bbox)),
                    "properties": "metadata",
                    "showMetadata": "true",
                    "time": f"{start},{end}",
                    "filter": filters,
                }
            )

            req = urllib.request.Request(API + "?" + params)
            for key, value in headers.items():
                req.add_header(key, value)
            with urllib.request.urlopen(req) as resp_gzipped:
                resp = gzip.GzipFile(fileobj=resp_gzipped)
                compress = zlib.compressobj()
                result = b""
                for chunk in stream_to_processed(resp):
                    serialized = json.dumps(chunk, use_decimal=True) + "\n"
                    result += compress.compress(serialized.encode())
                result += compress.flush()
            cache.set(cache_key, result, timeout=60 * 60 * 24 * 30)
    for line in zlib.decompress(result).decode().split("\n"):
        if line:
            yield json.loads(line)


def process(group, end):
    first, last = group[0], group[-1]
    if last["properties"]["@validTo"] != end:
        return  # feature has been deleted
    firstedit = datetime.datetime.strptime(
        first["properties"]["@validFrom"], "%Y-%m-%dT%H:%M:%SZ"
    )
    lastedit = datetime.datetime.strptime(
        last["properties"]["@validFrom"], "%Y-%m-%dT%H:%M:%SZ"
    )
    average_update_days = (
        datetime.datetime.now().utcnow() - lastedit
    ).days / last["properties"]["@version"]
    return (
        last["geometry"]["coordinates"][0],
        last["geometry"]["coordinates"][1],
        int(first["properties"]["@osmId"].split("/")[1]),
        firstedit.timestamp(),
        lastedit.timestamp(),
        last["properties"]["@version"],
        average_update_days,
    )


def feature_to_geojson(feature):
    return json.dumps(
        {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [feature[0], feature[1]],
            },
            "properties": {
                "id": feature[2],
                "created": str(datetime.datetime.utcfromtimestamp(feature[3])),
                "lastedit": str(
                    datetime.datetime.utcfromtimestamp(feature[4])
                ),
                "version": feature[5],
                "average_update_days": feature[6],
            },
        },
        use_decimal=True,
    )


def process_group(group, end):
    if processed := process(group, end):
        return processed
