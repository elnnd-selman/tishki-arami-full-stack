import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import productRoutes from './modules/products/product.routes.js';
import categoryRoutes from './modules/categories/category.routes.js';
import brandRoutes from './modules/brands/brand.routes.js';
import lookupRoutes from './modules/lookups/lookups.routes.js';
import publicRoutes from './modules/public/public.routes.js';
import contactRoutes from './modules/contact/contact.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', service: 'tishkiarami-api' } });
});

// Public storefront API (no authentication).
router.use('/public', publicRoutes);

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/contact', contactRoutes);
router.use('/', lookupRoutes); // /meta

export default router;
