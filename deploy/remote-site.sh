#!/usr/bin/env bash
# =====================================================================
#  Runs ON THE HOSTING over SSH (sent by the GitHub workflows).
#  Puts a site build into the document root without taking the site down:
#    1. new hashed assets are added (old ones stay for open pages)
#    2. pages, images and .htaccess are copied over
#    3. files that are not in the new build are removed
#  Paths cPanel or the API own are never touched:
#    api/ (Passenger .htaccess), uploads (image symlink), .well-known/ (SSL),
#    cgi-bin/
#  The last releases are kept in ~/rma-deploy/releases for a rollback.
#
#  deploy:   remote-site.sh deploy   <release-id> <tarball> <docroot> [keep]
#  rollback: remote-site.sh rollback <release-id|previous> - <docroot>
# =====================================================================
set -euo pipefail

ACTION="$1"
RELEASE="$2"
TARBALL="$3"
DOCROOT="$4"
KEEP="${5:-5}"

BASE="$HOME/rma-deploy"
RELEASES="$BASE/releases"
mkdir -p "$RELEASES"

case "$DOCROOT" in
  /*) ;;
  *) DOCROOT="$HOME/$DOCROOT" ;;
esac

if [ ! -d "$DOCROOT" ]; then
  echo "Document root $DOCROOT not found." >&2
  exit 1
fi

if [ "$ACTION" = "rollback" ]; then
  if [ "$RELEASE" = "previous" ]; then
    # Newest complete release that is not the live one
    CURRENT="$(cat "$BASE/current" 2>/dev/null || true)"
    RELEASE=""
    while IFS= read -r candidate; do
      [ "$candidate" != "$CURRENT" ] && [ -f "$RELEASES/$candidate/build.json" ] && { RELEASE="$candidate"; break; }
    done < <(ls -1t "$RELEASES")
  fi
  DIR="$RELEASES/$RELEASE"
  [ -n "$RELEASE" ] && [ -d "$DIR" ] || { echo "Release '$RELEASE' not found. Available:"; ls -1t "$RELEASES"; exit 1; }
else
  DIR="$RELEASES/$RELEASE"
  rm -rf "$DIR"
  mkdir -p "$DIR"
  tar -xzf "$TARBALL" -C "$DIR"
  rm -f "$TARBALL"
fi

# The release must be a complete build (an incomplete upload is removed, the live site stays)
for file in index.html build.json sitemap.xml robots.txt .htaccess; do
  if [ ! -f "$DIR/$file" ]; then
    echo "Release is incomplete: $file missing. The live site was not changed." >&2
    [ "$ACTION" = "deploy" ] && rm -rf "$DIR"
    exit 1
  fi
done

# Keep a copy of the live .htaccess (cPanel may have added lines to it)
[ -f "$DOCROOT/.htaccess" ] && cp -p "$DOCROOT/.htaccess" "$BASE/htaccess.before-$RELEASE"

PROTECT=(api uploads .well-known cgi-bin)

if command -v rsync >/dev/null 2>&1; then
  EXCLUDES=()
  for item in "${PROTECT[@]}"; do EXCLUDES+=("--exclude=/$item"); done

  [ -d "$DIR/assets" ] && rsync -a "$DIR/assets/" "$DOCROOT/assets/"
  rsync -a "${EXCLUDES[@]}" "$DIR/" "$DOCROOT/"
  rsync -a --delete "${EXCLUDES[@]}" "$DIR/" "$DOCROOT/"
else
  echo "rsync not found: copying with cp and removing stale files with find."
  [ -d "$DIR/assets" ] && mkdir -p "$DOCROOT/assets" && cp -a "$DIR/assets/." "$DOCROOT/assets/"
  cp -a "$DIR/." "$DOCROOT/"

  PRUNE=()
  for item in "${PROTECT[@]}"; do PRUNE+=(-path "./$item" -prune -o); done
  (cd "$DIR" && find . -type f | sort) > "$BASE/new-files.txt"
  (cd "$DOCROOT" && find . "${PRUNE[@]}" -type f -print | sort) > "$BASE/old-files.txt"
  comm -13 "$BASE/new-files.txt" "$BASE/old-files.txt" | while IFS= read -r stale; do
    rm -f "$DOCROOT/$stale"
  done
  (cd "$DOCROOT" && find . "${PRUNE[@]}" -type d -empty -exec rmdir {} + 2>/dev/null) || true
fi

echo "$RELEASE" > "$BASE/current"

# Keep the newest releases only
ls -1t "$RELEASES" | tail -n +"$((KEEP + 1))" | while IFS= read -r old; do
  [ "$old" = "$RELEASE" ] || rm -rf "${RELEASES:?}/$old"
done

echo "Release $RELEASE is live in $DOCROOT."
