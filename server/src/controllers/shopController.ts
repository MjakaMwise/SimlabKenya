import { Request, Response } from 'express';
import { z } from 'zod';
import supabase from '../config/supabase.js';

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().min(1),
  has_sizes: z.boolean().optional().default(false),
  available_sizes: z.array(z.string()).optional(),
  stock_quantity: z.number().int().min(0).optional().default(100),
  is_available: z.boolean().optional().default(true),
  image_url: z.string().url().optional(),
});

// GET /api/products — public
export const getProducts = async (req: Request, res: Response) => {
  const { category, available } = req.query;

  let query = supabase.from('products').select('*').order('created_at', { ascending: false });

  // Public callers only see available products
  if (!req.user) {
    query = query.eq('is_available', true);
  } else if (available !== undefined) {
    query = query.eq('is_available', available === 'true');
  }

  if (category) {
    query = query.eq('category', category as string);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
};

// GET /api/products/:id — public
export const getProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Product not found' });
  res.json(data);
};

// POST /api/products — admin only
export const createProduct = async (req: Request, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { data, error } = await supabase
    .from('products')
    .insert(parsed.data)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
};

// PUT /api/products/:id — admin only
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { data, error } = await supabase
    .from('products')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Product not found' });
  res.json(data);
};

// DELETE /api/products/:id — admin only
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.status(204).send();
};
