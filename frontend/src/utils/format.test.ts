import { describe, expect, it } from 'vitest';
import {
  formatAperture,
  formatCamera,
  formatCoords,
  formatEv,
  formatPeriod,
  formatShutter,
  osmUrl,
  shiftPeriod,
} from './format';

describe('EXIF-Formatierung', () => {
  it('Blende', () => {
    expect(formatAperture(2.8)).toBe('ƒ/2.8');
    expect(formatAperture(8)).toBe('ƒ/8');
    expect(formatAperture(null)).toBeNull();
  });

  it('Verschlusszeit', () => {
    expect(formatShutter(0.004)).toBe('1/250 s');
    expect(formatShutter(1 / 8000)).toBe('1/8000 s');
    expect(formatShutter(2)).toBe('2 s');
    expect(formatShutter(0.5)).toBe('0,5 s');
  });

  it('Belichtungskorrektur in Drittel- und halben Stufen', () => {
    expect(formatEv(-0.33)).toBe('−1/3 EV');
    expect(formatEv(0.67)).toBe('+2/3 EV');
    expect(formatEv(1)).toBe('+1 EV');
    expect(formatEv(-1.33)).toBe('−1 1/3 EV');
    expect(formatEv(0.5)).toBe('+1/2 EV');
    expect(formatEv(0)).toBe('±0 EV');
  });

  it('GPS-Koordinaten', () => {
    expect(formatCoords(52.52, 13.405)).toBe('52,5200° N, 13,4050° O');
    expect(formatCoords(-33.86, -70.6)).toBe('33,8600° S, 70,6000° W');
    expect(formatCoords(null, 1)).toBeNull();
  });

  it('Kamera ohne doppelten Herstellernamen', () => {
    expect(formatCamera('Canon', 'Canon EOS R6')).toBe('Canon EOS R6');
    expect(formatCamera('Fujifilm', 'X-T5')).toBe('Fujifilm X-T5');
  });

  it('Monate', () => {
    expect(formatPeriod('2026-10')).toBe('Oktober 2026');
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01');
  });
});

describe('Kartenlink', () => {
  it('baut nur Links aus gültigen Zahlen', () => {
    expect(osmUrl(52.52, 13.405)).toMatch(/^https:\/\/www\.openstreetmap\.org\/\?mlat=52\.520000&mlon=13\.405000/);
    expect(osmUrl(100, 0)).toBeNull();
    expect(osmUrl(Number.NaN, 0)).toBeNull();
    // eingeschleuste Strings dürfen keine URL erzeugen
    expect(osmUrl('javascript:alert(1)' as unknown as number, 0)).toBeNull();
  });
});
