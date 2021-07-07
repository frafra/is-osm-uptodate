FROM python:3.9.6-buster AS apt
LABEL maintainer="fraph24@gmail.com"
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update
WORKDIR /home/app

RUN apt-get -qq install firefox-esr xvfb
COPY requirements.txt .
RUN pip3 install --requirement requirements.txt && \
    seleniumbase install geckodriver
COPY test_api.py test_webapp.py common.py ./
ENV DISPLAY=:99

CMD ["pytest", "--browser=firefox", "--save_screenshot"]
