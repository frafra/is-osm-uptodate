import urllib.parse
import urllib.request

import simplejson as json

from . import METADATA, __version__, cache


def generateHeaders(referer):
    return {
        "User-Agent": "Is-OSM-uptodate/%s" % __version__,
        "Referer": referer,
        "Accept-Encoding": "gzip",
    }


def timestamp_shortener(timestamp):
    return (
        timestamp.replace(":", "")
        .replace("-", "")
        .rstrip("Z")
        .rstrip("0")
        .rstrip("T")
    )


def lonlat_in_bbox(bbox, lon, lat):
    return bbox.left <= lon <= bbox.right and bbox.bottom <= lat <= bbox.top


@cache.cached(timeout=60 * 60 * 24)
def get_updated_metadata():
    metadata = json.load(urllib.request.urlopen(METADATA))
    temporal_extent = metadata["extractRegion"]["temporalExtent"]
    start = temporal_extent["fromTimestamp"]
    end = temporal_extent["toTimestamp"]
    end = end.rstrip("Z") + ":00Z"
    return start, end


def ensure_range(value, value_min=0, value_max=1):
    if value < value_min:
        value = value_min
    elif value > value_max:
        value = value_max
    return value
