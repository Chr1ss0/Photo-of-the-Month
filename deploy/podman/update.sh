#!/usr/bin/env bash
# Image aus dem aktuellen Code neu bauen und App neu starten (als root):
#   sudo ./deploy/podman/update.sh              git pull, Backup, bauen, neu starten
#   sudo ./deploy/podman/update.sh --no-pull    lokalen Stand bauen
#   sudo ./deploy/podman/update.sh --rollback   zurück zum vorherigen Image
set -euo pipefail
# shellcheck source=common.sh
source "$(dirname "$0")/common.sh"
require_root

restart_and_check() {
  usystemctl daemon-reload            # Quadlet-Unit (neu) erzeugen
  usystemctl restart "$SERVICE"
  if ! wait_healthy; then
    echo "❌ App startet nicht sauber. Logs: sudo ./deploy/podman/status.sh --logs" >&2
    echo "   Zurückrollen: sudo ./deploy/podman/update.sh --rollback" >&2
    exit 1
  fi
}

PULL=1
case "${1:-}" in
  --no-pull) PULL=0 ;;
  --rollback)
    pm image exists "$IMAGE:previous" || { echo "Kein vorheriges Image vorhanden." >&2; exit 1; }
    pm tag "$IMAGE:previous" "$IMAGE:latest"
    restart_and_check
    echo "↩  Zurück auf Commit $(image_revision "$IMAGE:latest")"
    exit 0 ;;
  "") ;;
  *) echo "Unbekannte Option: $1" >&2; exit 1 ;;
esac

if [[ $PULL -eq 1 ]]; then
  echo "⬇  Hole aktuellen Code …"
  git -C "$REPO_DIR" pull --ff-only
fi
commit="$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"

if container_running; then
  "$REPO_DIR/deploy/podman/backup.sh"
  pm tag "$IMAGE:latest" "$IMAGE:previous"
fi

echo "🔨 Baue Image für Commit $commit …"
# optionale Zusatzoptionen für podman build, z. B. POTM_BUILD_OPTS="--network=host"
read -r -a extra_opts <<< "${POTM_BUILD_OPTS:-}"
pm build --format docker --pull=newer --build-arg "GIT_COMMIT=$commit" "${extra_opts[@]}" -t "$IMAGE:latest" "$REPO_DIR"

restart_and_check
pm image prune -f >/dev/null
echo "✅ Läuft mit Commit $(image_revision "$IMAGE:latest")"
