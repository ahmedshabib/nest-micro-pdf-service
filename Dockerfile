FROM buildkite/puppeteer
RUN npm install
RUN nest build
CMD exec npm run start:prod