import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  submitAbstract,
  listAbstracts,
  getAbstract,
  updateAbstractStatus,
  downloadAbstractFile,
} from '../controllers/abstractController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

const router = Router();

// Public
router.post('/', upload.array('files', 10), submitAbstract);

// Admin or delegated staff
router.get('/', requireAuth, requirePermission('abstracts', 'view'), listAbstracts);
router.get('/:id/files/:fileId', requireAuth, requirePermission('abstracts', 'view'), downloadAbstractFile);
router.get('/:id', requireAuth, requirePermission('abstracts', 'view'), getAbstract);
router.patch('/:id/status', requireAuth, requirePermission('abstracts', 'manage'), updateAbstractStatus);

export default router;
