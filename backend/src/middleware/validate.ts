import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '../lib/errors.js';

type Part = 'body' | 'query' | 'params';

// Validates and COERCES a request part against a Zod schema. The parsed result
// replaces the original, so controllers receive typed, sanitized data.
export function validate(schema: ZodSchema, part: Part = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[part]);
      // req.query/params getters can be read-only in some setups; assign defensively.
      Object.defineProperty(req, part, { value: parsed, writable: true, configurable: true });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        return next(new ValidationError('Validation failed', details));
      }
      next(err);
    }
  };
}
