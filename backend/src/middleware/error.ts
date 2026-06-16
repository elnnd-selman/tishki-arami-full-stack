import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` },
  });
}

// Central error formatter. Maps known error types to clean JSON envelopes and
// never leaks stack traces outside development.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large (max ${env.upload.maxSizeMb}MB)`
        : err.message;
    return res.status(400).json({ success: false, error: { code: err.code, message } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: `A record with this ${target} already exists` },
      });
    }
    if (err.code === 'P2025') {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'FK_CONSTRAINT',
          message: 'Operation blocked by a related record (foreign key constraint)',
        },
      });
    }
  }

  // Unknown error - log it server-side, return a generic message.
  // eslint-disable-next-line no-console
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      ...(env.isProd ? {} : { stack: err instanceof Error ? err.stack : String(err) }),
    },
  });
}
