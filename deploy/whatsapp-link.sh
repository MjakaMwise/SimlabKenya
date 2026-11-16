#!/usr/bin/env bash
# whatsapp-link.sh — link the business number with a code instead of a QR scan.
#
#   ./deploy/whatsapp-link.sh 0712345678        (also +254 712 345 678 or 254712345678)
#
# Prints an 8-character code. On the business phone: WhatsApp > Settings > Linked devices >
# Link a device > "Link with phone number instead", then type the code.
# Needs the container from ./deploy/whatsapp-setup.sh.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

raw="${1:-}"
if [ -z "$raw" ] && [ -t 0 ]; then read -r -p "Business WhatsApp number (e.g. 0712345678): " raw; fi
[ -n "$raw" ] || { echo "Usage: ./deploy/whatsapp-link.sh <number>" >&2; exit 2; }

d="${raw//[^0-9]/}"
d="${d#00}"
if [[ "$d" == 0* ]]; then d="254${d#0}"; elif [[ "$d" =~ ^[71][0-9]{8}$ ]]; then d="254$d"; fi
[[ "$d" =~ ^[0-9]{10,15}$ ]] || { echo "That does not look like a phone number: $raw" >&2; exit 2; }
echo "Linking +$d"

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
DOCKER="docker"
docker info >/dev/null 2>&1 || { $SUDO docker info >/dev/null 2>&1 && DOCKER="$SUDO docker" || { echo "Docker is not running or you may not use it." >&2; exit 1; }; }
dc() { $DOCKER compose --profile whatsapp "$@"; }

dc ps --status running --services 2>/dev/null | grep -qx whatsapp || {
  echo "The WhatsApp container is not running. Run ./deploy/whatsapp-setup.sh first." >&2; exit 1; }

dc exec whatsapp node cli.mjs pair "$d"
