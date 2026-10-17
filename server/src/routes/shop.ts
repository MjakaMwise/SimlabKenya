import { Router } from 'express';
import { requireAuth, requirePermission, optionalAuth } from '../middleware/auth.js';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/shopController.js';

const router = Router();

// Public routes (optionalAuth lets admins see all products when logged in)
router.get('/', optionalAuth, getProducts);
router.get('/:id', getProduct);

// Admin or delegated staff
router.post('/', requireAuth, requirePermission('shop', 'manage'), createProduct);
router.put('/:id', requireAuth, requirePermission('shop', 'manage'), updateProduct);
router.delete('/:id', requireAuth, requirePermission('shop', 'manage'), deleteProduct);

export default router;
