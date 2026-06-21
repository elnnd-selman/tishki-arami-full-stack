import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import * as ctrl from './contact.controller.js';

const router = Router();

// Admin-only routes (read, delete, mark).
router.get('/', authenticate, authorize('contact.read'), asyncHandler(ctrl.list));
router.patch('/:id/read', authenticate, authorize('contact.read'), asyncHandler(ctrl.read));
router.patch('/:id/unread', authenticate, authorize('contact.read'), asyncHandler(ctrl.unread));
router.delete('/:id', authenticate, authorize('contact.delete'), asyncHandler(ctrl.remove));

export default router;
