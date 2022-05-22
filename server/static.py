from aiohttp import web


async def entry(request):
    return web.FileResponse("web/dist/index.html")
