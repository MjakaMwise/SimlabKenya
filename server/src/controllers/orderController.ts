import { Request, Response } from 'express';
import { z } from 'zod';
import supabase from '../config/supabase.js';
import { sendOrderEmails } from '../services/emailService.js';
import { Order } from '../types/index.js';

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

// POST /api/orders — public
export const createOrder = async (req: Request, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const orderData = {
    ...parsed.data,
    order_number: generateOrderNumber(),
    order_status: 'pending',
    payment_status: 'pending',
  };

  const { data, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Send emails in background — don't block the response
  sendOrderEmails(data as Order).catch((err) =>
    console.error('[Order emails] Failed to send:', err.message)
  );

  res.status(201).json(data);
};

// GET /api/orders — admin only
export const getOrders = async (req: Request, res: Response) => {
  const { status, payment, limit = '50', offset = '0' } = req.query;

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq('order_status', status as string);
  if (payment) query = query.eq('payment_status', payment as string);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ orders: data, total: count });
};

// GET /api/orders/:id — admin only
export const getOrder = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Order not found' });
  res.json(data);
};

// PATCH /api/orders/:id — admin only
export const updateOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = updateOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  // Auto-set timestamps based on status transitions
  if (parsed.data.order_status === 'contacted' && !parsed.data.contacted_at) {
    updates.contacted_at = new Date().toISOString();
  }
  if (parsed.data.order_status === 'completed' && !parsed.data.completed_at) {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Order not found' });
  res.json(data);
};
