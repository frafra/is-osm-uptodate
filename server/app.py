import sentry_sdk
from aiohttp import web
from sentry_sdk.integrations.aiohttp import AioHttpIntegration

from server import SENTRY_DSN, __version__
from server.feature import getFeature
from server.geojson import getData
from server.static import entry
from server.statistics import getStats
from server.tile import tile

if SENTRY_DSN:
    sentry_sdk.init(
        SENTRY_DSN,
        integrations=[AioHttpIntegration()],
        traces_sample_rate=1.0,
        release=__version__,
    )


async def webapp():
    app = web.Application()
    app.add_routes(
        [
            web.get("/", entry),
            web.get("/api/getFeature", getFeature),
            web.get("/api/getData", getData),
            web.get("/api/getStats", getStats),
            web.get("/tiles/{z}/{x}/{y}.png", tile),
        ]
    )
    app.router.add_static("/", path="web/dist", name="static")
    return app
