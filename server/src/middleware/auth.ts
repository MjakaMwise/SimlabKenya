import { Request, Response, NextFunction } from 'express';
import pool from '../config/postgres.js';
import { verifyToken, TokenPurpose } from '../services/authService.js';

const bearer = (req: Request): string | null => {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
};

// The account must still exist and the token must be newer than the last "revoke sessions"
// (set by deploy/reset-admin.sh), so a reset signs that admin out everywhere.
const adminValid = async (user: { id: string; iat: number }) => {
  const { rows } = await pool.query(
    'SELECT floor(extract(epoch FROM sessions_valid_after))::bigint AS valid_after FROM admin_users WHERE id = $1',
    [user.id]
  );
  return rows.length === 1 && user.iat >= rows[0].valid_after;
};

const authenticate = (purpose: TokenPurpose) => async (req: Request, res: Response, next: NextFunction) => {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Missing or invalid authorization header' });
  const user = verifyToken(token, purpose);
  // Re-check the account on every request so deleting/resetting an admin revokes sessions immediately.
  if (!user || !(await adminValid(user))) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = { id: user.id, email: user.email };
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
  if (user && (await adminValid(user))) req.user = { id: user.id, email: user.email };
  next();
};

// Every row in admin_users is an administrator.
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
};
