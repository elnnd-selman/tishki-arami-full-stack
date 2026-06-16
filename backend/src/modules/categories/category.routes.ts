import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { uploadImages } from '../../middleware/upload.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { createCategorySchema, updateCategorySchema, listCategoriesSchema } from './category.schema.js';
import * as ctrl from './category.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.CATEGORY_VIEW), validate(listCategoriesSchema, 'query'), asyncHandler(ctrl.list));
router.get('/:id', authorize(PERMISSIONS.CATEGORY_VIEW), asyncHandler(ctrl.getById));
router.post('/', authorize(PERMISSIONS.CATEGORY_CREATE), validate(createCategorySchema), asyncHandler(ctrl.create));
router.put('/:id', authorize(PERMISSIONS.CATEGORY_UPDATE), validate(updateCategorySchema), asyncHandler(ctrl.update));
router.delete('/:id', authorize(PERMISSIONS.CATEGORY_DELETE), asyncHandler(ctrl.remove));

router.put(
  '/:id/image',
  authorize(PERMISSIONS.CATEGORY_UPDATE),
  uploadImages.single('image'),
  asyncHandler(ctrl.uploadImage),
);
router.delete('/:id/image', authorize(PERMISSIONS.CATEGORY_UPDATE), asyncHandler(ctrl.deleteImage));

export default router;
