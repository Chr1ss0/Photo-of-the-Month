import { describe, expect, it } from 'vitest';
import { currentPeriod, periodDeadline, periodStart, shiftPeriod } from '../src/utils/time.js';

describe('Zeitlogik', () => {
  it('Deadline ist das Ende des letzten Monatstags in Ortszeit (Winterzeit)', () => {
    // 1. Nov. 2026 00:00 MEZ = 31. Okt. 23:00 UTC
    expect(periodDeadline('2026-10').toISOString()).toBe('2026-10-31T23:00:00.000Z');
  });

  it('berücksichtigt Sommerzeit', () => {
    // 1. Apr. 2026 00:00 MESZ = 31. März 22:00 UTC
    expect(periodDeadline('2026-03').toISOString()).toBe('2026-03-31T22:00:00.000Z');
    expect(periodStart('2026-04').toISOString()).toBe('2026-03-31T22:00:00.000Z');
  });

  it('bestimmt den Monat in der App-Zeitzone', () => {
    expect(currentPeriod(new Date('2026-10-31T22:59:59Z'))).toBe('2026-10');
    expect(currentPeriod(new Date('2026-10-31T23:00:00Z'))).toBe('2026-11');
  });

  it('verschiebt Perioden über Jahresgrenzen', () => {
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01');
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
  });
});
