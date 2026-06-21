import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as ctrl from './public.controller.js';
import { submit as contactSubmit } from '../contact/contact.controller.js';

// Public, unauthenticated, read-only storefront API. Only published/active
// content is ever returned (enforced in the service layer).
const router = Router();

// Light rate limit to protect the public endpoints from abuse.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

router.get('/home', asyncHandler(ctrl.home));

router.get('/products', asyncHandler(ctrl.products));
router.get('/products/:slug', asyncHandler(ctrl.productBySlug));

router.get('/categories', asyncHandler(ctrl.categories));
router.get('/brands', asyncHandler(ctrl.brands));
router.get('/services', asyncHandler(ctrl.services));

router.get('/projects', asyncHandler(ctrl.projects));
router.get('/projects/:slug', asyncHandler(ctrl.projectBySlug));

router.get('/blogs', asyncHandler(ctrl.blogs));
router.get('/blogs/:slug', asyncHandler(ctrl.blogBySlug));

// Contact form submission — rate-limited separately to prevent spam.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/contact', contactLimiter, asyncHandler(contactSubmit));

export default router;
