# Build context is the repo root (see deploy/docker-compose.yml's
# `build.context: ..`) - not this directory - because this image also needs
# src/data/shortLinkWords.js and deploy/migrations, both of which live
# outside server/. Keeping those as the single source of truth (shared with
# the frontend build / the docker-compose-mounted migrations dir) means the
# Docker build context can't be scoped to server/ alone.
FROM node:22-alpine
WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
RUN npm install --prefix server --omit=dev

COPY server/src ./server/src
COPY server/scripts ./server/scripts
COPY src/data/shortLinkWords.js ./src/data/shortLinkWords.js
# scripts/migrate.js resolves this relative to itself (../../deploy/migrations) -
# see server/scripts/migrate.js.
COPY deploy/migrations ./deploy/migrations

WORKDIR /app/server
EXPOSE 3000
CMD ["node", "src/index.js"]
