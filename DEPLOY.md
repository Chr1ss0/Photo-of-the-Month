# Deployment mit Docker & Caddy

Das Projekt bringt ein `Dockerfile` (ein Image mit API und gebautem Frontend) und eine `docker-compose.yml`
mit [Caddy](https://caddyserver.com) als Reverse-Proxy mit. Caddy holt die HTTPS-Zertifikate automatisch.

```
Internet ──HTTPS──▶ caddy (:80/:443) ──▶ app (:3000, nur intern)
                                          └── Volume potm-data → /data (SQLite + Bilder)
```

## Voraussetzungen

- VPS mit Docker Engine und Compose-Plugin (`curl -fsSL https://get.docker.com | sh`)
- Eine Domain, deren A-/AAAA-Eintrag auf den Server zeigt
- Offene Ports 80 und 443 (z. B. `ufw allow 80,443/tcp && ufw allow 443/udp`)

## Installation

```bash
git clone https://github.com/Chr1ss0/Photo-of-the-Month.git /opt/potm
cd /opt/potm
cp .env.docker.example .env
nano .env          # DOMAIN, ADMIN_USERNAME, ADMIN_PASSWORD setzen
docker compose up -d --build
docker compose logs -f app     # „Admin-Konto … eingerichtet“ und „API läuft“
```

Danach `https://<deine-domain>` öffnen und mit dem Admin-Konto anmelden.
`ADMIN_PASSWORD` wird nur beim allerersten Start verwendet – danach aus der `.env` entfernen und das Passwort
in der App unter „Konto“ ändern.

### Konfiguration (`.env`)

| Variable | Bedeutung |
| --- | --- |
| `DOMAIN` | Domain ohne `https://`, z. B. `foto.example.de` (Caddy-Zertifikat + CSRF-Allowlist) |
| `APP_TIMEZONE` | Zeitzone für Monatswechsel und Deadline |
| `ALLOW_REGISTRATION` | `false`, wenn nur der Admin Konten anlegen soll |
| `MAX_UPLOAD_MB` | Max. Dateigröße (Caddy erlaubt bis 30 MB, siehe `deploy/Caddyfile`) |
| `SESSION_TTL_HOURS` | Gültigkeit einer Anmeldung |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Erstes Admin-Konto |

Im Image sind bereits gesetzt: `NODE_ENV=production`, `COOKIE_SECURE=true`, `TRUST_PROXY=1`, `DATA_DIR=/data`.
Die App läuft als unprivilegierter Benutzer `node` und hat einen eingebauten Healthcheck.

## Betrieb

```bash
docker compose ps                                     # Status (app sollte „healthy“ sein)
docker compose logs -f app                            # Logs
docker compose exec app node dist/scripts/createAdmin.js   # Admin anlegen / Passwort zurücksetzen
./deploy/backup.sh                                    # Backup nach ./backups/
```

**Updates:**

```bash
git pull
docker compose up -d --build
docker image prune -f
```

Datenbank-Migrationen laufen beim Start automatisch. Daten liegen im Volume `potm-data` und bleiben bei Updates erhalten.

**Backup:** `deploy/backup.sh` erstellt eine konsistente Kopie der Datenbank plus aller Bilder als `.tar.gz` und
löscht Backups älter als 14 Tage. Täglich per Cron:
`30 3 * * * cd /opt/potm && ./deploy/backup.sh >/dev/null`. Backups zusätzlich außerhalb des Servers ablegen.

**Wiederherstellen:**

```bash
docker compose stop app
tar -xzf backups/<datum>.tar.gz -C /tmp
docker compose cp /tmp/<datum>/potm.sqlite app:/data/potm.sqlite
docker compose cp /tmp/<datum>/uploads/. app:/data/uploads/
docker compose start app
```

## Nur das Image (eigener Reverse-Proxy)

Läuft bereits ein Caddy/nginx auf dem Host:

```bash
docker build -t photo-of-the-month .
docker run -d --name potm --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v potm-data:/data \
  -e ALLOWED_ORIGINS=https://foto.example.de \
  -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD='ein-langes-passwort' \
  photo-of-the-month
```

Im Host-Caddyfile dann `reverse_proxy 127.0.0.1:3000`.

## Fehlersuche

| Symptom | Ursache |
| --- | --- |
| „Ungültige Herkunft“ / „CSRF“ beim Login | `DOMAIN` passt nicht zur aufgerufenen Adresse |
| Nach dem Login sofort wieder abgemeldet | Aufruf über `http://` – die App setzt nur sichere Cookies |
| Viele „Zu viele Anfragen“ (429) | Proxy-Kette geändert: `TRUST_PROXY` muss der Anzahl der Proxies entsprechen |
| Upload großer Dateien bricht ab | `request_body max_size` in `deploy/Caddyfile` erhöhen |
| Kein Zertifikat | DNS zeigt noch nicht auf den Server oder Port 80/443 blockiert (`docker compose logs caddy`) |
