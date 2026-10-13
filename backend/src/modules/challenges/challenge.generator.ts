import crypto from 'node:crypto';
import { getDb } from '../../db/index.js';
import { config } from '../../config/env.js';

export interface ThemeRow {
  id: number;
  kind: 'subject' | 'twist';
  title: string;
  description: string;
  active: number;
  created_at: string;
}

export interface GeneratedChallenge {
  title: string;
  description: string;
  twist: string | null;
  themeId: number;
  twistId: number | null;
}

/** Wie viele vergangene Challenges berücksichtigt werden, um Wiederholungen zu vermeiden. */
const HISTORY_WINDOW = 12;

function pick<T>(items: T[]): T {
  return items[crypto.randomInt(items.length)]!;
}

/**
 * Würfelt eine neue Monatsaufgabe aus dem Themen-Pool.
 * Themen der letzten Monate werden bevorzugt ausgelassen; mit einer
 * konfigurierbaren Wahrscheinlichkeit kommt ein zusätzlicher „Twist“ hinzu.
 */
export function generateChallenge(options: { excludePeriod?: string } = {}): GeneratedChallenge {
  const db = getDb();
  const subjects = db
    .prepare("SELECT * FROM challenge_themes WHERE kind = 'subject' AND active = 1")
    .all() as ThemeRow[];
  if (subjects.length === 0) {
    throw new Error('Keine aktiven Themen im Pool – bitte im Admin-Panel anlegen.');
  }
  const twists = db.prepare("SELECT * FROM challenge_themes WHERE kind = 'twist' AND active = 1").all() as ThemeRow[];

  const recent = db
    .prepare('SELECT theme_id, twist_id FROM challenges WHERE period != ? ORDER BY period DESC LIMIT ?')
    .all(options.excludePeriod ?? '', HISTORY_WINDOW) as Array<{ theme_id: number | null; twist_id: number | null }>;
  const recentThemes = new Set(recent.map((r) => r.theme_id));
  const recentTwists = new Set(recent.slice(0, 3).map((r) => r.twist_id));

  const freshSubjects = subjects.filter((s) => !recentThemes.has(s.id));
  const subject = pick(freshSubjects.length ? freshSubjects : subjects);

  let twist: ThemeRow | null = null;
  if (twists.length && crypto.randomInt(100) < config.twistChance) {
    const freshTwists = twists.filter((t) => !recentTwists.has(t.id));
    twist = pick(freshTwists.length ? freshTwists : twists);
  }

  return {
    title: subject.title,
    description: subject.description,
    twist: twist ? `${twist.title} – ${twist.description}` : null,
    themeId: subject.id,
    twistId: twist?.id ?? null,
  };
}
