// Outgoing email goes through Resend's HTTPS API (port 443), so it works on VPSes that block SMTP ports.

export class ResendError extends Error {
  constructor(message: string, readonly status?: number, readonly code?: string) {
    super(message);
  }
}

interface MailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

const resendFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new ResendError('Missing email configuration: RESEND_API_KEY is required', undefined, 'ENOKEY');
  return fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init?.headers },
  });
};

export const createTransporter = () => ({
  // Mirrors the nodemailer result shape the callers already use.
  async sendMail(opts: MailOptions): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
    const to = Array.isArray(opts.to) ? opts.to : [opts.to];
    const res = await resendFetch('/emails', { method: 'POST', body: JSON.stringify({ ...opts, to }) });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!res.ok || !body.id) throw new ResendError(body.message ?? `Resend returned HTTP ${res.status}`, res.status, body.name);
    return { messageId: body.id, accepted: to, rejected: [] };
  },

  // Cheap authenticated call; a restricted "sending access" key gets 401 here but is still valid for sending.
  async verify(): Promise<void> {
    const res = await resendFetch('/domains');
    if (res.status === 401) {
      const body = (await res.json().catch(() => ({}))) as { name?: string; message?: string };
      if (body.name !== 'restricted_api_key') throw new ResendError(body.message ?? 'Invalid API key', 401, body.name);
    } else if (!res.ok) {
      throw new ResendError(`Resend returned HTTP ${res.status}`, res.status);
    }
  },
});

// Must be an address on a domain verified in Resend (onboarding@resend.dev only delivers to the account owner).
export const FROM_ADDRESS = process.env.EMAIL_FROM || 'onboarding@resend.dev';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
export const ADMIN_DASHBOARD_URL = process.env.ADMIN_DASHBOARD_URL || 'http://localhost:8080/admin';
export const SUPPORT_PHONE = '+254727054994';
export const SUPPORT_EMAIL = 'simlabkenya@gmail.com';
