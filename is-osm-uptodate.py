#!/usr/bin/env python3

__version__ = "2.1.0-alpha"

import datetime
import gzip
import io
import math
import os
import statistics
import time
import urllib.parse
import urllib.request
import zlib

import mercantile
import png
import sentry_sdk
import simplejson as json
from aiohttp import web
from jsonslicer import JsonSlicer
from matplotlib import cm
from sentry_sdk.integrations.aiohttp import AioHttpIntegration
from walrus import Database

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        SENTRY_DSN,
        integrations=[AioHttpIntegration()],
        traces_sample_rate=1.0,
        release=__version__,
    )

API_SERVER = os.environ.get("API_SERVER", "https://api.ohsome.org")
API = f"{API_SERVER}/v1/elementsFullHistory/geometry"
METADATA = f"{API_SERVER}/v1/metadata"
CACHE_REFRESH = 60 * 60 * 24
Z_TARGET = int(os.environ.get("Z_TARGET", 12))
API_OSM = "https://www.openstreetmap.org/api/0.6"
DEFAULT_FILTER = "type:node"

viridis = cm.get_cmap("viridis", 256)
featuresTime = time.time()
start, end = None, None

db = Database(host=os.environ.get("REDIS_HOST", "localhost"))


def generateHeaders(referer):
    return {
        "User-Agent": "Is-OSM-uptodate/%s" % __version__,
        "Referer": referer,
        "Accept-Encoding": "gzip",
    }


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


def processed_to_geojson(processed):
    for feature in processed:
        yield {
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
        }


def process_group(group, end):
    if processed := process(group, end):
        return processed


def timestamp_shortener(timestamp):
    return (
        timestamp.replace(":", "")
        .replace("-", "")
        .rstrip("Z")
        .rstrip("0")
        .rstrip("T")
    )


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


def get_tile_features(quadkey, start, end, *filters, **headers):
    yield from processed_to_geojson(
        get_tile_data(quadkey, start, end, *filters, **headers)
    )


def generate(bbox, start, end, *filters, **headers):
    bbox = mercantile.Bbox(*bbox)
    yield ""  # signal
    yield '{"type": "FeatureCollection", "features": ['
    first = True
    for tile in bbox_tiles(bbox, Z_TARGET):
        quadkey = mercantile.quadkey(tile)
        for feature in get_tile_features(
            quadkey, start, end, *filters, **headers
        ):
            if lonlat_in_bbox(bbox, *feature["geometry"]["coordinates"]):
                feature_json = json.dumps(feature, use_decimal=True)
                if not first:
                    yield ", "
                if first and feature_json:
                    first = False
                yield feature_json
    yield "]}"


def get_updated_metadata():
    global featuresTime, start, end
    if time.time() - featuresTime > CACHE_REFRESH or not start or not end:
        metadata = json.load(urllib.request.urlopen(METADATA))
        temporal_extent = metadata["extractRegion"]["temporalExtent"]
        if (
            start != temporal_extent["fromTimestamp"]
            or end != temporal_extent["toTimestamp"]
        ):
            pass  # invalidate cache?
        start = temporal_extent["fromTimestamp"]
        end = temporal_extent["toTimestamp"]
        end = end.rstrip("Z") + ":00Z"  # W
    return start, end


def generate_invalid_tile():
    tile = io.BytesIO()
    writer = png.Writer(1, 1, greyscale=True)
    writer.write(tile, [[255]])
    tile.seek(0)
    return tile.getvalue()


def ensure_range(value, value_min=0, value_max=1):
    if value < value_min:
        value = value_min
    elif value > value_max:
        value = value_max
    return value


async def tile(request):
    z = int(request.match_info["z"])
    x = int(request.match_info["x"])
    y = int(request.match_info["y"])
    tile = mercantile.Tile(x, y, z)

    # common
    referer = request.headers.get("REFERER", "http://localhost:8000/")
    headers = generateHeaders(referer)
    filters = request.rel_url.query.get("filter")
    filters = [filters, DEFAULT_FILTER]
    start, end = get_updated_metadata()

    mode = request.rel_url.query.get("mode", "lastedit")
    scale_min = request.rel_url.query.get("scale_min")
    scale_max = request.rel_url.query.get("scale_max")
    percentile = int(request.rel_url.query.get("percentile", "50"))
    resolution = int(request.rel_url.query.get("resolution", "8"))
    if percentile < 0 or percentile > 100:
        return web.Response(
            body=generate_invalid_tile(), content_type="image/png"
        )

    if mode == "creation":
        feature_index = 3
    elif mode == "lastedit":
        feature_index = 4

    if mode == "creation" or mode == "lastedit":
        if not scale_min:
            scale_min = datetime.datetime.strptime(
                start, "%Y-%m-%dT%H:%M:%SZ"
            ).timestamp()
        else:
            scale_min = int(scale_min) / 1000
        if not scale_max:
            scale_max = datetime.datetime.strptime(
                end, "%Y-%m-%dT%H:%M:%SZ"
            ).timestamp()
        else:
            scale_max = int(scale_max) / 1000
    elif mode == "revisions":
        if not scale_min:
            scale_min = 1
        if not scale_max:
            scale_max = 10
        feature_index = 5
    elif mode == "frequency":
        if not scale_min:
            scale_min = 7
        if not scale_max:
            scale_max = 700
        feature_index = 6
    else:
        return web.Response(text="Invalid param")

    scale_min = float(scale_min)
    scale_max = float(scale_max)
    if scale_min == scale_max:
        scale_max += 1

    subvalues = [[] for _ in range(resolution * resolution)]
    bbox = mercantile.Bbox(*mercantile.bounds(tile))
    for btile in bbox_tiles(bbox, Z_TARGET):
        quadkey = mercantile.quadkey(btile)
        tile_data = get_tile_data(quadkey, start, end, *filters, **headers)
        for feature in tile_data:
            if not lonlat_in_bbox(bbox, feature[0], feature[1]):
                continue
            y_index = ensure_range(
                math.floor(
                    resolution
                    * (bbox.top - feature[1])
                    / (bbox.top - bbox.bottom)
                ),
                value_max=resolution - 1,
            )
            x_index = ensure_range(
                math.floor(
                    resolution
                    * (feature[0] - bbox.left)
                    / (bbox.right - bbox.left)
                ),
                value_max=resolution - 1,
            )
            subvalues[y_index * resolution + x_index].append(
                (feature[feature_index] - scale_min) / (scale_max - scale_min)
            )

    colors = []
    for values in subvalues:
        if len(values) == 0:
            colors.extend([255, 255, 255])
            continue
        elif len(values) == 1:
            value = values[0]
        else:
            value = [
                min(values),
                *statistics.quantiles(values, n=100, method="inclusive"),
                max(values),
            ][percentile]
        colors.extend(
            [round(c * 255) for c in viridis(round(value * 255))][:3]
        )

    tile = io.BytesIO()
    writer = png.Writer(resolution, resolution, greyscale=False)
    writer.write_array(tile, colors)
    tile.seek(0)

    return web.Response(body=tile.getvalue(), content_type="image/png")


async def getData(request):
    # Round to 7 decimal https://wiki.openstreetmap.org/wiki/Node#Structure
    bbox = []
    for arg in ("minx", "miny", "maxx", "maxy"):
        bbox.append(round(float(request.rel_url.query.get(arg)), 7))
    # common
    referer = request.headers.get("REFERER", "http://localhost:8000/")
    headers = generateHeaders(referer)
    filters = request.rel_url.query.get("filter")
    filters = [filters, DEFAULT_FILTER]
    start, end = get_updated_metadata()

    start_short = timestamp_shortener(start)
    end_short = timestamp_shortener(end)
    bbox_str = "_".join(map(str, bbox))
    filename = (
        f"is-osm-uptodate_{bbox_str}_{start_short}_{end_short}.json".replace(
            ":", ""
        )
    )
    generated = generate(bbox, start, end, *filters, **headers)
    try:
        next(generated)  # peek
    except urllib.error.HTTPError as error:
        if error.code == 503:
            return "ohsome", error.code
        else:
            return error.reason, error.code
    except Exception:
        return "", 500
    else:

        response = web.StreamResponse(
            status=200,
            reason="OK",
            headers={
                "Content-Type": "application/json",
                "Content-Disposition": f'attachment; filename="{filename}',
            },
        )
        await response.prepare(request)
        for chunk in generated:
            await response.write(chunk.encode("utf-8"))
        await response.write_eof()
        return response


async def getFeature(request):
    feature_type = request.rel_url.query.get("feature_type", "node")
    feature_id = request.rel_url.query.get("feature_id")
    referer = request.headers.get("REFERER", "http://localhost:8000/")
    request = urllib.request.Request(
        f"{API_OSM}/{feature_type}/{feature_id}.json",
        headers=generateHeaders(referer),
    )
    with urllib.request.urlopen(request) as resp_gzipped:
        resp = gzip.GzipFile(fileobj=resp_gzipped)
        return web.Response(body=resp.read())


async def entry(request):
    return web.FileResponse("web/dist/index.html")


async def webapp():
    app = web.Application()
    app.add_routes(
        [
            web.get("/", entry),
            web.get("/api/getFeature", getFeature),
            web.get("/api/getData", getData),
            web.get("/tiles/{z}/{x}/{y}.png", tile),
        ]
    )
    app.router.add_static("/", path="web/dist", name="static")
    return app


if __name__ == "__main__":
    app = webapp()
    web.run_app(app, path="0.0.0.0", port=8000)
