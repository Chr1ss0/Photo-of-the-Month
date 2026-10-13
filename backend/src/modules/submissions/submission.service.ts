import { getDb } from '../../db/index.js';
import { extractExif, type ExifData } from '../../services/exif.js';
import { removeImages, storeImage } from '../../services/imageStorage.js';
import { conflict, forbidden, notFound } from '../../utils/errors.js';
import { isPeriodClosed, isPeriodOpen, nowIso, periodDeadline } from '../../utils/time.js';
import type { SessionUser } from '../auth/auth.service.js';
import { ensureChallenge } from '../challenges/challenge.service.js';

export interface SubmissionRow {
  id: number;
  challenge_id: number;
  user_id: number;
  description: string;
  show_location: number;
  image_file: string;
  thumb_file: string;
  width: number;
  height: number;
  aperture: number | null;
  exposure_time: number | null;
  iso: number | null;
  white_balance: string | null;
  exposure_bias: number | null;
  gps_lat: number | null;
  gps_lon: number | null;
  focal_length: number | null;
  camera_make: string | null;
  camera_model: string | null;
  lens: string | null;
  taken_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Submission inkl. Challenge- und Benutzerdaten (Ergebnis von SELECT_FULL). */
export interface SubmissionFullRow extends SubmissionRow {
  period: string;
  challenge_title: string;
  challenge_twist: string | null;
  username: string;
  comment_count: number;
}

export const SELECT_FULL = `
  SELECT s.*, c.period, c.title AS challenge_title, c.twist AS challenge_twist, u.username,
         (SELECT COUNT(*) FROM comments cm WHERE cm.submission_id = s.id) AS comment_count
    FROM submissions s
    JOIN challenges c ON c.id = s.challenge_id
    JOIN users u ON u.id = s.user_id`;

export interface SubmissionDto {
  id: number;
  challenge: { id: number; period: string; title: string; twist: string | null; deadline: string };
  user: { id: number; username: string };
  description: string;
  showLocation: boolean;
  imageUrl: string;
  thumbUrl: string;
  width: number;
  height: number;
  exif: ExifData;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  /** true, solange die Frist läuft – erst danach erscheint das Bild in der Galerie. */
  isOpen: boolean;
  permissions: { edit: boolean; replace: boolean; delete: boolean };
}

function version(row: SubmissionRow): string {
  return row.image_file.slice(0, 8);
}

export function toSubmissionDto(row: SubmissionFullRow, viewer: SessionUser): SubmissionDto {
  const isOwner = row.user_id === viewer.id;
  const isAdmin = viewer.role === 'admin';
  const open = isPeriodOpen(row.period);
  const revealGps = row.show_location === 1 || isOwner;
  return {
    id: row.id,
    challenge: {
      id: row.challenge_id,
      period: row.period,
      title: row.challenge_title,
      twist: row.challenge_twist,
      deadline: periodDeadline(row.period).toISOString(),
    },
    user: { id: row.user_id, username: row.username },
    description: row.description,
    showLocation: row.show_location === 1,
    imageUrl: `/api/submissions/${row.id}/image?v=${version(row)}`,
    thumbUrl: `/api/submissions/${row.id}/image?size=thumb&v=${version(row)}`,
    width: row.width,
    height: row.height,
    exif: {
      aperture: row.aperture,
      exposureTime: row.exposure_time,
      iso: row.iso,
      whiteBalance: row.white_balance,
      exposureBias: row.exposure_bias,
      gpsLat: revealGps ? row.gps_lat : null,
      gpsLon: revealGps ? row.gps_lon : null,
      focalLength: row.focal_length,
      cameraMake: row.camera_make,
      cameraModel: row.camera_model,
      lens: row.lens,
      takenAt: row.taken_at,
    },
    commentCount: row.comment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOpen: open,
    permissions: {
      edit: isOwner,
      replace: isOwner && open,
      delete: (isOwner && open) || isAdmin,
    },
  };
}

export function findSubmission(id: number): SubmissionFullRow | undefined {
  return getDb().prepare(`${SELECT_FULL} WHERE s.id = ?`).get(id) as SubmissionFullRow | undefined;
}

/**
 * Sichtbarkeitsregel: Eigene Bilder und Admin immer; fremde Bilder erst,
 * wenn die Frist der Challenge abgelaufen ist (dann sind sie in der Galerie).
 */
export function canView(row: Pick<SubmissionFullRow, 'user_id' | 'period'>, viewer: SessionUser): boolean {
  return row.user_id === viewer.id || viewer.role === 'admin' || isPeriodClosed(row.period);
}

/** Lädt eine Submission und prüft die Sichtbarkeit. Nicht sichtbare werden wie nicht existierende behandelt. */
export function getVisibleSubmission(id: number, viewer: SessionUser): SubmissionFullRow {
  const row = findSubmission(id);
  if (!row || !canView(row, viewer)) throw notFound('Foto nicht gefunden');
  return row;
}

function exifColumns(exif: ExifData) {
  return [
    exif.aperture,
    exif.exposureTime,
    exif.iso,
    exif.whiteBalance,
    exif.exposureBias,
    exif.gpsLat,
    exif.gpsLon,
    exif.focalLength,
    exif.cameraMake,
    exif.cameraModel,
    exif.lens,
    exif.takenAt,
  ];
}

export async function createSubmission(
  user: SessionUser,
  file: Buffer,
  data: { description: string; showLocation: boolean },
): Promise<SubmissionFullRow> {
  const challenge = ensureChallenge();
  if (!isPeriodOpen(challenge.period)) throw conflict('Die Einsendefrist ist abgelaufen');

  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM submissions WHERE challenge_id = ? AND user_id = ?')
    .get(challenge.id, user.id);
  if (existing) throw conflict('Du hast für diesen Monat bereits ein Foto eingereicht – du kannst es austauschen.');

  const exif = await extractExif(file);
  const stored = await storeImage(file);
  const now = nowIso();
  try {
    const info = db
      .prepare(
        `INSERT INTO submissions (challenge_id, user_id, description, show_location, image_file, thumb_file, width, height,
           aperture, exposure_time, iso, white_balance, exposure_bias, gps_lat, gps_lon, focal_length,
           camera_make, camera_model, lens, taken_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        challenge.id,
        user.id,
        data.description,
        data.showLocation ? 1 : 0,
        stored.imageFile,
        stored.thumbFile,
        stored.width,
        stored.height,
        ...exifColumns(exif),
        now,
        now,
      );
    return findSubmission(Number(info.lastInsertRowid))!;
  } catch (err) {
    await removeImages(stored.imageFile, stored.thumbFile);
    if (String(err).includes('UNIQUE')) throw conflict('Du hast für diesen Monat bereits ein Foto eingereicht.');
    throw err;
  }
}

function assertOwner(row: SubmissionRow, user: SessionUser): void {
  if (row.user_id !== user.id) throw forbidden('Nur der Urheber darf dieses Foto bearbeiten');
}

export async function replacePhoto(id: number, user: SessionUser, file: Buffer): Promise<SubmissionFullRow> {
  const row = getVisibleSubmission(id, user);
  assertOwner(row, user);
  if (!isPeriodOpen(row.period)) throw conflict('Die Frist ist abgelaufen – das Foto kann nicht mehr getauscht werden');

  const exif = await extractExif(file);
  const stored = await storeImage(file);
  getDb()
    .prepare(
      `UPDATE submissions SET image_file = ?, thumb_file = ?, width = ?, height = ?,
         aperture = ?, exposure_time = ?, iso = ?, white_balance = ?, exposure_bias = ?, gps_lat = ?, gps_lon = ?,
         focal_length = ?, camera_make = ?, camera_model = ?, lens = ?, taken_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(stored.imageFile, stored.thumbFile, stored.width, stored.height, ...exifColumns(exif), nowIso(), id);
  await removeImages(row.image_file, row.thumb_file);
  return findSubmission(id)!;
}

export function updateSubmission(
  id: number,
  user: SessionUser,
  data: { description?: string; showLocation?: boolean },
): SubmissionFullRow {
  const row = getVisibleSubmission(id, user);
  assertOwner(row, user);
  getDb()
    .prepare('UPDATE submissions SET description = ?, show_location = ?, updated_at = ? WHERE id = ?')
    .run(
      data.description ?? row.description,
      data.showLocation === undefined ? row.show_location : data.showLocation ? 1 : 0,
      nowIso(),
      id,
    );
  return findSubmission(id)!;
}

export async function deleteSubmission(id: number, user: SessionUser): Promise<void> {
  const row = getVisibleSubmission(id, user);
  if (user.role !== 'admin') {
    assertOwner(row, user);
    if (!isPeriodOpen(row.period)) throw conflict('Nach Ablauf der Frist kann das Foto nicht mehr gelöscht werden');
  }
  getDb().prepare('DELETE FROM submissions WHERE id = ?').run(id);
  await removeImages(row.image_file, row.thumb_file);
}

export function listOwnSubmissions(user: SessionUser): SubmissionFullRow[] {
  return getDb()
    .prepare(`${SELECT_FULL} WHERE s.user_id = ? ORDER BY c.period DESC`)
    .all(user.id) as SubmissionFullRow[];
}

export function findOwnSubmissionForChallenge(userId: number, challengeId: number): SubmissionFullRow | undefined {
  return getDb()
    .prepare(`${SELECT_FULL} WHERE s.user_id = ? AND s.challenge_id = ?`)
    .get(userId, challengeId) as SubmissionFullRow | undefined;
}

/** Löscht alle Bilddateien eines Benutzers (vor dem Löschen des Kontos). */
export async function removeUserImages(userId: number): Promise<void> {
  const rows = getDb().prepare('SELECT image_file, thumb_file FROM submissions WHERE user_id = ?').all(userId) as Array<
    Pick<SubmissionRow, 'image_file' | 'thumb_file'>
  >;
  for (const r of rows) await removeImages(r.image_file, r.thumb_file);
}
