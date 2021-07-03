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
RUN apt-get -qq install \
        uwsgi \
        mime-support && \
    useradd --user-group --system --no-create-home --no-log-init app && \
    chown -R app:app .
COPY requirements.txt .
RUN pip3 install --requirement requirements.txt

COPY tests/ tests
ARG test
ENV test=${test}
RUN if [ -n "$test" ]; then cd tests && \
    pip3 install --requirement requirements.txt && \
    apt-get -qq install firefox-esr xvfb && \
    seleniumbase install geckodriver && \
    chown app:app -R . ; \
    fi
ENV DISPLAY=:99

COPY --from=builder /home/app/web web/
COPY uwsgi.ini is-osm-uptodate.py ./
COPY web web

EXPOSE 8000/tcp

USER app
CMD ["uwsgi", "--ini", "uwsgi.ini"]
