export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heif', 'image/heic', 'image/tiff'];
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',');
export const MAX_UPLOAD_MB = 25;

/** Schnelle clientseitige Vorprüfung – die eigentliche Prüfung erfolgt im Backend. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type) && !/\.(jpe?g|png|webp|avif|heic|heif|tiff?)$/i.test(file.name)) {
    return 'Bitte eine Bilddatei wählen (JPEG, PNG, WebP, AVIF, HEIF oder TIFF).';
  }
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `Die Datei ist zu groß (max. ${MAX_UPLOAD_MB} MB).`;
  }
  return null;
}
