import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/postgres.js';
import { can } from '../services/permissions.js';
import { isShopEnabled } from '../services/settings.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().min(1),
  has_sizes: z.boolean().optional().default(false),
  available_sizes: z.array(z.string()).optional(),
  stock_quantity: z.number().int().min(0).optional().default(100),
  is_available: z.boolean().optional().default(true),
  image_url: z.string().optional(),
  images: z.array(z.string()).max(10).optional(),
});

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const FIELDS = ['name', 'description', 'price', 'category', 'has_sizes', 'available_sizes',
  'stock_quantity', 'is_available', 'image_url', 'images'] as const;

// GET /api/products — public
export const getProducts = async (req: Request, res: Response) => {
  const staff = can(req.user, 'shop', 'view');
  // Shop switched off: the public sees an empty catalogue; staff still manage products.
  if (!staff && !(await isShopEnabled())) return res.json([]);
  const { category, available } = req.query;
  const where: string[] = [];
  const params: unknown[] = [];

  // Public callers only see available products
  if (!can(req.user, 'shop', 'view')) where.push('is_available = true');
  else if (available !== undefined) { params.push(available === 'true'); where.push(`is_available = $${params.length}`); }
  if (category) { params.push(String(category)); where.push(`category = $${params.length}`); }

  const { rows } = await pool.query(
    `SELECT * FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`,
    params
  );
  res.json(rows);
};

// GET /api/products/:id — public
export const getProduct = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id) || !(await isShopEnabled())) return res.status(404).json({ error: 'Product not found' });
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1 AND is_available = true', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
};

// POST /api/products — admin only
export const createProduct = async (req: Request, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const d = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO products (name, description, price, category, has_sizes, available_sizes,
                           stock_quantity, is_available, image_url, images)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [d.name, d.description ?? null, d.price, d.category, d.has_sizes, d.available_sizes ?? null,
     d.stock_quantity, d.is_available, d.image_url ?? d.images?.[0] ?? null, d.images ?? []]
  );
  res.status(201).json(rows[0]);
};

// PUT /api/products/:id — admin only
export const updateProduct = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(404).json({ error: 'Product not found' });
  // .partial() keeps the schema's defaults out of the update only if we filter on what was actually sent
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const sent = FIELDS.filter((f) => req.body && f in req.body && parsed.data[f] !== undefined);
  if (!sent.length) return res.status(400).json({ error: 'Nothing to update' });

  const params: unknown[] = sent.map((f) => parsed.data[f]);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE products SET ${sent.map((f, i) => `${f} = $${i + 1}`).join(', ')}
     WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
};

// DELETE /api/products/:id — admin only
export const deleteProduct = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(404).json({ error: 'Product not found' });
  await pool.query('DELETE FROM products WHERE id = $1', [id]);
  res.status(204).send();
};

// POST /api/products/upload-image — shop managers. Returns the hosted URLs of the uploaded pictures.
export const uploadProductImages = async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  if (!files.length) return res.status(400).json({ error: 'Choose at least one image' });
  const bad = files.find((f) => !f.mimetype.startsWith('image/'));
  if (bad) return res.status(400).json({ error: `"${bad.originalname}" is not an image` });
  try {
    const urls = await Promise.all(files.map(async (f) => (await uploadToCloudinary(f.buffer, f.originalname, 'simlab-shop')).secure_url));
    res.status(201).json({ urls });
  } catch (err) {
    console.error('[Shop] image upload error:', err);
    res.status(500).json({ error: 'Image upload failed. Check the Cloudinary settings and try again.' });
  }
};
