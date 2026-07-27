# Build context is the repo root (see deploy/docker-compose.yml's
# `build.context: ..`) - not this directory - because this image also needs
# src/data/shortLinkWords.js, which lives outside server/. Keeping that file
# as the single source of truth (shared with the frontend build) means the
# Docker build context can't be scoped to server/ alone.
FROM node:22-alpine
WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
RUN npm install --prefix server --omit=dev

COPY server/src ./server/src
COPY server/scripts ./server/scripts
COPY src/data/shortLinkWords.js ./src/data/shortLinkWords.js

WORKDIR /app/server
EXPOSE 3000
CMD ["node", "src/index.js"]
