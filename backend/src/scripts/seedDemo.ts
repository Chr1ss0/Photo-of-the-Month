/**
 * Füllt eine Entwicklungsdatenbank mit Demo-Daten:
 *   npm run seed:demo
 * Legt Demo-Benutzer, vergangene Challenges und generierte Beispielbilder an.
 * NICHT in Produktion verwenden.
 */
import sharp from 'sharp';
import { config } from '../config/env.js';
import { getDb } from '../db/index.js';
import { createUser } from '../modules/auth/auth.service.js';
import { ensureChallenge, upsertChallenge } from '../modules/challenges/challenge.service.js';
import { extractExif } from '../services/exif.js';
import { storeImage } from '../services/imageStorage.js';
import { currentPeriod, nowIso, shiftPeriod } from '../utils/time.js';

if (config.isProduction) {
  console.error('Demo-Daten dürfen nicht in Produktion angelegt werden.');
  process.exit(1);
}

const DEMO_PASSWORD = 'demo-passwort-123';
const users = ['mara', 'jonas', 'lea', 'tim'];
const palettes = [
  ['#f97316', '#7c2d12'],
  ['#0ea5e9', '#0c4a6e'],
  ['#a3e635', '#14532d'],
  ['#f43f5e', '#4c0519'],
  ['#eab308', '#422006'],
  ['#8b5cf6', '#2e1065'],
  ['#14b8a6', '#042f2e'],
  ['#64748b', '#0f172a'],
];

async function demoImage(i: number): Promise<Buffer> {
  const [a, b] = palettes[i % palettes.length]!;
  const w = 1600;
  const h = i % 3 === 0 ? 2000 : 1067;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${w * (0.3 + (i % 4) * 0.12)}" cy="${h * 0.45}" r="${h * 0.22}" fill="#fff" fill-opacity="0.18"/>
    <rect x="0" y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="#000" fill-opacity="0.25"/>
  </svg>`;
  const apertures = ['18/10', '28/10', '4/1', '56/10', '8/1', '11/1'];
  const shutters = ['1/4000', '1/500', '1/125', '1/60', '1/15', '2/1'];
  const isos = ['100', '200', '400', '800', '1600', '3200'];
  const evs = ['0/1', '-1/3', '2/3', '-1/1', '1/3', '-2/3'];
  return sharp(Buffer.from(svg))
    .withExif({
      IFD0: { Make: ['Fujifilm', 'Sony', 'Canon', 'Nikon'][i % 4]!, Model: ['X-T5', 'ILCE-7M4', 'EOS R6', 'Z 6II'][i % 4]! },
      IFD2: {
        FNumber: apertures[i % 6]!,
        ExposureTime: shutters[(i + 2) % 6]!,
        ISOSpeedRatings: isos[(i + 1) % 6]!,
        WhiteBalance: String(i % 2),
        ExposureBiasValue: evs[i % 6]!,
        FocalLength: `${[23, 35, 50, 85][i % 4]}/1`,
        LensModel: ['XF23mmF1.4 R LM WR', 'FE 35mm F1.8', 'RF50mm F1.8 STM', 'NIKKOR Z 85mm f/1.8 S'][i % 4]!,
        DateTimeOriginal: '2026:08:15 19:42:10',
      },
      ...(i % 2 === 0
        ? {
            IFD3: {
              GPSLatitudeRef: 'N',
              GPSLatitude: `${48 + (i % 5)}/1 ${(i * 7) % 60}/1 0/1`,
              GPSLongitudeRef: 'E',
              GPSLongitude: `${8 + (i % 6)}/1 ${(i * 11) % 60}/1 0/1`,
            },
          }
        : {}),
    })
    .jpeg({ quality: 90 })
    .toBuffer();
}

const descriptions = [
  'Kurz bevor die Sonne hinter den Dächern verschwand.',
  'Auf dem Heimweg entdeckt – manchmal liegt das Motiv direkt vor der Tür.',
  'Drei Versuche, bis das Licht gepasst hat.',
  '',
];

const db = getDb();
const ids: number[] = [];
for (const name of users) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(name) as { id: number } | undefined;
  ids.push(existing?.id ?? (await createUser(name, DEMO_PASSWORD)).id);
}

const now = currentPeriod();
const past = [
  { period: shiftPeriod(now, -1), title: 'Spiegelungen', description: 'Pfützen, Fenster, Wasserflächen – finde eine Welt, die sich selbst betrachtet.', twist: null },
  { period: shiftPeriod(now, -2), title: 'Goldene Stunde', description: 'Das warme, weiche Licht kurz nach Sonnenaufgang oder vor Sonnenuntergang.', twist: 'Hochformat – Das Bild muss im Hochformat sein.' },
];
ensureChallenge(now);

let img = 0;
for (const p of past) {
  const challenge = upsertChallenge(p.period, p);
  for (const [i, userId] of ids.entries()) {
    if ((i + img) % 5 === 4) continue;
    const exists = db.prepare('SELECT 1 FROM submissions WHERE challenge_id = ? AND user_id = ?').get(challenge.id, userId);
    if (exists) continue;
    const buf = await demoImage(img++);
    const exif = await extractExif(buf);
    const stored = await storeImage(buf);
    const ts = nowIso();
    const info = db
      .prepare(
        `INSERT INTO submissions (challenge_id, user_id, description, show_location, image_file, thumb_file, width, height,
           aperture, exposure_time, iso, white_balance, exposure_bias, gps_lat, gps_lon, focal_length, camera_make, camera_model, lens, taken_at, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        challenge.id, userId, descriptions[i % descriptions.length], stored.imageFile, stored.thumbFile, stored.width, stored.height,
        exif.aperture, exif.exposureTime, exif.iso, exif.whiteBalance, exif.exposureBias, exif.gpsLat, exif.gpsLon,
        exif.focalLength, exif.cameraMake, exif.cameraModel, exif.lens, exif.takenAt, ts, ts,
      );
    if (i % 2 === 0) {
      db.prepare('INSERT INTO comments (submission_id, user_id, body, created_at) VALUES (?, ?, ?, ?)').run(
        info.lastInsertRowid, ids[(i + 1) % ids.length], 'Starke Komposition – das Licht ist großartig!', ts,
      );
    }
  }
}
console.log(`Demo-Daten angelegt. Benutzer: ${users.join(', ')} – Passwort: ${DEMO_PASSWORD}`);
