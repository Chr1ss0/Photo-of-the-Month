import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config/env.js';
import { migrations } from './schema.js';
import { seedThemes } from './seed.js';

export type DB = Database.Database;

let instance: DB | null = null;

export function openDatabase(file: string = config.dbFile): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  seedThemes(db);
  return db;
}

function migrate(db: DB): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (let v = current; v < migrations.length; v++) {
    db.transaction(() => {
      db.exec(migrations[v]!);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

export function getDb(): DB {
  if (!instance) instance = openDatabase();
  return instance;
}

/** Für Tests: eigene Datenbank injizieren. */
export function setDb(db: DB): void {
  instance = db;
}

export function closeDb(): void {
  instance?.close();
  instance = null;
}
