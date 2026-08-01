# Build context is the repo root (see deploy/docker-compose.yml's
# `build.context: ..`) - not this directory - because this image also needs
# src/data/shortLinkWords.js and deploy/migrations, both of which live
# outside server/. Keeping those as the single source of truth (shared with
# the frontend build / the docker-compose-mounted migrations dir) means the
# Docker build context can't be scoped to server/ alone.
FROM node:22-alpine
WORKDIR /app

# FONTS. node:22-alpine ships with NONE - `fc-list` returns 0 and there is no
# /usr/share/fonts at all. @napi-rs/canvas does not error when a font cannot be
# resolved; ctx.fillText simply draws nothing. Every og-image therefore rendered
# with its shapes, icons and colours intact and all of its TEXT missing, which
# looks like a layout bug rather than a missing dependency, and never reproduces
# locally because a dev machine has system fonts.
#
# fontconfig is what canvas asks for "sans-serif" through; font-dejavu is what
# answers. Both are needed - the config alone resolves nothing.
RUN apk add --no-cache fontconfig font-dejavu && fc-cache -f

COPY server/package.json server/package-lock.json* ./server/
RUN npm install --prefix server --omit=dev

COPY server/src ./server/src
COPY server/scripts ./server/scripts
COPY src/data/shortLinkWords.js ./src/data/shortLinkWords.js
# og-image rendering (server/src/lib/ogImageRender.js) needs the same gear/
# region data and icon assets the frontend build uses, so those come along
# too - see that file's ICONS_DIR/REGION_ICONS_DIR resolution.
#
# WARNING: these are copied file-by-file, so adding an import to anything
# under server/src/ that reaches a NEW file in src/ silently produces an image
# that crashes on boot with ERR_MODULE_NOT_FOUND - taking down every /api/*
# route, not just og-image. It builds and tests fine locally, where the whole
# repo is on disk. Whole directories are not copied instead because src/data
# pulls in the entire frontend data set (several MB of gear/ability tables)
# that this service has no use for.
#
# The blessings/leagueRelics/gearStats entries below are what the share-image
# renderer's blessing + league relic columns need; blessings.js re-exports from
# src/utils/gearStats.js, so that has to come along even though no server file
# imports it directly.
COPY src/data/gear.js ./src/data/gear.js
COPY src/data/regions.js ./src/data/regions.js
COPY src/data/blessings.js ./src/data/blessings.js
COPY src/data/leagueRelics.js ./src/data/leagueRelics.js
COPY src/data/blessingBuilds.js ./src/data/blessingBuilds.js
COPY src/data/aegisMultiplier.js ./src/data/aegisMultiplier.js
COPY src/data/tierListItems.js ./src/data/tierListItems.js
COPY src/utils/gearStats.js ./src/utils/gearStats.js
COPY src/utils/usageKeys.js ./src/utils/usageKeys.js
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
