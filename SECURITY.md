# Sicherheit

Dieses Dokument beschreibt die Schutzmaßnahmen von *Photo of the Month* und die durchgeführten Sicherheitstests.

## Bedrohungsmodell (Kurzfassung)

Angreifer sind (a) anonyme Besucher, (b) angemeldete Benutzer, die fremde Daten sehen oder ändern wollen, und
(c) fremde Websites, die den Browser eines angemeldeten Benutzers missbrauchen. Schützenswert sind Konten, noch nicht
veröffentlichte Fotos (bis zum Fristende), Standortdaten und die Integrität von Galerie und Kommentaren.

## Maßnahmen

### Authentifizierung & Sessions
- Passwörter: **scrypt** (N=32768, r=8, p=1, 16 Byte Salt), Vergleich mit `timingSafeEqual`, Mindestlänge 10.
- Sessions: 256-Bit-Zufallstoken im Cookie, in der DB nur als **SHA-256-Hash** gespeichert.
- Cookie: `HttpOnly`, `SameSite=Strict`, `Path=/`, in Produktion `Secure` + `__Host-`-Präfix.
- Session-Fixation: beim Login/Registrieren wird ein vorhandenes Token verworfen und ein neues ausgestellt.
- Passwortwechsel und Admin-Passwort-Reset beenden alle Sessions; Sperren/Rollenwechsel wirken sofort.
- Keine Benutzer-Enumeration beim Login: identische Meldung, Dummy-Hashvergleich bei unbekanntem Namen.
- Brute-Force-Schutz: Rate-Limits pro IP **und** pro Benutzername (Login), außerdem für Registrierung, Uploads und Kommentare.
  Hinweis: Das Limit pro Benutzername kann von Dritten ausgelöst werden (kurze Sperre von 15 min) – bewusster Kompromiss
  gegen verteiltes Passwort-Raten.

### CSRF
- Double-Submit-Token (`X-CSRF-Token`-Header muss dem Cookie entsprechen, Vergleich zeitkonstant) für alle
  schreibenden Requests – auch Login (verhindert Login-CSRF).
- Zusätzlich Prüfung von `Origin`/`Referer` gegen eine Allowlist und `SameSite=Strict`-Cookies.

### Autorisierung
- Alle Endpunkte außer Login/Registrierung erfordern eine Session; `/api/admin/*` erfordert die Admin-Rolle.
- Fotos anderer sind **erst nach Fristende** sichtbar. Nicht sichtbare Fotos werden wie nicht existierende behandelt (404),
  damit IDs nicht ausgespäht werden können – das gilt für Details, Bilddateien, Kommentare, Bearbeiten und Löschen.
- Austausch/Löschen nur durch den Urheber und nur vor Fristende (Admins dürfen moderieren).
- GPS-Daten werden für andere ausgeblendet, wenn der Urheber den Standort verbirgt.
- Schutz vor Selbstaussperrung: der letzte aktive Admin kann nicht herabgestuft, gesperrt oder gelöscht werden.

### Uploads
- Prüfung über den **tatsächlichen Dateiinhalt** (sharp), nicht über Endung/MIME. Erlaubt: JPEG, PNG, WebP, AVIF, HEIF, TIFF.
  SVG/HTML werden abgelehnt.
- Größenlimit (Standard 25 MB), max. 120 Megapixel (Schutz vor Dekompressionsbomben), genau eine Datei.
- Bilder werden **neu kodiert** – eingebettete Metadaten (inkl. GPS) und angehängte Fremddaten (Polyglot-Dateien) verschwinden.
  EXIF-Werte werden vorher ausgelesen, validiert (Wertebereiche) und von Steuerzeichen befreit.
- Zufällige Dateinamen (UUID), Speicherung außerhalb des Webroots, Auslieferung nur über eine Route mit Zugriffskontrolle,
  `X-Content-Type-Options: nosniff` und `Content-Security-Policy: sandbox` auf Bildantworten.

### Eingaben & Ausgaben
- Validierung aller Eingaben mit **Zod**, unbekannte Felder werden abgelehnt (`strict`, kein Mass-Assignment).
- Ausschließlich parametrisierte SQL-Statements (better-sqlite3).
- Längenlimits, Entfernen von Steuerzeichen, JSON-Body max. 20 KB, einfacher Query-Parser (keine verschachtelten Objekte).
- Frontend rendert Benutzertexte nur über Textinterpolation (automatisch escaped); `v-html` ist per ESLint verboten.
- Externe Links (OpenStreetMap) werden nur aus validierten Zahlen gebaut und mit `rel="noopener noreferrer"` geöffnet.
- Weiterleitungen nach dem Login sind auf interne Pfade beschränkt (kein Open Redirect).
- Fehlerantworten enthalten keine Stacktraces oder internen Details.

### HTTP-Header (helmet)
Strikte CSP (`default-src 'self'`, kein Inline-Script, `frame-ancestors 'none'`, `object-src 'none'`), HSTS in Produktion,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy: same-origin`, restriktive `Permissions-Policy`,
`Cache-Control: no-store` für API-Antworten, kein `X-Powered-By`. Das Frontend lädt keine externen Ressourcen
(keine Google Fonts, keine CDNs).

## Durchgeführte Tests

| Prüfung | Ergebnis |
| --- | --- |
| Backend-Tests (`backend/tests`, 49 Tests) – u. a. Auth, Session-Fixation/-Ablauf, Passwortwechsel, CSRF (fehlend/falsch/fremde Origin), IDOR auf allen Foto-Endpunkten, Fristlogik, Upload von HTML/SVG/Polyglot/Übergröße/Mehrfachdateien, Metadaten-Entfernung, SQL-Injection- und Path-Traversal-Versuche, Mass-Assignment, XSS-Payloads, Rate-Limiting, Admin-Rechte | ✅ alle bestanden |
| Frontend-Tests (`frontend/src/**/*.test.ts`, 24 Tests) – XSS-Escaping in Kommentaren und EXIF-Box, Open-Redirect-Schutz, CSRF-Header im HTTP-Client, sichere Kartenlinks | ✅ alle bestanden |
| ESLint-Sicherheitsregeln (`vue/no-v-html`, `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`) | ✅ keine Verstöße |
| `npm audit` Backend & Frontend | ✅ 0 Schwachstellen |
| `scripts/security-probe.sh` gegen Produktions-Build (24 Black-Box-Checks: Auth-Pflicht, CSRF, Path-Traversal, Header, Brute-Force) | ✅ alle bestanden |
| Browser-Durchlauf (Playwright) im Produktionsmodus mit aktiver CSP: Login, Upload, Galerie, Kommentar mit `<script>`-Payload, Admin-Seiten | ✅ keine CSP-Verletzungen, Payload als Text dargestellt |

## Empfehlungen für den Betrieb
- Nur hinter HTTPS betreiben, `COOKIE_SECURE=true`, `TRUST_PROXY` korrekt setzen.
- `ADMIN_PASSWORD` nach dem ersten Start aus der Umgebung entfernen bzw. ändern.
- `backend/data/` regelmäßig sichern und nicht öffentlich ausliefern.
- Abhängigkeiten regelmäßig mit `npm run audit` prüfen.
