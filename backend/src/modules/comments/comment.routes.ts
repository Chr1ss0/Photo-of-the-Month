import { Router } from 'express';
import { z } from 'zod';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { commentLimiter } from '../../middleware/rateLimit.js';
import { cleanText, idParam, parse } from '../../utils/validation.js';
import { addComment, deleteComment, listComments } from './comment.service.js';

const createSchema = z.object({ body: cleanText(1000).pipe(z.string().min(1, 'Kommentar darf nicht leer sein')) }).strict();

/** Kommentare zu einer Submission: /api/submissions/:id/comments */
export const submissionCommentRouter = Router({ mergeParams: true });
submissionCommentRouter.use(requireAuth);

submissionCommentRouter.get('/', (req, res) => {
  const id = parse(idParam, (req.params as Record<string, string>).id);
  res.json({ comments: listComments(id, currentUser(req)) });
});

submissionCommentRouter.post('/', commentLimiter, (req, res) => {
  const id = parse(idParam, (req.params as Record<string, string>).id);
  const { body } = parse(createSchema, req.body ?? {});
  res.status(201).json({ comment: addComment(id, currentUser(req), body) });
});

/** Einzelne Kommentare: /api/comments/:id */
export const commentRouter = Router();
commentRouter.use(requireAuth);

commentRouter.delete('/:id', (req, res) => {
  deleteComment(parse(idParam, req.params.id), currentUser(req));
  res.status(204).end();
});
