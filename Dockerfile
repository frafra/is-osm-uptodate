FROM python:3.9.1-buster AS apt
LABEL maintainer="fraph24@gmail.com"
RUN apt-get update
WORKDIR /home/app

FROM apt AS builder
ADD . .
RUN apt-get install -y npm && \
    cd web && \
    npm ci

FROM apt AS base
COPY --from=builder /home/app .
RUN useradd --user-group --system --no-create-home --no-log-init app && \
    chown -R app:app . && \
    pip3 install --requirement requirements.txt && \
    apt-get install -y \
        uwsgi \
        mime-support \
        libsqlite3-mod-spatialite \
        spatialite-bin

FROM base AS tester
WORKDIR /home/app/tests
RUN pip3 install --requirement requirements.txt && \
    apt-get install -y firefox-esr xvfb && \
    seleniumbase install geckodriver
USER app
CMD ["pytest", "--browser=firefox", "--save_screenshot"]

FROM base AS runner
ENV DISPLAY=:99
USER app
EXPOSE 8000/tcp
CMD ["uwsgi", "--ini", "uwsgi.ini"]
