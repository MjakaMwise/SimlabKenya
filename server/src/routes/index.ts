import { Router } from 'express';
import shopRoutes from './shop.js';
import orderRoutes from './orders.js';
import abstractRoutes from './abstracts.js';
import adminRoutes from './admin.js';

const router = Router();

router.use('/products', shopRoutes);
router.use('/orders', orderRoutes);
router.use('/abstracts', abstractRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
