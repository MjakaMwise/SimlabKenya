import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  submitAbstract,
  listAbstracts,
  getAbstract,
  updateAbstractStatus,
} from '../controllers/abstractController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

const router = Router();

// Public
router.post('/', upload.array('files', 10), submitAbstract);

// Admin only
router.get('/', requireAuth, requireAdmin, listAbstracts);
router.get('/:id', requireAuth, requireAdmin, getAbstract);
router.patch('/:id/status', requireAuth, requireAdmin, updateAbstractStatus);

export default router;
