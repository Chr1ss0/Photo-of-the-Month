import exifr from 'exifr';

export interface ExifData {
  aperture: number | null;
  exposureTime: number | null;
  iso: number | null;
  whiteBalance: string | null;
  exposureBias: number | null;
  gpsLat: number | null;
  gpsLon: number | null;
  focalLength: number | null;
  cameraMake: string | null;
  cameraModel: string | null;
  lens: string | null;
  takenAt: string | null;
}

export const EMPTY_EXIF: ExifData = {
  aperture: null,
  exposureTime: null,
  iso: null,
  whiteBalance: null,
  exposureBias: null,
  gpsLat: null,
  gpsLon: null,
  focalLength: null,
  cameraMake: null,
  cameraModel: null,
  lens: null,
  takenAt: null,
};

const WHITE_BALANCE: Record<string, string> = { Auto: 'Automatisch', Manual: 'Manuell' };

const LIGHT_SOURCE: Record<string, string> = {
  Daylight: 'Tageslicht',
  Fluorescent: 'Leuchtstoff',
  'Tungsten (incandescent light)': 'Glühlampe',
  Flash: 'Blitz',
  'Fine weather': 'Sonnig',
  'Cloudy weather': 'Bewölkt',
  Shade: 'Schatten',
  'Daylight fluorescent (D 5700 - 7100K)': 'Leuchtstoff (Tageslicht)',
  'Day white fluorescent (N 4600 - 5400K)': 'Leuchtstoff (Neutralweiß)',
  'Cool white fluorescent (W 3900 - 4500K)': 'Leuchtstoff (Kaltweiß)',
  'White fluorescent (WW 3200 - 3700K)': 'Leuchtstoff (Warmweiß)',
  'Standard light A': 'Normlicht A',
  'Standard light B': 'Normlicht B',
  'Standard light C': 'Normlicht C',
  D55: 'D55',
  D65: 'D65',
  D75: 'D75',
  D50: 'D50',
  'ISO studio tungsten': 'Studio-Kunstlicht',
};

function num(v: unknown, min = -Infinity, max = Infinity): number | null {
  const n = typeof v === 'number' ? v : Array.isArray(v) && typeof v[0] === 'number' ? v[0] : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function text(v: unknown, max = 80): string | null {
  if (typeof v !== 'string') return null;
  // Steuerzeichen entfernen – EXIF-Felder sind vom Benutzer kontrollierte Eingaben
  const s = v.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return s ? s.slice(0, max) : null;
}

function round(n: number | null, digits: number): number | null {
  if (n === null) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function localIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Liest die für die Info-Box relevanten EXIF-Daten aus einem Bildpuffer. */
export async function extractExif(buffer: Buffer): Promise<ExifData> {
  let raw: Record<string, unknown> | undefined;
  try {
    raw = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      ifd1: false,
      xmp: false,
      icc: false,
      iptc: false,
      jfif: false,
      ihdr: false,
      translateValues: true,
      reviveValues: true,
    });
  } catch {
    return { ...EMPTY_EXIF };
  }
  if (!raw) return { ...EMPTY_EXIF };

  const wbRaw = text(raw.WhiteBalance);
  const lightRaw = text(raw.LightSource);
  let whiteBalance = wbRaw ? (WHITE_BALANCE[wbRaw] ?? wbRaw) : null;
  if (lightRaw && lightRaw !== 'Unknown' && LIGHT_SOURCE[lightRaw]) {
    whiteBalance = whiteBalance ? `${whiteBalance} · ${LIGHT_SOURCE[lightRaw]}` : LIGHT_SOURCE[lightRaw];
  }

  const lat = num(raw.latitude, -90, 90);
  const lon = num(raw.longitude, -180, 180);
  const hasGps = lat !== null && lon !== null && !(lat === 0 && lon === 0);

  const taken = raw.DateTimeOriginal ?? raw.CreateDate;
  // EXIF-Zeitstempel haben keine Zeitzone: als lokale Wanduhrzeit (ohne „Z“) speichern
  const takenAt = taken instanceof Date && !Number.isNaN(taken.getTime()) ? localIso(taken) : null;

  return {
    aperture: round(num(raw.FNumber, 0.3, 256), 1),
    exposureTime: num(raw.ExposureTime, 1e-6, 36_000),
    iso: (() => {
      const v = num(raw.ISO ?? raw.ISOSpeedRatings ?? raw.PhotographicSensitivity, 1, 10_000_000);
      return v === null ? null : Math.round(v);
    })(),
    whiteBalance,
    exposureBias: round(num(raw.ExposureCompensation ?? raw.ExposureBiasValue, -20, 20), 2),
    gpsLat: hasGps ? round(lat, 6) : null,
    gpsLon: hasGps ? round(lon, 6) : null,
    focalLength: round(num(raw.FocalLength, 0.1, 10_000), 1),
    cameraMake: text(raw.Make),
    cameraModel: text(raw.Model),
    lens: text(raw.LensModel ?? raw.Lens),
    takenAt,
  };
}
