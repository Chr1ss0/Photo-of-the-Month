import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { config } from '../config/env.js';
import { badRequest } from '../utils/errors.js';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'heif', 'tiff']);
const MAX_PIXELS = 120_000_000; // ~ 120 MP
const FULL_MAX_EDGE = 3840;
const THUMB_MAX_EDGE = 900;
const FILE_NAME_RE = /^[a-f0-9-]{36}(_thumb)?\.(jpg|webp)$/;

export interface StoredImage {
  imageFile: string;
  thumbFile: string;
  width: number;
  height: number;
}

/**
 * Prüft den Upload anhand des tatsächlichen Dateiinhalts (nicht über MIME-Typ oder Endung),
 * kodiert ihn neu und speichert eine große Version sowie ein Vorschaubild.
 * Durch das Neukodieren werden eingebettete Metadaten (inkl. GPS) und
 * eventuell eingeschleuste Fremddaten (Polyglot-Dateien) entfernt.
 */
export async function storeImage(buffer: Buffer): Promise<StoredImage> {
  let meta: Metadata;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    throw badRequest('Die Datei ist kein gültiges Bild');
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw badRequest('Nicht unterstütztes Bildformat (erlaubt: JPEG, PNG, WebP, AVIF, HEIF, TIFF)');
  }
  if (!meta.width || !meta.height || meta.width < 200 || meta.height < 200) {
    throw badRequest('Das Bild ist zu klein (mind. 200 × 200 Pixel)');
  }

  await fs.mkdir(config.uploadDir, { recursive: true });
  const id = crypto.randomUUID();
  const imageFile = `${id}.jpg`;
  const thumbFile = `${id}_thumb.webp`;

  try {
    const base = sharp(buffer, { limitInputPixels: MAX_PIXELS, pages: 1 }).rotate(); // EXIF-Orientierung anwenden
    const full = await base
      .clone()
      .resize({ width: FULL_MAX_EDGE, height: FULL_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(filePath(imageFile));
    await base
      .clone()
      .resize({ width: THUMB_MAX_EDGE, height: THUMB_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filePath(thumbFile));
    return { imageFile, thumbFile, width: full.width, height: full.height };
  } catch {
    await removeImages(imageFile, thumbFile);
    throw badRequest('Das Bild konnte nicht verarbeitet werden');
  }
}

export function filePath(name: string): string {
  if (!FILE_NAME_RE.test(name)) throw new Error('Ungültiger Dateiname');
  return path.join(config.uploadDir, name);
}

export async function removeImages(...names: string[]): Promise<void> {
  await Promise.all(
    names.map(async (n) => {
      try {
        await fs.unlink(filePath(n));
      } catch {
        /* Datei existiert bereits nicht mehr */
      }
    }),
  );
}
