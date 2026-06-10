FROM realies/audiowaveform AS audiowaveform

#─────────────────────────────────────────────────────────────────────────────
# Build stage — installs all workspace deps, builds @openpeeps/server,
# @openpeeps/worker and @openpeeps/web (plus their workspace dependencies).
#─────────────────────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

ARG VERSION
ARG ENVIRONMENT

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
ENV VERSION=$VERSION
ENV ENVIRONMENT=$ENVIRONMENT

WORKDIR /apat

RUN npm i -g pnpm

COPY . .

RUN node scripts/generate-changelog.mjs

# Install workspace deps for the three runtime packages and all of their
# transitive workspace dependencies. The `...` suffix on each filter expands
# to "this package + everything it depends on".
RUN pnpm \
    --filter "@openpeeps/server..." \
    --filter "@openpeeps/worker..." \
    --filter "@openpeeps/web..." \
    install --frozen-lockfile

# Build the dependency closure in topological order. `pnpm -r` walks the
# workspace graph so libraries (common → core → react-ui → react → …) are
# built before the packages that consume them.
RUN pnpm -r \
    --filter "@openpeeps/server..." \
    --filter "@openpeeps/worker..." \
    --filter "@openpeeps/web..." \
    build

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
    tini \
    unzip

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

# Tell @openpeeps/server where to find the React SPA build at runtime.
# `start.sh` honours this when launching the `web` command.
ENV WEB_DIST_PATH=/apat/platform/web/dist

WORKDIR /apat

EXPOSE 8080

COPY --from=audiowaveform /usr/local/bin/audiowaveform /usr/local/bin/audiowaveform

# Bring across the entire built workspace. The build stage already pruned
# node_modules to the closure of server/worker/web via filtered installs.
COPY --from=builder /apat /apat

# Expose the @openpeeps/cli `opc` bin on PATH so operators can run admin
# commands (`opc db clear`, `opc accounts create`, …) from anywhere in the
# container. The script imports the compiled CLI via a relative path so it
# does not depend on `@openpeeps/cli` being resolvable from the cwd.
RUN ln -sf /apat/platform/cli/bin/opc.mjs /usr/local/bin/opc \
 && chmod +x /apat/platform/cli/bin/opc.mjs

RUN mkdir -p /apat/.media && mkdir -p /apat/.logs

VOLUME /apat/.media
VOLUME /apat/.logs

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/apat/docker/prod/start.sh"]

CMD ["web"]
