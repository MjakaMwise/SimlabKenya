import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
} from '../controllers/orderController.js';

const router = Router();

// Public route — anyone can place an order
router.post('/', createOrder);

// Admin-only routes
router.get('/', requireAuth, requireAdmin, getOrders);
router.get('/:id', requireAuth, requireAdmin, getOrder);
router.patch('/:id', requireAuth, requireAdmin, updateOrder);

export default router;
