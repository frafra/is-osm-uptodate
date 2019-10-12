FROM python:3.7-buster
LABEL maintainer="fraph24@gmail.com"

ADD . /src
RUN : && \
    apt-get update && \
    apt-get install -y \
        uwsgi \
        mime-support \
        libsqlite3-mod-spatialite \
        spatialite-bin \
        npm \
    && \
    pip3 install --requirement /src/requirements.txt && \
    cd /src/web && \
    npm ci && \
    :

EXPOSE 8000

CMD ["uwsgi", "--ini", "/src/uwsgi.ini", "--chdir", "/src", "--pythonpath", "/usr/local/lib/python3.7/site-packages"]
