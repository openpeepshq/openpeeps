FROM realies/audiowaveform AS audiowaveform

FROM node:24-alpine

ARG VERSION
ARG ENVIRONMENT

RUN apk add --no-cache \
    dumb-init \
    ffmpeg \
    python3 \
    git

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV PROTOCOL_HEADER=x-forwarded-proto HOST_HEADER=x-forwarded-host
ENV HOST=0.0.0.0 PORT=8080 NODE_ENV=production BODY_SIZE_LIMIT=540e9 VERSION=$VERSION ENVIRONMENT=$ENVIRONMENT

ENV MEDIA_STORAGE_PARAMS_PATH=/apat/.media
ENV LOGS_LOCAL_PATH=/apat/.logs

ENV DEBUG_COLORS=false DEBUG_HIDE_DATE=true DEBUG_DEPTH=20

WORKDIR /apat

EXPOSE 8080

COPY --from=audiowaveform /usr/local/bin/audiowaveform /usr/local/bin/audiowaveform

ADD . .

RUN corepack enable
RUN node scripts/generate-changelog.mjs
RUN (cp ./CHANGELOG.md platform/app/src/routes/docs/admin/release-notes/+page.svx )
RUN pnpm --filter @openpeeps/app... install

RUN pnpm --filter @openpeeps/app... build

RUN (mkdir -p /apat/.media && mkdir -p /apat/.logs)

VOLUME /apat/.media
VOLUME /apat/.logs

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/apat/docker/prod/start.sh"]

CMD ["web"]
