FROM python:3.10-bullseye AS apt
LABEL maintainer="fraph24@gmail.com"
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update
WORKDIR /app

RUN --mount=type=cache,sharing=locked,target=/var/cache/apt \
    apt-get -qy install firefox-esr xvfb
COPY pyproject.toml pdm.lock ./
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=cache,target=/root/.cache/pdm \
    pip3 install pdm && \
    pdm install --no-default -G test && \
    pdm run seleniumbase install geckodriver
COPY tests/test_api.py tests/test_webapp.py tests/common.py tests/
ENV DISPLAY=:99

CMD ["pdm", "run", "test"]
