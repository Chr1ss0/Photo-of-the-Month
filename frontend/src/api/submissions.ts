import { request } from './http';
import type { Comment, Submission } from './types';

export const submissionApi = {
  mine: () => request<{ submissions: Submission[] }>('/submissions/mine'),
  get: (id: number) => request<{ submission: Submission }>(`/submissions/${id}`),
  create: (photo: File, description: string, showLocation: boolean) => {
    const form = new FormData();
    form.append('description', description);
    form.append('showLocation', String(showLocation));
    form.append('photo', photo);
    return request<{ submission: Submission }>('/submissions', { method: 'POST', body: form });
  },
  replacePhoto: (id: number, photo: File) => {
    const form = new FormData();
    form.append('photo', photo);
    return request<{ submission: Submission }>(`/submissions/${id}/photo`, { method: 'PUT', body: form });
  },
  update: (id: number, data: { description?: string; showLocation?: boolean }) =>
    request<{ submission: Submission }>(`/submissions/${id}`, { method: 'PATCH', body: data }),
  remove: (id: number) => request<void>(`/submissions/${id}`, { method: 'DELETE' }),

  comments: (id: number) => request<{ comments: Comment[] }>(`/submissions/${id}/comments`),
  addComment: (id: number, body: string) =>
    request<{ comment: Comment }>(`/submissions/${id}/comments`, { method: 'POST', body: { body } }),
  deleteComment: (commentId: number) => request<void>(`/comments/${commentId}`, { method: 'DELETE' }),
};
