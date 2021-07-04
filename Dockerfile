FROM python:3.9.6-buster AS apt
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
RUN apt-get -qq install uwsgi libyajl-dev && \
    useradd --user-group --system --no-create-home --no-log-init app && \
    chown -R app:app .
COPY requirements.txt .
RUN pip3 install --requirement requirements.txt

ARG test
ENV test=${test}
RUN if [ -n "$test" ]; then apt-get -qq install firefox-esr xvfb ; fi
COPY tests/requirements.txt tests/
RUN if [ -n "$test" ]; then cd tests && \
    pip3 install --requirement requirements.txt ; \
    seleniumbase install geckodriver ; \
    fi
COPY tests/test_api.py tests/test_webapp.py tests/
RUN if [ -n "$test" ]; then chown app:app -R tests/ ; fi
COPY tests/test_api.py tests/test_webapp.py tests/__init__.py tests/
ENV DISPLAY=:99

COPY --from=builder /home/app/web web/
COPY uwsgi.ini is-osm-uptodate.py ./
COPY web web

EXPOSE 8000/tcp

USER app
CMD ["uwsgi", "--ini", "uwsgi.ini"]
