import multer from 'multer';
import { env } from '../config/env.js';
import { BadRequestError } from '../lib/errors.js';

// Memory storage: files arrive as buffers and go straight to the sharp pipeline,
// so nothing unvalidated is ever written to disk.
const storage = multer.memoryStorage();

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
]);

export const uploadImages = multer({
  storage,
  limits: { fileSize: env.upload.maxSizeMb * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    // First-line filter on declared mime. The sharp pipeline re-validates the
    // actual bytes afterwards, so spoofed extensions still get rejected.
    if (IMAGE_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// Single document/file upload (PDF etc.) - kept for the file-testing checklist.
export const uploadDocument = multer({
  storage,
  limits: { fileSize: env.upload.maxSizeMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);
    if (allowed.has(file.mimetype)) cb(null, true);
    else cb(new BadRequestError(`Unsupported file type: ${file.mimetype}`));
  },
});
