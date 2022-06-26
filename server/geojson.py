import urllib.error

from aiohttp import web

from . import DEFAULT_FILTER
from .process import generate
from .utils import (
    generateHeaders,
    get_updated_metadata,
    request_to_multipolygon,
    timestamp_shortener,
)


async def getData(request):
    # common
    multipolygon = await request_to_multipolygon(request)
    referer = request.headers.get("REFERER", "http://localhost:8000/")
    headers = generateHeaders(referer)
    filters = request.rel_url.query.get("filter")
    filters = [filters, DEFAULT_FILTER]
    start, end = get_updated_metadata()

    start_short = timestamp_shortener(start)
    end_short = timestamp_shortener(end)
    generated = generate(multipolygon, start, end, *filters, **headers)

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
        filename = (
            f"is-osm-uptodate_{start_short}_{end_short}.geojson"
        ).replace(":", "")
        response = web.StreamResponse(
            status=200,
            reason="OK",
            headers={
                "Content-Type": "application/json",
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
        await response.prepare(request)
        for chunk in generated:
            await response.write(chunk.encode("utf-8"))
        await response.write_eof()
        return response
