FROM node:16

MAINTAINER Ahmed Shabib "ahmed@shipthis.co"
RUN  apt-get update \
     && apt-get install -y wget gnupg ca-certificates \
     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     && apt-get install -y google-chrome-stable fonts-kacst fonts-freefont-ttf \
      --no-install-recommends \
     && rm -rf /var/lib/apt/lists/* \
     && wget --quiet https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh -O /usr/sbin/wait-for-it.sh \
     && chmod +x /usr/sbin/wait-for-it.sh
COPY . /app
WORKDIR /app
# RUN rm -rf package-lock.json
RUN npm install  --legacy-peer-deps
RUN npm install -g @nestjs/cli
RUN npm run build
RUN export NODE_TLS_REJECT_UNAUTHORIZED=0
CMD node dist/main.js