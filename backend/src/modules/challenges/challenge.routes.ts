import { Router } from 'express';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { findOwnSubmissionForChallenge, toSubmissionDto } from '../submissions/submission.service.js';
import { countSubmissions, ensureChallenge, toChallengeDto } from './challenge.service.js';

export const challengeRouter = Router();
challengeRouter.use(requireAuth);

/** Aktuelle Monatsaufgabe inkl. eigener Einsendung. */
challengeRouter.get('/current', (req, res) => {
  const user = currentUser(req);
  const challenge = ensureChallenge();
  const mine = findOwnSubmissionForChallenge(user.id, challenge.id);
  res.json({
    challenge: toChallengeDto(challenge),
    participantCount: countSubmissions(challenge.id),
    mySubmission: mine ? toSubmissionDto(mine, user) : null,
  });
});
