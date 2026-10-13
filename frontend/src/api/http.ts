/**
 * Zentraler HTTP-Client für die REST-API.
 * - sendet Cookies (Session) nur an die eigene Origin
 * - hängt bei schreibenden Requests das CSRF-Token an
 * - wandelt Fehlerantworten in ApiError um
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

const BASE = '/api';
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** Wird aufgerufen, wenn die Session serverseitig abgelaufen ist (401). */
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch(`${BASE}/auth/csrf`, { credentials: 'same-origin' });
  if (!res.ok) throw new ApiError(res.status, 'Sicherheits-Token konnte nicht geladen werden');
  const data = (await res.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
  return csrfToken;
}

function getCsrfToken(): Promise<string> {
  if (csrfToken) return Promise.resolve(csrfToken);
  csrfRequest ??= fetchCsrfToken().finally(() => (csrfRequest = null));
  return csrfRequest;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body; // Content-Type (inkl. Boundary) setzt der Browser
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (UNSAFE.has(method)) headers['X-CSRF-Token'] = await getCsrfToken();

  let url = `${BASE}${path}`;
  if (options.query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query)) if (v !== undefined) qs.set(k, String(v));
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const res = await fetch(url, { method, headers, body, credentials: 'same-origin', signal: options.signal });

  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { message: string; code?: string; details?: Array<{ path: string; message: string }> } })
    | null;

  if (!res.ok) {
    const err = data?.error;
    // CSRF-Token ungültig (z. B. Cookie gelöscht) -> einmal neu holen und wiederholen
    if (res.status === 403 && err?.message?.includes('CSRF') && !retried) {
      csrfToken = null;
      return request<T>(path, options, true);
    }
    if (res.status === 401 && !path.startsWith('/auth/')) unauthorizedHandler?.();
    throw new ApiError(res.status, err?.message ?? 'Unbekannter Fehler', err?.code, err?.details);
  }
  return data as T;
}

/** Nur für Tests. */
export function resetCsrfToken(): void {
  csrfToken = null;
}

/** Lesbare Fehlermeldung inkl. Validierungsdetails. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = err.details?.[0]?.message;
    return detail ? `${err.message}: ${detail}` : err.message;
  }
  if (err instanceof TypeError) return 'Server nicht erreichbar';
  return 'Unbekannter Fehler';
}
