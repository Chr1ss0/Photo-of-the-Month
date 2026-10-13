# Deployment (hinter vorhandenem Caddy)

Zwei Varianten – beide nutzen dasselbe `Dockerfile`:

- **A – Docker** mit `docker compose` (unten)
- **B – Rootless Podman** als Systembenutzer ohne Shell, gestartet über systemd ([weiter unten](#variante-b-rootless-podman-systembenutzer-ohne-shell))

# Variante A: Docker

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

---

# Variante B: Rootless Podman (Systembenutzer ohne Shell)

Die App läuft als eigener **Systembenutzer `potm` ohne Login-Shell** in rootless Podman. Gestartet und überwacht wird sie
von systemd über eine [Quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)-Unit – auch nach
einem Reboot, ohne dass sich jemand anmelden muss. Alle Verwaltungsskripte laufen als root und führen Podman als `potm` aus.

```
Caddy (Host) ──▶ 127.0.0.1:3000 ──▶ rootless Podman (Benutzer potm, nologin)
                                     └── Container photo-of-the-month (uid node → unprivilegierte subuid)
                                           ├── Root-Dateisystem schreibgeschützt, keine Capabilities
                                           └── Volume potm-data → /data
```

**Sicherheitsgewinn gegenüber Docker:** Es gibt keinen root-Daemon. Selbst ein Ausbruch aus dem Container landet bei einer
unprivilegierten subuid des Benutzers `potm`, der sich nicht anmelden kann. Zusätzlich setzt die Unit `ReadOnly=true`,
`DropCapability=ALL` und `NoNewPrivileges=true`.

## Voraussetzungen

**Debian 13 „Trixie“** (Podman 5.x) oder neuer. Debian 12 bringt nur Podman 4.3 ohne Quadlet mit – dort zuerst auf
Debian 13 aktualisieren (oder Variante A nutzen).

```bash
sudo apt install podman uidmap passt dbus-user-session git
```

## Einrichtung (einmalig)

```bash
sudo git clone https://github.com/Chr1ss0/Photo-of-the-Month.git /opt/potm
cd /opt/potm
sudo ./deploy/podman/setup.sh        # 1. Lauf: legt Benutzer und /etc/potm/potm.env an
sudo nano /etc/potm/potm.env         # ALLOWED_ORIGINS=https://deine-domain, Admin-Zugang, ggf. APP_PORT
sudo ./deploy/podman/setup.sh        # 2. Lauf: baut das Image und startet die App
```

`setup.sh` ist mehrfach ausführbar und erledigt:

1. Systembenutzer `potm` mit Home `/var/lib/potm` und Shell `/usr/sbin/nologin`
2. subuid/subgid-Bereich für `potm` (wird bei Systembenutzern nicht automatisch vergeben)
3. `loginctl enable-linger potm` – die systemd-Benutzerinstanz läuft ohne Login und startet die App beim Booten
4. Konfiguration `/etc/potm/potm.env` (Besitzer `root:potm`, Rechte `0640`)
5. Quadlet-Unit nach `/etc/containers/systemd/users/<uid>/photo-of-the-month.container` (gehört root – `potm` kann sie
   nicht verändern)
6. Image bauen, Dienst starten, Healthcheck abwarten

Danach im Caddyfile `reverse_proxy 127.0.0.1:3000` eintragen (Vorlage `deploy/Caddyfile.example`) und
`sudo systemctl reload caddy`. `ADMIN_PASSWORD` nach dem ersten Login aus `/etc/potm/potm.env` entfernen.

## Code geändert? Aktualisieren

```bash
cd /opt/potm
sudo ./deploy/podman/update.sh              # git pull, Backup, Image neu bauen, Neustart, Healthcheck
sudo ./deploy/podman/update.sh --no-pull    # lokalen Stand bauen (auch nach Änderungen an potm.env)
sudo ./deploy/podman/update.sh --rollback   # zurück zum vorherigen Image
```

Vor jedem Update wird ein Backup erstellt und das laufende Image als `localhost/photo-of-the-month:previous` aufgehoben.
Hinter einem Proxy oder für Spezialfälle lassen sich Optionen an `podman build` durchreichen:
`sudo POTM_BUILD_OPTS="--network=host" ./deploy/podman/update.sh`.

## Betrieb

```bash
sudo ./deploy/podman/status.sh            # Dienst, Container, laufender Commit
sudo ./deploy/podman/status.sh --logs     # Logs live (journald)
sudo ./deploy/podman/status.sh --admin    # Admin anlegen / Passwort zurücksetzen
sudo ./deploy/podman/backup.sh            # Backup nach /var/backups/potm (nur root lesbar)
sudo ./deploy/podman/restore.sh /var/backups/potm/potm-<datum>.tar.gz
```

**Tägliches Backup** (root-Crontab, `sudo crontab -e`):
`30 3 * * * /opt/potm/deploy/podman/backup.sh >/dev/null` – Backups älter als 14 Tage werden gelöscht.

Direkt mit Podman/systemd arbeiten (als root):
`sudo runuser -u potm -- env XDG_RUNTIME_DIR=/run/user/$(id -u potm) podman ps` bzw.
`... systemctl --user status photo-of-the-month`.

## Fehlersuche

| Symptom | Ursache / Lösung |
| --- | --- |
| `setup.sh`: „Benutzer-systemd läuft nicht“ | `dbus-user-session` installieren, dann erneut ausführen |
| `newuidmap … operation not permitted` | Paket `uidmap` fehlt oder kein subuid-Eintrag: `grep potm /etc/subuid` |
| Container startet nach Reboot nicht | Linger aktiv? `loginctl show-user potm -p Linger` |
| Unit wird nicht gefunden | Podman < 4.4 (Debian 12) – Quadlet nicht verfügbar |
| „Ungültige Herkunft“ / „CSRF“ | `ALLOWED_ORIGINS` in `/etc/potm/potm.env` passt nicht zur Domain |
| Port geändert | `APP_PORT` in `potm.env` ändern, `setup.sh` erneut ausführen, Caddyfile anpassen |
