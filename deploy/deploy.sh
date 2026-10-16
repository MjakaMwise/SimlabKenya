#!/usr/bin/env bash
# Run on the VPS from the repo root: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Missing .env — copy .env.example to .env and fill it in."; exit 1; }

git pull --ff-only
docker compose build
docker compose up -d --remove-orphans
docker image prune -f >/dev/null
docker compose ps
