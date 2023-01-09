FROM bloodred17/track-cargo

MAINTAINER Ahmed Shabib "ahmed@shipthis.co"
COPY . /app
WORKDIR /app
# RUN rm -rf package-lock.json
RUN npm install  --legacy-peer-deps
RUN npm install -g @nestjs/cli
RUN npm run build
RUN export NODE_TLS_REJECT_UNAUTHORIZED=0
CMD dist/main.js