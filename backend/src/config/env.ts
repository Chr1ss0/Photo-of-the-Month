import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) throw new Error(`Umgebungsvariable ${name} muss eine Zahl sein`);
  return n;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

const nodeEnv = str('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

export const config = {
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  port: int('PORT', 3000),
  host: str('HOST', '127.0.0.1'),
  /** Zeitzone, in der Monatsgrenzen und Deadlines berechnet werden. */
  timezone: str('APP_TIMEZONE', 'Europe/Berlin'),
  dataDir: path.resolve(rootDir, str('DATA_DIR', 'data')),
  get dbFile() {
    return process.env.DB_FILE ?? path.join(this.dataDir, 'potm.sqlite');
  },
  get uploadDir() {
    return path.join(this.dataDir, 'uploads');
  },
  /** Optional: gebautes Frontend, das vom Backend ausgeliefert wird (Produktion). */
  staticDir: process.env.STATIC_DIR ? path.resolve(rootDir, process.env.STATIC_DIR) : path.resolve(rootDir, '..', 'frontend', 'dist'),
  /** Erlaubte Origins für zustandsändernde Requests (kommagetrennt). */
  allowedOrigins: str('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  trustProxy: int('TRUST_PROXY', 0),
  cookieSecure: bool('COOKIE_SECURE', isProduction),
  sessionTtlHours: int('SESSION_TTL_HOURS', 24 * 7),
  allowRegistration: bool('ALLOW_REGISTRATION', true),
  maxUploadMb: int('MAX_UPLOAD_MB', 25),
  /** scrypt-Kostenfaktor (Zweierpotenz). In Tests niedriger, damit sie schnell laufen. */
  scryptCost: int('SCRYPT_COST', nodeEnv === 'test' ? 1024 : 32768),
  rateLimitEnabled: bool('RATE_LIMIT', true),
  /** Wahrscheinlichkeit (0-100), dass der Generator einen zusätzlichen Twist anhängt. */
  twistChance: int('CHALLENGE_TWIST_CHANCE', 60),
  admin: {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  },
};

export type AppConfig = typeof config;
