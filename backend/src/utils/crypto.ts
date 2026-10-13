import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { config } from '../config/env.js';

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

const KEY_LEN = 64;

/** Passwort-Hash im Format scrypt$N$r$p$salt$hash (Base64). */
export async function hashPassword(password: string): Promise<string> {
  const N = config.scryptCost;
  const r = 8;
  const p = 1;
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password.normalize('NFKC'), salt, KEY_LEN, { N, r, p, maxmem: 256 * N * r });
  return ['scrypt', N, r, p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4]!, 'base64');
  const expected = Buffer.from(parts[5]!, 'base64');
  const actual = await scrypt(password.normalize('NFKC'), salt, expected.length, { N, r, p, maxmem: 256 * N * r });
  return crypto.timingSafeEqual(actual, expected);
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
