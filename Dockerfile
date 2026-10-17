# syntax=docker/dockerfile:1

FROM realies/audiowaveform AS audiowaveform

#─────────────────────────────────────────────────────────────────────────────
# Build stage — installs all workspace deps, builds @openpeepshq/server,
# @openpeepshq/worker and @openpeepshq/web (plus their workspace dependencies).
#─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# VERSION and ENVIRONMENT are runtime-only inputs (core config reads
# process.env at startup; nothing in the build bakes them into artifacts).
# They live in the runtime stage (below), not here, so a per-commit VERSION
# (date–short_sha) cannot pin an ENV layer and bust the install/build cache.

# `git`            → consumed by scripts/generate-changelog.mjs
# `python3 make g++` → required to compile native node addons (bcrypt, sharp)
RUN apk add --no-cache \
    g++ \
    git \
    make \
    python3

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV NODE_ENV=production

WORKDIR /apat

RUN npm i -g pnpm

# Manifests only, so a source-only commit reuses the install layer from the
# registry build cache (mode=max). Per-package COPYs merge over these files
# and leave node_modules alone (.dockerignore excludes it from the context).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY --parents \
    libraries/*/package.json \
    platform/*/package.json \
    examples/*/package.json \
    docs-site/package.json \
    ./

# Install workspace deps for the three runtime packages and all of their
# transitive workspace dependencies. The `...` suffix on each filter expands
# to "this package + everything it depends on". `*plugins*` matches scanned
# plugins under `plugins/<namespace>/<name>` (package names like
# `@openpeepshq-plugins/*`); referenced example plugins (root package.json's
# `openpeeps.plugins`) live under `examples/*` and need their own filter or
# they're never installed/built, so `initializePlugins()` fails with
# "Cannot find module '.../dist/index.js'" the moment one is enabled.
# pnpm install layer: cached via registry BuildKit cache (mode=max).
# When the lockfile has not changed, this layer is CACHED and pnpm
# doesn't run. --prefer-offline reuses any packages from the local
# cache mount before downloading from the registry.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store \
    && pnpm \
    --filter "@openpeepshq/server..." \
    --filter "@openpeepshq/worker..." \
    --filter "@openpeepshq/web..." \
    --filter "*plugins*" \
    --filter "./examples/greeter-plugin" \
    install --frozen-lockfile --prefer-offline

# ─────────────────────────────────────────────────────────────
# Per-package builds in dependency order.
#
# Each COPY+RUN is its own Docker layer. Changing one package's source
# only invalidates that package's build layer *and* its dependents —
# everything else stays cached. With BuildKit registry caching (mode=max)
# in CI, each layer is cached independently, so small source changes only
# rebuild the affected subtree.
#
# CHANGELOG.md is pre-generated in CI (build.yaml: Generate changelog step)
# where .git is available. Inside Docker, .git is excluded via .dockerignore,
# so the committed CHANGELOG.md from the build context is used as-is.
#
# Dependency topology (top → bottom):
#   Level 0 (leaf):  common, fetch-client, geocoder, react-ui,
#                    greenscreen, i18n
#   Level 1:         client, core
#   Level 2:         react, mcp, worker, cli, greeter-plugin
#   Level 3:         server, web
# ─────────────────────────────────────────────────────────────

# Level 0: leaf packages (no workspace dependencies)
COPY platform/common platform/common
RUN pnpm --filter @openpeepshq/common build

COPY libraries/fetch-client libraries/fetch-client
RUN pnpm --filter @openpeepshq/fetch-client build

COPY libraries/geocoder libraries/geocoder
RUN pnpm --filter @openpeepshq/geocoder build

COPY libraries/react-ui libraries/react-ui
RUN pnpm --filter @openpeepshq/react-ui build

COPY libraries/greenscreen libraries/greenscreen
RUN pnpm --filter @openpeepshq/greenscreen build

COPY platform/i18n platform/i18n
RUN pnpm --filter @openpeepshq/i18n build

# Level 1: depend on Level 0
COPY platform/client platform/client
RUN pnpm --filter @openpeepshq/client build

COPY platform/core platform/core
RUN pnpm --filter @openpeepshq/core build

# Level 2: depend on Level 1
COPY platform/react platform/react
RUN pnpm --filter @openpeepshq/react build

COPY platform/mcp platform/mcp
RUN pnpm --filter @openpeepshq/mcp build

COPY platform/worker platform/worker
RUN pnpm --filter @openpeepshq/worker build

COPY platform/cli platform/cli
RUN pnpm --filter @openpeepshq/cli build

COPY examples/greeter-plugin examples/greeter-plugin
RUN pnpm --filter "./examples/greeter-plugin" build

# Level 3: depend on Level 2
COPY platform/server platform/server
RUN pnpm --filter @openpeepshq/server build

COPY platform/web platform/web
RUN pnpm --filter @openpeepshq/web build

# Only copy runtime files needed by the entrypoint/scripts — NOT source
# code (already copied per-package above) or docs/CI files. This avoids
# invalidating this layer on every source change, which would also
# bust the stage-2 COPY --from=builder layer (~37s rebuild on every push).
COPY docker/ docker/
RUN pnpm rebuild --filter @openpeepshq/cli --filter @openpeepshq/mcp

#─────────────────────────────────────────────────────────────────────────────
# Runtime stage — minimal Alpine + Node with only the binaries the running
# server / worker actually need (no build toolchain).
#─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine

ARG VERSION
ARG ENVIRONMENT

RUN apk add --no-cache \
    dumb-init \
    ffmpeg \
    git \
    libreoffice \
    tini \
    unzip

# pnpm retained for operator convenience (debugging workspace packages).
RUN npm i -g pnpm@10.11.0

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host
ENV HOST=0.0.0.0 PORT=8080 NODE_ENV=production BODY_SIZE_LIMIT=540e9 VERSION=$VERSION ENVIRONMENT=$ENVIRONMENT
# Disable Node's 5-minute server.requestTimeout so slow media uploads aren't
# cut off mid-transfer. Override at deploy time if you want a finite cap.
ENV REQUEST_TIMEOUT=0
# Generous headers/keep-alive windows for long-lived requests behind Traefik.
ENV HEADERS_TIMEOUT=120 KEEP_ALIVE_TIMEOUT=120

ENV MEDIA_STORAGE_PARAMS_PATH=/apat/.media
ENV LOGS_LOCAL_PATH=/apat/.logs

ENV DEBUG_COLORS=false DEBUG_HIDE_DATE=true DEBUG_DEPTH=20

# Tell @openpeepshq/server where to find the React SPA build at runtime.
# `start.sh` honours this when launching the `web` command.
ENV WEB_DIST_PATH=/apat/platform/web/dist

# Plugins are loaded from a volume-mounted directory at runtime, not baked into
# the image. Operators control which plugins are active by mounting the desired
# plugin tree to /apat/plugins. Keeping the mount inside /apat lets pnpm
# workspace symlinks resolve exactly as they do on the build host.
ENV PLUGINS_PATH=/apat/plugins

# Referenced example/demo plugins (e.g. `examples/*`) only load when listed in
# the root package.json's `openpeeps.plugins` array, so this must point at the
# baked-in root package.json to resolve those references.
ENV ROOT_PACKAGE_JSON_PATH=/apat/package.json

WORKDIR /apat

EXPOSE 8080

COPY --from=audiowaveform /usr/local/bin/audiowaveform /usr/local/bin/audiowaveform

# Bring across the entire built workspace. The build stage already pruned
# node_modules to the closure of server/worker/web via filtered installs.
COPY --from=builder /apat /apat

# Expose the @openpeepshq/cli `opc` bin on PATH so operators can run admin
# commands (`opc db clear`, `opc accounts create`, …) from anywhere in the
# container. The script imports the compiled CLI via a relative path so it
# does not depend on `@openpeepshq/cli` being resolvable from the cwd.
RUN ln -sf /apat/platform/cli/bin/opc.mjs /usr/local/bin/opc \
    && chmod +x /apat/platform/cli/bin/opc.mjs

RUN mkdir -p /apat/.media && mkdir -p /apat/.logs && mkdir -p /apat/plugins

VOLUME /apat/.media
VOLUME /apat/.logs

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/apat/docker/prod/start.sh"]

CMD ["web"]
