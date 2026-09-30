#!/bin/sh
set -e

hash_file="node_modules/.package-lock.hash"

if [ ! -f "$hash_file" ] || ! cmp -s package-lock.json "$hash_file"; then
  echo "Dependencies changed. Running npm ci."
  npm ci
  cp package-lock.json "$hash_file"
fi

exec "$@"
