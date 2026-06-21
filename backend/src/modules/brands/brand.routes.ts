import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { uploadImages } from '../../middleware/upload.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { createBrandSchema, updateBrandSchema, listBrandsSchema } from './brand.schema.js';
import * as ctrl from './brand.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.BRAND_VIEW), validate(listBrandsSchema, 'query'), asyncHandler(ctrl.list));
router.get('/:id', authorize(PERMISSIONS.BRAND_VIEW), asyncHandler(ctrl.getById));
router.post('/', authorize(PERMISSIONS.BRAND_CREATE), validate(createBrandSchema), asyncHandler(ctrl.create));
router.put('/:id', authorize(PERMISSIONS.BRAND_UPDATE), validate(updateBrandSchema), asyncHandler(ctrl.update));
router.delete('/:id', authorize(PERMISSIONS.BRAND_DELETE), asyncHandler(ctrl.remove));

router.put('/:id/logo', authorize(PERMISSIONS.BRAND_UPLOAD), uploadImages.single('logo'), asyncHandler(ctrl.uploadLogo));
router.delete('/:id/logo', authorize(PERMISSIONS.BRAND_UPLOAD), asyncHandler(ctrl.deleteLogo));

export default router;
