#!/usr/bin/python3

import asyncio
import io
import json
import subprocess
import time

import aiohttp
import mercantile
import pygeos
import pyproj
import shapely

from server import Z_TARGET
from server.process import bbox_tiles

tests = [
    ("Piazza del Duomo, Milano", True),
    ("Piazza del Duomo, Milano", False),
    ("Municipio 1, Milano", True),
    ("Municipio 1, Milano", False),
    ("Milano", True),
    ("Milano", False),
    ("Città Metropolitana di Milano", True),  # >1' timeout
    ("Città Metropolitana di Milano", False),
]

NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search.php"

# FLYCTL = True
# SERVER = "https://is-osm-uptodate-test.fly.dev"
REDIS_APP = "is-osm-uptodate-redis-test"
REDIS_APP_CONF = "redis/fly.toml"

FLYCTL = False
SERVER = "http://localhost:8000"


async def nominatim_osmid_and_geojson(client, location):
    async with client.get(
        NOMINATIM_SEARCH,
        params={
            "q": location,
            "limit": 1,
            "format": "jsonv2",
            "polygon_geojson": 1,
        },
    ) as resp:
        assert resp.status == 200
        feature = (await resp.json())[0]
    return feature["osm_id"], feature["geojson"]


async def fetch(client, method, url, *args, **kwargs):
    async with client.request(method=method, url=url, *args, **kwargs) as resp:
        content = await resp.read()
    return content


def flushdb():
    if FLYCTL:
        command = [
            "flyctl",
            "ssh",
            "console",
            "-a",
            REDIS_APP,
            "-c",
            REDIS_APP_CONF,
            "-C",
            "redis-cli FLUSHDB",
        ]
    else:
        command = [
            "redis-cli",
            "FLUSHDB",
        ]
    process = subprocess.Popen(
        command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    process.wait()


async def benchmark(client, location, cold=True, repetitions=3):
    results = {
        "getData": {
            "requests": 1,
            "elapsed": [],
        },
        "getStats": {
            "requests": 1,
            "elapsed": [],
        },
        "tiles": {
            "requests": None,
            "elapsed": [],
        },
    }

    osmid, geojson = await nominatim_osmid_and_geojson(client, location)
    geometry = pygeos.to_shapely(pygeos.from_geojson(json.dumps(geojson)))
    bbox = mercantile.Bbox(*geometry.bounds)
    # bbox_params = dict(zip(("minx", "miny", "maxx", "maxy"), bbox))

    geojson_io = io.StringIO()
    json.dump(geojson, geojson_io)

    for _ in range(repetitions):
        if cold:
            flushdb()
        start = time.time()
        geojson_io.seek(0)
        response = await fetch(
            client,
            "POST",
            f"{SERVER}/api/getStats",
            data={"geojson": geojson_io},
        )
        results["getStats"]["elapsed"].append(time.time() - start)

    nodes = json.loads(response.decode("utf-8"))["lastedit"]["nodes"]

    for _ in range(repetitions):
        if cold:
            flushdb()
        geojson_io.seek(0)
        await fetch(
            client,
            "POST",
            f"{SERVER}/api/getData",
            data={"geojson": geojson_io},
        )
        results["getData"]["elapsed"].append(time.time() - start)

    for _ in range(repetitions):
        if cold:
            flushdb()
        start = time.time()
        tasks = []
        for tile in bbox_tiles(bbox, Z_TARGET):
            tile_box = shapely.geometry.box(*mercantile.bounds(*tile))
            sliced = geometry.intersection(tile_box)
            if sliced.is_empty:
                continue
            tasks.append(
                fetch(
                    client,
                    "GET",
                    f"{SERVER}/tiles/{tile.z}/{tile.x}/{tile.y}.png",
                )
            )
        await asyncio.gather(*tasks)
        results["tiles"]["elapsed"].append(time.time() - start)

    results["tiles"]["requests"] = len(tasks)

    geod = pyproj.Geod(ellps="WGS84")
    area = abs(geod.geometry_area_perimeter(geometry)[0])

    return osmid, area, nodes, results


async def main():
    timeout = aiohttp.ClientTimeout(total=0, sock_read=0)
    connector = aiohttp.TCPConnector(force_close=True, limit=16)
    async with aiohttp.ClientSession(
        connector=connector, timeout=timeout
    ) as client:
        for location, cold in tests:
            osmid, area, nodes, results = await benchmark(
                client, location, cold
            )
            with open("report.jsonl", "a") as output:
                line = {
                    "location": location,
                    "cold_cache": cold,
                    "osm_id": osmid,
                    "area": area,
                    "nodes": nodes,
                    "results": results,
                }
                json.dump(line, output)
                output.write("\n")


loop = asyncio.get_event_loop()
loop.run_until_complete(main())
