import type { CookieOptions, Response } from 'express';
import { config } from '../config/env.js';

// Mit __Host- Präfix erzwingt der Browser Secure, Path=/ und keine Domain –
// nur möglich, wenn Cookies tatsächlich über HTTPS gesetzt werden.
const prefix = config.cookieSecure ? '__Host-' : '';

export const SESSION_COOKIE = `${prefix}potm_sid`;
export const CSRF_COOKIE = `${prefix}potm_csrf`;
export const CSRF_HEADER = 'x-csrf-token';

const base: CookieOptions = {
  secure: config.cookieSecure,
  sameSite: 'strict',
  path: '/',
};

export function setSessionCookie(res: Response, token: string, expires: Date): void {
  res.cookie(SESSION_COOKIE, token, { ...base, httpOnly: true, expires });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { ...base, httpOnly: true });
}

/** Das CSRF-Cookie muss vom Frontend lesbar sein (Double-Submit-Verfahren). */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, { ...base, httpOnly: false });
}
