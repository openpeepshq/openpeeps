#!/bin/sh

COMMAND=$1

if [ "$COMMAND" == "web" ]; then
  (cd /apat/platform/app && node server.js)
elif [ "$COMMAND" == "worker" ]; then
  (cd /apat/platform/app && node worker.js)
else
  shift
  $COMMAND $@
fi