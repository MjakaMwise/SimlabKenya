import { Request, Response, NextFunction } from 'express';
import pool from '../config/postgres.js';
import { verifyToken, TokenPurpose } from '../services/authService.js';
import { can, Area, Level } from '../services/permissions.js';

const bearer = (req: Request): string | null => {
  const h = req.headers.authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
};

// The account must still exist, be active, and the token must be newer than the last "revoke sessions"
// (password reset / deactivation), so those sign the person out everywhere. Role and permissions are read
// fresh on every request, so a change of delegation takes effect immediately.
const loadAccount = async (user: { id: string; email: string; iat: number }): Promise<Express.Request['user'] | null> => {
  const { rows } = await pool.query(
    `SELECT name, role, permissions, active, floor(extract(epoch FROM sessions_valid_after))::bigint AS valid_after
     FROM admin_users WHERE id = $1`,
    [user.id]
  );
  const r = rows[0];
  if (!r || !r.active || user.iat < r.valid_after) return null;
  return { id: user.id, email: user.email, name: r.name, role: r.role, permissions: r.permissions };
};

const authenticate = (purpose: TokenPurpose) => async (req: Request, res: Response, next: NextFunction) => {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Missing or invalid authorization header' });
  const user = verifyToken(token, purpose);
  const account = user && (await loadAccount(user));
  if (!account) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = account;
  next();
};

// Fully signed-in admin (password + emailed code completed).
export const requireAuth = authenticate('session');
// Password accepted, emailed code still outstanding.
export const requirePending = authenticate('pending');

// Does not block anonymous requests (used so people with shop access see unpublished products).
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const token = bearer(req);
  const user = token && verifyToken(token, 'session');
  const account = user && (await loadAccount(user));
  if (account) req.user = account;
  next();
};

// Full administrators only (staff management, Ocean Shujaa, email settings).
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Administrator access required' });
  next();
};

// Signed-in admin, or staff delegated this area at this level.
export const requirePermission = (area: Area, level: Level) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!can(req.user, area, level)) return res.status(403).json({ error: `You don't have permission to ${level} ${area}` });
  next();
};
