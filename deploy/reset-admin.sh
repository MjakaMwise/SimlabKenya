#!/usr/bin/env bash
# Reset admin credentials (or create/delete/list admins) on the running VPS stack.
#
#   ./deploy/reset-admin.sh                       interactive: pick the admin, set a new password
#   ./deploy/reset-admin.sh --list                show admin accounts
#   ./deploy/reset-admin.sh --email a@b.c         reset/create this admin (prompts for the password)
#   ./deploy/reset-admin.sh --email a@b.c --generate   set a random password and print it once
#   ./deploy/reset-admin.sh --revoke-all          sign every admin out everywhere (no password change)
#   ./deploy/reset-admin.sh --delete a@b.c        delete an admin (refuses to delete the last one)
#   add --yes to skip confirmation; non-interactive password: ADMIN_PASSWORD='...' ./deploy/reset-admin.sh --email ...
#
# Resetting a password also discards that admin's pending login codes and signs them out on all devices.
# Creating an account with a new --email adds a new admin; the old one is not changed.
set -Eeuo pipefail
cd "$(dirname "$0")/.."

LIST=0; REVOKE=0; GEN=0; YES=0; EMAIL=""; DELETE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --list) LIST=1 ;;
    --revoke-all) REVOKE=1 ;;
    --generate) GEN=1 ;;
    --yes) YES=1 ;;
    --email) EMAIL="${2:-}"; shift ;;
    --delete) DELETE="${2:-}"; shift ;;
    -h|--help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)"; exit 2 ;;
  esac
  shift
done

die() { echo "✖ $*" >&2; exit 1; }
[ -f .env ] || die "No .env here — run this from the deployed repo (after ./start-setup.sh)."

DOCKER="docker"
docker info >/dev/null 2>&1 || { DOCKER="sudo docker"; $DOCKER info >/dev/null 2>&1 || die "Cannot reach Docker."; }
dc() { $DOCKER compose "$@"; }
env_get() { grep -m1 "^$1=" .env | cut -d= -f2- || true; }
PGUSER_="$(env_get POSTGRES_USER)"; PGUSER_="${PGUSER_:-simlab}"
PGDB_="$(env_get POSTGRES_DB)";     PGDB_="${PGDB_:-simlab}"
psql_db() { dc exec -T db psql -v ON_ERROR_STOP=1 -q -U "$PGUSER_" -d "$PGDB_" "$@"; }

dc up -d db >/dev/null
for i in $(seq 1 20); do psql_db -c 'SELECT 1' >/dev/null 2>&1 && break; sleep 2; [ "$i" -lt 20 ] || die "Database is not responding."; done
# make sure the session-revocation column exists even if the stack was deployed before it was added
psql_db < db/init/004_admin_session_revocation.sql >/dev/null 2>&1 || true

confirm() { [ "$YES" -eq 1 ] && return 0; local r; read -r -p "$1 [y/N] " r; [[ "$r" =~ ^[Yy] ]]; }
sql_quote() { printf "%s" "$1" | sed "s/'/''/g"; }
list_admins() { psql_db -c "SELECT email, created_at::date AS created, updated_at::date AS password_changed FROM admin_users ORDER BY created_at"; }

if [ "$LIST" -eq 1 ]; then list_admins; exit 0; fi

if [ "$REVOKE" -eq 1 ]; then
  confirm "Sign out ALL admins on every device?" || die "Cancelled."
  psql_db -c "UPDATE admin_users SET sessions_valid_after = now()" -c "DELETE FROM admin_otp"
  echo "✔ All admin sessions revoked."; exit 0
fi

if [ -n "$DELETE" ]; then
  [ "$(psql_db -At -c 'SELECT count(*) FROM admin_users')" -gt 1 ] || die "That is the only admin; refusing to delete it. Reset its password instead."
  confirm "Delete admin $DELETE?" || die "Cancelled."
  [ "$(psql_db -At -c "DELETE FROM admin_users WHERE email = lower('$(sql_quote "$DELETE")') RETURNING 1")" = 1 ] \
    && echo "✔ Deleted $DELETE" || die "No admin with that email."
  exit 0
fi

# ── reset / create ────────────────────────────────────────────────────────────
if [ -z "$EMAIL" ]; then
  COUNT="$(psql_db -At -c 'SELECT count(*) FROM admin_users')"
  if [ "$COUNT" = 1 ]; then
    EMAIL="$(psql_db -At -c 'SELECT email FROM admin_users')"
    echo "Only one admin exists: $EMAIL"
  else
    [ "$COUNT" -gt 0 ] && list_admins
    read -r -p "Admin email to reset (or a new one to create): " EMAIL
  fi
fi
EMAIL="$(echo "$EMAIL" | tr '[:upper:]' '[:lower:]' | xargs)"
[[ "$EMAIL" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || die "Invalid email: '$EMAIL'"

PASS="${ADMIN_PASSWORD:-}"
if [ "$GEN" -eq 1 ]; then
  command -v openssl >/dev/null || die "openssl is required for --generate."
  PASS="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 20)"
elif [ -z "$PASS" ]; then
  [ -t 0 ] || die "No terminal. Use --generate or set ADMIN_PASSWORD."
  read -r -s -p "New password (min 10 chars): " PASS; echo
  read -r -s -p "Repeat password: " PASS2; echo
  [ "$PASS" = "$PASS2" ] || die "Passwords do not match."
fi
[ "${#PASS}" -ge 10 ] || die "Password must be at least 10 characters."

EXISTS="$(psql_db -At -c "SELECT count(*) FROM admin_users WHERE email = '$(sql_quote "$EMAIL")'")"
if [ "$EXISTS" = 1 ]; then confirm "Reset the password for $EMAIL and sign them out everywhere?" || die "Cancelled."
else confirm "No admin '$EMAIL' yet — create a NEW admin account?" || die "Cancelled."; fi

dc run --rm --build -T -e ADMIN_EMAIL="$EMAIL" -e ADMIN_PASSWORD="$PASS" api npx tsx server/scripts/create-admin.ts

if [ "$GEN" -eq 1 ]; then
  echo
  echo "  Email:     $EMAIL"
  echo "  Password:  $PASS"
  echo "  (shown once — store it in a password manager, then change it in Admin → Settings)"
fi
