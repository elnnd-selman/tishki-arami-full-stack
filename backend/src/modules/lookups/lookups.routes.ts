import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { ok } from '../../utils/http.js';
import { PERMISSION_DEFINITIONS } from '../../config/permissions.js';
import { LOCALES } from '../../utils/i18n.js';

const router = Router();
router.use(authenticate);

// Static metadata for building UI: the full permission catalog and supported locales.
// (Category & brand lists are now served by their own CRUD modules.)
router.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    return ok(res, { permissions: PERMISSION_DEFINITIONS, locales: LOCALES });
  }),
);

export default router;
