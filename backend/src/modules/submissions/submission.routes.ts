import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { uploadLimiter } from '../../middleware/rateLimit.js';
import { photoUpload } from '../../middleware/upload.js';
import { filePath } from '../../services/imageStorage.js';
import { badRequest } from '../../utils/errors.js';
import { cleanText, idParam, parse } from '../../utils/validation.js';
import {
  createSubmission,
  deleteSubmission,
  getVisibleSubmission,
  listOwnSubmissions,
  replacePhoto,
  toSubmissionDto,
  updateSubmission,
} from './submission.service.js';

const formBool = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0', 'on', 'off'])])
  .transform((v) => v === true || v === 'true' || v === '1' || v === 'on');

const createSchema = z.object({
  description: cleanText(2000).default(''),
  showLocation: formBool.default(true),
});

const updateSchema = z
  .object({
    description: cleanText(2000).optional(),
    showLocation: z.boolean().optional(),
  })
  .strict();

const imageQuery = z.object({
  size: z.enum(['full', 'thumb']).default('full'),
  v: z.string().max(16).optional(),
});

export const submissionRouter = Router();
submissionRouter.use(requireAuth);

submissionRouter.get('/mine', (req, res) => {
  const user = currentUser(req);
  res.json({ submissions: listOwnSubmissions(user).map((r) => toSubmissionDto(r, user)) });
});

submissionRouter.post('/', uploadLimiter, photoUpload, async (req, res) => {
  const user = currentUser(req);
  if (!req.file) throw badRequest('Bitte ein Foto auswählen');
  const data = parse(createSchema, req.body ?? {});
  const row = await createSubmission(user, req.file.buffer, data);
  res.status(201).json({ submission: toSubmissionDto(row, user) });
});

submissionRouter.get('/:id', (req, res) => {
  const user = currentUser(req);
  const row = getVisibleSubmission(parse(idParam, req.params.id), user);
  res.json({ submission: toSubmissionDto(row, user) });
});

submissionRouter.patch('/:id', (req, res) => {
  const user = currentUser(req);
  const data = parse(updateSchema, req.body ?? {});
  const row = updateSubmission(parse(idParam, req.params.id), user, data);
  res.json({ submission: toSubmissionDto(row, user) });
});

submissionRouter.put('/:id/photo', uploadLimiter, photoUpload, async (req, res) => {
  const user = currentUser(req);
  if (!req.file) throw badRequest('Bitte ein Foto auswählen');
  const row = await replacePhoto(parse(idParam, req.params.id), user, req.file.buffer);
  res.json({ submission: toSubmissionDto(row, user) });
});

submissionRouter.delete('/:id', async (req, res) => {
  await deleteSubmission(parse(idParam, req.params.id), currentUser(req));
  res.status(204).end();
});

/** Bildauslieferung mit Zugriffskontrolle – Bilder liegen nicht öffentlich im Webroot. */
submissionRouter.get('/:id/image', (req, res, next) => {
  const user = currentUser(req);
  const row = getVisibleSubmission(parse(idParam, req.params.id), user);
  const { size } = parse(imageQuery, req.query);
  const file = size === 'thumb' ? row.thumb_file : row.image_file;
  res.set({
    'Cache-Control': 'private, max-age=31536000, immutable',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  res.type(size === 'thumb' ? 'image/webp' : 'image/jpeg');
  res.sendFile(filePath(file), { dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) next(err);
  });
});
