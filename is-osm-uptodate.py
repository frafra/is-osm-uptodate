#!/usr/bin/env python3

from aiohttp import web

from server.feature import getFeature
from server.geojson import getData
from server.static import entry
from server.tile import tile


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
