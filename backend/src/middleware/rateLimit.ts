import type { Request } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import { config } from '../config/env.js';

const message = { error: { code: 'RATE_LIMITED', message: 'Zu viele Anfragen – bitte später erneut versuchen.' } };

function limiter(options: Partial<Options>) {
  return rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message,
    skip: () => !config.rateLimitEnabled,
    ...options,
  });
}

const ip = (req: Request) => ipKeyGenerator(req.ip ?? 'unknown');

/** Allgemeines Limit für die gesamte API. */
export const apiLimiter = limiter({ windowMs: 60_000, limit: 300, keyGenerator: ip });

/** Login: pro IP und pro Benutzername – bremst Brute-Force und Credential-Stuffing. */
export const loginIpLimiter = limiter({ windowMs: 15 * 60_000, limit: 20, keyGenerator: ip });
export const loginUserLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 8,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const name = typeof req.body?.username === 'string' ? req.body.username.toLowerCase().slice(0, 64) : '';
    return `user:${name}`;
  },
});

export const registerLimiter = limiter({ windowMs: 60 * 60_000, limit: 10, keyGenerator: ip });
export const uploadLimiter = limiter({ windowMs: 60 * 60_000, limit: 40, keyGenerator: ip });
export const commentLimiter = limiter({ windowMs: 60_000, limit: 15, keyGenerator: ip });
