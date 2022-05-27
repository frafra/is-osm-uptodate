from aiohttp import web

from server.feature import getFeature
from server.geojson import getData
from server.static import entry
from server.statistics import getStats
from server.tile import tile


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
