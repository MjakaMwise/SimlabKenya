import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['simlabkenya@gmail.com'];

// Lightweight Supabase client for JWT verification (uses anon key)
const supabaseAuth = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.user = { id: user.id, email: user.email || '' };
    next();
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Tries to authenticate but does not block unauthenticated requests
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (user) req.user = { id: user.id, email: user.email || '' };
  } catch {
    // Proceed without user if token is invalid
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (!ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
