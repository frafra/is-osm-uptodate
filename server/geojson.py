import urllib.error

from aiohttp import web

from . import DEFAULT_FILTER
from .process import generate
from .utils import generateHeaders, get_updated_metadata, timestamp_shortener


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
