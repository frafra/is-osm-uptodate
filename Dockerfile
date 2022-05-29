FROM python:3.10-bullseye AS apt
LABEL maintainer="fraph24@gmail.com"
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update
WORKDIR /home/app

FROM apt AS builder
RUN --mount=type=cache,sharing=locked,target=/var/cache/apt \
    apt-get -qy install npm
WORKDIR /home/app/web
COPY web/package.json web/package-lock.json ./
RUN --mount=type=cache,target=/home/app/.npm npm ci
COPY web/webpack.config.js ./
COPY web/src ./src
ARG SENTRY_DSN
RUN npm run build

FROM apt AS base
RUN --mount=type=cache,sharing=locked,target=/var/cache/apt \
    apt-get -qy install libyajl-dev && \
    useradd --user-group --system --no-create-home --no-log-init app && \
    chown -R app:app .
COPY --chown=app:app pyproject.toml pdm.lock ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install pdm
USER app
RUN --mount=type=cache,target=/root/.cache/pdm \
    pdm install --production --no-self

COPY --from=builder --chown=app:app /home/app/web/dist/ web/dist/
COPY --chown=app:app web/dist/index.html web/dist/robots.txt web/dist/

COPY --chown=app:app is-osm-uptodate.py ./
COPY --chown=app:app server/ server/

EXPOSE 8000/tcp

ARG SENTRY_DSN
ENV SENTRY_DSN=$SENTRY_DSN
ENV PYTHONPATH=__pypackages__/3.10/lib
ENV PATH=$PATH:__pypackages__/3.10/bin
CMD ["gunicorn", "is-osm-uptodate:webapp", "--bind", "0.0.0.0:8000", "--workers", "2", "--worker-class", "aiohttp.GunicornWebWorker", "--timeout", "300"]
