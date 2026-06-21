import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { BadRequestError } from '../lib/errors.js';

// Raster formats we accept. Anything else (svg, pdf, text renamed to .jpg, ...)
// is rejected, which covers the "invalid / corrupted format" test cases.
const SUPPORTED_INPUT = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff']);

const MAX_DIMENSION = 1600;
const THUMB_DIMENSION = 400;

export interface ProcessedImage {
  path: string; // optimized original (relative to upload dir)
  webpPath: string;
  thumbnailPath: string;
  thumbnailWebpPath: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

function uploadRoot(): string {
  return path.resolve(process.cwd(), env.upload.dir);
}

// Absolute filesystem path for a stored (relative) image path.
export function toAbsolute(relativePath: string): string {
  return path.join(uploadRoot(), relativePath);
}

// Public URL the frontend can load directly.
export function toPublicUrl(relativePath: string): string {
  return `${env.upload.publicBaseUrl}/${env.upload.dir}/${relativePath}`.replace(/([^:]\/)\/+/g, '$1');
}

/**
 * Validate, optimize and derive WebP + thumbnail variants from an uploaded buffer.
 * Writes four files to disk under `<uploadDir>/<subdir>/` and returns their
 * relative paths plus metadata. Throws BadRequestError on invalid/corrupt images.
 */
export async function processImage(
  buffer: Buffer,
  subdir: string,
  declaredMime?: string,
): Promise<ProcessedImage> {
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new BadRequestError('The uploaded file is not a valid image');
  }

  if (!meta.format || !SUPPORTED_INPUT.has(meta.format)) {
    throw new BadRequestError(
      `Unsupported image format${meta.format ? `: ${meta.format}` : ''}. Allowed: JPEG, PNG, WebP, GIF, AVIF, TIFF`,
    );
  }
  if (!meta.width || !meta.height) {
    throw new BadRequestError('The uploaded image appears to be corrupted (no dimensions)');
  }

  // Normalize the "original" to a web-friendly format: PNG when it has
  // transparency, otherwise JPEG. This keeps optimization predictable and
  // avoids path collisions with the WebP variant.
  const hasAlpha = Boolean(meta.hasAlpha);
  const mainExt = hasAlpha ? 'png' : 'jpg';
  const mainMime = hasAlpha ? 'image/png' : 'image/jpeg';

  const dir = path.join(uploadRoot(), subdir);
  await fs.mkdir(dir, { recursive: true });

  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const rel = (suffix: string) => path.posix.join(subdir, `${id}${suffix}`);

  const relMain = rel(`.${mainExt}`);
  const relWebp = rel('.webp');
  const relThumb = rel(`-thumb.${mainExt}`);
  const relThumbWebp = rel('-thumb.webp');

  // Auto-orient via EXIF, then strip metadata (sharp strips by default on output).
  const base = sharp(buffer, { failOn: 'truncated' }).rotate();

  const mainPipeline = base
    .clone()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });

  const mainOut = hasAlpha
    ? mainPipeline.png({ compressionLevel: 9, palette: true })
    : mainPipeline.jpeg({ quality: 82, mozjpeg: true });

  const thumbPipeline = base
    .clone()
    .resize({ width: THUMB_DIMENSION, height: THUMB_DIMENSION, fit: 'inside', withoutEnlargement: true });

  // Write all four variants in parallel.
  const [mainInfo] = await Promise.all([
    mainOut.toFile(toAbsolute(relMain)),
    base
      .clone()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(toAbsolute(relWebp)),
    (hasAlpha
      ? thumbPipeline.clone().png({ compressionLevel: 9, palette: true })
      : thumbPipeline.clone().jpeg({ quality: 78, mozjpeg: true })
    ).toFile(toAbsolute(relThumb)),
    thumbPipeline.clone().webp({ quality: 75 }).toFile(toAbsolute(relThumbWebp)),
  ]);

  return {
    path: relMain,
    webpPath: relWebp,
    thumbnailPath: relThumb,
    thumbnailWebpPath: relThumbWebp,
    mimeType: mainMime,
    sizeBytes: mainInfo.size,
    width: mainInfo.width,
    height: mainInfo.height,
  };
}

// Removes the given relative image paths from disk. Missing files are ignored,
// so it is safe to call during cascade cleanup even if a file is already gone.
export async function deleteImageFiles(relativePaths: Array<string | null | undefined>): Promise<void> {
  await Promise.all(
    relativePaths
      .filter((p): p is string => Boolean(p))
      .map(async (p) => {
        try {
          await fs.unlink(toAbsolute(p));
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
            // eslint-disable-next-line no-console
            console.warn(`[image] could not delete ${p}:`, (err as Error).message);
          }
        }
      }),
  );
}

// Convenience: delete all four variants of one image record.
export async function deleteImageVariants(image: {
  path?: string | null;
  webpPath?: string | null;
  thumbnailPath?: string | null;
  thumbnailWebpPath?: string | null;
}): Promise<void> {
  await deleteImageFiles([
    image.path,
    image.webpPath,
    image.thumbnailPath,
    image.thumbnailWebpPath,
  ]);
}

// Builds a public URL set for a single embedded image (e.g. category image,
// brand logo) given its four stored relative paths.
export function singleImageUrls(rec: {
  path?: string | null;
  webpPath?: string | null;
  thumbPath?: string | null;
  thumbWebpPath?: string | null;
}) {
  if (!rec.path) return null;
  return {
    url: toPublicUrl(rec.path),
    webpUrl: rec.webpPath ? toPublicUrl(rec.webpPath) : null,
    thumbnailUrl: rec.thumbPath ? toPublicUrl(rec.thumbPath) : null,
    thumbnailWebpUrl: rec.thumbWebpPath ? toPublicUrl(rec.thumbWebpPath) : null,
  };
}
