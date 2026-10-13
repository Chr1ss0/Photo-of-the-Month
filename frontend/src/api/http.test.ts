import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, resetCsrfToken } from './http';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('HTTP-Client', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    resetCsrfToken();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sendet bei schreibenden Requests das CSRF-Token und nur Same-Origin-Cookies', async () => {
    fetchMock.mockResolvedValueOnce(json({ csrfToken: 'tok123' })).mockResolvedValueOnce(json({ ok: true }));
    await request('/x', { method: 'POST', body: { a: 1 } });
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('/api/x');
    expect(init.headers['X-CSRF-Token']).toBe('tok123');
    expect(init.credentials).toBe('same-origin');
  });

  it('sendet bei GET kein CSRF-Token', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    await request('/x');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1].headers['X-CSRF-Token']).toBeUndefined();
  });

  it('holt bei ungültigem CSRF-Token ein neues und wiederholt einmal', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ csrfToken: 'alt' }))
      .mockResolvedValueOnce(json({ error: { message: 'CSRF-Token fehlt oder ist ungültig' } }, 403))
      .mockResolvedValueOnce(json({ csrfToken: 'neu' }))
      .mockResolvedValueOnce(json({ ok: true }));
    await request('/x', { method: 'DELETE' });
    expect(fetchMock.mock.calls[3]![1].headers['X-CSRF-Token']).toBe('neu');
  });

  it('wirft ApiError mit Servermeldung', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: 'Nicht gefunden', code: 'NOT_FOUND' } }, 404));
    await expect(request('/x')).rejects.toEqual(expect.any(ApiError));
  });
});
