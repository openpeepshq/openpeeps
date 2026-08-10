#!/bin/sh
set -e

# Prefer OPENPEEPS_COMMAND so Forgejo/GitHub Actions service containers can
# run as worker without a custom command (services often cannot override CMD).
COMMAND=${OPENPEEPS_COMMAND:-${1:-web}}

case "$COMMAND" in
  web)
    # @openpeepshq/server: Express + Riddl API + serves the @openpeepshq/web SPA
    # (WEB_DIST_PATH is baked into the image).
    exec node /apat/platform/server/dist/server.js
    ;;
  worker)
    # @openpeepshq/server worker entrypoint: registers React email templates and
    # boots the BullMQ workers from @openpeepshq/worker.
    exec node /apat/platform/server/dist/worker.js
    ;;
  migrate)
    exec node /apat/platform/core/dist/db/bootMigrate.js
    ;;
  *)
    # Escape hatch: run an arbitrary command in the container.
    shift
    exec "$COMMAND" "$@"
    ;;
esac
