FROM node:lts

# Set CI to true & LANG
ENV CI=1
ENV LANG en_US.UTF-8

# Install the desired version of @ionic/cli
ARG IONIC_CLI_VERSION

RUN npm i -g @ionic/cli@${IONIC_CLI_VERSION} && \
  ionic --no-interactive config set -g daemon.updates false && \
  ionic --no-interactive config set -g telemetry false

WORKDIR /usr/src/app