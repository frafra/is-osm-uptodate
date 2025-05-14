FROM node:22-alpine AS builder

WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN --mount=type=cache,target=/app/web/.npm npm ci
COPY web/webpack.config.js ./
COPY web/src ./src
ARG SENTRY_DSN
RUN npm run build

FROM ghcr.io/astral-sh/uv:python3.10-bookworm AS base

RUN --mount=type=cache,sharing=locked,target=/var/cache/apt \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    apt-get update && \
    apt-get -qy install --no-install-recommends libyajl-dev

WORKDIR /app
ARG UID=1000
ARG GID=1000
RUN groupadd -g ${GID} app && \
    useradd -u ${UID} -g ${GID} --system --create-home --no-log-init app && \
    chown -R app:app .
USER app
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project
ENV PYTHONPATH=/app/.venv/lib
ENV PATH=$PATH:/app/.venv/bin

FROM base AS tests
USER root
RUN --mount=type=cache,sharing=locked,target=/var/cache/apt \
    apt-get -qy install --no-install-recommends chromium
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project
RUN --mount=type=cache,target=/root/seleniumbase/drivers/ \
    seleniumbase install chromedriver
USER app
COPY --chown=app:app tests/test_api.py tests/test_webapp.py tests/common.py tests/

CMD ["pytest", "--headless", "--browser=chrome", "--save_screenshot", "tests/"]

FROM base
COPY --chown=app:app web/dist/index.html web/dist/robots.txt web/dist/
COPY --chown=app:app is-osm-uptodate.py ./
COPY --chown=app:app server/ server/
COPY --from=builder --chown=app:app /app/web/dist/ web/dist/

EXPOSE 8000/tcp

ARG SENTRY_DSN
ENV SENTRY_DSN=$SENTRY_DSN
CMD ["gunicorn", "is-osm-uptodate:webapp", "--bind", "0.0.0.0:8000", "--workers", "2", "--worker-class", "aiohttp.GunicornWebWorker", "--timeout", "300"]
