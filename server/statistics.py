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

    stats = {
        "mean": statistics.mean(values),
        "stdev": statistics.stdev(values),
    }

    if param in ["creation", "lastedit"]:
        stats["mean"] = datetime.datetime.utcfromtimestamp(
            stats["mean"]
        ).strftime("%Y-%m-%d %H:%M:%S")
        stats["stdev"] = (
            str(datetime.timedelta(seconds=stats["stdev"]).days) + " days"
        )
    elif param == "frequency":
        stats["mean"] = f'every {stats["mean"]:.3f} days'
        stats["stdev"] = f'every {stats["stdev"]:.3f} days'
    else:
        stats["mean"] = f'{stats["mean"]:.3f}'
        stats["stdev"] = f'{stats["stdev"]:.3f}'

    return web.Response(body=json.dumps(stats))
