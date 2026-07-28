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
# og-image rendering (server/src/lib/ogImageRender.js) needs the same gear/
# region data and icon assets the frontend build uses, so those come along
# too - see that file's ICONS_DIR/REGION_ICONS_DIR resolution.
COPY src/data/gear.js ./src/data/gear.js
COPY src/data/regions.js ./src/data/regions.js
COPY public/icons ./public/icons
# routes/shareLinkPage.js injects a per-build og:image tag into this same
# HTML the frontend container serves, rather than proxying to it at request
# time - see that file for why. Built by the "Pull latest code and build
# frontend" step before this image is (re)built, so it's always fresh; see
# docs/deployment.md step 7/10.
COPY dist/index.html ./dist/index.html
# scripts/migrate.js resolves this relative to itself (../../deploy/migrations) -
# see server/scripts/migrate.js.
COPY deploy/migrations ./deploy/migrations

WORKDIR /app/server
EXPOSE 3000
CMD ["node", "src/index.js"]
