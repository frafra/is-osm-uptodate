FROM python:3.10.0-buster AS apt
LABEL maintainer="fraph24@gmail.com"
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update
WORKDIR /home/app

FROM apt AS builder
RUN apt-get  -qq install npm
COPY web/package.json web/package-lock.json web/
RUN cd web && \
    npm ci

FROM apt AS base
RUN apt-get -qq install libyajl-dev && \
    useradd --user-group --system --no-create-home --no-log-init app && \
    chown -R app:app .
COPY --chown=app:app pyproject.toml pdm.lock ./
RUN pip3 install pdm && \
    pdm install --production --no-self && \
    chmod +x $(pdm info --packages)/bin/*

COPY --from=builder /home/app/web web/
COPY uwsgi.ini is-osm-uptodate.py ./
COPY web web

EXPOSE 8000/tcp

USER app
CMD ["pdm", "run", "web"]
