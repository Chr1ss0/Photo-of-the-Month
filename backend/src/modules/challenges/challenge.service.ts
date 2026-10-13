import { getDb } from '../../db/index.js';
import { conflict, notFound } from '../../utils/errors.js';
import { currentPeriod, isPeriodClosed, isPeriodOpen, nowIso, periodDeadline, periodStart } from '../../utils/time.js';
import { generateChallenge } from './challenge.generator.js';

export interface ChallengeRow {
  id: number;
  period: string;
  title: string;
  description: string;
  twist: string | null;
  theme_id: number | null;
  twist_id: number | null;
  created_at: string;
}

export interface ChallengeDto {
  id: number;
  period: string;
  title: string;
  description: string;
  twist: string | null;
  startsAt: string;
  deadline: string;
  status: 'upcoming' | 'open' | 'closed';
}

export function toChallengeDto(row: ChallengeRow): ChallengeDto {
  return {
    id: row.id,
    period: row.period,
    title: row.title,
    description: row.description,
    twist: row.twist,
    startsAt: periodStart(row.period).toISOString(),
    deadline: periodDeadline(row.period).toISOString(),
    status: isPeriodClosed(row.period) ? 'closed' : isPeriodOpen(row.period) ? 'open' : 'upcoming',
  };
}

export function findChallengeByPeriod(period: string): ChallengeRow | undefined {
  return getDb().prepare('SELECT * FROM challenges WHERE period = ?').get(period) as ChallengeRow | undefined;
}

export function findChallengeById(id: number): ChallengeRow | undefined {
  return getDb().prepare('SELECT * FROM challenges WHERE id = ?').get(id) as ChallengeRow | undefined;
}

/** Liefert die Challenge einer Periode und erzeugt sie bei Bedarf über den Generator. */
export function ensureChallenge(period: string = currentPeriod()): ChallengeRow {
  const existing = findChallengeByPeriod(period);
  if (existing) return existing;
  const g = generateChallenge();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO challenges (period, title, description, twist, theme_id, twist_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(period, g.title, g.description, g.twist, g.themeId, g.twistId, nowIso());
  return findChallengeByPeriod(period)!;
}

export function countSubmissions(challengeId: number): number {
  const r = getDb().prepare('SELECT COUNT(*) AS n FROM submissions WHERE challenge_id = ?').get(challengeId) as {
    n: number;
  };
  return r.n;
}

/** Würfelt die Aufgabe einer (noch nicht abgeschlossenen) Periode neu. */
export function regenerateChallenge(period: string, force = false): ChallengeRow {
  if (isPeriodClosed(period)) throw conflict('Abgeschlossene Challenges können nicht neu generiert werden');
  const existing = findChallengeByPeriod(period);
  if (existing && !force && countSubmissions(existing.id) > 0) {
    throw conflict('Für diese Challenge gibt es bereits Einsendungen');
  }
  const g = generateChallenge({ excludePeriod: period });
  if (existing) {
    getDb()
      .prepare('UPDATE challenges SET title = ?, description = ?, twist = ?, theme_id = ?, twist_id = ? WHERE id = ?')
      .run(g.title, g.description, g.twist, g.themeId, g.twistId, existing.id);
  } else {
    getDb()
      .prepare(
        `INSERT INTO challenges (period, title, description, twist, theme_id, twist_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(period, g.title, g.description, g.twist, g.themeId, g.twistId, nowIso());
  }
  return findChallengeByPeriod(period)!;
}

/** Legt eine Challenge manuell fest oder überschreibt sie. */
export function upsertChallenge(
  period: string,
  data: { title: string; description: string; twist: string | null },
): ChallengeRow {
  const existing = findChallengeByPeriod(period);
  if (existing) {
    getDb()
      .prepare('UPDATE challenges SET title = ?, description = ?, twist = ?, theme_id = NULL, twist_id = NULL WHERE id = ?')
      .run(data.title, data.description, data.twist, existing.id);
  } else {
    getDb()
      .prepare('INSERT INTO challenges (period, title, description, twist, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(period, data.title, data.description, data.twist, nowIso());
  }
  return findChallengeByPeriod(period)!;
}

export function deleteChallenge(period: string): void {
  const existing = findChallengeByPeriod(period);
  if (!existing) throw notFound('Challenge nicht gefunden');
  if (countSubmissions(existing.id) > 0) throw conflict('Challenge hat Einsendungen und kann nicht gelöscht werden');
  getDb().prepare('DELETE FROM challenges WHERE id = ?').run(existing.id);
}

export function listChallenges(): ChallengeRow[] {
  return getDb().prepare('SELECT * FROM challenges ORDER BY period DESC').all() as ChallengeRow[];
}
