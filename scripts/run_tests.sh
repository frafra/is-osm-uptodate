#!/bin/bash -ex

COMMIT=$(git rev-parse --short HEAD)

APP="is-osm-uptodate"
TESTER="$APP-tester"

DOCKER_APP="$APP:$COMMIT"
DOCKER_TESTER="$TESTER:$COMMIT"
NETWORK="is-osm-uptodate-$COMMIT"

# Cleanup
clean_up () {
    {
        docker container stop $TESTER
        docker container stop $APP
        docker container rm $TESTER
        docker container rm $APP
        docker network rm $NETWORK
    } &>/dev/null || true
}
trap clean_up TERM EXIT
clean_up

# Build Docker images
docker build -t $DOCKER_APP .
docker build -t $DOCKER_TESTER -f tests/Dockerfile .

# Setup the network
docker network create $NETWORK

# Run
docker run --network $NETWORK --name $APP -d $DOCKER_APP
set +e
docker run --network $NETWORK --name $TESTER -e URL="http://$APP:8000" $DOCKER_TESTER
exitcode="$?"
set -e

# Copy tester logs
docker cp $TESTER:/home/app/latest_logs latest_logs || true

# Copy app logs
docker logs $APP

exit $exitcode
