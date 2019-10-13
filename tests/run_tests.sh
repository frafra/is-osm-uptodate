#!/bin/bash

set -xe

cd "$(dirname "$0")"

python3 -m venv venv
source venv/bin/activate

pip install -r ../requirements.txt
pip install -r requirements.txt

if ! command -v firefox; then
  pip install mozdownload
  curl $(mozdownload --version=latest-esr --print-url |&
         sed -nr 's/^INFO \| (.*)$/\1/p') | tar xjf -
  export PATH="$PATH:$PWD/firefox"
fi
if ! command -v geckodriver; then
  seleniumbase install geckodriver
fi

cleanup() {
    kill -- -$$
}

(cd .. && uwsgi --ini uwsgi.ini) &
trap cleanup 0

pytest --browser=firefox --save_screenshot $@
