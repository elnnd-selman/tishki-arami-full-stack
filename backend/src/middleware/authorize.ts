import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../lib/errors.js';
import type { PermissionCode } from '../config/permissions.js';

// Requires the authenticated user to hold ALL of the given permission codes.
// Must run after authenticate(). The backend is the source of truth: even if the
// frontend hides a button, this still blocks the request.
export function authorize(...required: PermissionCode[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    const held = new Set(req.user.permissions);
    const missing = required.filter((code) => !held.has(code));
    if (missing.length > 0) {
      return next(new ForbiddenError(`Missing permission: ${missing.join(', ')}`));
    }
    next();
  };
}
