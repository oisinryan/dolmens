#!/bin/sh
# Build the website and publish it to Cloudflare (a Workers static site) at dolmens.tirnarogue.com.
#   ./publish.sh            (from the site folder)
# On your own machine wrangler uses `npx wrangler login`. In a cloud Claude session it needs
# CLOUDFLARE_API_TOKEN in the cloud environment and api.cloudflare.com allowed on its network,
# as for the Gods and Fighting Men site. publish/ holds only generated pages and files.
set -e
cd "$(dirname "$0")"
if [ "$CLAUDE_CODE_REMOTE" = "true" ]; then
  if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "error: CLOUDFLARE_API_TOKEN isn't set in this cloud environment." >&2
    exit 1
  fi
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    https://api.cloudflare.com/client/v4/user/tokens/verify || true)
  if [ "$code" != "200" ]; then
    echo "error: api.cloudflare.com answered $code to the token check. Is the token right, and does the environment's network allow api.cloudflare.com?" >&2
    exit 1
  fi
  export WRANGLER_SEND_METRICS=false
fi
[ -d node_modules ] || npm ci --no-audit --no-fund
node build.mjs
npx --yes wrangler@latest deploy
