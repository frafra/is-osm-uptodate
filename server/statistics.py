import datetime
import statistics

import simplejson as json
from aiohttp import web

from . import DEFAULT_FILTER
from .process import generate_raw
from .utils import generateHeaders, get_updated_metadata, request_to_bbox


async def getStats(request):
    bbox = request_to_bbox(request)
    param = request.rel_url.query.get("param")

    # common
    referer = request.headers.get("REFERER", "http://localhost:8000/")
    headers = generateHeaders(referer)
    filters = request.rel_url.query.get("filter")
    filters = [filters, DEFAULT_FILTER]
    start, end = get_updated_metadata()

    features = generate_raw(bbox, start, end, *filters, **headers)

    index = [
        "lon",
        "lat",
        "id",
        "creation",
        "lastedit",
        "revisions",
        "frequency",
    ].index(param)
    if index == -1:
        pass  # error

    values = []
    for feature in features:
        value = feature[index]
        if value:
            values.append(value)

    stats = {}
    if len(values) > 1:
        stats.update(
            {
                "min": min(values),
                "mean": statistics.mean(values),
                "max": max(values),
            }
        )
    if len(values) > 2:
        stats.update(
            {
                "stdev": statistics.stdev(values),
            }
        )

    for key in stats:
        match [param, key]:
            case [("creation" | "lastedit"), ("min" | "mean" | "max")]:
                stats[key] = datetime.datetime.utcfromtimestamp(
                    stats[key]
                ).strftime("%Y-%m-%d %H:%M:%S")
            case [("creation" | "lastedit"), _]:
                stats[key] = (
                    str(datetime.timedelta(seconds=stats[key]).days) + " days"
                )
            case ["frequency", ("min", "mean", "max")]:
                stats[key] = f"every {stats[key]:.3f} days"
            case ["frequency", _]:
                stats[key] = f"{stats[key]:.3f} days"
            case [_, _]:
                stats[key] = f"{stats[key]:.3f}"

    return web.Response(body=json.dumps(stats))
