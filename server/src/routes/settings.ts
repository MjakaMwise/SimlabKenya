import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { isShopEnabled, setShopEnabled } from '../services/settings.js';

const router = Router();

// Public: the website uses this to show or hide the Shop.
router.get('/', async (_req, res) => {
  res.json({ shop_enabled: await isShopEnabled() });
});

// Admin or staff who manage the shop.
router.patch('/', requireAuth, requirePermission('shop', 'manage'), async (req, res) => {
  const parsed = z.object({ shop_enabled: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'shop_enabled must be true or false' });
  await setShopEnabled(parsed.data.shop_enabled);
  res.json({ shop_enabled: parsed.data.shop_enabled });
});

export default router;
