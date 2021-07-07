#!/bin/bash -ex

COMMIT=$(git rev-parse --short HEAD)

APP="is-osm-uptodate"
DOCKER_APP="$APP:$COMMIT"

# Build Docker images
docker build -t $DOCKER_APP .

# Run
docker run --rm --publish 8000:8000 --name $APP $DOCKER_APP
