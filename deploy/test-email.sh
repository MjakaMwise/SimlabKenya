#!/usr/bin/env bash
# Check that the server can send email.
#   ./deploy/test-email.sh                 verify the Gmail login only
#   ./deploy/test-email.sh you@example.com verify AND send a real test message to that address
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "No .env here — run from the deployed repo." >&2; exit 1; }
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo docker"
$DOCKER compose run --rm --build -T -e TEST_EMAIL_TO="${1:-}" api npx tsx server/scripts/test-email.ts
