import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { config } from '../config/env.js';
import { HttpError } from '../utils/errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route nicht gefunden' } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? `Datei ist zu groß (max. ${config.maxUploadMb} MB)` : 'Upload fehlgeschlagen';
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: { code: err.code, message } });
    return;
  }
  // Fehler von body-parser (z. B. ungültiges JSON, zu großer Body)
  const status = (err as { status?: number; type?: string })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: { code: 'BAD_REQUEST', message: 'Ungültige Anfrage' } });
    return;
  }
  if (!config.isTest) console.error(err);
  // Keine internen Details an den Client weitergeben
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Interner Serverfehler' } });
}
