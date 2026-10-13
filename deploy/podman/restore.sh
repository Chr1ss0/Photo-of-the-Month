#!/usr/bin/env bash
# Stellt ein mit backup.sh erstelltes Backup wieder her (als root):
#   sudo ./deploy/podman/restore.sh /var/backups/potm/potm-2026-10-13_031500.tar.gz
# Achtung: ersetzt die aktuelle Datenbank und alle Bilder.
set -euo pipefail
# shellcheck source=common.sh
source "$(dirname "$0")/common.sh"
require_root

file="${1:?Pfad zur Backup-Datei angeben}"
[[ -f "$file" ]] || { echo "Datei nicht gefunden: $file" >&2; exit 1; }
gzip -t "$file"

read -r -p "Aktuelle Daten durch $(basename "$file") ersetzen? [j/N] " answer
[[ "$answer" =~ ^[jJyY]$ ]] || { echo "Abgebrochen."; exit 1; }

usystemctl stop "$SERVICE"
# Temporärer Container mit demselben Volume entpackt das Backup
pm run --rm -i --user node --network none -v potm-data:/data --entrypoint sh "$IMAGE:latest" -c '
  set -e
  cd /data
  rm -rf uploads potm.sqlite potm.sqlite-wal potm.sqlite-shm
  tar -xzf -
  mv potm-backup.sqlite potm.sqlite
' < "$file"
usystemctl start "$SERVICE"
wait_healthy
echo "✅ Wiederhergestellt aus $file"
