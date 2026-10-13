#!/usr/bin/env bash
# Status und Logs der App (als root):
#   sudo ./deploy/podman/status.sh           Dienst-, Container- und Image-Status
#   sudo ./deploy/podman/status.sh --logs    Logs live verfolgen
#   sudo ./deploy/podman/status.sh --admin   Admin-Konto anlegen / Passwort zurücksetzen
set -euo pipefail
# shellcheck source=common.sh
source "$(dirname "$0")/common.sh"
require_root

case "${1:-}" in
  --logs) exec runuser -u "$POTM_USER" -- env XDG_RUNTIME_DIR="/run/user/$(potm_uid)" \
            journalctl --user -u "$SERVICE" -f --no-hostname ;;
  --admin) pm exec -it "$CONTAINER" node dist/scripts/createAdmin.js; exit ;;
esac

usystemctl --no-pager status "$SERVICE" || true
echo
pm ps --filter "name=$CONTAINER" --format '{{.Names}}  {{.Status}}  {{.Ports}}'
echo "Commit: $(image_revision "$IMAGE:latest")   (vorheriges Image: $(image_revision "$IMAGE:previous"))"
