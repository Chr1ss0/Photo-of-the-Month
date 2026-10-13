import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { getDb } from '../src/db/index.js';
import { generateChallenge } from '../src/modules/challenges/challenge.generator.js';
import { client, freshApp, loggedIn, PASSWORD, travelTo } from './helpers/app.js';
import { jpegWithExif } from './helpers/images.js';

let app: Express;
beforeEach(() => {
  app = freshApp();
  travelTo('2026-10-28T12:00:00Z');
});

async function submitted(name: string) {
  const c = await loggedIn(app, name);
  const res = await c
    .post('/api/submissions')
    .attach('photo', await jpegWithExif(), { filename: 'a.jpg', contentType: 'image/jpeg' })
    .expect(201);
  return { c, submission: res.body.submission };
}

describe('Kommentare', () => {
  it('können nach der Frist geschrieben und nur vom Autor/Admin gelöscht werden', async () => {
    const { c: anna, submission } = await submitted('anna');
    const bernd = await loggedIn(app, 'bernd');
    const admin = await loggedIn(app, 'chef', 'admin');
    travelTo('2026-11-02T10:00:00Z');

    const created = await bernd.post(`/api/submissions/${submission.id}/comments`).send({ body: 'Tolles Licht!' }).expect(201);
    expect(created.body.comment).toMatchObject({ body: 'Tolles Licht!', user: { username: 'bernd' }, canDelete: true });

    const list = await anna.get(`/api/submissions/${submission.id}/comments`).expect(200);
    expect(list.body.comments).toHaveLength(1);
    expect(list.body.comments[0].canDelete).toBe(false);

    await anna.delete(`/api/comments/${created.body.comment.id}`).expect(403);
    await admin.delete(`/api/comments/${created.body.comment.id}`).expect(204);
  });

  it('lehnt leere und zu lange Kommentare ab', async () => {
    const { c: anna, submission } = await submitted('anna');
    await anna.post(`/api/submissions/${submission.id}/comments`).send({ body: '   ' }).expect(400);
    await anna.post(`/api/submissions/${submission.id}/comments`).send({ body: 'x'.repeat(1001) }).expect(400);
    await anna.post(`/api/submissions/${submission.id}/comments`).send({ body: 'Notiz an mich' }).expect(201);
  });
});

describe('Admin-Panel', () => {
  it('ist für normale Benutzer gesperrt', async () => {
    const u = await loggedIn(app, 'anna');
    for (const url of ['/api/admin/stats', '/api/admin/users', '/api/admin/themes', '/api/admin/challenges']) {
      await u.get(url).expect(403);
    }
    await u.patch(`/api/admin/users/${u.userId}`).send({ role: 'admin' }).expect(403);
  });

  it('verwaltet Benutzer: sperren beendet Sessions sofort', async () => {
    const admin = await loggedIn(app, 'chef', 'admin');
    const u = await loggedIn(app, 'anna');
    await admin.patch(`/api/admin/users/${u.userId}`).send({ disabled: true }).expect(200);
    await u.get('/api/challenges/current').expect(401);
    const c = await client(app);
    await c.post('/api/auth/login').send({ username: 'anna', password: PASSWORD }).expect(403);
  });

  it('verhindert, dass sich der letzte Admin aussperrt', async () => {
    const admin = await loggedIn(app, 'chef', 'admin');
    await admin.patch(`/api/admin/users/${admin.userId}`).send({ role: 'user' }).expect(400);
    await admin.delete(`/api/admin/users/${admin.userId}`).expect(400);
  });

  it('löscht Benutzer samt Fotos', async () => {
    const admin = await loggedIn(app, 'chef', 'admin');
    const { c } = await submitted('anna');
    const me = await c.get('/api/auth/me');
    await admin.delete(`/api/admin/users/${me.body.user.id}`).expect(204);
    expect(getDb().prepare('SELECT COUNT(*) AS n FROM submissions').get()).toEqual({ n: 0 });
  });

  it('verwaltet den Themen-Pool und würfelt Challenges neu', async () => {
    const admin = await loggedIn(app, 'chef', 'admin');
    const theme = await admin.post('/api/admin/themes').send({ kind: 'subject', title: 'Regenschirme', description: 'Bunt!' }).expect(201);
    await admin.patch(`/api/admin/themes/${theme.body.theme.id}`).send({ active: false }).expect(200);
    await admin.post('/api/admin/themes').send({ kind: 'evil', title: 'x' }).expect(400);

    const gen = await admin.post('/api/admin/challenges/2026-10/generate').send({}).expect(200);
    expect(gen.body.challenge.period).toBe('2026-10');
    const set = await admin
      .put('/api/admin/challenges/2026-12')
      .send({ title: 'Weihnachtslichter', description: 'Bokeh!', twist: '' })
      .expect(200);
    expect(set.body.challenge).toMatchObject({ title: 'Weihnachtslichter', twist: null, status: 'upcoming' });
    await admin.put('/api/admin/challenges/2026-13').send({ title: 'x' }).expect(400);
  });

  it('würfelt nicht neu, wenn bereits Einsendungen existieren (außer erzwungen)', async () => {
    const admin = await loggedIn(app, 'chef', 'admin');
    await submitted('anna');
    await admin.post('/api/admin/challenges/2026-10/generate').send({}).expect(409);
    await admin.post('/api/admin/challenges/2026-10/generate').send({ force: true }).expect(200);
    travelTo('2026-11-03T10:00:00Z');
    await admin.post('/api/admin/challenges/2026-10/generate').send({ force: true }).expect(409);
  });

  it('kann jedes Foto löschen (Moderation)', async () => {
    const admin = await loggedIn(app, 'chef', 'admin');
    const { submission } = await submitted('anna');
    travelTo('2026-11-03T10:00:00Z');
    const list = await admin.get('/api/admin/submissions').expect(200);
    expect(list.body.submissions).toHaveLength(1);
    await admin.delete(`/api/submissions/${submission.id}`).expect(204);
  });
});

describe('Challenge-Generator', () => {
  it('vermeidet Themen der letzten Monate', () => {
    freshApp();
    const db = getDb();
    const subjects = db.prepare("SELECT id FROM challenge_themes WHERE kind = 'subject'").all() as Array<{ id: number }>;
    // alle bis auf ein Thema als „kürzlich verwendet“ markieren (max. 12 werden berücksichtigt)
    const keep = subjects.slice(0, 12);
    db.prepare("UPDATE challenge_themes SET active = 0 WHERE kind = 'subject'").run();
    for (const s of keep) db.prepare('UPDATE challenge_themes SET active = 1 WHERE id = ?').run(s.id);
    keep.slice(0, 11).forEach((s, i) => {
      db.prepare('INSERT INTO challenges (period, title, theme_id, created_at) VALUES (?, ?, ?, ?)').run(
        `2025-${String(i + 1).padStart(2, '0')}`,
        'x',
        s.id,
        new Date().toISOString(),
      );
    });
    for (let i = 0; i < 20; i++) expect(generateChallenge().themeId).toBe(keep[11]!.id);
  });
});
