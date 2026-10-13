import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { config } from '../src/config/env.js';
import { getDb } from '../src/db/index.js';
import { client, freshApp, loggedIn, ORIGIN, PASSWORD } from './helpers/app.js';

let app: Express;
beforeEach(() => {
  app = freshApp();
});

describe('Registrierung & Login', () => {
  it('registriert, liefert /me und meldet ab', async () => {
    const c = await client(app);
    const reg = await c.post('/api/auth/register').send({ username: 'anna', password: PASSWORD }).expect(201);
    expect(reg.body.user).toEqual({ id: expect.any(Number), username: 'anna', role: 'user' });

    const me = await c.get('/api/auth/me').expect(200);
    expect(me.body.user.username).toBe('anna');

    await c.post('/api/auth/logout').expect(204);
    const after = await c.get('/api/auth/me').expect(200);
    expect(after.body.user).toBeNull();
  });

  it('setzt das Session-Cookie HttpOnly + SameSite=Strict', async () => {
    const c = await client(app);
    const res = await c.post('/api/auth/register').send({ username: 'ben', password: PASSWORD }).expect(201);
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((s) => s.startsWith('potm_sid='))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\//);
  });

  it('speichert Passwörter nur als scrypt-Hash und Sessions nur gehasht', async () => {
    const c = await client(app);
    const res = await c.post('/api/auth/register').send({ username: 'carla', password: PASSWORD }).expect(201);
    expect(JSON.stringify(res.body)).not.toContain('password');
    const row = getDb().prepare('SELECT password_hash FROM users WHERE username = ?').get('carla') as {
      password_hash: string;
    };
    expect(row.password_hash).toMatch(/^scrypt\$/);
    expect(row.password_hash).not.toContain(PASSWORD);

    const token = (res.headers['set-cookie'] as unknown as string[])
      .find((s) => s.startsWith('potm_sid='))!
      .split(';')[0]!
      .split('=')[1]!;
    const session = getDb().prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
    expect(session.token_hash).not.toBe(token);
    expect(session.token_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('lehnt schwache Passwörter, ungültige Namen und Mass-Assignment ab', async () => {
    const c = await client(app);
    await c.post('/api/auth/register').send({ username: 'dora', password: 'kurz' }).expect(400);
    await c.post('/api/auth/register').send({ username: '<script>', password: PASSWORD }).expect(400);
    await c.post('/api/auth/register').send({ username: 'x', password: PASSWORD }).expect(400);
    // Rolle darf nicht über die Registrierung gesetzt werden
    await c.post('/api/auth/register').send({ username: 'eve', password: PASSWORD, role: 'admin' }).expect(400);
    expect(getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").get()).toEqual({ n: 0 });
  });

  it('verhindert doppelte Benutzernamen (Groß-/Kleinschreibung egal)', async () => {
    const c = await client(app);
    await c.post('/api/auth/register').send({ username: 'Fred', password: PASSWORD }).expect(201);
    const c2 = await client(app);
    await c2.post('/api/auth/register').send({ username: 'fred', password: PASSWORD }).expect(409);
  });

  it('gibt bei falschem Passwort und unbekanntem Benutzer dieselbe Fehlermeldung', async () => {
    await loggedIn(app, 'gina');
    const c = await client(app);
    const wrongPw = await c.post('/api/auth/login').send({ username: 'gina', password: 'falsch-falsch' }).expect(401);
    const noUser = await c.post('/api/auth/login').send({ username: 'niemand', password: 'falsch-falsch' }).expect(401);
    expect(wrongPw.body.error.message).toBe(noUser.body.error.message);
  });

  it('akzeptiert keine Objekte statt Strings (NoSQL-/Type-Juggling)', async () => {
    await loggedIn(app, 'hans');
    const c = await client(app);
    await c.post('/api/auth/login').send({ username: 'hans', password: { $ne: '' } }).expect(400);
    await c.post('/api/auth/login').send({ username: ["hans' OR 1=1 --"], password: PASSWORD }).expect(400);
    await c.post('/api/auth/login').send({ username: "hans' OR '1'='1", password: "' OR '1'='1" }).expect(401);
  });

  it('verwirft beim Login das alte Session-Token (Session-Fixation)', async () => {
    const a = await loggedIn(app, 'ida');
    const before = getDb().prepare('SELECT token_hash FROM sessions').all();
    await a.post('/api/auth/login').send({ username: 'ida', password: PASSWORD }).expect(200);
    const after = getDb().prepare('SELECT token_hash FROM sessions').all();
    expect(after).toHaveLength(1);
    expect(after).not.toEqual(before);
  });

  it('beendet beim Passwortwechsel alle anderen Sessions', async () => {
    const dev1 = await loggedIn(app, 'jan');
    const dev2 = await client(app);
    await dev2.post('/api/auth/login').send({ username: 'jan', password: PASSWORD }).expect(200);

    await dev1.post('/api/auth/password').send({ currentPassword: 'falsch-falsch', newPassword: 'neues-passwort-123' }).expect(401);
    await dev1.post('/api/auth/password').send({ currentPassword: PASSWORD, newPassword: 'neues-passwort-123' }).expect(204);

    expect((await dev1.get('/api/auth/me')).body.user?.username).toBe('jan');
    expect((await dev2.get('/api/auth/me')).body.user).toBeNull();
  });

  it('lehnt manipulierte oder abgelaufene Session-Cookies ab', async () => {
    const res = await request(app).get('/api/challenges/current').set('Cookie', 'potm_sid=gefaelscht').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('respektiert ALLOW_REGISTRATION=false', async () => {
    config.allowRegistration = false;
    try {
      const c = await client(app);
      await c.post('/api/auth/register').send({ username: 'karl', password: PASSWORD }).expect(403);
    } finally {
      config.allowRegistration = true;
    }
  });

  it('begrenzt Login-Versuche (Brute-Force-Schutz)', async () => {
    config.rateLimitEnabled = true;
    try {
      const c = await client(app);
      const statuses: number[] = [];
      for (let i = 0; i < 10; i++) {
        const r = await c.post('/api/auth/login').send({ username: 'opfer', password: `versuch-${i}` });
        statuses.push(r.status);
      }
      expect(statuses).toContain(429);
    } finally {
      config.rateLimitEnabled = false;
    }
  });
});

describe('CSRF-Schutz', () => {
  it('blockiert zustandsändernde Requests ohne CSRF-Token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Origin', ORIGIN)
      .send({ username: 'mallory', password: PASSWORD })
      .expect(403);
    expect(res.body.error.message).toMatch(/CSRF/);
  });

  it('blockiert falsche Tokens', async () => {
    const c = await client(app);
    await c.agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', 'A'.repeat(43))
      .send({ username: 'mallory', password: PASSWORD })
      .expect(403);
  });

  it('blockiert fremde Origins auch mit gültigem Token', async () => {
    const c = await client(app);
    await c.agent
      .post('/api/auth/register')
      .set('X-CSRF-Token', c.csrf)
      .set('Origin', 'https://evil.example')
      .send({ username: 'mallory', password: PASSWORD })
      .expect(403);
  });

  it('setzt Sicherheits-Header', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('lehnt zu große JSON-Bodies ab', async () => {
    const c = await client(app);
    await c.post('/api/auth/login').send({ username: 'a', password: 'x'.repeat(50_000) }).expect(413);
  });
});
