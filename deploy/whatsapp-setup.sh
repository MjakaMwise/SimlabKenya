#!/usr/bin/env bash
# whatsapp-setup.sh — set up the WhatsApp inbox (OpenWA) on the VPS, one page at a time.
#
#   ./deploy/whatsapp-setup.sh [options]
#
# Pages (each is safe to re-run):
#   1. Preflight      Docker, project files, memory, the main stack
#   2. Configure      create WA_API_KEY in .env (kept if already set)
#   3. Start          pull and start the WhatsApp container, restart the API so it picks the key up
#   4. Link number    show the QR code to scan from Linked devices on the business phone
#   5. Verify         container health, session state, API reachability, next steps in the admin
#
# Options:
#   --qr              only show the QR code (page 4) and wait for the scan
#   --status          only run the checks (page 5)
#   --stop            stop the WhatsApp container (the linked session is kept)
#   --reset-session   forget the linked number so a new one can be scanned (asks first)
#   --yes             never prompt
#   -h, --help        show this help
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
ROOT="$PWD"

ONLY=""; ASSUME_YES=0; ACTION=""
for a in "$@"; do
  case "$a" in
    --qr) ONLY="qr" ;;
    --status) ONLY="status" ;;
    --stop) ACTION="stop" ;;
    --reset-session) ACTION="reset" ;;
    --yes) ASSUME_YES=1 ;;
    -h|--help) sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $a (try --help)"; exit 2 ;;
  esac
done

if [ -t 1 ]; then B=$'\e[1m'; G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; N=$'\e[0m'; else B=; G=; Y=; R=; N=; fi
PAGE=0; TOTAL=5
page()  { PAGE=$((PAGE+1)); printf '\n%s== Page %s of %s: %s ==%s\n' "$B" "$PAGE" "$TOTAL" "$*" "$N"; }
ok()    { printf '  %s✔%s %s\n' "$G" "$N" "$*"; }
warn()  { printf '  %s!%s %s\n' "$Y" "$N" "$*"; }
info()  { printf '    %s\n' "$*"; }
die()   { printf '\n%s✖ %s%s\n' "$R" "$*" "$N" >&2; exit 1; }
trap 'printf "\n%s✖ Stopped at line %s. Fix the problem above and re-run ./deploy/whatsapp-setup.sh; finished pages are skipped.%s\n" "$R" "$LINENO" "$N" >&2' ERR

interactive() { [ "$ASSUME_YES" -eq 0 ] && [ -t 0 ]; }
pause() { interactive && { read -r -p "  Press Enter to continue... " _; } || true; }
confirm() { interactive || return 1; local r; read -r -p "  $1 [y/N] " r; [[ "$r" =~ ^[Yy] ]]; }

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  if $SUDO docker info >/dev/null 2>&1; then DOCKER="$SUDO docker"; else die "Docker is not running or you may not use it. Run ./start-setup.sh first."; fi
fi
dc() { $DOCKER compose --profile whatsapp "$@"; }

env_get() { [ -f .env ] && grep -m1 "^$1=" .env | cut -d= -f2- || true; }
env_set() {
  local tmp; tmp="$(mktemp)"
  K="$1" V="$2" awk 'BEGIN{FS=OFS="="; k=ENVIRON["K"]; v=ENVIRON["V"]}
    $1==k && !d {print k "=" v; d=1; next} {print} END{if(!d) print k "=" v}' .env > "$tmp"
  cat "$tmp" > .env; rm -f "$tmp"
}

health() { # prints the /health JSON from inside the container, or nothing
  dc exec -T whatsapp node -e "fetch('http://127.0.0.1:8080/health').then(r=>r.text()).then(t=>process.stdout.write(t)).catch(()=>process.exit(1))" 2>/dev/null || true
}
is_ready() { health | grep -q '"ready":[[:space:]]*true'; }

# ── single actions ────────────────────────────────────────────────────────────
if [ "$ACTION" = "stop" ]; then
  dc stop whatsapp; ok "WhatsApp container stopped. Start it again with ./deploy/whatsapp-setup.sh"; exit 0
fi
if [ "$ACTION" = "reset" ]; then
  warn "This forgets the linked number. Clients cannot be messaged until a number is scanned again."
  confirm "Forget the linked session?" || die "Cancelled."
  dc stop whatsapp
  dc run --rm --no-deps --entrypoint sh whatsapp -c 'rm -rf /sessions/simlab' && ok "Session removed"
  dc up -d whatsapp; ok "Started. Run ./deploy/whatsapp-setup.sh --qr to link a number."; exit 0
fi

show_qr() {
  info "Scan from the business phone: WhatsApp > Settings > Linked devices > Link a device."
  info "The code appears in the log below and refreshes about every 20 seconds. Ctrl+C when linked."
  echo
  # Stops by itself once the session is ready, otherwise the operator presses Ctrl+C.
  ( dc logs -f --tail 60 whatsapp & echo $! > /tmp/.wa-logs.pid; wait ) &
  local logs_pid=$!
  local waited=0
  while [ "$waited" -lt 300 ]; do
    if is_ready; then break; fi
    sleep 4; waited=$((waited+4))
  done
  kill "$(cat /tmp/.wa-logs.pid 2>/dev/null)" "$logs_pid" 2>/dev/null || true
  rm -f /tmp/.wa-logs.pid
  echo
  if is_ready; then ok "Number linked."; else warn "Not linked yet. Run ./deploy/whatsapp-setup.sh --qr to try again."; fi
}

checks() {
  local bad=0
  if dc ps --status running --services 2>/dev/null | grep -qx whatsapp; then ok "WhatsApp container is running"; else warn "WhatsApp container is not running"; bad=1; fi
  local h; h="$(health)"
  if [ -z "$h" ]; then warn "The WhatsApp server did not answer yet (it can take a minute after a start)"; bad=1
  else
    ok "The WhatsApp server answers"
    if echo "$h" | grep -q '"ready":[[:space:]]*true'; then ok "A number is linked and ready"; else warn "No number is linked yet: ./deploy/whatsapp-setup.sh --qr"; bad=1; fi
  fi
  if dc exec -T api node -e "fetch('http://whatsapp:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then ok "The website API can reach WhatsApp"; else warn "The website API cannot reach WhatsApp. Check: docker compose --profile whatsapp ps"; bad=1; fi
  return $bad
}

if [ "$ONLY" = "qr" ]; then page "Link number"; show_qr; exit 0; fi
if [ "$ONLY" = "status" ]; then PAGE=4; page "Verify"; checks && exit 0 || exit 1; fi

# ══════════════════════════════════════════════════════════════════════════════
page "Preflight"
[ -f docker-compose.yml ] && [ -d server ] || die "Run this from the SimlabKenya project (docker-compose.yml not found)."
[ -f .env ] || die ".env is missing. Run ./start-setup.sh first to set up the website."
ok "Project at $ROOT"
MEM_MB=$(awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo)
if [ "$MEM_MB" -ge 3000 ]; then ok "Memory: ${MEM_MB} MB"; else warn "Only ${MEM_MB} MB RAM. WhatsApp runs a browser and needs about 1 GB free; add swap or upgrade the VPS if it keeps restarting."; fi
dc ps --status running --services 2>/dev/null | grep -qx api && ok "Website API is running" || warn "The website is not running. Start it with ./start-setup.sh"
pause

# ══════════════════════════════════════════════════════════════════════════════
page "Configure"
KEY="$(env_get WA_API_KEY)"
if [ -z "$KEY" ]; then
  KEY="$(openssl rand -hex 24)"
  env_set WA_API_KEY "$KEY"
  ok "Created an access key (WA_API_KEY in .env). Keep .env private."
else
  ok "Access key already set; keeping it"
fi
[ -n "$(env_get WA_VERSION)" ] || env_set WA_VERSION 5.1.0
ok "OpenWA version: $(env_get WA_VERSION)"
info "The WhatsApp server is not published to the internet. Only the website API can reach it."
pause

# ══════════════════════════════════════════════════════════════════════════════
page "Start"
info "Pulling the image (large, first time only)..."
dc pull whatsapp
dc up -d whatsapp
dc up -d api
ok "Containers started. Waiting for the WhatsApp server..."
for _ in $(seq 1 45); do [ -n "$(health)" ] && break; sleep 4; done
[ -n "$(health)" ] && ok "The WhatsApp server is up" || warn "Not answering yet. Check: docker compose --profile whatsapp logs whatsapp"
pause

# ══════════════════════════════════════════════════════════════════════════════
page "Link number"
if is_ready; then
  ok "A number is already linked. To use a different one: ./deploy/whatsapp-setup.sh --reset-session"
else
  show_qr
fi

# ══════════════════════════════════════════════════════════════════════════════
page "Verify"
checks || true
cat <<DONE

${B}Next, in the admin${N}
  1. Staff > give people "WhatsApp inbox" access (view, or view & manage)
  2. WhatsApp > Setup > Bot menu: check the wording, business hours and the on/off switch
  3. Send "hi" to the business number from another phone and watch it arrive in WhatsApp

Commands
  ./deploy/whatsapp-setup.sh --status          re-run the checks
  ./deploy/whatsapp-setup.sh --qr              show the QR code again
  ./deploy/whatsapp-setup.sh --stop            stop WhatsApp (the link is kept)
  ./deploy/whatsapp-setup.sh --reset-session   forget the number and link another
  docker compose --profile whatsapp logs -f whatsapp
DONE
