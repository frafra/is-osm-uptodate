import collections
import statistics

import simplejson as json
from aiohttp import web

from . import DEFAULT_FILTER
from .process import generate_raw
from .utils import (
    generateHeaders,
    get_updated_metadata,
    request_to_bbox,
    timestamp_shortener,
)

params = ["creation", "lastedit", "revisions", "frequency"]


async def getStats(request):
    bbox = request_to_bbox(request)

    # common
    referer = request.headers.get("REFERER", "http://localhost:8000/")
    headers = generateHeaders(referer)
    filters = request.rel_url.query.get("filter")
    filters = [filters, DEFAULT_FILTER]
    start, end = get_updated_metadata()

    features = generate_raw(bbox, start, end, *filters, **headers)

    values = collections.defaultdict(list)
    for feature in features:
        for param in params:
            index = ["lon", "lat", "id", *params].index(param)
            if index == -1:
                pass  # error
            value = feature[index]
            if value:
                values[param].append(value)

    stats = collections.defaultdict(collections.OrderedDict)
    for param in params:
        values_p = values[param]
        if len(values_p) >= 1:
            stats[param] |= {
                "min": min(values_p),
                "max": max(values_p),
            }
        if len(values_p) >= 2:
            quartiles = statistics.quantiles(values_p, n=4, method="inclusive")
            stats[param] |= {
                "1st quartile": quartiles[0],
                "median": quartiles[1],
                "3rd quartile": quartiles[2],
            }
            stats[param].move_to_end("max")

    start_short = timestamp_shortener(start)
    end_short = timestamp_shortener(end)
    bbox_str = "_".join(map(str, bbox))
    filename = (
        f"is-osm-uptodate_{bbox_str}_{start_short}_{end_short}.json"
    ).replace(":", "")
    return web.Response(
        body=json.dumps(stats),
        headers={
            "Content-Type": "application/json",
            "Content-Disposition": f'attachment; filename="{filename}',
        },
    )
