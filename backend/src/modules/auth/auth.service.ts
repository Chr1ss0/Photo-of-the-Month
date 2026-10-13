import { getDb } from '../../db/index.js';
import { config } from '../../config/env.js';
import { hashPassword, randomToken, sha256, verifyPassword } from '../../utils/crypto.js';
import { conflict, forbidden, unauthorized } from '../../utils/errors.js';
import { now, nowIso } from '../../utils/time.js';

export type Role = 'user' | 'admin';

export interface SessionUser {
  id: number;
  username: string;
  role: Role;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  disabled: number;
  created_at: string;
}

// Hash eines zufälligen Passworts – wird verglichen, wenn der Benutzer nicht existiert,
// damit Antwortzeiten keine Rückschlüsse auf vorhandene Benutzernamen zulassen.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(randomToken()));

export function toSessionUser(row: Pick<UserRow, 'id' | 'username' | 'role'>): SessionUser {
  return { id: row.id, username: row.username, role: row.role };
}

export async function createUser(username: string, password: string, role: Role = 'user'): Promise<SessionUser> {
  const db = getDb();
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists) throw conflict('Benutzername ist bereits vergeben');
  const hash = await hashPassword(password);
  const info = db
    .prepare('INSERT INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)')
    .run(username, hash, role, nowIso());
  return { id: Number(info.lastInsertRowid), username, role };
}

export async function authenticate(username: string, password: string): Promise<SessionUser> {
  const row = getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
  if (!row) {
    await verifyPassword(password, await getDummyHash());
    throw unauthorized('Benutzername oder Passwort falsch');
  }
  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) throw unauthorized('Benutzername oder Passwort falsch');
  if (row.disabled) throw forbidden('Dieses Konto ist gesperrt');
  return toSessionUser(row);
}

export async function changePassword(userId: number, current: string, next: string): Promise<void> {
  const db = getDb();
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as
    | Pick<UserRow, 'password_hash'>
    | undefined;
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    throw unauthorized('Aktuelles Passwort ist falsch');
  }
  await setPassword(userId, next);
}

export async function setPassword(userId: number, password: string): Promise<void> {
  const hash = await hashPassword(password);
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  revokeAllSessions(userId);
}

// ---------------------------------------------------------------- Sessions

/** Erstellt eine neue Session. Zurückgegeben wird das Klartext-Token (nur für das Cookie). */
export function createSession(userId: number): { token: string; expiresAt: Date } {
  const token = randomToken(32);
  const expiresAt = new Date(now().getTime() + config.sessionTtlHours * 3600_000);
  getDb()
    .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(sha256(token), userId, nowIso(), expiresAt.toISOString());
  return { token, expiresAt };
}

export function findSessionUser(token: string): SessionUser | null {
  if (!token || token.length > 128) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.username, u.role, u.disabled, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`,
    )
    .get(sha256(token)) as (UserRow & { expires_at: string }) | undefined;
  if (!row) return null;
  if (row.disabled || new Date(row.expires_at).getTime() <= now().getTime()) {
    revokeSession(token);
    return null;
  }
  return toSessionUser(row);
}

export function revokeSession(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export function revokeAllSessions(userId: number): void {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function purgeExpiredSessions(): void {
  getDb().prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso());
}
