export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg = 'Ungültige Anfrage', details?: unknown) =>
  new HttpError(400, msg, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'Nicht angemeldet') => new HttpError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'Keine Berechtigung') => new HttpError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Nicht gefunden') => new HttpError(404, msg, 'NOT_FOUND');
export const conflict = (msg: string) => new HttpError(409, msg, 'CONFLICT');
