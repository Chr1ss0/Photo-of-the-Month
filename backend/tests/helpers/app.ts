import fs from 'node:fs';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/env.js';
import { openDatabase, setDb } from '../../src/db/index.js';
import { createUser, type Role } from '../../src/modules/auth/auth.service.js';
import { setClock } from '../../src/utils/time.js';

export const ORIGIN = 'http://localhost:5173';
export const PASSWORD = 'sehr-geheimes-passwort';

/** Frische App mit leerer In-Memory-Datenbank. */
export function freshApp(): Express {
  setDb(openDatabase(':memory:'));
  fs.rmSync(config.uploadDir, { recursive: true, force: true });
  setClock(null);
  return createApp();
}

/** Setzt die „aktuelle“ Zeit der App. */
export function travelTo(iso: string): void {
  setClock(() => new Date(iso));
}

export interface Client {
  agent: ReturnType<typeof request.agent>;
  csrf: string;
  get: (url: string) => request.Test;
  post: (url: string) => request.Test;
  put: (url: string) => request.Test;
  patch: (url: string) => request.Test;
  delete: (url: string) => request.Test;
}

/** Agent mit Cookie-Jar und gültigem CSRF-Token. */
export async function client(app: Express): Promise<Client> {
  const agent = request.agent(app);
  const res = await agent.get('/api/auth/csrf').expect(200);
  const csrf = res.body.csrfToken as string;
  const withCsrf = (t: request.Test) => t.set('X-CSRF-Token', csrf).set('Origin', ORIGIN);
  return {
    agent,
    csrf,
    get: (url) => agent.get(url),
    post: (url) => withCsrf(agent.post(url)),
    put: (url) => withCsrf(agent.put(url)),
    patch: (url) => withCsrf(agent.patch(url)),
    delete: (url) => withCsrf(agent.delete(url)),
  };
}

/** Legt einen Benutzer an und meldet ihn mit einem neuen Client an. */
export async function loggedIn(app: Express, username: string, role: Role = 'user'): Promise<Client & { userId: number }> {
  const user = await createUser(username, PASSWORD, role);
  const c = await client(app);
  await c.post('/api/auth/login').send({ username, password: PASSWORD }).expect(200);
  return { ...c, userId: user.id };
}
