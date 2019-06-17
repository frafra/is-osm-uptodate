FROM python:3.7
LABEL maintainer="fraph24@gmail.com"

ADD requirements.txt /src/requirements.txt
RUN : && \
    apt-get update && \
    apt-get install -y \
        uwsgi \
        mime-support \
        libsqlite3-mod-spatialite \
        spatialite-bin \
    && \
    pip3 install --requirement /src/requirements.txt && \
    :
ADD . /src

EXPOSE 8000

CMD ["uwsgi", "--ini", "/src/uwsgi.ini", "--chdir", "/src", "--pythonpath", "/usr/local/lib/python3.7/site-packages"]
