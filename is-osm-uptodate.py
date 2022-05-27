#!/usr/bin/env python3

from aiohttp import web

from server.app import webapp

if __name__ == "__main__":
    app = webapp()
    web.run_app(app, path="0.0.0.0", port=8000)
