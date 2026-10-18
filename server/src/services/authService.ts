import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters');
}

// ── Passwords (scrypt, no extra dependency) ───────────────────────────────────
export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
};

export const verifyPassword = (password: string, stored: string): boolean => {
  const [scheme, saltHex, keyHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
};

// ── One-time codes ────────────────────────────────────────────────────────────
export const generateOtp = (): string => crypto.randomInt(100000, 1000000).toString();
export const hashOtp = (code: string): string =>
  crypto.createHmac('sha256', secret!).update(code).digest('hex');

// ── Tokens ────────────────────────────────────────────────────────────────────
// "pending": password was correct, waiting for the emailed code (10 min).
// "session": fully authenticated (8 h).
export type TokenPurpose = 'pending' | 'session' | 'school';

export const signToken = (admin: { id: string; email: string }, purpose: TokenPurpose): string =>
  jwt.sign({ email: admin.email, purpose }, secret!, {
    subject: admin.id,
    expiresIn: purpose === 'pending' ? '10m' : purpose === 'school' ? '12h' : '8h',
  });

export const verifyToken = (token: string, purpose: TokenPurpose): { id: string; email: string; iat: number } | null => {
  try {
    const p = jwt.verify(token, secret!) as jwt.JwtPayload;
    if (p.purpose !== purpose || !p.sub || typeof p.email !== 'string') return null;
    return { id: p.sub, email: p.email, iat: p.iat ?? 0 };
  } catch {
    return null;
  }
};
