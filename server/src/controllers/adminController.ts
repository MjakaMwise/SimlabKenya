import { Request, Response } from 'express';
import { z } from 'zod';
import supabase from '../config/supabase.js';
import pool from '../config/postgres.js';
import { sendOTPEmail } from '../services/emailService.js';
import { getAbstractsFromFirestore } from '../services/firebaseService.js';
import {
  hashPassword, verifyPassword, generateOtp, hashOtp, signToken,
} from '../services/authService.js';

const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;
// Compared against when the email is unknown so response time doesn't reveal valid accounts.
const DUMMY_HASH = hashPassword('not-a-real-password');

const loginSchema = z.object({ email: z.string().email().toLowerCase(), password: z.string().min(1).max(200) });
const otpSchema = z.object({ otp: z.string().length(6).regex(/^\d+$/, 'OTP must be 6 digits') });
const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, 'Password must be at least 10 characters').max(200),
});

const issueOtp = async (admin: { id: string; email: string }) => {
  const code = generateOtp();
  await pool.query('UPDATE admin_otp SET used = true WHERE admin_id = $1 AND used = false', [admin.id]);
  await pool.query(
    `INSERT INTO admin_otp (admin_id, code_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [admin.id, hashOtp(code), OTP_TTL_MIN]
  );
  await sendOTPEmail(admin.email, code);
};

// POST /api/admin/login — public. Checks the password, emails a code, returns a pending token.
export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Email and password are required' });

  const { email, password } = parsed.data;
  const { rows } = await pool.query('SELECT id, email, password_hash FROM admin_users WHERE email = $1', [email]);
  const admin = rows[0];
  const ok = verifyPassword(password, admin?.password_hash ?? DUMMY_HASH) && !!admin;
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  try {
    await issueOtp(admin);
  } catch (err) {
    console.error('[OTP] send error:', err);
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
  res.json({ success: true, pendingToken: signToken(admin, 'pending'), email: admin.email });
};

// POST /api/admin/resend-otp — pending token required
export const resendOTP = async (req: Request, res: Response) => {
  try {
    await issueOtp(req.user!);
  } catch (err) {
    console.error('[OTP] resend error:', err);
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
  res.json({ success: true });
};

// POST /api/admin/verify-otp — pending token required. Returns the session token.
export const verifyOTP = async (req: Request, res: Response) => {
  const parsed = otpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A 6-digit code is required' });

  const admin = req.user!;
  const { rows } = await pool.query(
    `SELECT id, code_hash, attempts FROM admin_otp
     WHERE admin_id = $1 AND used = false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [admin.id]
  );
  const rec = rows[0];
  if (!rec || rec.attempts >= OTP_MAX_ATTEMPTS) {
    return res.status(401).json({ error: 'Invalid or expired code' });
  }
  if (rec.code_hash !== hashOtp(parsed.data.otp)) {
    await pool.query('UPDATE admin_otp SET attempts = attempts + 1 WHERE id = $1', [rec.id]);
    return res.status(401).json({ error: 'Invalid or expired code' });
  }
  await pool.query('UPDATE admin_otp SET used = true WHERE id = $1', [rec.id]);
  res.json({ success: true, token: signToken(admin, 'session'), user: admin });
};

// POST /api/admin/change-password — admin only
export const changePassword = async (req: Request, res: Response) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
  }
  const { rows } = await pool.query('SELECT password_hash FROM admin_users WHERE id = $1', [req.user!.id]);
  if (!rows[0] || !verifyPassword(parsed.data.currentPassword, rows[0].password_hash)) {
    return res.status(403).json({ error: 'Current password is incorrect' });
  }
  await pool.query('UPDATE admin_users SET password_hash = $1, updated_at = now() WHERE id = $2',
    [hashPassword(parsed.data.newPassword), req.user!.id]);
  res.json({ success: true });
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
