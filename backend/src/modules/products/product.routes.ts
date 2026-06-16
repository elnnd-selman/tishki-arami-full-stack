import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { uploadImages } from '../../middleware/upload.js';
import { PERMISSIONS } from '../../config/permissions.js';
import {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
  imageAltSchema,
} from './product.schema.js';
import { createVariantSchema, updateVariantSchema } from './variant.schema.js';
import * as ctrl from './product.controller.js';
import * as variantCtrl from './variant.controller.js';

const router = Router();

// Every product route requires authentication; each action requires its permission.
router.use(authenticate);

router.get(
  '/',
  authorize(PERMISSIONS.PRODUCT_VIEW),
  validate(listProductsSchema, 'query'),
  asyncHandler(ctrl.list),
);

router.get('/slug/:slug', authorize(PERMISSIONS.PRODUCT_VIEW), asyncHandler(ctrl.getBySlug));

router.get('/:id', authorize(PERMISSIONS.PRODUCT_VIEW), asyncHandler(ctrl.getById));

router.post(
  '/',
  authorize(PERMISSIONS.PRODUCT_CREATE),
  validate(createProductSchema),
  asyncHandler(ctrl.create),
);

router.put(
  '/:id',
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  validate(updateProductSchema),
  asyncHandler(ctrl.update),
);

router.delete('/:id', authorize(PERMISSIONS.PRODUCT_DELETE), asyncHandler(ctrl.remove));

// --- Image management ---
router.post(
  '/:id/images',
  authorize(PERMISSIONS.PRODUCT_UPLOAD),
  uploadImages.array('images', 20),
  asyncHandler(ctrl.uploadImages),
);

router.put(
  '/:id/images/:imageId',
  authorize(PERMISSIONS.PRODUCT_UPLOAD),
  uploadImages.single('image'),
  asyncHandler(ctrl.replaceImage),
);

router.patch(
  '/:id/images/:imageId/cover',
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  asyncHandler(ctrl.setCover),
);

router.patch(
  '/:id/images/:imageId/alt',
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  validate(imageAltSchema),
  asyncHandler(ctrl.updateImageAlt),
);

router.delete(
  '/:id/images/:imageId',
  authorize(PERMISSIONS.PRODUCT_UPLOAD),
  asyncHandler(ctrl.deleteImage),
);

// --- Variants (each with its own relational key/value attributes) ---
router.post(
  '/:id/variants',
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  validate(createVariantSchema),
  asyncHandler(variantCtrl.create),
);
router.put(
  '/:id/variants/:variantId',
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  validate(updateVariantSchema),
  asyncHandler(variantCtrl.update),
);
router.delete(
  '/:id/variants/:variantId',
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  asyncHandler(variantCtrl.remove),
);

export default router;
