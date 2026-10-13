import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/env.js';
import { randomToken, safeEqual } from '../utils/crypto.js';
import { forbidden } from '../utils/errors.js';
import { CSRF_COOKIE, CSRF_HEADER, setCsrfCookie } from './cookies.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Stellt sicher, dass ein CSRF-Cookie existiert, und gibt das Token zurück. */
export function ensureCsrfToken(req: Request, res: Response): string {
  const existing: unknown = req.cookies?.[CSRF_COOKIE];
  if (typeof existing === 'string' && /^[A-Za-z0-9_-]{43}$/.test(existing)) return existing;
  const token = randomToken(32);
  setCsrfCookie(res, token);
  return token;
}

/**
 * CSRF-Schutz in zwei Schichten:
 *  1. Origin/Referer-Prüfung gegen eine Allowlist
 *  2. Double-Submit-Token: Header muss dem Cookie entsprechen
 * Zusätzlich sind alle Cookies SameSite=Strict.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin') ?? refererOrigin(req.get('referer'));
  if (origin && !isAllowedOrigin(req, origin)) {
    return next(forbidden('Ungültige Herkunft der Anfrage'));
  }

  const cookieToken: unknown = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);
  if (typeof cookieToken !== 'string' || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(forbidden('CSRF-Token fehlt oder ist ungültig'));
  }
  next();
}

function refererOrigin(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return 'invalid';
  }
}

function isAllowedOrigin(req: Request, origin: string): boolean {
  if (config.allowedOrigins.includes(origin)) return true;
  // gleiche Herkunft wie der Server selbst (z. B. Produktion hinter Reverse-Proxy)
  const host = req.get('host');
  return !!host && (origin === `${req.protocol}://${host}`);
}
