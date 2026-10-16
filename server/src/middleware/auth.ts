import { Request, Response, NextFunction } from 'express';
import pool from '../config/postgres.js';
import { verifyToken, TokenPurpose } from '../services/authService.js';

const bearer = (req: Request): string | null => {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
};

const adminExists = async (id: string) =>
  (await pool.query('SELECT 1 FROM admin_users WHERE id = $1', [id])).rowCount === 1;

const authenticate = (purpose: TokenPurpose) => async (req: Request, res: Response, next: NextFunction) => {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Missing or invalid authorization header' });
  const user = verifyToken(token, purpose);
  // Re-check the account so deleting an admin revokes their session immediately.
  if (!user || !(await adminExists(user.id))) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = user;
  next();
};

// Fully signed-in admin (password + emailed code completed).
export const requireAuth = authenticate('session');
// Password accepted, emailed code still outstanding.
export const requirePending = authenticate('pending');

// Does not block anonymous requests (used so admins see unpublished products).
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const token = bearer(req);
  const user = token && verifyToken(token, 'session');
  if (user && (await adminExists(user.id))) req.user = user;
  next();
};

// Every row in admin_users is an administrator.
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
};
