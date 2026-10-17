import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/postgres.js';
import { sendOrderEmails } from '../services/emailService.js';
import { Order } from '../types/index.js';
import { postEvent } from '../services/chat.js';
import { isShopEnabled } from '../services/settings.js';

const orderItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  size: z.string().optional(),
});

const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'Name is required'),
  customer_email: z.string().email('Valid email is required'),
  customer_phone: z.string().min(8, 'Phone number is required'),
  delivery_method: z.enum(['pickup', 'delivery']),
  delivery_location: z.string().optional(),
  delivery_address: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  total_amount: z.number().positive(),
  additional_notes: z.string().optional(),
});

const updateOrderSchema = z.object({
  order_status: z.enum(['pending', 'contacted', 'confirmed', 'completed', 'cancelled']).optional(),
  payment_status: z.enum(['pending', 'paid']).optional(),
  contacted_at: z.string().optional(),
  completed_at: z.string().optional(),
});

const generateOrderNumber = (): string => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 900 + 100);
  return `ORD-${dateStr}-${rand}`;
};

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

// POST /api/orders — public
export const createOrder = async (req: Request, res: Response) => {
  if (!(await isShopEnabled())) return res.status(403).json({ error: 'The shop is currently closed.' });
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const d = parsed.data;

  // Order numbers are random per day; retry on the (unlikely) unique-key collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, delivery_method,
                             delivery_location, delivery_address, items, total_amount, additional_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING *`,
        [generateOrderNumber(), d.customer_name, d.customer_email, d.customer_phone, d.delivery_method,
         d.delivery_location ?? null, d.delivery_address ?? null, JSON.stringify(d.items), d.total_amount,
         d.additional_notes ?? null]
      );
      postEvent('orders',
        `New order ${rows[0].order_number} from ${d.customer_name}: KES ${Number(d.total_amount).toLocaleString('en-KE')}, ${d.delivery_method}`,
        { type: 'order', id: rows[0].id, label: rows[0].order_number });
      // Send emails in background — don't block the response
      sendOrderEmails(rows[0] as Order).catch((err) =>
        console.error('[Order emails] Failed to send:', err.message)
      );
      return res.status(201).json(rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code !== '23505') throw err;
    }
  }
  res.status(500).json({ error: 'Could not allocate an order number, please retry' });
};

// GET /api/orders — admin only
export const getOrders = async (req: Request, res: Response) => {
  const { status, payment } = req.query;
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 1000);
  const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

  const where: string[] = [];
  const params: unknown[] = [];
  if (status) { params.push(String(status)); where.push(`order_status = $${params.length}`); }
  if (payment) { params.push(String(payment)); where.push(`payment_status = $${params.length}`); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [list, count] = await Promise.all([
    pool.query(`SELECT * FROM orders ${w} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    pool.query(`SELECT count(*) AS total FROM orders ${w}`, params),
  ]);
  res.json({ orders: list.rows, total: count.rows[0].total });
};

// GET /api/orders/:id — admin only
export const getOrder = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(404).json({ error: 'Order not found' });
  const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
  res.json(rows[0]);
};

// PATCH /api/orders/:id — admin only
export const updateOrder = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(404).json({ error: 'Order not found' });
  const parsed = updateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  // Auto-set timestamps based on status transitions
  if (parsed.data.order_status === 'contacted' && !parsed.data.contacted_at) updates.contacted_at = new Date().toISOString();
  if (parsed.data.order_status === 'completed' && !parsed.data.completed_at) updates.completed_at = new Date().toISOString();

  const keys = Object.keys(updates).filter((k) => updates[k] !== undefined);
  if (!keys.length) return res.status(400).json({ error: 'Nothing to update' });
  const params = keys.map((k) => updates[k]);
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE orders SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
  res.json(rows[0]);
};
