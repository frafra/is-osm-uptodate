FROM python:3.9.7-bullseye AS apt
LABEL maintainer="fraph24@gmail.com"
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update
WORKDIR /home/app

FROM apt AS builder
RUN apt-get -qq install npm
WORKDIR /home/app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/webpack.config.js ./
COPY web/src/geojson.js web/src/map.css src/
RUN npm run build

FROM apt AS base
RUN apt-get -qq install libyajl-dev && \
    useradd --user-group --system --no-create-home --no-log-init app && \
    chown -R app:app .
COPY --chown=app:app pyproject.toml pdm.lock ./
RUN pip3 install pdm && \
    pdm install --production --no-self && \
    chmod +x $(pdm info --packages)/bin/*

COPY --from=builder /home/app/web/dist/ web/dist/
COPY web/dist/index.html web/dist/

# sed -nr 's;.*="(node_modules/[^"]+)".*;\1;p' <web/dist/index.html | xargs -I% echo COPY --from=builder /home/app/web/% web/%
COPY --from=builder /home/app/web/node_modules/leaflet/dist/leaflet.css web/node_modules/leaflet/dist/leaflet.css
COPY --from=builder /home/app/web/node_modules/leaflet.markercluster/dist/MarkerCluster.css web/node_modules/leaflet.markercluster/dist/MarkerCluster.css
COPY --from=builder /home/app/web/node_modules/bootstrap/dist/css/bootstrap.min.css web/node_modules/bootstrap/dist/css/bootstrap.min.css
COPY --from=builder /home/app/web/node_modules/leaflet-geosearch/dist/geosearch.css web/node_modules/leaflet-geosearch/dist/geosearch.css
COPY --from=builder /home/app/web/node_modules/@fortawesome/fontawesome-free/js/all.js web/node_modules/@fortawesome/fontawesome-free/js/all.js
COPY --from=builder /home/app/web/node_modules/leaflet/dist/leaflet.js web/node_modules/leaflet/dist/leaflet.js
COPY --from=builder /home/app/web/node_modules/leaflet.markercluster/dist/leaflet.markercluster.js web/node_modules/leaflet.markercluster/dist/leaflet.markercluster.js
COPY --from=builder /home/app/web/node_modules/leaflet-hash/leaflet-hash.js web/node_modules/leaflet-hash/leaflet-hash.js
COPY --from=builder /home/app/web/node_modules/bootstrap/dist/js/bootstrap.bundle.min.js web/node_modules/bootstrap/dist/js/bootstrap.bundle.min.js
COPY --from=builder /home/app/web/node_modules/leaflet-geosearch/dist/bundle.min.js web/node_modules/leaflet-geosearch/dist/bundle.min.js
COPY --from=builder /home/app/web/node_modules/d3-color/dist/d3-color.min.js web/node_modules/d3-color/dist/d3-color.min.js
COPY --from=builder /home/app/web/node_modules/d3-interpolate/dist/d3-interpolate.min.js web/node_modules/d3-interpolate/dist/d3-interpolate.min.js
COPY --from=builder /home/app/web/node_modules/d3-scale-chromatic/dist/d3-scale-chromatic.min.js web/node_modules/d3-scale-chromatic/dist/d3-scale-chromatic.min.js

COPY uwsgi.ini is-osm-uptodate.py ./

EXPOSE 8000/tcp

USER app
CMD ["pdm", "run", "web"]
