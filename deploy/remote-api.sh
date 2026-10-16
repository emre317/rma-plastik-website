#!/usr/bin/env bash
# =====================================================================
#  Runs ON THE HOSTING over SSH (sent by deploy-api.yml).
#  Updates the API code of the cPanel Node.js app and restarts it:
#    <APP_DIR>/server/...            the API (application root in cPanel)
#    <APP_DIR>/client/src/data/...   built-in data the API imports
#    <APP_DIR>/client/src/i18n/...   locale texts the API imports
#  Never touched: server/.env, server/node_modules, server/uploads, tmp, logs.
#  The previous code is kept in ~/rma-deploy/api-releases for a rollback.
#
#  remote-api.sh <release-id> <tarball> <app-dir> <nodevenv-activate>
# =====================================================================
set -euo pipefail

RELEASE="$1"
TARBALL="$2"
APP_DIR="$3"
ACTIVATE="$4"

case "$APP_DIR" in /*) ;; *) APP_DIR="$HOME/$APP_DIR" ;; esac
case "$ACTIVATE" in /*) ;; *) ACTIVATE="$HOME/$ACTIVATE" ;; esac

BASE="$HOME/rma-deploy/api-releases"
mkdir -p "$BASE" "$APP_DIR"

DIR="$BASE/$RELEASE"
rm -rf "$DIR"
mkdir -p "$DIR"
tar -xzf "$TARBALL" -C "$DIR"
rm -f "$TARBALL"

[ -f "$DIR/server/passenger.cjs" ] && [ -f "$DIR/server/package-lock.json" ] || { echo "Incomplete API release." >&2; exit 1; }

# Copy of the code that runs now, for a rollback
if [ -d "$APP_DIR/server" ]; then
  tar -czf "$BASE/before-$RELEASE.tar.gz" -C "$APP_DIR" \
    --exclude=server/node_modules --exclude=server/uploads --exclude=server/.env --exclude=server/tmp --exclude=server/logs \
    server client 2>/dev/null || true
fi

KEEP=(--exclude=/server/node_modules --exclude=/server/uploads --exclude=/server/.env --exclude=/server/tmp --exclude=/server/logs --exclude=/server/*.log)

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "${KEEP[@]}" "$DIR/" "$APP_DIR/"
else
  cp -a "$DIR/." "$APP_DIR/"
fi

if [ -f "$ACTIVATE" ]; then
  # shellcheck disable=SC1090
  source "$ACTIVATE"
else
  echo "Node.js environment $ACTIVATE not found (cPanel > Setup Node.js App shows the path)." >&2
  exit 1
fi

cd "$APP_DIR/server"
node --version
npm ci --omit=dev --no-audit --no-fund

# Passenger restarts the app on the next request
mkdir -p tmp
touch tmp/restart.txt

ls -1t "$BASE" | tail -n +11 | while IFS= read -r old; do rm -rf "${BASE:?}/$old"; done
echo "API release $RELEASE installed in $APP_DIR."
