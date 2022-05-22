import os

from matplotlib import cm
from walrus import Database

__version__ = "2.1.0-alpha"

API_SERVER = os.environ.get("API_SERVER", "https://api.ohsome.org")
API = f"{API_SERVER}/v1/elementsFullHistory/geometry"
METADATA = f"{API_SERVER}/v1/metadata"
Z_TARGET = int(os.environ.get("Z_TARGET", 12))
API_OSM = "https://www.openstreetmap.org/api/0.6"
DEFAULT_FILTER = "type:node"

viridis = cm.get_cmap("viridis", 256)

db = Database(host=os.environ.get("REDIS_HOST", "localhost"))
cache = db.cache()

SENTRY_DSN = os.getenv("SENTRY_DSN")
