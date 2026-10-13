import { config } from '../config/env.js';
import { getDb } from '../db/index.js';
import { passwordSchema, usernameSchema } from '../modules/auth/auth.schemas.js';
import { createUser } from '../modules/auth/auth.service.js';

/**
 * Legt beim Start einen Admin an, falls ADMIN_USERNAME/ADMIN_PASSWORD gesetzt sind
 * und noch kein Admin existiert.
 */
export async function bootstrapAdmin(): Promise<void> {
  const { username, password } = config.admin;
  const hasAdmin = getDb().prepare("SELECT 1 FROM users WHERE role = 'admin'").get();
  if (hasAdmin) return;
  if (!username || !password) {
    console.warn('⚠️  Kein Admin-Konto vorhanden. Setze ADMIN_USERNAME und ADMIN_PASSWORD oder nutze `npm run create-admin`.');
    return;
  }
  const u = usernameSchema.safeParse(username);
  const p = passwordSchema.safeParse(password);
  if (!u.success || !p.success) {
    console.error('❌ ADMIN_USERNAME/ADMIN_PASSWORD ungültig (Passwort mind. 10 Zeichen).');
    return;
  }
  const existing = getDb().prepare('SELECT id FROM users WHERE username = ?').get(u.data) as { id: number } | undefined;
  if (existing) {
    getDb().prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existing.id);
  } else {
    await createUser(u.data, p.data, 'admin');
  }
  console.log(`👤 Admin-Konto „${u.data}“ eingerichtet.`);
}
