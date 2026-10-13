import type { NextFunction, Request, Response } from 'express';
import { findSessionUser } from '../modules/auth/auth.service.js';
import { forbidden, unauthorized } from '../utils/errors.js';
import { clearSessionCookie, SESSION_COOKIE } from './cookies.js';

/** Lädt den Benutzer aus dem Session-Cookie (falls vorhanden). */
export function loadSession(req: Request, res: Response, next: NextFunction): void {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string' && token) {
    const user = findSessionUser(token);
    if (user) req.user = user;
    else clearSessionCookie(res);
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'admin') return next(forbidden());
  next();
}

/** Liefert den angemeldeten Benutzer – nur nach requireAuth verwenden. */
export function currentUser(req: Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}
