import { getDb } from '../../db/index.js';
import { forbidden, notFound } from '../../utils/errors.js';
import { nowIso } from '../../utils/time.js';
import type { SessionUser } from '../auth/auth.service.js';
import { getVisibleSubmission } from '../submissions/submission.service.js';

interface CommentRow {
  id: number;
  submission_id: number;
  user_id: number;
  username: string;
  body: string;
  created_at: string;
}

export interface CommentDto {
  id: number;
  body: string;
  createdAt: string;
  user: { id: number; username: string };
  canDelete: boolean;
}

const SELECT = `SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id`;

function toDto(row: CommentRow, viewer: SessionUser): CommentDto {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    user: { id: row.user_id, username: row.username },
    canDelete: row.user_id === viewer.id || viewer.role === 'admin',
  };
}

export function listComments(submissionId: number, viewer: SessionUser): CommentDto[] {
  getVisibleSubmission(submissionId, viewer);
  const rows = getDb()
    .prepare(`${SELECT} WHERE c.submission_id = ? ORDER BY c.created_at ASC, c.id ASC`)
    .all(submissionId) as CommentRow[];
  return rows.map((r) => toDto(r, viewer));
}

export function addComment(submissionId: number, viewer: SessionUser, body: string): CommentDto {
  getVisibleSubmission(submissionId, viewer);
  const info = getDb()
    .prepare('INSERT INTO comments (submission_id, user_id, body, created_at) VALUES (?, ?, ?, ?)')
    .run(submissionId, viewer.id, body, nowIso());
  const row = getDb().prepare(`${SELECT} WHERE c.id = ?`).get(info.lastInsertRowid) as CommentRow;
  return toDto(row, viewer);
}

export function deleteComment(commentId: number, viewer: SessionUser): void {
  const row = getDb().prepare('SELECT * FROM comments WHERE id = ?').get(commentId) as CommentRow | undefined;
  if (!row) throw notFound('Kommentar nicht gefunden');
  // Sichtbarkeit des zugehörigen Fotos prüfen (kein Löschen über erratene IDs)
  getVisibleSubmission(row.submission_id, viewer);
  if (row.user_id !== viewer.id && viewer.role !== 'admin') throw forbidden();
  getDb().prepare('DELETE FROM comments WHERE id = ?').run(commentId);
}
