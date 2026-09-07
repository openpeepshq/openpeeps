# Dedicated one-shot Arango → Postgres cutover image.
# Not the OpenPeeps runtime; do not use as APAT_CHANNEL.
# Build from repo root:
#   docker build -f archive/arango-migrate/Dockerfile -t openpeeps-arango-migrate .
FROM node:24-alpine AS builder

RUN apk add --no-cache g++ git make python3

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production

WORKDIR /src
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY . .
RUN pnpm --filter "@openpeepshq/arango-migrate..." install --frozen-lockfile
RUN pnpm -r --filter "@openpeepshq/arango-migrate..." build

FROM node:24-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV MIGRATION_EXPORT_DIR=/export

WORKDIR /src
COPY --from=builder /src /src

ENTRYPOINT ["node", "/src/archive/arango-migrate/dist/cli.js"]
