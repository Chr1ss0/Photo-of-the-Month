# Gemeinsame Einstellungen und Hilfsfunktionen für die Podman-Skripte.
# Alle Skripte laufen als root und führen Podman/systemctl als Dienstbenutzer aus.
# shellcheck shell=bash disable=SC2034

POTM_USER="${POTM_USER:-potm}"
POTM_HOME="${POTM_HOME:-/var/lib/potm}"
POTM_ENV="${POTM_ENV:-/etc/potm/potm.env}"
POTM_BACKUP_DIR="${POTM_BACKUP_DIR:-/var/backups/potm}"
IMAGE="localhost/photo-of-the-month"
CONTAINER="photo-of-the-month"
SERVICE="photo-of-the-month.service"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

require_root() {
  [[ $EUID -eq 0 ]] || { echo "Bitte als root ausführen (z. B. mit sudo)." >&2; exit 1; }
}

potm_uid() { id -u "$POTM_USER"; }

# Befehl als Dienstbenutzer mit dessen Laufzeitumgebung ausführen (funktioniert ohne Login-Shell)
as_potm() {
  local uid; uid="$(potm_uid)"
  (cd / && runuser -u "$POTM_USER" -- env \
    HOME="$POTM_HOME" \
    XDG_RUNTIME_DIR="/run/user/$uid" \
    DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" \
    "$@")
}

pm() { as_potm podman "$@"; }
usystemctl() { as_potm systemctl --user "$@"; }

container_running() {
  [[ "$(pm container inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" == "true" ]]
}

# Wartet, bis der Healthcheck des Containers erfolgreich ist (max. ~2 Minuten)
wait_healthy() {
  echo -n "⏳ Warte auf Healthcheck "
  for _ in $(seq 1 60); do
    if pm healthcheck run "$CONTAINER" >/dev/null 2>&1; then echo " ✔"; return 0; fi
    echo -n "."; sleep 2
  done
  echo " ✘"
  return 1
}

image_revision() {
  pm image inspect -f '{{ index .Labels "org.opencontainers.image.revision" }}' "$1" 2>/dev/null || echo "?"
}
