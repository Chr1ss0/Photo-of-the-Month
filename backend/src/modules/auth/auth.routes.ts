import { Router, type Request, type Response } from 'express';
import { config } from '../../config/env.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from '../../middleware/cookies.js';
import { ensureCsrfToken } from '../../middleware/csrf.js';
import { loginIpLimiter, loginUserLimiter, registerLimiter } from '../../middleware/rateLimit.js';
import { forbidden } from '../../utils/errors.js';
import { parse } from '../../utils/validation.js';
import { changePasswordSchema, loginSchema, registerSchema } from './auth.schemas.js';
import {
  authenticate,
  changePassword,
  createSession,
  createUser,
  revokeSession,
  type SessionUser,
} from './auth.service.js';

export const authRouter = Router();

function startSession(req: Request, res: Response, user: SessionUser): void {
  // Session-Fixation verhindern: ein evtl. vorhandenes altes Token verwerfen
  const old: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof old === 'string') revokeSession(old);
  const { token, expiresAt } = createSession(user.id);
  setSessionCookie(res, token, expiresAt);
}

/** Liefert das CSRF-Token (und setzt das Cookie, falls noch nicht vorhanden). */
authRouter.get('/csrf', (req, res) => {
  res.json({ csrfToken: ensureCsrfToken(req, res) });
});

authRouter.get('/me', (req, res) => {
  res.json({ user: req.user ?? null, registrationOpen: config.allowRegistration });
});

authRouter.post('/register', registerLimiter, async (req, res) => {
  if (!config.allowRegistration) throw forbidden('Registrierung ist deaktiviert');
  const { username, password } = parse(registerSchema, req.body ?? {});
  const user = await createUser(username, password);
  startSession(req, res, user);
  res.status(201).json({ user });
});

authRouter.post('/login', loginIpLimiter, loginUserLimiter, async (req, res) => {
  const { username, password } = parse(loginSchema, req.body ?? {});
  const user = await authenticate(username, password);
  startSession(req, res, user);
  res.json({ user });
});

authRouter.post('/logout', (req, res) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === 'string') revokeSession(token);
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.post('/password', requireAuth, loginIpLimiter, async (req, res) => {
  const user = currentUser(req);
  const { currentPassword, newPassword } = parse(changePasswordSchema, req.body ?? {});
  await changePassword(user.id, currentPassword, newPassword);
  // alle Sessions wurden widerrufen – neue Session für dieses Gerät starten
  startSession(req, res, user);
  res.status(204).end();
});
