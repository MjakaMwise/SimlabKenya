import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requirePermission, optionalAuth } from '../middleware/auth.js';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
} from '../controllers/shopController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 10 } });

// Public routes (optionalAuth lets admins see all products when logged in)
router.post('/upload-image', requireAuth, requirePermission('shop', 'manage'), upload.array('images', 10), uploadProductImages);
router.get('/', optionalAuth, getProducts);
router.get('/:id', getProduct);

// Admin or delegated staff
router.post('/', requireAuth, requirePermission('shop', 'manage'), createProduct);
router.put('/:id', requireAuth, requirePermission('shop', 'manage'), updateProduct);
router.delete('/:id', requireAuth, requirePermission('shop', 'manage'), deleteProduct);

export default router;
