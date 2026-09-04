#!/usr/bin/env bash
#
# Static export build for GitHub Pages.
#
# Next's `output: export` errors on features that need a server: route handlers
# (src/app/api), the i18n proxy (src/proxy.ts), and ISR (`export const
# revalidate`). None of those work on Pages, but we keep them in the repo for a
# future server deploy. So this script *temporarily* moves/neutralizes them,
# runs the export, then ALWAYS restores the tree (trap on EXIT) — even if the
# build fails. Nothing here is a permanent edit.
#
# Run via `pnpm build:static` (which sets STATIC_EXPORT=1).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STASH=".static-build-stash"
REDIRECT_LOCALE="it"   # routing.defaultLocale

# Files that must leave the tree during export (server-only).
# /admin stays in: it's entirely client-side now (AdminGate + fetches against
# the Cloud Functions API), so it exports fine and ships with the site.
API_DIR="src/app/api"
PROXY="src/proxy.ts"

# Pages carrying `export const revalidate = …` (ISR → unsupported in export).
# Discovered at runtime so new pages are covered automatically.
revalidate_files() {
  grep -rl --include="*.tsx" --include="*.ts" \
    -e "export const revalidate" src/app 2>/dev/null || true
}

restore() {
  # Bring server-only files back.
  if [ -d "$STASH/api" ]; then
    rm -rf "$API_DIR"
    mv "$STASH/api" "$API_DIR"
  fi
  if [ -f "$STASH/proxy.ts" ]; then
    mv "$STASH/proxy.ts" "$PROXY"
  fi
  # Un-comment the revalidate lines we neutralized.
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    # Reverse marker → original.
    perl -i -pe 's{^// STATIC_EXPORT_DISABLED: }{}g' "$f"
  done < <(printf '%s\n' "${REVALIDATE_FILES:-}")
  rmdir "$STASH" 2>/dev/null || true
  echo "↺ working tree restored"
}
trap restore EXIT

# Start from a clean build. Next reuses prerendered pages from .next, and
# published content is fetched during that prerender — so a stale cache can
# silently ship yesterday's Firestore data (or the seed) even though the build
# "succeeded". CI is always clean; this makes local builds match it.
rm -rf .next

echo "→ static export: stashing server-only files"
mkdir -p "$STASH"

[ -d "$API_DIR" ] && mv "$API_DIR" "$STASH/api"
[ -f "$PROXY" ] && mv "$PROXY" "$STASH/proxy.ts"

# Neutralize ISR by commenting out the export with a reversible marker.
REVALIDATE_FILES="$(revalidate_files)"
export REVALIDATE_FILES
while IFS= read -r f; do
  [ -n "$f" ] || continue
  perl -i -pe 's{^(export const revalidate)}{// STATIC_EXPORT_DISABLED: $1}g' "$f"
done < <(printf '%s\n' "$REVALIDATE_FILES")

echo "→ next build (STATIC_EXPORT=1)"
STATIC_EXPORT=1 next build

# proxy.ts gone → `/` is not generated. Write a static redirect to /it/.
echo "→ writing out/index.html redirect → /$REDIRECT_LOCALE/"
cat > out/index.html <<HTML
<!doctype html>
<html lang="$REDIRECT_LOCALE">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=/$REDIRECT_LOCALE/" />
    <link rel="canonical" href="/$REDIRECT_LOCALE/" />
    <title>DevFest Milano 2026</title>
    <script>location.replace("/$REDIRECT_LOCALE/");</script>
  </head>
  <body>
    <a href="/$REDIRECT_LOCALE/">DevFest Milano 2026 →</a>
  </body>
</html>
HTML

# Pages does no Jekyll processing; keep _next assets servable.
touch out/.nojekyll

echo "✓ static export ready in ./out"
