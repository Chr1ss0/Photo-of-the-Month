import { request } from './http';
import type { AdminChallenge, AdminComment, AdminSubmission, AdminUser, Challenge, Role, Theme } from './types';

export const adminApi = {
  stats: () =>
    request<{ stats: { users: number; submissions: number; comments: number; challenges: number } }>('/admin/stats'),

  users: () => request<{ users: AdminUser[] }>('/admin/users'),
  updateUser: (id: number, data: { role?: Role; disabled?: boolean }) =>
    request<{ users: AdminUser[] }>(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  resetPassword: (id: number, password: string) =>
    request<void>(`/admin/users/${id}/password`, { method: 'POST', body: { password } }),
  deleteUser: (id: number) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),

  themes: () => request<{ themes: Theme[] }>('/admin/themes'),
  createTheme: (data: { kind: Theme['kind']; title: string; description: string }) =>
    request<{ theme: Theme }>('/admin/themes', { method: 'POST', body: data }),
  updateTheme: (id: number, data: { title?: string; description?: string; active?: boolean }) =>
    request<{ theme: Theme }>(`/admin/themes/${id}`, { method: 'PATCH', body: data }),
  deleteTheme: (id: number) => request<void>(`/admin/themes/${id}`, { method: 'DELETE' }),

  challenges: () => request<{ challenges: AdminChallenge[]; currentPeriod: string }>('/admin/challenges'),
  saveChallenge: (period: string, data: { title: string; description: string; twist: string | null }) =>
    request<{ challenge: Challenge }>(`/admin/challenges/${period}`, { method: 'PUT', body: data }),
  generateChallenge: (period: string, force = false) =>
    request<{ challenge: Challenge }>(`/admin/challenges/${period}/generate`, { method: 'POST', body: { force } }),
  deleteChallenge: (period: string) => request<void>(`/admin/challenges/${period}`, { method: 'DELETE' }),

  submissions: (period?: string) =>
    request<{ submissions: AdminSubmission[] }>('/admin/submissions', { query: { period } }),
  comments: () => request<{ comments: AdminComment[] }>('/admin/comments'),
};
