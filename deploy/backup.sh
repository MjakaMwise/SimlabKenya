#!/usr/bin/env bash
# Daily backup of Postgres and the uploads volume (abstract files, shop pictures), keeps the newest 14 of each. Cron example (as the deploy user):
#   0 2 * * * /home/deploy/SimlabKenya/deploy/backup.sh >> /home/deploy/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
# Read only what we need: .env holds values that are not safe to `source`.
env_get() { grep -m1 "^$1=" .env | cut -d= -f2-; }
POSTGRES_USER="$(env_get POSTGRES_USER)"; POSTGRES_DB="$(env_get POSTGRES_DB)"

DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$DIR"
FILE="$DIR/simlab-$(date +%Y%m%d-%H%M%S).sql.gz"

docker compose exec -T db pg_dump -U "${POSTGRES_USER:-simlab}" "${POSTGRES_DB:-simlab}" | gzip > "$FILE"
ls -1t "$DIR"/simlab-*.sql.gz | tail -n +15 | xargs -r rm --
echo "Backup written: $FILE"

# Uploads live in the api container's volume; archive them from there.
UPLOADS="$DIR/uploads-$(date +%Y%m%d-%H%M%S).tar.gz"
docker compose exec -T api tar -C /data -czf - uploads > "$UPLOADS"
ls -1t "$DIR"/uploads-*.tar.gz | tail -n +15 | xargs -r rm --
echo "Backup written: $UPLOADS"
