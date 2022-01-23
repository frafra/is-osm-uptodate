FROM python:3.9.10-bullseye AS apt
LABEL maintainer="fraph24@gmail.com"
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update
WORKDIR /home/app

RUN apt-get -qq install firefox-esr xvfb
COPY pyproject.toml pdm.lock ./
RUN pip3 install pdm && \
    pdm install --no-default -G test && \
    pdm run seleniumbase install geckodriver
COPY tests/test_api.py tests/test_webapp.py tests/common.py tests/
ENV DISPLAY=:99

CMD ["pdm", "run", "test"]
