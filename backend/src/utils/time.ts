import { config } from '../config/env.js';

/** Zentrale Zeitquelle – in Tests überschreibbar. */
let clock: () => Date = () => new Date();

export function now(): Date {
  return clock();
}

export function setClock(fn: (() => Date) | null): void {
  clock = fn ?? (() => new Date());
}

export function nowIso(): string {
  return now().toISOString();
}

const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isValidPeriod(period: string): boolean {
  return PERIOD_RE.test(period);
}

export function parsePeriod(period: string): { year: number; month: number } {
  const m = PERIOD_RE.exec(period);
  if (!m) throw new Error(`Ungültige Periode: ${period}`);
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Datumsbestandteile eines Zeitpunkts in einer bestimmten Zeitzone. */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Offset der Zeitzone zu UTC in Millisekunden zum gegebenen Zeitpunkt. */
function zoneOffset(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Wandelt eine lokale Wanduhrzeit in einer Zeitzone in einen UTC-Zeitpunkt um. */
export function zonedTimeToUtc(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  let result = guess - zoneOffset(new Date(guess), timeZone);
  // zweite Iteration für Sommerzeit-Übergänge
  result = guess - zoneOffset(new Date(result), timeZone);
  return new Date(result);
}

export function currentPeriod(date: Date = now(), timeZone = config.timezone): string {
  const p = zonedParts(date, timeZone);
  return formatPeriod(p.year, p.month);
}

export function shiftPeriod(period: string, delta: number): string {
  const { year, month } = parsePeriod(period);
  const idx = year * 12 + (month - 1) + delta;
  return formatPeriod(Math.floor(idx / 12), (idx % 12) + 1);
}

/** Beginn der Periode (erster Tag 00:00 Ortszeit) als UTC-Zeitpunkt. */
export function periodStart(period: string, timeZone = config.timezone): Date {
  const { year, month } = parsePeriod(period);
  return zonedTimeToUtc(year, month, 1, timeZone);
}

/**
 * Deadline einer Periode: Einsendungen sind bis einschließlich des letzten Tags
 * des Monats (23:59:59 Ortszeit) möglich – also exklusiv bis zum Beginn des Folgemonats.
 */
export function periodDeadline(period: string, timeZone = config.timezone): Date {
  return periodStart(shiftPeriod(period, 1), timeZone);
}

export function isPeriodOpen(period: string, at: Date = now()): boolean {
  return at.getTime() >= periodStart(period).getTime() && at.getTime() < periodDeadline(period).getTime();
}

export function isPeriodClosed(period: string, at: Date = now()): boolean {
  return at.getTime() >= periodDeadline(period).getTime();
}
