import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { isValidPeriod } from '../../utils/time.js';
import { parse } from '../../utils/validation.js';
import { getGalleryMonth, listGallery } from './gallery.service.js';

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(6),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});
const periodParam = z.string().refine(isValidPeriod, 'Ungültiger Monat (YYYY-MM)');

export const galleryRouter = Router();
galleryRouter.use(requireAuth);

galleryRouter.get('/', (req, res) => {
  const { limit, offset } = parse(listQuery, req.query);
  res.json(listGallery(currentUser(req), limit, offset));
});

galleryRouter.get('/:period', (req, res) => {
  res.json(getGalleryMonth(currentUser(req), parse(periodParam, req.params.period)));
});
