import datetime
import io
import math
import statistics

import mercantile
import png
from aiohttp import web

from . import DEFAULT_FILTER, Z_TARGET, viridis
from .process import bbox_tiles, get_tile_data
from .utils import (
    ensure_range,
    generateHeaders,
    get_updated_metadata,
    request_to_multipolygon,
    shape_contains_feature,
)


async def tile(request):
    # common
    multipolygon = await request_to_multipolygon(request)
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
            scale_min = int(scale_min)
        if not scale_max:
            scale_max = datetime.datetime.strptime(
                end, "%Y-%m-%dT%H:%M:%SZ"
            ).timestamp()
        else:
            scale_max = int(scale_max)
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
    bbox = mercantile.Bbox(*multipolygon.bounds)
    for btile in bbox_tiles(bbox, Z_TARGET):
        quadkey = mercantile.quadkey(btile)
        tile_data = get_tile_data(quadkey, start, end, *filters, **headers)
        for feature in tile_data:
            if not shape_contains_feature(multipolygon, feature):
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


def generate_invalid_tile():
    tile = io.BytesIO()
    writer = png.Writer(1, 1, greyscale=True)
    writer.write(tile, [[255]])
    tile.seek(0)
    return tile.getvalue()
