import { request } from './http';
import type { Challenge, Submission } from './types';

export const challengeApi = {
  current: () =>
    request<{ challenge: Challenge; participantCount: number; mySubmission: Submission | null }>('/challenges/current'),
};
