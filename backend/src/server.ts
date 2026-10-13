import { config } from './config/env.js';
import { getDb } from './db/index.js';
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

createApp().listen(config.port, config.host, () => {
  console.log(`📷 Photo of the Month API läuft auf http://${config.host}:${config.port}`);
});
