/**
 * Interaktives Anlegen bzw. Hochstufen eines Admin-Kontos:
 *   npm run create-admin
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { getDb } from '../db/index.js';
import { passwordSchema, usernameSchema } from '../modules/auth/auth.schemas.js';
import { createUser, setPassword } from '../modules/auth/auth.service.js';

const rl = createInterface({ input: stdin, output: stdout });
try {
  const username = usernameSchema.parse(await rl.question('Admin-Benutzername: '));
  const password = passwordSchema.parse(await rl.question('Passwort (mind. 10 Zeichen): '));
  const existing = getDb().prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number } | undefined;
  if (existing) {
    getDb().prepare("UPDATE users SET role = 'admin', disabled = 0 WHERE id = ?").run(existing.id);
    await setPassword(existing.id, password);
    console.log(`Bestehendes Konto „${username}“ ist jetzt Admin.`);
  } else {
    await createUser(username, password, 'admin');
    console.log(`Admin „${username}“ angelegt.`);
  }
} catch (err) {
  console.error('Fehler:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  rl.close();
}
