import multer from 'multer';
import { config } from '../config/env.js';

/**
 * Uploads landen zunächst im Speicher und werden nach der Prüfung
 * durch den Image-Service neu kodiert gespeichert. Der Originalname wird nie verwendet.
 */
export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024,
    files: 1,
    fields: 5,
    fieldSize: 8 * 1024,
    parts: 7,
  },
}).single('photo');
