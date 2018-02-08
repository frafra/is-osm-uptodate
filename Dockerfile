FROM fedora
LABEL maintainer="fraph24@gmail.com"

RUN dnf -y update && dnf clean all
RUN dnf -y install uwsgi-plugin-python3 mailcap spatialite-tools && dnf clean all

ADD . /src

RUN echo -e '#!/bin/sh\nexport PYTHONPATH="/usr/local/lib/python3.6/site-packages"\nuwsgi --ini /src/uwsgi.ini --chdir /src' > /src/run.sh; chmod +x /src/run.sh; pip3 install --requirement /src/requirements.txt

EXPOSE 8000

CMD ["/bin/sh", "/src/run.sh"]
