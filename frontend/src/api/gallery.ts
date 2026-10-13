import { request } from './http';
import type { GalleryMonth } from './types';

export const galleryApi = {
  list: (limit: number, offset: number) =>
    request<{ months: GalleryMonth[]; total: number }>('/gallery', { query: { limit, offset } }),
  month: (period: string) => request<GalleryMonth>(`/gallery/${encodeURIComponent(period)}`),
};
