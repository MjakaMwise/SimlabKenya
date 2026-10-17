#!/usr/bin/env bash
# Run on the VPS from the repo root: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Missing .env — copy .env.example to .env and fill it in."; exit 1; }

git pull --ff-only
docker compose build

# Team Desk push notifications: create the VAPID key pair once. Existing keys are never replaced,
# because that would drop every registered device.
env_get() { grep -m1 "^$1=" .env | cut -d= -f2- || true; }
if [ -z "$(env_get VAPID_PUBLIC_KEY)" ] || [ -z "$(env_get VAPID_PRIVATE_KEY)" ]; then
  json="$(docker compose run --rm -T --no-deps api npx web-push generate-vapid-keys --json 2>/dev/null || true)"
  pub="$(printf '%s' "$json" | sed -n 's/.*"publicKey" *: *"\([^"]*\)".*/\1/p' | head -1)"
  priv="$(printf '%s' "$json" | sed -n 's/.*"privateKey" *: *"\([^"]*\)".*/\1/p' | head -1)"
  if [ -n "$pub" ] && [ -n "$priv" ]; then
    sed -i '/^VAPID_PUBLIC_KEY=/d;/^VAPID_PRIVATE_KEY=/d' .env
    printf 'VAPID_PUBLIC_KEY=%s\nVAPID_PRIVATE_KEY=%s\n' "$pub" "$priv" >> .env
    grep -q '^VAPID_SUBJECT=.\+' .env || { sed -i '/^VAPID_SUBJECT=/d' .env; echo "VAPID_SUBJECT=mailto:$(env_get ADMIN_EMAIL)" >> .env; }
    echo "Generated VAPID keys for push notifications."
  else
    echo "Could not generate VAPID keys; Team Desk will work without phone notifications."
  fi
fi

docker compose up -d --remove-orphans
docker image prune -f >/dev/null
docker compose ps
