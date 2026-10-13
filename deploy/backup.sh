#!/usr/bin/env bash
# Sichert Datenbank und Bilder aus dem laufenden Docker-Container.
#   ./deploy/backup.sh [Zielordner]      (Standard: ./backups)
# Per Cron täglich: 30 3 * * * cd /opt/potm && ./deploy/backup.sh >/dev/null
set -euo pipefail
cd "$(dirname "$0")/.."
DEST="${1:-./backups}/$(date +%F_%H%M)"
mkdir -p "$DEST"

# Konsistente Kopie der SQLite-Datenbank (auch bei laufender App)
docker compose exec -T app node -e "
  require('better-sqlite3')('/data/potm.sqlite', { readonly: true })
    .backup('/tmp/potm-backup.sqlite')
    .then(() => console.log('Datenbank gesichert'))"
docker compose cp app:/tmp/potm-backup.sqlite "$DEST/potm.sqlite"
docker compose exec -T app rm -f /tmp/potm-backup.sqlite
docker compose exec -T app mkdir -p /data/uploads
docker compose cp app:/data/uploads "$DEST/uploads"
tar -czf "$DEST.tar.gz" -C "$(dirname "$DEST")" "$(basename "$DEST")" && rm -rf "$DEST"

# Backups älter als 14 Tage entfernen
find "$(dirname "$DEST")" -maxdepth 1 -name '*.tar.gz' -mtime +14 -delete
echo "Backup: $DEST.tar.gz"
