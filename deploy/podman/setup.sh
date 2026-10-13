#!/usr/bin/env bash
# Einmalige Einrichtung für rootless Podman auf Debian (als root ausführen):
#   sudo ./deploy/podman/setup.sh
# Legt den Systembenutzer potm (ohne Login-Shell) an, richtet subuid/subgid, Linger,
# Konfiguration und Quadlet-Unit ein und startet die App. Mehrfach ausführbar.
set -euo pipefail
# shellcheck source=common.sh
source "$(dirname "$0")/common.sh"
require_root

for cmd in podman runuser loginctl newuidmap; do
  command -v "$cmd" >/dev/null || {
    echo "$cmd fehlt – installieren mit: apt install podman uidmap passt dbus-user-session" >&2; exit 1; }
done

# 1. Systembenutzer ohne Shell
if ! id "$POTM_USER" >/dev/null 2>&1; then
  useradd --system --user-group --create-home --home-dir "$POTM_HOME" --shell /usr/sbin/nologin \
    --comment "Photo of the Month (rootless Podman)" "$POTM_USER"
  echo "👤 Benutzer $POTM_USER angelegt (Home $POTM_HOME, Shell nologin)"
fi

# 2. subuid/subgid-Bereich (bei Systembenutzern nicht automatisch vergeben)
if ! grep -q "^$POTM_USER:" /etc/subuid 2>/dev/null || ! grep -q "^$POTM_USER:" /etc/subgid 2>/dev/null; then
  start=$(cat /etc/subuid /etc/subgid 2>/dev/null | awk -F: 'BEGIN{m=100000} {e=$2+$3; if(e>m)m=e} END{print m}')
  usermod --add-subuids "$start-$((start + 65535))" --add-subgids "$start-$((start + 65535))" "$POTM_USER"
  echo "🔢 subuid/subgid $start-$((start + 65535)) vergeben"
fi

# 3. Linger: Benutzer-systemd läuft ohne Login und startet die App beim Booten
loginctl enable-linger "$POTM_USER"
uid="$(potm_uid)"
systemctl start "user@$uid.service"
for _ in $(seq 1 20); do [[ -S "/run/user/$uid/bus" ]] && break; sleep 0.5; done
[[ -S "/run/user/$uid/bus" ]] || { echo "Benutzer-systemd läuft nicht (fehlt dbus-user-session?)" >&2; exit 1; }

# 4. Konfiguration
install -d -m 0750 -o root -g "$POTM_USER" "$(dirname "$POTM_ENV")"
if [[ ! -f "$POTM_ENV" ]]; then
  install -m 0640 -o root -g "$POTM_USER" "$REPO_DIR/deploy/podman/potm.env.example" "$POTM_ENV"
  echo "📝 $POTM_ENV angelegt – bitte ALLOWED_ORIGINS und Admin-Zugang anpassen und setup.sh erneut ausführen."
  exit 0
fi
if grep -q "foto.example.de" "$POTM_ENV"; then
  echo "📝 Bitte zuerst $POTM_ENV anpassen (ALLOWED_ORIGINS enthält noch die Beispiel-Domain)." >&2
  exit 1
fi
chown root:"$POTM_USER" "$POTM_ENV" && chmod 0640 "$POTM_ENV"
app_port="$(sed -n 's/^APP_PORT=\([0-9]\{2,5\}\)\s*$/\1/p' "$POTM_ENV" | tail -1)"
app_port="${app_port:-3000}"

# 5. Quadlet-Unit (gehört root – der Dienstbenutzer kann sie nicht verändern)
unit_dir="/etc/containers/systemd/users/$uid"
install -d -m 0755 "$unit_dir"
sed -e "s#@APP_PORT@#$app_port#" -e "s#@ENV_FILE@#$POTM_ENV#" \
  "$REPO_DIR/deploy/podman/photo-of-the-month.container" > "$unit_dir/photo-of-the-month.container"
chmod 0644 "$unit_dir/photo-of-the-month.container"
echo "⚙️  Quadlet-Unit installiert: $unit_dir/photo-of-the-month.container (Port 127.0.0.1:$app_port)"

# 6. Image bauen und starten
"$REPO_DIR/deploy/podman/update.sh" --no-pull

cat <<MSG

Fertig. Im Caddyfile ergänzen und Caddy neu laden:

  deine-domain.de {
      encode zstd gzip
      request_body {
          max_size 30MB
      }
      reverse_proxy 127.0.0.1:$app_port
  }

Status:  sudo ./deploy/podman/status.sh          Logs: sudo ./deploy/podman/status.sh --logs
Update:  sudo ./deploy/podman/update.sh          Backup: sudo ./deploy/podman/backup.sh
MSG
