import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrder,
} from '../controllers/orderController.js';

const router = Router();

// Public route — anyone can place an order
router.post('/', createOrder);

// Admin or delegated staff
router.get('/', requireAuth, requirePermission('orders', 'view'), getOrders);
router.get('/:id', requireAuth, requirePermission('orders', 'view'), getOrder);
router.patch('/:id', requireAuth, requirePermission('orders', 'manage'), updateOrder);

export default router;
