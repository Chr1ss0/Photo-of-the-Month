import { request } from './http';
import type { User } from './types';

export const authApi = {
  me: () => request<{ user: User | null; registrationOpen: boolean }>('/auth/me'),
  login: (username: string, password: string) =>
    request<{ user: User }>('/auth/login', { method: 'POST', body: { username, password } }),
  register: (username: string, password: string) =>
    request<{ user: User }>('/auth/register', { method: 'POST', body: { username, password } }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>('/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),
};
