import { Router } from 'express';
import shopRoutes from './shop.js';
import orderRoutes from './orders.js';
import abstractRoutes from './abstracts.js';
import adminRoutes from './admin.js';
import oceanShujaaRoutes from './oceanShujaa.js';
import schoolRoutes from './schools.js';
import settingsRoutes from './settings.js';
import chatRoutes from './chat.js';
import emailRoutes from './email.js';
import whatsappRoutes from './whatsapp.js';

const router = Router();

router.use('/products', shopRoutes);
router.use('/orders', orderRoutes);
router.use('/abstracts', abstractRoutes);
router.use('/admin', adminRoutes);
router.use('/ocean-shujaa', oceanShujaaRoutes);
router.use('/schools', schoolRoutes);
router.use('/settings', settingsRoutes);
router.use('/chat', chatRoutes);
router.use('/email', emailRoutes);
router.use('/whatsapp', whatsappRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
