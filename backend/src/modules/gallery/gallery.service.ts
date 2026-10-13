import { getDb } from '../../db/index.js';
import { notFound } from '../../utils/errors.js';
import { currentPeriod } from '../../utils/time.js';
import type { SessionUser } from '../auth/auth.service.js';
import { toChallengeDto, type ChallengeDto, type ChallengeRow } from '../challenges/challenge.service.js';
import { SELECT_FULL, toSubmissionDto, type SubmissionDto, type SubmissionFullRow } from '../submissions/submission.service.js';

export interface GalleryMonth {
  challenge: ChallengeDto;
  submissions: SubmissionDto[];
}

/**
 * Abgeschlossene Monate (Frist abgelaufen) – neueste zuerst.
 * Eine Periode ist abgeschlossen, sobald sie vor dem aktuellen Monat liegt.
 */
export function listGallery(viewer: SessionUser, limit: number, offset: number): { months: GalleryMonth[]; total: number } {
  const db = getDb();
  const period = currentPeriod();
  const total = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM challenges c
          WHERE c.period < ? AND EXISTS (SELECT 1 FROM submissions s WHERE s.challenge_id = c.id)`,
      )
      .get(period) as { n: number }
  ).n;
  const challenges = db
    .prepare(
      `SELECT c.* FROM challenges c
        WHERE c.period < ? AND EXISTS (SELECT 1 FROM submissions s WHERE s.challenge_id = c.id)
        ORDER BY c.period DESC LIMIT ? OFFSET ?`,
    )
    .all(period, limit, offset) as ChallengeRow[];

  const months = challenges.map((c) => ({
    challenge: toChallengeDto(c),
    submissions: listForChallenge(c.id).map((r) => toSubmissionDto(r, viewer)),
  }));
  return { months, total };
}

export function getGalleryMonth(viewer: SessionUser, period: string): GalleryMonth {
  const c = getDb()
    .prepare('SELECT * FROM challenges WHERE period = ? AND period < ?')
    .get(period, currentPeriod()) as ChallengeRow | undefined;
  if (!c) throw notFound('Dieser Monat ist (noch) nicht in der Galerie');
  return {
    challenge: toChallengeDto(c),
    submissions: listForChallenge(c.id).map((r) => toSubmissionDto(r, viewer)),
  };
}

function listForChallenge(challengeId: number): SubmissionFullRow[] {
  return getDb()
    .prepare(`${SELECT_FULL} WHERE s.challenge_id = ? ORDER BY s.created_at ASC`)
    .all(challengeId) as SubmissionFullRow[];
}
