#!/usr/bin/env bash
# Sichert Datenbank (konsistente SQLite-Kopie) und Bilder aus dem laufenden Container:
#   sudo ./deploy/podman/backup.sh [Zielordner]     (Standard: /var/backups/potm)
# Cron (root): 30 3 * * * /opt/potm/deploy/podman/backup.sh >/dev/null
set -euo pipefail
# shellcheck source=common.sh
source "$(dirname "$0")/common.sh"
require_root

dest_dir="${1:-$POTM_BACKUP_DIR}"
install -d -m 0700 "$dest_dir"
file="$dest_dir/potm-$(date +%F_%H%M%S).tar.gz"

container_running || { echo "Container läuft nicht – kein Backup möglich." >&2; exit 1; }

# Im Container: SQLite-Backup nach /tmp (tmpfs), dann Datenbank + Uploads als tar-Stream ausgeben
pm exec "$CONTAINER" sh -c '
  set -e
  node -e "require(\"better-sqlite3\")(\"/data/potm.sqlite\", { readonly: true })
    .backup(\"/tmp/potm-backup.sqlite\").catch((e) => { console.error(e); process.exit(1); })"
  mkdir -p /data/uploads
  tar -cf - -C /tmp potm-backup.sqlite -C /data uploads
  rm -f /tmp/potm-backup.sqlite
' | gzip > "$file.part"
mv "$file.part" "$file"
chmod 0600 "$file"

find "$dest_dir" -maxdepth 1 -name 'potm-*.tar.gz' -mtime +14 -delete
echo "💾 Backup: $file ($(du -h "$file" | cut -f1))"
