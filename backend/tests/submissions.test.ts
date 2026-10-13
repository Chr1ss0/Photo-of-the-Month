import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { config } from '../src/config/env.js';
import { getDb } from '../src/db/index.js';
import { freshApp, loggedIn, travelTo } from './helpers/app.js';
import { jpegWithExif, plainPng } from './helpers/images.js';

let app: Express;
let defaultJpeg: Buffer;
beforeAll(async () => {
  defaultJpeg = await jpegWithExif();
});
beforeEach(() => {
  app = freshApp();
  travelTo('2026-10-28T12:00:00Z');
});

function upload(c: Awaited<ReturnType<typeof loggedIn>>, buf?: Buffer, fields: Record<string, string> = {}) {
  const req = c.post('/api/submissions');
  for (const [k, v] of Object.entries(fields)) req.field(k, v);
  return req.attach('photo', buf ?? defaultJpeg, { filename: 'foto.jpg', contentType: 'image/jpeg' });
}

describe('Aktuelle Challenge', () => {
  it('wird automatisch generiert und hat das Monatsende als Deadline', async () => {
    const a = await loggedIn(app, 'anna');
    const res = await a.get('/api/challenges/current').expect(200);
    expect(res.body.challenge.period).toBe('2026-10');
    expect(res.body.challenge.status).toBe('open');
    expect(res.body.challenge.deadline).toBe('2026-10-31T23:00:00.000Z');
    expect(res.body.mySubmission).toBeNull();
  });
});

describe('Upload & EXIF', () => {
  it('liest Blende, Verschlusszeit, ISO, Weißabgleich, GPS und EV aus', async () => {
    const a = await loggedIn(app, 'anna');
    const res = await upload(a, undefined, { description: 'Abendlicht' }).expect(201);
    const s = res.body.submission;
    expect(s.description).toBe('Abendlicht');
    expect(s.exif).toMatchObject({
      aperture: 2.8,
      exposureTime: 0.004,
      iso: 400,
      whiteBalance: 'Manuell · Tageslicht',
      exposureBias: -0.33,
      gpsLat: 52.52,
      gpsLon: 13.405,
      cameraModel: 'X-T5',
    });
    expect(s.permissions).toEqual({ edit: true, replace: true, delete: true });
  });

  it('entfernt alle Metadaten (inkl. GPS) aus der gespeicherten Datei', async () => {
    const a = await loggedIn(app, 'anna');
    const s = (await upload(a).expect(201)).body.submission;
    const img = await a.get(s.imageUrl).buffer(true).expect(200);
    expect(img.headers['content-type']).toBe('image/jpeg');
    const meta = await sharp(img.body as Buffer).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.format).toBe('jpeg');
  });

  it('lehnt Nicht-Bilder ab, auch wenn sie sich als JPEG ausgeben', async () => {
    const a = await loggedIn(app, 'anna');
    const html = Buffer.from('<html><script>alert(1)</script></html>');
    await upload(a, html).expect(400);
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><script>alert(1)</script><rect width="500" height="500"/></svg>',
    );
    const res = await upload(a, svg).expect(400);
    expect(res.body.error.message).toMatch(/Bildformat|gültiges Bild/);
    // Polyglot: gültiges JPEG mit angehängtem Skript -> wird neu kodiert, Payload verschwindet
    const poly = Buffer.concat([defaultJpeg, Buffer.from('<script>alert(1)</script>')]);
    const s = (await upload(a, poly).expect(201)).body.submission;
    const img = await a.get(s.imageUrl).buffer(true).expect(200);
    expect((img.body as Buffer).includes(Buffer.from('<script>'))).toBe(false);
  });

  it('lehnt zu kleine Bilder und Dateien über dem Upload-Limit ab', async () => {
    const a = await loggedIn(app, 'anna');
    const tiny = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#fff' } }).png().toBuffer();
    await upload(a, tiny).expect(400);
    const huge = Buffer.alloc(config.maxUploadMb * 1024 * 1024 + 1, 0xff);
    const res = await upload(a, huge).expect(413);
    expect(res.body.error.code).toBe('LIMIT_FILE_SIZE');
  });

  it('lehnt Uploads ohne Datei und mit mehreren Dateien ab', async () => {
    const a = await loggedIn(app, 'anna');
    await a.post('/api/submissions').field('description', 'ohne Bild').expect(400);
    await a
      .post('/api/submissions')
      .attach('photo', defaultJpeg, 'a.jpg')
      .attach('photo', defaultJpeg, 'b.jpg')
      .expect(400);
    await a.post('/api/submissions').attach('anders', defaultJpeg, 'a.jpg').expect(400);
  });

  it('akzeptiert PNG ohne EXIF', async () => {
    const a = await loggedIn(app, 'anna');
    const s = (await upload(a, await plainPng()).expect(201)).body.submission;
    expect(s.exif.aperture).toBeNull();
    expect(s.exif.gpsLat).toBeNull();
  });

  it('erlaubt nur eine Einsendung pro Monat, aber den Austausch vor der Frist', async () => {
    const a = await loggedIn(app, 'anna');
    const first = (await upload(a).expect(201)).body.submission;
    await upload(a).expect(409);

    const oldFiles = getDb().prepare('SELECT image_file, thumb_file FROM submissions').get() as Record<string, string>;
    const replaced = await a
      .put(`/api/submissions/${first.id}/photo`)
      .attach('photo', await plainPng(), { filename: 'neu.png', contentType: 'image/png' })
      .expect(200);
    expect(replaced.body.submission.id).toBe(first.id);
    expect(replaced.body.submission.imageUrl).not.toBe(first.imageUrl);
    expect(replaced.body.submission.exif.aperture).toBeNull();
    // alte Dateien wurden gelöscht
    expect(fs.existsSync(path.join(config.uploadDir, oldFiles.image_file!))).toBe(false);
    expect(fs.existsSync(path.join(config.uploadDir, oldFiles.thumb_file!))).toBe(false);
  });

  it('verbietet Austausch und Löschen nach Ablauf der Frist', async () => {
    const a = await loggedIn(app, 'anna');
    const s = (await upload(a).expect(201)).body.submission;
    travelTo('2026-10-31T23:00:00Z'); // 1. Nov. 00:00 Ortszeit
    await a
      .put(`/api/submissions/${s.id}/photo`)
      .attach('photo', await plainPng(), { filename: 'neu.png', contentType: 'image/png' })
      .expect(409);
    await a.delete(`/api/submissions/${s.id}`).expect(409);
    // Beschreibung darf weiterhin gepflegt werden
    await a.patch(`/api/submissions/${s.id}`).send({ description: 'Nachtrag' }).expect(200);
    const mine = await a.get('/api/submissions/mine').expect(200);
    expect(mine.body.submissions[0].permissions).toEqual({ edit: true, replace: false, delete: false });
  });
});

describe('Zugriffskontrolle (IDOR)', () => {
  it('fremde Fotos sind vor Ablauf der Frist unsichtbar', async () => {
    const a = await loggedIn(app, 'anna');
    const b = await loggedIn(app, 'bernd');
    const s = (await upload(a).expect(201)).body.submission;

    await b.get(`/api/submissions/${s.id}`).expect(404);
    await b.get(s.imageUrl).expect(404);
    await b.get(s.thumbUrl).expect(404);
    await b.get(`/api/submissions/${s.id}/comments`).expect(404);
    await b.post(`/api/submissions/${s.id}/comments`).send({ body: 'hi' }).expect(404);
    await b.patch(`/api/submissions/${s.id}`).send({ description: 'gehackt' }).expect(404);
    await b.delete(`/api/submissions/${s.id}`).expect(404);
    await b
      .put(`/api/submissions/${s.id}/photo`)
      .attach('photo', await plainPng(), { filename: 'x.png', contentType: 'image/png' })
      .expect(404);
    const gallery = await b.get('/api/gallery').expect(200);
    expect(gallery.body.months).toHaveLength(0);
  });

  it('nach der Frist: sichtbar in der Galerie, aber nicht von Fremden änderbar', async () => {
    const a = await loggedIn(app, 'anna');
    const b = await loggedIn(app, 'bernd');
    const s = (await upload(a, undefined, { description: 'Mein Bild' }).expect(201)).body.submission;
    travelTo('2026-11-02T10:00:00Z');

    const view = await b.get(`/api/submissions/${s.id}`).expect(200);
    expect(view.body.submission.permissions).toEqual({ edit: false, replace: false, delete: false });
    await b.get(s.imageUrl).expect(200);
    await b.patch(`/api/submissions/${s.id}`).send({ description: 'gehackt' }).expect(403);
    await b.delete(`/api/submissions/${s.id}`).expect(403);

    const gallery = await b.get('/api/gallery').expect(200);
    expect(gallery.body.months).toHaveLength(1);
    expect(gallery.body.months[0].challenge.period).toBe('2026-10');
    expect(gallery.body.months[0].submissions[0].user.username).toBe('anna');
    const month = await b.get('/api/gallery/2026-10').expect(200);
    expect(month.body.submissions).toHaveLength(1);
    await b.get('/api/gallery/2026-11').expect(404);
  });

  it('versteckt GPS-Daten für andere, wenn der Standort ausgeblendet ist', async () => {
    const a = await loggedIn(app, 'anna');
    const b = await loggedIn(app, 'bernd');
    const s = (await upload(a, undefined, { showLocation: 'false' }).expect(201)).body.submission;
    expect(s.exif.gpsLat).toBe(52.52); // der Urheber sieht seine Daten
    travelTo('2026-11-02T10:00:00Z');
    const view = await b.get(`/api/submissions/${s.id}`).expect(200);
    expect(view.body.submission.exif.gpsLat).toBeNull();
    expect(view.body.submission.exif.gpsLon).toBeNull();
  });

  it('alle Endpunkte erfordern eine Anmeldung', async () => {
    for (const url of ['/api/challenges/current', '/api/submissions/mine', '/api/submissions/1', '/api/submissions/1/image', '/api/gallery']) {
      await request(app).get(url).expect(401);
    }
  });
});

describe('Eingabevalidierung', () => {
  it('weist SQL-Injection- und Path-Traversal-Versuche in Parametern ab', async () => {
    const a = await loggedIn(app, 'anna');
    await a.get('/api/submissions/1%20OR%201=1').expect(400);
    await a.get("/api/submissions/1'--").expect(400);
    await a.get('/api/submissions/-1').expect(400);
    await a.get('/api/gallery/2026-10%27%20OR%201=1').expect(400);
    const s = (await upload(a).expect(201)).body.submission;
    await a.get(`/api/submissions/${s.id}/image?size=../../../etc/passwd`).expect(400);
    await a.get(`/api/submissions/${s.id}/image?size=thumb&size=full`).expect(400);
  });

  it('speichert XSS-Payloads unverändert als Text und liefert sie als JSON aus', async () => {
    const a = await loggedIn(app, 'anna');
    const payload = '<img src=x onerror=alert(1)>';
    const res = await upload(a, undefined, { description: payload }).expect(201);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.submission.description).toBe(payload);
  });

  it('begrenzt die Länge der Beschreibung und entfernt Steuerzeichen', async () => {
    const a = await loggedIn(app, 'anna');
    await upload(a, undefined, { description: 'x'.repeat(2001) }).expect(400);
    const s = (await upload(a, undefined, { description: 'Hallo\u0000Welt\u0007' }).expect(201)).body.submission;
    expect(s.description).toBe('HalloWelt');
  });

  it('erlaubt nur bekannte Felder beim Bearbeiten', async () => {
    const a = await loggedIn(app, 'anna');
    const s = (await upload(a).expect(201)).body.submission;
    await a.patch(`/api/submissions/${s.id}`).send({ user_id: 999 }).expect(400);
    await a.patch(`/api/submissions/${s.id}`).send({ image_file: '../../x' }).expect(400);
  });
});
