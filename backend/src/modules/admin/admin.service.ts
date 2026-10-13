import { getDb } from '../../db/index.js';
import { badRequest, conflict, notFound } from '../../utils/errors.js';
import { nowIso } from '../../utils/time.js';
import { revokeAllSessions, setPassword, type Role, type SessionUser } from '../auth/auth.service.js';
import type { ThemeRow } from '../challenges/challenge.generator.js';
import { removeUserImages } from '../submissions/submission.service.js';

export interface AdminUserDto {
  id: number;
  username: string;
  role: Role;
  disabled: boolean;
  createdAt: string;
  submissionCount: number;
  commentCount: number;
}

export function stats() {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    users: one('SELECT COUNT(*) AS n FROM users'),
    submissions: one('SELECT COUNT(*) AS n FROM submissions'),
    comments: one('SELECT COUNT(*) AS n FROM comments'),
    challenges: one('SELECT COUNT(*) AS n FROM challenges'),
  };
}

// ------------------------------------------------------------------ Benutzer

export function listUsers(): AdminUserDto[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.username, u.role, u.disabled, u.created_at,
              (SELECT COUNT(*) FROM submissions s WHERE s.user_id = u.id) AS submission_count,
              (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) AS comment_count
         FROM users u ORDER BY u.created_at ASC`,
    )
    .all() as Array<{
    id: number;
    username: string;
    role: Role;
    disabled: number;
    created_at: string;
    submission_count: number;
    comment_count: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    disabled: r.disabled === 1,
    createdAt: r.created_at,
    submissionCount: r.submission_count,
    commentCount: r.comment_count,
  }));
}

function getUser(id: number) {
  const row = getDb().prepare('SELECT id, role FROM users WHERE id = ?').get(id) as
    | { id: number; role: Role }
    | undefined;
  if (!row) throw notFound('Benutzer nicht gefunden');
  return row;
}

function activeAdminCount(): number {
  return (getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND disabled = 0").get() as { n: number })
    .n;
}

export function updateUser(actor: SessionUser, id: number, data: { role?: Role; disabled?: boolean }): void {
  const target = getUser(id);
  if (id === actor.id && (data.role === 'user' || data.disabled === true)) {
    throw badRequest('Du kannst dich nicht selbst herabstufen oder sperren');
  }
  const losesAdmin = target.role === 'admin' && (data.role === 'user' || data.disabled === true);
  if (losesAdmin && activeAdminCount() <= 1) throw conflict('Es muss mindestens ein aktiver Admin bleiben');

  const db = getDb();
  if (data.role) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(data.role, id);
  if (data.disabled !== undefined) db.prepare('UPDATE users SET disabled = ? WHERE id = ?').run(data.disabled ? 1 : 0, id);
  // Rollen- oder Statusänderungen wirken sofort: bestehende Sessions beenden
  revokeAllSessions(id);
}

export async function resetUserPassword(id: number, password: string): Promise<void> {
  getUser(id);
  await setPassword(id, password);
}

export async function deleteUser(actor: SessionUser, id: number): Promise<void> {
  const target = getUser(id);
  if (id === actor.id) throw badRequest('Du kannst dein eigenes Konto hier nicht löschen');
  if (target.role === 'admin' && activeAdminCount() <= 1) throw conflict('Es muss mindestens ein aktiver Admin bleiben');
  await removeUserImages(id);
  getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
}

// ------------------------------------------------------------------ Themen-Pool

export function listThemes(): ThemeRow[] {
  return getDb().prepare('SELECT * FROM challenge_themes ORDER BY kind, title COLLATE NOCASE').all() as ThemeRow[];
}

export function createTheme(data: { kind: 'subject' | 'twist'; title: string; description: string }): ThemeRow {
  const info = getDb()
    .prepare('INSERT INTO challenge_themes (kind, title, description, created_at) VALUES (?, ?, ?, ?)')
    .run(data.kind, data.title, data.description, nowIso());
  return getDb().prepare('SELECT * FROM challenge_themes WHERE id = ?').get(info.lastInsertRowid) as ThemeRow;
}

export function updateTheme(id: number, data: { title?: string; description?: string; active?: boolean }): ThemeRow {
  const db = getDb();
  const row = db.prepare('SELECT * FROM challenge_themes WHERE id = ?').get(id) as ThemeRow | undefined;
  if (!row) throw notFound('Thema nicht gefunden');
  db.prepare('UPDATE challenge_themes SET title = ?, description = ?, active = ? WHERE id = ?').run(
    data.title ?? row.title,
    data.description ?? row.description,
    data.active === undefined ? row.active : data.active ? 1 : 0,
    id,
  );
  return db.prepare('SELECT * FROM challenge_themes WHERE id = ?').get(id) as ThemeRow;
}

export function deleteTheme(id: number): void {
  const info = getDb().prepare('DELETE FROM challenge_themes WHERE id = ?').run(id);
  if (info.changes === 0) throw notFound('Thema nicht gefunden');
}

// ------------------------------------------------------------------ Moderation

export function listAllSubmissions(period?: string) {
  const rows = getDb()
    .prepare(
      `SELECT s.id, s.description, s.created_at, c.period, c.title AS challenge_title, u.id AS user_id, u.username, s.image_file,
              (SELECT COUNT(*) FROM comments cm WHERE cm.submission_id = s.id) AS comment_count
         FROM submissions s JOIN challenges c ON c.id = s.challenge_id JOIN users u ON u.id = s.user_id
        ${period ? 'WHERE c.period = ?' : ''}
        ORDER BY c.period DESC, s.created_at DESC LIMIT 500`,
    )
    .all(...(period ? [period] : [])) as Array<Record<string, unknown> & { image_file: string; id: number }>;
  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    createdAt: r.created_at,
    period: r.period,
    challengeTitle: r.challenge_title,
    user: { id: r.user_id, username: r.username },
    commentCount: r.comment_count,
    thumbUrl: `/api/submissions/${r.id}/image?size=thumb&v=${r.image_file.slice(0, 8)}`,
  }));
}

export function listRecentComments() {
  const rows = getDb()
    .prepare(
      `SELECT cm.id, cm.body, cm.created_at, cm.submission_id, u.id AS user_id, u.username
         FROM comments cm JOIN users u ON u.id = cm.user_id
        ORDER BY cm.created_at DESC LIMIT 200`,
    )
    .all() as Array<{ id: number; body: string; created_at: string; submission_id: number; user_id: number; username: string }>;
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    submissionId: r.submission_id,
    user: { id: r.user_id, username: r.username },
  }));
}
