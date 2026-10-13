# Deployment mit Docker (hinter vorhandenem Caddy)

Das Projekt bringt ein `Dockerfile` mit, das Frontend und API in **ein** Image packt. `docker-compose.yml` startet nur
diesen App-Container; er lauscht ausschließlich auf `127.0.0.1:3000`. Der bereits auf dem VPS laufende Caddy leitet
die Domain dorthin weiter und kümmert sich um HTTPS.

```
Internet ──HTTPS──▶ Caddy (Host) ──▶ 127.0.0.1:3000 ──▶ Container photo-of-the-month
                                                          └── Volume potm-data → /data (SQLite + Bilder)
```

## Einrichtung (einmalig)

Voraussetzungen: Docker Engine mit Compose-Plugin (`curl -fsSL https://get.docker.com | sh`), Git, Caddy.

```bash
git clone https://github.com/Chr1ss0/Photo-of-the-Month.git /opt/potm
cd /opt/potm
cp .env.docker.example .env
nano .env                 # DOMAIN, ADMIN_USERNAME, ADMIN_PASSWORD (ggf. APP_PORT) setzen
./deploy/update.sh        # baut das Image und startet den Container
```

Dann im vorhandenen Caddy (z. B. `/etc/caddy/Caddyfile`) einen Block ergänzen – Vorlage: `deploy/Caddyfile.example`:

```caddy
foto.example.de {
	encode zstd gzip
	request_body {
		max_size 30MB
	}
	reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

`https://foto.example.de` öffnen und mit dem Admin-Konto anmelden. `ADMIN_PASSWORD` wird nur beim allerersten Start
gebraucht – danach aus der `.env` entfernen und das Passwort in der App unter „Konto“ ändern.

### Konfiguration (`.env`)

| Variable | Bedeutung |
| --- | --- |
| `DOMAIN` | Domain ohne `https://` – muss exakt der Adresse im Caddyfile entsprechen (CSRF-Schutz) |
| `APP_PORT` | Lokaler Port für Caddy (Standard `3000`) |
| `APP_TIMEZONE` | Zeitzone für Monatswechsel und Deadline |
| `ALLOW_REGISTRATION` | `false`, wenn nur der Admin Konten anlegen soll |
| `MAX_UPLOAD_MB` | Max. Dateigröße (im Caddyfile `max_size` etwas größer wählen) |
| `SESSION_TTL_HOURS` | Gültigkeit einer Anmeldung |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Erstes Admin-Konto |

Im Image fest gesetzt: `NODE_ENV=production`, `COOKIE_SECURE=true`, `TRUST_PROXY=1` (genau ein Proxy: Caddy),
`DATA_DIR=/data`. Der Container läuft als unprivilegierter Benutzer `node` und hat einen Healthcheck.

## Code geändert? Image aktualisieren

Das Image wird immer aus dem aktuellen Code gebaut – nach Änderungen genügt:

```bash
cd /opt/potm
./deploy/update.sh
```

Das Skript

1. holt den neuen Code (`git pull --ff-only`),
2. erstellt ein **Backup** (Datenbank + Bilder nach `./backups/`),
3. hebt das laufende Image als `photo-of-the-month:previous` auf,
4. baut das Image neu und startet den Container,
5. wartet auf den Healthcheck und meldet den laufenden Git-Commit.

Varianten:

```bash
./deploy/update.sh --no-pull     # lokal geänderten Code bauen, ohne git pull
./deploy/update.sh --rollback    # zurück zum vorherigen Image, falls etwas nicht stimmt
```

Datenbank-Migrationen laufen beim Start automatisch, die Daten im Volume `potm-data` bleiben erhalten.
Welcher Commit läuft, zeigt auch
`docker inspect -f '{{ index .Config.Labels "org.opencontainers.image.revision" }}' photo-of-the-month`.

## Betrieb

```bash
docker compose ps                                          # Status („healthy“)
docker compose logs -f app                                 # Logs
docker compose exec app node dist/scripts/createAdmin.js   # Admin anlegen / Passwort zurücksetzen
./deploy/backup.sh                                         # Backup manuell
```

**Tägliches Backup** per Cron (`crontab -e`):
`30 3 * * * cd /opt/potm && ./deploy/backup.sh >/dev/null` – Backups älter als 14 Tage werden gelöscht.
Zusätzlich außerhalb des Servers ablegen.

**Wiederherstellen:**

```bash
docker compose stop app
tar -xzf backups/<datum>.tar.gz -C /tmp
docker compose cp /tmp/<datum>/potm.sqlite app:/data/potm.sqlite
docker compose cp /tmp/<datum>/uploads/. app:/data/uploads/
docker compose start app
```

## Fehlersuche

| Symptom | Ursache |
| --- | --- |
| „Ungültige Herkunft“ / „CSRF“ beim Login | `DOMAIN` in `.env` passt nicht zur Domain im Caddyfile |
| Nach dem Login sofort wieder abgemeldet | Aufruf über `http://` – die App setzt nur sichere Cookies |
| 502 Bad Gateway von Caddy | Container läuft nicht oder `APP_PORT` ≠ Port im Caddyfile (`docker compose ps`) |
| Upload großer Dateien bricht ab | `request_body max_size` im Caddyfile erhöhen |
| Viele „Zu viele Anfragen“ (429) | Weiterer Proxy (z. B. Cloudflare) vor Caddy – dann `TRUST_PROXY=2` in `docker-compose.yml` setzen |
| Update schlägt beim Healthcheck fehl | `docker compose logs app` prüfen, ggf. `./deploy/update.sh --rollback` |
