import { config } from './config/env.js';
import { closeDb, getDb } from './db/index.js';
import { bootstrapAdmin } from './scripts/bootstrapAdmin.js';
import { createApp } from './app.js';
import { purgeExpiredSessions } from './modules/auth/auth.service.js';
import { ensureChallenge } from './modules/challenges/challenge.service.js';

getDb();
await bootstrapAdmin();

// Aktuelle Challenge sicherstellen und regelmäßig prüfen (Monatswechsel)
const tick = () => {
  try {
    ensureChallenge();
    purgeExpiredSessions();
  } catch (err) {
    console.error('Wartungsaufgabe fehlgeschlagen:', err);
  }
};
tick();
setInterval(tick, 10 * 60_000).unref();

const server = createApp().listen(config.port, config.host, () => {
  console.log(`📷 Photo of the Month API läuft auf http://${config.host}:${config.port}`);
});

// Sauber beenden (z. B. bei `podman stop` / `docker stop`): keine neuen Verbindungen annehmen,
// laufende Anfragen abschließen, Datenbank schließen. Wichtig im Container, wo Node PID 1 ist
// und SIGTERM sonst ignoriert würde.
function shutdown(signal: string): void {
  console.log(`${signal} empfangen – fahre herunter …`);
  server.close(() => {
    closeDb();
    process.exit(0);
  });
  server.closeIdleConnections();
  setTimeout(() => process.exit(0), 8000).unref();
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
