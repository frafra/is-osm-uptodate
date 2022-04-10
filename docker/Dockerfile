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
RUN npm run build

FROM apt AS base
RUN --mount=type=cache,sharing=locked,target=/var/cache/apt \
    apt-get -qy install libyajl-dev && \
    useradd --user-group --system --no-create-home --no-log-init app && \
    chown -R app:app .
COPY --chown=app:app pyproject.toml pdm.lock ./
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/root/.cache/pdm \
    pip3 install pdm && \
    pdm install --production --no-self

COPY --from=builder /home/app/web/dist/ web/dist/
COPY web/dist/index.html web/dist/

COPY uwsgi.ini is-osm-uptodate.py ./

EXPOSE 8000/tcp

USER app
CMD ["pdm", "run", "web"]
