const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

/** '2026-10' -> 'Oktober 2026' */
export function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return period;
  return `${MONTHS[m - 1]} ${y}`;
}

/** 2.8 -> 'ƒ/2.8' */
export function formatAperture(v: number | null): string | null {
  return v === null ? null : `ƒ/${Number(v.toFixed(1))}`;
}

/** 0.004 -> '1/250 s', 2 -> '2 s' */
export function formatShutter(v: number | null): string | null {
  if (v === null || v <= 0) return null;
  if (v >= 0.3) return `${Number(v.toFixed(1)).toLocaleString('de-DE')} s`;
  return `1/${Math.round(1 / v)} s`;
}

export function formatIso(v: number | null): string | null {
  return v === null ? null : `ISO ${v}`;
}

/** -0.33 -> '−1/3 EV', 1 -> '+1 EV', 0 -> '±0 EV' */
export function formatEv(v: number | null): string | null {
  if (v === null) return null;
  if (Math.abs(v) < 0.05) return '±0 EV';
  const sign = v > 0 ? '+' : '−';
  const abs = Math.abs(v);
  const whole = Math.floor(abs + 1e-6);
  const frac = abs - whole;
  const thirds = Math.round(frac * 3);
  const halves = Math.round(frac * 2);
  let fracStr = '';
  if (Math.abs(frac - thirds / 3) < 0.04 && thirds % 3 !== 0) fracStr = `${thirds}/3`;
  else if (Math.abs(frac - halves / 2) < 0.04 && halves % 2 !== 0) fracStr = '1/2';
  else if (frac > 0.04) return `${sign}${abs.toFixed(1).replace('.', ',')} EV`;
  const wholeFinal = fracStr ? whole : Math.round(abs);
  const body = wholeFinal && fracStr ? `${wholeFinal} ${fracStr}` : fracStr || String(wholeFinal);
  return `${sign}${body} EV`;
}

export function formatFocal(v: number | null): string | null {
  return v === null ? null : `${Number(v.toFixed(1)).toLocaleString('de-DE')} mm`;
}

export function formatCoords(lat: number | null, lon: number | null): string | null {
  if (lat === null || lon === null) return null;
  const f = (n: number) => Math.abs(n).toFixed(4).replace('.', ',');
  return `${f(lat)}° ${lat >= 0 ? 'N' : 'S'}, ${f(lon)}° ${lon >= 0 ? 'O' : 'W'}`;
}

/** Sicherer Link zu OpenStreetMap – nur aus validierten Zahlen gebaut. */
export function osmUrl(lat: number | null, lon: number | null): string | null {
  if (lat === null || lon === null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=15/${lat.toFixed(5)}/${lon.toFixed(5)}`;
}

export function formatCamera(make: string | null, model: string | null): string | null {
  if (!make && !model) return null;
  if (make && model && model.toLowerCase().startsWith(make.toLowerCase())) return model;
  return [make, model].filter(Boolean).join(' ');
}

const dateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

/** Deadline ist exklusiv (Beginn des Folgemonats) – angezeigt wird der letzte Tag 23:59. */
export function formatDeadline(iso: string): string {
  return dateTimeFmt.format(new Date(new Date(iso).getTime() - 60_000));
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.round((new Date(iso).getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(diff, 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
  return formatDate(iso);
}

export function currentPeriodLocal(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}
