#!/bin/sh
set -e

COMMAND=${1:-web}

case "$COMMAND" in
  web)
    # @openpeeps/server: Express + Riddl API + serves the @openpeeps/web SPA
    # (WEB_DIST_PATH is baked into the image).
    exec node /apat/platform/server/dist/server.js
    ;;
  worker)
    # @openpeeps/server worker entrypoint: registers React email templates and
    # boots the BullMQ workers from @openpeeps/worker.
    exec node /apat/platform/server/dist/worker.js
    ;;
  *)
    # Escape hatch: run an arbitrary command in the container.
    shift
    exec "$COMMAND" "$@"
    ;;
esac
