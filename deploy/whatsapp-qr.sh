#!/usr/bin/env bash
# whatsapp-qr.sh — show the WhatsApp QR code in the terminal and wait for the scan.
#
#   ./deploy/whatsapp-qr.sh
#
# On the business phone: WhatsApp > Settings > Linked devices > Link a device, then scan.
# Prefer typing a code instead of scanning? Use ./deploy/whatsapp-link.sh <number>.
# Needs the container from ./deploy/whatsapp-setup.sh. Ctrl+C to stop.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
DOCKER="docker"
docker info >/dev/null 2>&1 || { $SUDO docker info >/dev/null 2>&1 && DOCKER="$SUDO docker" || { echo "Docker is not running or you may not use it." >&2; exit 1; }; }
dc() { $DOCKER compose --profile whatsapp "$@"; }

dc ps --status running --services 2>/dev/null | grep -qx whatsapp || {
  echo "The WhatsApp container is not running. Run ./deploy/whatsapp-setup.sh first." >&2; exit 1; }

echo "Scan from the business phone: WhatsApp > Settings > Linked devices > Link a device."
dc exec whatsapp node cli.mjs qr
