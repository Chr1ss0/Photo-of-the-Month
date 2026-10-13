import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAdmin } from '../../middleware/auth.js';
import { currentPeriod, isValidPeriod } from '../../utils/time.js';
import { cleanText, idParam, parse } from '../../utils/validation.js';
import { passwordSchema } from '../auth/auth.schemas.js';
import {
  countSubmissions,
  deleteChallenge,
  listChallenges,
  regenerateChallenge,
  toChallengeDto,
  upsertChallenge,
} from '../challenges/challenge.service.js';
import * as admin from './admin.service.js';

const periodParam = z.string().refine(isValidPeriod, 'Ungültiger Monat (YYYY-MM)');

const userUpdateSchema = z
  .object({ role: z.enum(['user', 'admin']).optional(), disabled: z.boolean().optional() })
  .strict();
const passwordResetSchema = z.object({ password: passwordSchema }).strict();

const themeCreateSchema = z
  .object({
    kind: z.enum(['subject', 'twist']),
    title: cleanText(80).pipe(z.string().min(2)),
    description: cleanText(500).default(''),
  })
  .strict();
const themeUpdateSchema = z
  .object({
    title: cleanText(80).pipe(z.string().min(2)).optional(),
    description: cleanText(500).optional(),
    active: z.boolean().optional(),
  })
  .strict();

const challengeSchema = z
  .object({
    title: cleanText(120).pipe(z.string().min(2)),
    description: cleanText(1000).default(''),
    twist: cleanText(300)
      .nullable()
      .default(null)
      .transform((v) => v || null),
  })
  .strict();
const regenerateSchema = z.object({ force: z.boolean().default(false) }).strict();

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get('/stats', (_req, res) => {
  res.json({ stats: admin.stats() });
});

// --- Benutzer
adminRouter.get('/users', (_req, res) => {
  res.json({ users: admin.listUsers() });
});

adminRouter.patch('/users/:id', (req, res) => {
  admin.updateUser(currentUser(req), parse(idParam, req.params.id), parse(userUpdateSchema, req.body ?? {}));
  res.json({ users: admin.listUsers() });
});

adminRouter.post('/users/:id/password', async (req, res) => {
  const { password } = parse(passwordResetSchema, req.body ?? {});
  await admin.resetUserPassword(parse(idParam, req.params.id), password);
  res.status(204).end();
});

adminRouter.delete('/users/:id', async (req, res) => {
  await admin.deleteUser(currentUser(req), parse(idParam, req.params.id));
  res.status(204).end();
});

// --- Themen-Pool
adminRouter.get('/themes', (_req, res) => {
  res.json({ themes: admin.listThemes() });
});

adminRouter.post('/themes', (req, res) => {
  res.status(201).json({ theme: admin.createTheme(parse(themeCreateSchema, req.body ?? {})) });
});

adminRouter.patch('/themes/:id', (req, res) => {
  res.json({ theme: admin.updateTheme(parse(idParam, req.params.id), parse(themeUpdateSchema, req.body ?? {})) });
});

adminRouter.delete('/themes/:id', (req, res) => {
  admin.deleteTheme(parse(idParam, req.params.id));
  res.status(204).end();
});

// --- Challenges
adminRouter.get('/challenges', (_req, res) => {
  res.json({
    currentPeriod: currentPeriod(),
    challenges: listChallenges().map((c) => ({ ...toChallengeDto(c), submissionCount: countSubmissions(c.id) })),
  });
});

adminRouter.put('/challenges/:period', (req, res) => {
  const period = parse(periodParam, req.params.period);
  res.json({ challenge: toChallengeDto(upsertChallenge(period, parse(challengeSchema, req.body ?? {}))) });
});

adminRouter.post('/challenges/:period/generate', (req, res) => {
  const period = parse(periodParam, req.params.period);
  const { force } = parse(regenerateSchema, req.body ?? {});
  res.json({ challenge: toChallengeDto(regenerateChallenge(period, force)) });
});

adminRouter.delete('/challenges/:period', (req, res) => {
  deleteChallenge(parse(periodParam, req.params.period));
  res.status(204).end();
});

// --- Moderation
adminRouter.get('/submissions', (req, res) => {
  const period = req.query.period === undefined ? undefined : parse(periodParam, req.query.period);
  res.json({ submissions: admin.listAllSubmissions(period) });
});

adminRouter.get('/comments', (_req, res) => {
  res.json({ comments: admin.listRecentComments() });
});
