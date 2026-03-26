#!/bin/sh

LAST_HASH=$(cat .source_hash.asc 2>&1)
CURRENT_HASH=$(tar cf - src static node_modules | sha256sum | awk '{print $1}')

echo "$LAST_HASH"
echo "$CURRENT_HASH"

if [ "$LAST_HASH" != "$CURRENT_HASH" ]; then
  npm run build
  echo "$CURRENT_HASH" > .source_hash.asc
else
  echo "No build necessary"
fi