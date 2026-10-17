#!/usr/bin/env bash
# start-setup.sh — one-shot VPS setup for the SIM-Lab Kenya website.
#
#   ./start-setup.sh [options]
#
# Steps (each is safe to re-run):
#   1. Preflight       OS, privileges, disk, memory
#   2. Install         git, curl, openssl, ufw, Docker Engine + compose plugin (only if missing)
#   3. Firewall        allow SSH, 80, 443 (ufw)
#   4. Configure       create .env, generate missing secrets, prompt (existing values are the
#                      default: Enter keeps them), validate. Existing values are never overwritten silently
#   5. Pre-deploy checks  compose file, ports, DNS, SQL files, image build
#   6. Deploy          database -> schema -> first admin -> api + web
#   7. Post-deploy checks  containers healthy, API, tables, admin, Resend key + test email, HTTPS site
#   8. Backups         daily backup cron (Postgres + the uploads volume)
#
# Options:
#   --verify-only     run steps 1 and 4-5 checks only; change nothing
#   --yes             never prompt (all values must already be in .env / environment)
#   --skip-firewall   do not touch ufw
#   --skip-dns-check  do not fail/warn when the domain does not point at this server
#   --skip-cron       do not install the backup cron job
#   --skip-email-check  do not verify the Resend key / send the test email
#   -h, --help        show this help
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
ROOT="$PWD"

VERIFY_ONLY=0; ASSUME_YES=0; SKIP_FW=0; SKIP_DNS=0; SKIP_CRON=0; SKIP_EMAIL=0
for a in "$@"; do
  case "$a" in
    --verify-only) VERIFY_ONLY=1 ;;
    --yes) ASSUME_YES=1 ;;
    --skip-firewall) SKIP_FW=1 ;;
    --skip-dns-check) SKIP_DNS=1 ;;
    --skip-cron) SKIP_CRON=1 ;;
    --skip-email-check) SKIP_EMAIL=1 ;;
    -h|--help) sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $a (try --help)"; exit 2 ;;
  esac
done

# ── output helpers ────────────────────────────────────────────────────────────
if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; N=$'\e[0m'; else B=; G=; Y=; R=; N=; fi
STEP=0
step()  { STEP=$((STEP+1)); printf '\n%s== Step %s: %s ==%s\n' "$B" "$STEP" "$*" "$N"; }
ok()    { printf '  %s✔%s %s\n' "$G" "$N" "$*"; }
warn()  { printf '  %s!%s %s\n' "$Y" "$N" "$*"; WARNINGS=$((WARNINGS+1)); }
info()  { printf '    %s\n' "$*"; }
die()   { printf '\n%s✖ %s%s\n' "$R" "$*" "$N" >&2; exit 1; }
WARNINGS=0
trap 'printf "\n%s✖ Setup stopped at line %s (exit %s). Fix the problem above and re-run ./start-setup.sh — completed steps are skipped.%s\n" "$R" "$LINENO" "$?" "$N" >&2' ERR

interactive() { [ "$ASSUME_YES" -eq 0 ] && [ -t 0 ]; }
confirm() { # confirm "question" -> 0 yes / 1 no ; non-interactive = no
  interactive || return 1
  local r; read -r -p "  $1 [y/N] " r; [[ "$r" =~ ^[Yy] ]]
}

SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

# ── .env helpers (values pass through ENVIRON so backslashes/quotes survive) ──
env_get() { [ -f .env ] && grep -m1 "^$1=" .env | cut -d= -f2- || true; }
env_set() {
  local tmp; tmp="$(mktemp)"
  K="$1" V="$2" awk 'BEGIN{FS=OFS="="; k=ENVIRON["K"]; v=ENVIRON["V"]}
    $1==k && !d {print k "=" v; d=1; next} {print} END{if(!d) print k "=" v}' .env > "$tmp"
  cat "$tmp" > .env; rm -f "$tmp"
}
# env_need KEY "prompt" [secret]
# Existing .env values are the default: Enter keeps them, typing a value changes them.
# An exported KEY=value always wins. Non-interactive runs keep what is in .env.
env_need() {
  local k="$1" p="$2" secret="${3:-}" cur v hint=""
  cur="$(env_get "$k")"
  v="${!k:-}"
  if [ -z "$v" ]; then
    if interactive; then
      if [ -n "$cur" ]; then
        if [ -n "$secret" ]; then hint=" [Enter = keep existing]"; else hint=" [$cur]"; fi
      fi
      if [ -n "$secret" ]; then read -r -s -p "  $p$hint: " v; echo; else read -r -p "  $p$hint: " v; fi
    fi
    v="${v:-$cur}"
  fi
  [ -n "$v" ] || die "$k is empty. Set it in .env (or export it) and re-run."
  if [ "$v" != "$cur" ]; then env_set "$k" "$v"; [ -z "$cur" ] || ok "Updated $k"; fi
}

# docker via sudo until the new group membership applies to this shell
DOCKER="docker"
pick_docker() {
  if docker info >/dev/null 2>&1; then DOCKER="docker"
  elif $SUDO docker info >/dev/null 2>&1; then DOCKER="$SUDO docker"
  else return 1; fi
}
dc() { $DOCKER compose "$@"; }

# ══════════════════════════════════════════════════════════════════════════════
step "Preflight"
[ -f docker-compose.yml ] && [ -d db/init ] && [ -d server ] || die "Run this from the SimlabKenya repo root (docker-compose.yml not found)."
ok "Project at $ROOT"

[ "$(uname -s)" = "Linux" ] || die "This script targets a Linux VPS."
. /etc/os-release 2>/dev/null || true
case "${ID:-}${ID_LIKE:-}" in
  *debian*|*ubuntu*) ok "OS: ${PRETTY_NAME:-Debian-based}" ;;
  *) warn "OS '${PRETTY_NAME:-unknown}' is not Debian/Ubuntu. Package installs may fail; install git, curl, openssl and Docker manually." ;;
esac

if [ "$VERIFY_ONLY" -eq 0 ] && [ -n "$SUDO" ]; then
  command -v sudo >/dev/null || die "Not root and sudo is missing. Run as root or install sudo."
  $SUDO -v || die "sudo access is required to install packages."
  ok "sudo available"
fi

FREE_GB=$(df -Pk "$ROOT" | awk 'NR==2{printf "%d", $4/1024/1024}')
[ "$FREE_GB" -ge 5 ] && ok "Disk free: ${FREE_GB} GB" || die "Only ${FREE_GB} GB free; need at least 5 GB for images and data."
MEM_MB=$(awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo)
[ "$MEM_MB" -ge 900 ] && ok "Memory: ${MEM_MB} MB" || warn "Only ${MEM_MB} MB RAM. The image build may fail; add swap or upgrade the VPS."

# ══════════════════════════════════════════════════════════════════════════════
if [ "$VERIFY_ONLY" -eq 0 ]; then
  step "Install required software (only what is missing)"
  MISSING=()
  for c in git curl openssl; do command -v "$c" >/dev/null || MISSING+=("$c"); done
  command -v ufw >/dev/null || [ "$SKIP_FW" -eq 1 ] || MISSING+=(ufw)
  if [ "${#MISSING[@]}" -gt 0 ]; then
    info "Installing: ${MISSING[*]}"
    $SUDO apt-get update -y
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates "${MISSING[@]}"
  fi
  ok "git, curl, openssl present"

  if ! command -v docker >/dev/null; then
    info "Installing Docker Engine (official get.docker.com script)"
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    $SUDO sh /tmp/get-docker.sh
    rm -f /tmp/get-docker.sh
  fi
  $DOCKER compose version >/dev/null 2>&1 || $SUDO docker compose version >/dev/null 2>&1 || {
    info "Installing the docker compose plugin"
    $SUDO apt-get install -y docker-compose-plugin
  }
  $SUDO systemctl enable --now docker >/dev/null 2>&1 || true
  if [ -n "$SUDO" ] && ! id -nG | tr ' ' '\n' | grep -qx docker; then
    $SUDO usermod -aG docker "$USER"
    warn "Added $USER to the docker group (takes effect on next login; this run uses sudo for docker)."
  fi
  pick_docker || die "Docker is installed but the daemon is not reachable. Check: sudo systemctl status docker"
  ok "Docker $($DOCKER --version | awk '{print $3}' | tr -d ,) with $($DOCKER compose version --short)"

  # ────────────────────────────────────────────────────────────────────────────
  step "Firewall"
  if [ "$SKIP_FW" -eq 1 ]; then
    info "Skipped (--skip-firewall)"
  else
    $SUDO ufw allow OpenSSH >/dev/null   # always keep SSH open BEFORE enabling, or we lock ourselves out
    $SUDO ufw allow 80/tcp  >/dev/null
    $SUDO ufw allow 443/tcp >/dev/null
    $SUDO ufw --force enable >/dev/null
    ok "ufw active: SSH, 80, 443 allowed; everything else blocked (Postgres is never published)"
  fi
else
  pick_docker || warn "Docker not reachable as this user; compose/build checks will be skipped."
fi

# ══════════════════════════════════════════════════════════════════════════════
step "Configure .env"
if [ ! -f .env ]; then
  [ "$VERIFY_ONLY" -eq 0 ] || die ".env does not exist. Run without --verify-only first."
  cp .env.example .env
  ok "Created .env from .env.example"
else
  ok ".env already exists (kept)"
fi
chmod 600 .env

if [ "$VERIFY_ONLY" -eq 0 ]; then
  [ -n "$(env_get POSTGRES_PASSWORD)" ] || { env_set POSTGRES_PASSWORD "$(openssl rand -hex 24)"; ok "Generated POSTGRES_PASSWORD"; }
  [ -n "$(env_get JWT_SECRET)" ]        || { env_set JWT_SECRET "$(openssl rand -hex 48)"; ok "Generated JWT_SECRET"; }

  OLD_DOMAIN="$(env_get SITE_DOMAIN)"
  env_need SITE_DOMAIN "Domain name (e.g. simlabkenya.co.ke)"
  DOMAIN="$(env_get SITE_DOMAIN)"
  # Values derived from the domain follow it only if they were still the derived defaults
  # (or empty); anything you customised by hand is left alone.
  derive() { # derive KEY old_default new_default
    local cur; cur="$(env_get "$1")"
    if [ -z "$cur" ] || { [ -n "$OLD_DOMAIN" ] && [ "$cur" = "$2" ]; }; then
      [ "$cur" = "$3" ] || env_set "$1" "$3"
    fi
  }
  derive SITE_ADDRESS "$OLD_DOMAIN" "$DOMAIN"
  derive ALLOWED_ORIGINS "https://$OLD_DOMAIN,https://www.$OLD_DOMAIN" "https://$DOMAIN,https://www.$DOMAIN"
  derive ADMIN_DASHBOARD_URL "https://$OLD_DOMAIN/admin" "https://$DOMAIN/admin"

  env_need RESEND_API_KEY "Resend API key (resend.com/api-keys)" secret
  env_need EMAIL_FROM "Sender address on your Resend-verified domain, e.g. no-reply@$DOMAIN"
  env_need ADMIN_EMAIL "Admin email that receives order/abstract notifications"
  ok ".env completed"
fi

# validate (also runs in --verify-only)
BAD=0
for k in SITE_DOMAIN SITE_ADDRESS POSTGRES_PASSWORD JWT_SECRET RESEND_API_KEY EMAIL_FROM ADMIN_EMAIL; do
  [ -n "$(env_get "$k")" ] || { printf '  %s✖%s %s is empty\n' "$R" "$N" "$k"; BAD=1; }
done
[ "$BAD" -eq 0 ] || die "Fill the empty values in .env and re-run."
JWT="$(env_get JWT_SECRET)"
[ "${#JWT}" -ge 32 ] || die "JWT_SECRET must be at least 32 characters."
case "$(env_get POSTGRES_PASSWORD)" in change-me*) die "POSTGRES_PASSWORD is still the placeholder." ;; esac
ok ".env validated (permissions 600)"

# ══════════════════════════════════════════════════════════════════════════════
step "Verify before deploying"
for f in db/init/001_ocean_shujaa.sql db/init/002_admin_auth.sql db/init/003_shop.sql db/init/004_admin_session_revocation.sql deploy/Caddyfile Dockerfile server/Dockerfile server/scripts/create-admin.ts; do
  [ -f "$f" ] || die "Missing project file: $f"
done
ok "Project files present"

DOMAIN="$(env_get SITE_DOMAIN)"
if [ -n "${DOCKER:-}" ] && pick_docker; then
  dc config -q && ok "docker-compose.yml is valid with this .env"
else
  warn "Skipping compose validation (Docker not reachable)."
fi

# ports 80/443 must be free, unless our own web container already owns them
if command -v ss >/dev/null; then
  for port in 80 443; do
    if ss -ltn "( sport = :$port )" | grep -q LISTEN; then
      if pick_docker && dc ps --status running --services 2>/dev/null | grep -qx web; then
        ok "Port $port is held by this project's web container"
      else
        die "Port $port is already in use by another program (e.g. apache/nginx). Stop it first: sudo ss -ltnp | grep :$port"
      fi
    else
      ok "Port $port is free"
    fi
  done
fi

# DNS must point here or Caddy cannot obtain a certificate
if [ "$SKIP_DNS" -eq 0 ] && [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "localhost.invalid" ]; then
  PUB_IP="$(curl -fsS --max-time 8 https://api.ipify.org 2>/dev/null || true)"
  DNS_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}')"
  if [ -z "$PUB_IP" ]; then
    warn "Could not determine this server's public IP; skipping DNS comparison."
  elif [ -z "$DNS_IP" ]; then
    warn "$DOMAIN does not resolve yet. Create an A record -> $PUB_IP. HTTPS will fail until it does."
    confirm "Continue anyway?" || die "Fix DNS, then re-run."
  elif [ "$DNS_IP" != "$PUB_IP" ]; then
    warn "$DOMAIN resolves to $DNS_IP but this server is $PUB_IP. HTTPS will fail until DNS matches."
    confirm "Continue anyway?" || die "Fix DNS, then re-run."
  else
    ok "DNS: $DOMAIN -> $PUB_IP (this server)"
  fi
fi

if [ "$VERIFY_ONLY" -eq 1 ]; then
  printf '\n%s✔ Verification finished with %s warning(s). Nothing was changed.%s\n' "$G" "$WARNINGS" "$N"
  exit 0
fi

info "Building images (first build takes a few minutes)..."
dc build
ok "Images built"

# ══════════════════════════════════════════════════════════════════════════════
step "Deploy"
dc up -d db
info "Waiting for Postgres to become healthy..."
for i in $(seq 1 40); do
  [ "$(dc ps db --format '{{.Health}}' 2>/dev/null)" = "healthy" ] && break
  sleep 3
  [ "$i" -lt 40 ] || { dc logs --tail 30 db; die "Postgres did not become healthy."; }
done
ok "Postgres healthy"

PGUSER_="$(env_get POSTGRES_USER)"; PGUSER_="${PGUSER_:-simlab}"
PGDB_="$(env_get POSTGRES_DB)";     PGDB_="${PGDB_:-simlab}"
psql_db() { dc exec -T db psql -v ON_ERROR_STOP=1 -q -U "$PGUSER_" -d "$PGDB_" "$@"; }

# Init scripts only auto-run on an empty volume; applying them again is harmless (idempotent SQL)
for f in db/init/*.sql; do psql_db < "$f" >/dev/null 2>&1 || { psql_db < "$f"; die "Schema file failed: $f"; }; done
ok "Database schema applied"

ADMINS="$(psql_db -At -c 'SELECT count(*) FROM admin_users')"
BOOT_EMAIL="$(env_get ADMIN_BOOTSTRAP_EMAIL)"; BOOT_PASS="$(env_get ADMIN_BOOTSTRAP_PASSWORD)"
if [ -n "$BOOT_EMAIL" ] && [ -n "$BOOT_PASS" ]; then
  dc run --rm -T -e ADMIN_EMAIL="$BOOT_EMAIL" -e ADMIN_PASSWORD="$BOOT_PASS" api npx tsx server/scripts/create-admin.ts
  # the plaintext bootstrap password should not stay on disk
  env_set ADMIN_BOOTSTRAP_PASSWORD ""
  ok "Admin account created from ADMIN_BOOTSTRAP_*; password removed from .env"
elif [ "$ADMINS" -eq 0 ]; then
  if interactive; then
    info "No admin exists yet — create the first one:"
    dc run --rm api npx tsx server/scripts/create-admin.ts
  else
    die "No admin account. Set ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD in .env, or run interactively."
  fi
else
  ok "$ADMINS admin account(s) already exist"
fi

dc up -d --remove-orphans
ok "Containers started"

# ══════════════════════════════════════════════════════════════════════════════
step "Verify the deployment"
FAIL=0
check() { # check "label" command...
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then ok "$label"; else printf '  %s✖%s %s\n' "$R" "$N" "$label"; FAIL=1; fi
}
SITE="https://$DOMAIN"; CURL_OPTS=(-fsS --max-time 10)
[ "$(env_get SITE_ADDRESS)" = ":80" ] && { SITE="http://localhost"; }


api_status() { # api_status METHOD PATH EXPECTED_STATUS
  dc exec -T api node -e "fetch('http://localhost:5000$2',{method:'$1',headers:{'content-type':'application/json'},body:'$1'==='POST'?'{}':undefined}).then(r=>process.exit(r.status===$3?0:1)).catch(()=>process.exit(1))"
}
db_scalar() { psql_db -At -c "$1"; }
registrations_table() { [ "$(db_scalar "SELECT to_regclass('public.ocean_shujaa_registrations') IS NOT NULL")" = t ]; }
shop_ready() { [ "$(db_scalar "SELECT to_regclass('public.orders') IS NOT NULL AND (SELECT count(*) FROM products) >= 0")" = t ]; }
has_admin() { [ "$(db_scalar 'SELECT count(*) FROM admin_users')" -ge 1 ]; }
abstracts_tables() { [ "$(db_scalar "SELECT to_regclass('public.abstracts') IS NOT NULL AND to_regclass('public.abstract_files') IS NOT NULL")" = t ]; }
uploads_writable() { dc exec -T api sh -c 'touch /data/uploads/.write-test && rm /data/uploads/.write-test'; }
postgres_private() { ! ss -ltn | grep -q ':5432 '; }

info "Waiting for the API (up to 90s)..."
for i in $(seq 1 30); do api_status GET /api/health 200 >/dev/null 2>&1 && break; sleep 3; done

check "api container answers /api/health"           api_status GET /api/health 200
check "ocean_shujaa_registrations table exists"     registrations_table
check "shop tables exist and catalogue is seeded"   shop_ready
check "an admin account exists"                     has_admin
check "public registration rejects bad input (400)" api_status POST /api/ocean-shujaa/registrations 400
check "admin API refuses anonymous requests (401)"  api_status GET /api/ocean-shujaa/admin/registrations 401
check "abstract tables exist"                       abstracts_tables
check "uploads volume is writable by the API"       uploads_writable
check "public abstract form rejects bad input (400)" api_status POST /api/abstracts 400
check "abstract list refuses anonymous requests (401)" api_status GET /api/abstracts 401
check "Postgres is not exposed on the host"         postgres_private

# Email: admin login codes depend on it, so prove it works instead of finding out at first login.
if [ "$SKIP_EMAIL" -eq 1 ]; then
  info "Email check skipped (--skip-email-check)"
else
  info "Verifying the Resend key..."
  if dc exec -T api npx tsx server/scripts/test-email.ts; then
    ok "Resend key works"
    TO="${ADMIN_BOOTSTRAP_EMAIL:-$(env_get ADMIN_BOOTSTRAP_EMAIL)}"; TO="${TO:-$(env_get ADMIN_EMAIL)}"
    if interactive; then
      read -r -p "  Send a real test email to [${TO}] (type another address, 'n' to skip): " ANS
      case "$ANS" in n|N|no) TO="" ;; ?*) TO="$ANS" ;; esac
    else
      TO=""   # unattended: login check only, so we never mail someone unexpectedly
    fi
    if [ -n "$TO" ]; then
      if dc exec -T -e TEST_EMAIL_TO="$TO" api npx tsx server/scripts/test-email.ts; then
        ok "Test email accepted for $TO"
        interactive && { read -r -p "  Did it arrive (check spam too)? [Y/n] " GOT; case "$GOT" in n|N) FAIL=1; printf '  %s✖%s Email was accepted but did not arrive — check the spam folder and the Resend dashboard logs.\n' "$R" "$N" ;; esac; }
      else
        FAIL=1
      fi
    fi
  else
    FAIL=1
    printf '  %s✖%s Admin login codes cannot be sent until this is fixed. Edit RESEND_API_KEY / EMAIL_FROM in .env, then: docker compose up -d api && ./deploy/test-email.sh\n' "$R" "$N"
  fi
fi

info "Checking the public site (HTTPS may take up to a minute while the certificate is issued)..."
SITE_OK=0
for i in $(seq 1 12); do
  if curl "${CURL_OPTS[@]}" -o /dev/null "$SITE/" 2>/dev/null && curl "${CURL_OPTS[@]}" "$SITE/api/health" 2>/dev/null | grep -q '"ok"'; then SITE_OK=1; break; fi
  sleep 5
done
if [ "$SITE_OK" -eq 1 ]; then ok "$SITE serves the site and /api/health"
else warn "$SITE is not reachable yet (usually DNS or certificate timing). Inspect: docker compose logs web"; fi

if [ "$FAIL" -ne 0 ]; then
  dc ps; dc logs --tail 25 api
  die "Some post-deploy checks failed (see above)."
fi

# ══════════════════════════════════════════════════════════════════════════════
step "Backups"
if [ "$SKIP_CRON" -eq 1 ]; then
  info "Skipped (--skip-cron)"
else
  CRON_LINE="0 2 * * * $ROOT/deploy/backup.sh >> $ROOT/backups.log 2>&1"
  if crontab -l 2>/dev/null | grep -qF "$ROOT/deploy/backup.sh"; then
    ok "Backup cron already installed"
  else
    ( crontab -l 2>/dev/null || true; echo "$CRON_LINE" ) | crontab -
    ok "Daily 02:00 backup of Postgres and uploads installed (keeps 14 of each, in $ROOT/backups)"
  fi
  warn "Backups live on this server. Copy $ROOT/backups off the VPS regularly."
fi

printf '\n%s✔ Setup complete%s (%s warning(s))\n' "$G" "$N" "$WARNINGS"
cat <<EOF

  Site:    $SITE
  Admin:   $SITE/admin/login   (password + emailed code)
  Update:  ./deploy/deploy.sh
  Logs:    docker compose logs -f
EOF
