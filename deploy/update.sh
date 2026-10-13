#!/usr/bin/env bash
# Baut das Image aus dem aktuellen Code neu und startet den Container.
#
#   ./deploy/update.sh              Code per git pull holen, Image neu bauen, neu starten
#   ./deploy/update.sh --no-pull    lokalen Stand bauen (ohne git pull)
#   ./deploy/update.sh --rollback   zurück zum vorherigen Image
#
# Vor jedem Update wird ein Backup erstellt und das laufende Image als
# photo-of-the-month:previous aufgehoben.
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE=photo-of-the-month
PULL=1
case "${1:-}" in
  --no-pull) PULL=0 ;;
  --rollback)
    docker image inspect "$IMAGE:previous" >/dev/null 2>&1 || { echo "Kein vorheriges Image vorhanden."; exit 1; }
    docker tag "$IMAGE:previous" "$IMAGE:latest"
    docker compose up -d --no-build
    echo "↩  Zurück auf Commit $(docker image inspect -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' "$IMAGE:latest")"
    exit 0 ;;
  "") ;;
  *) echo "Unbekannte Option: $1"; exit 1 ;;
esac

[[ -f .env ]] || { echo "Keine .env gefunden – zuerst: cp .env.docker.example .env"; exit 1; }

if [[ $PULL -eq 1 ]]; then
  echo "⬇  Hole aktuellen Code …"
  git pull --ff-only
fi
GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
export GIT_COMMIT

# Backup + bisheriges Image sichern (falls der Container schon läuft)
if docker compose ps --status running --quiet app 2>/dev/null | grep -q .; then
  ./deploy/backup.sh
  docker tag "$IMAGE:latest" "$IMAGE:previous"
fi

echo "🔨 Baue Image für Commit $GIT_COMMIT …"
docker compose build --pull app
docker compose up -d app

echo -n "⏳ Warte auf Healthcheck "
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{ .State.Health.Status }}' photo-of-the-month 2>/dev/null || echo starting)"
  [[ "$status" == "healthy" ]] && break
  [[ "$status" == "unhealthy" ]] && break
  echo -n "."; sleep 2
done
echo
if [[ "$status" != "healthy" ]]; then
  echo "❌ App ist nicht gesund (Status: $status). Logs: docker compose logs app"
  echo "   Zurückrollen mit: ./deploy/update.sh --rollback"
  exit 1
fi

docker image prune -f >/dev/null
echo "✅ Läuft mit Commit $GIT_COMMIT"
