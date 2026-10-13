# 📷 Photo of the Month

Eine WebApp für monatliche Foto-Challenges: Jeden Monat würfelt ein Generator eine neue Aufgabe, alle Teilnehmenden
haben bis zum letzten Tag des Monats Zeit, ihr Foto hochzuladen – danach landet alles in der nach Monaten sortierten
Galerie.

- **Frontend:** Vue 3 + TypeScript, Vite, Pinia, Vue Router, Tailwind CSS v4
- **Backend:** Node.js + Express 5 (REST-API, TypeScript), SQLite (better-sqlite3), sharp, exifr
- **Login:** serverseitige Sessions über HttpOnly-Cookies, CSRF-Schutz, scrypt-Passworthashes

## Funktionen

| Bereich | Beschreibung |
| --- | --- |
| **Challenge-Generator** | Kombiniert zum Monatsbeginn automatisch ein Thema aus dem Themen-Pool mit einem optionalen „Twist“ (z. B. *Spiegelungen* + *Nur Schwarz-Weiß*). Themen der letzten 12 Monate werden ausgelassen. Admins können neu würfeln oder Aufgaben manuell festlegen – auch im Voraus. |
| **Upload** | Ein Foto pro Person und Monat, mit Beschreibung. Bis zum Ablauf der Frist (letzter Tag 23:59, Zeitzone konfigurierbar) kann das Foto **ausgetauscht** oder gelöscht werden. |
| **EXIF-Info-Box** | Blende, Verschlusszeit, ISO, Weißabgleich, Belichtungskorrektur (EV), Brennweite, Kamera/Objektiv, Aufnahmezeit und GPS (mit OpenStreetMap-Link) werden beim Upload ausgelesen und unter dem Bild angezeigt. Der Standort lässt sich pro Foto ausblenden. |
| **Galerie** | Nach Ablauf der Frist erscheinen alle Einsendungen eines Monats gemeinsam – mit Challenge-Namen, Benutzer und EXIF-Daten. Vorher sind Fotos nur für ihre Urheber sichtbar. |
| **Kommentare** | Angemeldete Benutzer kommentieren Fotos in der Galerie; eigene Kommentare (und als Admin alle) lassen sich löschen. |
| **Meine Fotos** | Alle eigenen Einsendungen mit Status („läuft · austauschbar“ / „in der Galerie“). |
| **Admin-Panel** | Statistiken, Challenges (würfeln, bearbeiten, planen), Themen-Pool, Benutzerverwaltung (Rolle, sperren, Passwort setzen, löschen) und Moderation von Fotos & Kommentaren. |
| **Design** | Minimalistisch mit subtilen Foto-Elementen: Blenden-Logo, Sucher-Ecken, Drittel-Raster, Filmstreifen, Filmkorn, Countdown im Kamera-Display-Stil. Hell/Dunkel-Modus. |

## Schnellstart

Voraussetzung: **Node.js ≥ 20.12** (getestet mit 22).

```bash
npm run install:all                 # Abhängigkeiten für backend/ und frontend/
cp backend/.env.example backend/.env
# in backend/.env ADMIN_USERNAME und ADMIN_PASSWORD setzen (Passwort mind. 10 Zeichen)
npm run seed:demo                   # optional: Demo-Benutzer, vergangene Monate und Beispielbilder
npm run dev                         # Backend :3000 + Frontend :5173
```

Danach <http://localhost:5173> öffnen. Der Admin wird beim ersten Start aus `ADMIN_USERNAME`/`ADMIN_PASSWORD`
angelegt (alternativ interaktiv: `npm run create-admin --prefix backend`).
Demo-Benutzer: `mara`, `jonas`, `lea`, `tim` – Passwort `demo-passwort-123`.

### Produktion

```bash
npm run build
NODE_ENV=production COOKIE_SECURE=true TRUST_PROXY=1 ALLOWED_ORIGINS=https://deine-domain.de npm start
```

Das Backend liefert dann auch das gebaute Frontend aus (`frontend/dist`), Frontend und API laufen unter einer Origin.
Den Server hinter einen HTTPS-Reverse-Proxy (nginx, Caddy …) stellen. Datenbank und Bilder liegen in `backend/data/` –
dieses Verzeichnis sichern.

Wichtige Variablen (siehe `backend/.env.example`):

| Variable | Bedeutung |
| --- | --- |
| `APP_TIMEZONE` | Zeitzone für Monatswechsel und Deadline (Standard `Europe/Berlin`) |
| `COOKIE_SECURE` | `true` hinter HTTPS – setzt `Secure` und das `__Host-`-Präfix |
| `TRUST_PROXY` | Anzahl vorgeschalteter Proxies (wichtig für korrekte IP-basierte Rate-Limits) |
| `ALLOWED_ORIGINS` | Erlaubte Origins für schreibende Requests |
| `ALLOW_REGISTRATION` | Offene Registrierung an/aus |
| `MAX_UPLOAD_MB` | Max. Dateigröße (Standard 25 MB) |
| `CHALLENGE_TWIST_CHANCE` | Wahrscheinlichkeit (0–100) für einen zusätzlichen Twist |

## Projektstruktur

```
backend/src
├── app.ts / server.ts        Express-App (Middleware-Kette) und Start inkl. Monatswechsel-Job
├── config/env.ts             Konfiguration aus Umgebungsvariablen
├── db/                       SQLite-Verbindung, Migrationen (schema.ts), Start-Themen (seed.ts)
├── middleware/               auth, csrf, cookies, rateLimit, upload, errorHandler
├── modules/                  je Fachbereich: *.routes.ts (HTTP) + *.service.ts (Logik)
│   ├── auth/                 Registrierung, Login, Sessions, Passwort
│   ├── challenges/           Generator + Challenge-Verwaltung
│   ├── submissions/          Upload, Austausch, Sichtbarkeit, Bildauslieferung
│   ├── comments/  gallery/  admin/
├── services/                 exif.ts (EXIF auslesen), imageStorage.ts (prüfen, neu kodieren, speichern)
└── utils/                    Zeit/Zeitzonen, Krypto, Validierung, Fehler

frontend/src
├── api/                      HTTP-Client (CSRF, Fehler) + ein Modul pro API-Bereich, Typen
├── components/
│   ├── ui/                   Basis-Bausteine (Button, Input, Toggle, Dialog, Toast …)
│   ├── layout/               Header, Footer, Logo, Seitenköpfe
│   ├── photo/                ExifInfoBox, PhotoCard, PhotoUploader, Kommentare, SubmissionEditor …
│   └── challenge/            ChallengeHero, Countdown
├── composables/              useCountdown, useTheme, useToast, useAsync
├── stores/                   Pinia (Auth)
├── router/                   Routen + Guards (Login/Admin)
├── utils/                    Formatierung (EXIF, Datum), Upload-Prüfung, sichere Redirects
└── views/                    Seiten, inkl. views/admin/
```

Neue Funktionen folgen dem Muster: Backend-Modul (`routes` + `service`) → API-Modul im Frontend → Komponente/View.

## REST-API (Auszug)

| Methode & Pfad | Beschreibung |
| --- | --- |
| `GET /api/auth/csrf` | CSRF-Token holen (setzt Cookie) |
| `POST /api/auth/register` · `login` · `logout` · `password` | Konto & Session |
| `GET /api/auth/me` | Aktueller Benutzer |
| `GET /api/challenges/current` | Aktuelle Aufgabe, Deadline, eigene Einsendung |
| `POST /api/submissions` | Foto einreichen (multipart: `photo`, `description`, `showLocation`) |
| `PUT /api/submissions/:id/photo` | Foto austauschen (nur vor Fristende) |
| `PATCH` / `DELETE /api/submissions/:id` | Beschreibung/Standort ändern, löschen |
| `GET /api/submissions/:id/image?size=thumb` | Bild mit Zugriffskontrolle |
| `GET /api/submissions/mine` | Eigene Fotos |
| `GET/POST /api/submissions/:id/comments`, `DELETE /api/comments/:id` | Kommentare |
| `GET /api/gallery`, `GET /api/gallery/:YYYY-MM` | Galerie nach Monaten |
| `/api/admin/*` | stats, users, themes, challenges, submissions, comments |

Schreibende Requests benötigen den Header `X-CSRF-Token`.

## Tests & Qualität

```bash
npm test                            # Backend (Vitest + Supertest) und Frontend (Vitest + Vue Test Utils)
npm run lint                        # Typecheck beider Projekte + ESLint (u. a. Verbot von v-html)
npm run audit                       # npm audit für beide Projekte
./scripts/security-probe.sh http://127.0.0.1:3000   # Black-Box-Prüfung gegen laufende Instanz
```

Details zu den Sicherheitsmaßnahmen und Prüfergebnissen: [SECURITY.md](SECURITY.md).
