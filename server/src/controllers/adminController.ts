import { Request, Response } from 'express';
import { z } from 'zod';
import supabase from '../config/supabase.js';
import { sendOTPEmail } from '../services/emailService.js';
import { getAbstractsFromFirestore } from '../services/firebaseService.js';

const ADMIN_EMAILS = ['simlabkenya@gmail.com'];

const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPSchema = z.object({
  email: z.string().email('Valid email is required'),
});

const verifyOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d+$/, 'OTP must be 6 digits'),
});

// POST /api/admin/send-otp — public (returns same response whether admin or not)
export const sendOTP = async (req: Request, res: Response) => {
  const parsed = sendOTPSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const { email } = parsed.data;
  const genericResponse = {
    success: true,
    message: 'If this email is registered for admin access, you will receive an OTP.',
  };

  // Don't reveal whether email is an admin
  if (!ADMIN_EMAILS.includes(email)) {
    return res.json(genericResponse);
  }

  const otp = generateOTP();

  const { error: dbError } = await supabase
    .from('admin_2fa_otp')
    .insert({ admin_email: email, otp_code: otp });

  if (dbError) {
    console.error('[OTP] DB insert error:', dbError.message);
    return res.status(500).json({ error: 'Failed to generate OTP' });
  }

  try {
    await sendOTPEmail(email, otp);
  } catch (err) {
    console.error('[OTP] Email send error:', err);
    return res.status(500).json({ error: 'Failed to send OTP email' });
  }

  res.json(genericResponse);
};

// POST /api/admin/verify-otp — public
export const verifyOTP = async (req: Request, res: Response) => {
  const parsed = verifyOTPSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email and a 6-digit OTP are required' });
  }

  const { email, otp } = parsed.data;

  if (!ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ error: 'Unauthorized email' });
  }

  const { data: otpRecord, error } = await supabase
    .from('admin_2fa_otp')
    .select('*')
    .eq('admin_email', email)
    .eq('otp_code', otp)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !otpRecord) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  const { error: updateError } = await supabase
    .from('admin_2fa_otp')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('id', otpRecord.id);

  if (updateError) {
    console.error('[OTP] Failed to mark OTP as used:', updateError.message);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }

  res.json({ success: true, message: 'OTP verified successfully' });
};

// GET /api/admin/me — admin only
export const getMe = async (req: Request, res: Response) => {
  res.json({ email: req.user?.email, id: req.user?.id });
};

// GET /api/admin/stats — admin only
export const getStats = async (req: Request, res: Response) => {
  const [ordersResult, recentOrdersResult, abstracts] = await Promise.all([
    supabase.from('orders').select('order_status, payment_status, total_amount'),
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
    getAbstractsFromFirestore().catch(() => [] as { status?: string }[]),
  ]);

  if (ordersResult.error) {
    return res.status(500).json({ error: ordersResult.error.message });
  }

  const orders = ordersResult.data || [];
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.order_status === 'pending').length;
  const completedOrders = orders.filter((o) => o.order_status === 'completed').length;
  const totalRevenue = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const totalAbstracts = abstracts.length;
  const pendingAbstracts = abstracts.filter((a) => (a as { status?: string }).status === 'pending').length;

  res.json({
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue,
    totalAbstracts,
    pendingAbstracts,
    recentOrders: recentOrdersResult.data || [],
  });
};
