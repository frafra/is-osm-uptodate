import sentry_sdk
from sentry_sdk.integrations.aiohttp import AioHttpIntegration

from . import SENTRY_DSN, __version__

if SENTRY_DSN:
    sentry_sdk.init(
        SENTRY_DSN,
        integrations=[AioHttpIntegration()],
        traces_sample_rate=1.0,
        release=__version__,
    )
