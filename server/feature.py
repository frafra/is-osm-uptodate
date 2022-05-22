import gzip
import urllib.request

from aiohttp import web

from . import API_OSM
from .utils import generateHeaders


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
