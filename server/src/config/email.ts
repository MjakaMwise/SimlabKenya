// Outgoing email goes through Resend's HTTPS API (port 443), so it works on VPSes that block SMTP ports.
import { Resend } from 'resend';

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

const getClient = (): Resend => {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new ResendError('Missing email configuration: RESEND_API_KEY is required', undefined, 'ENOKEY');
  return new Resend(key);
};

// The SDK returns { data, error } instead of throwing; turn errors back into exceptions.
const toError = (e: { message: string; statusCode?: number | null; name?: string }) =>
  new ResendError(e.message, e.statusCode ?? undefined, e.name);

export const createTransporter = () => {
  const resend = getClient();
  return {
    // Keeps the sendMail({ from, to, subject, html }) shape the callers use.
    async sendMail(opts: MailOptions): Promise<{ messageId: string; accepted: string[]; rejected: string[] }> {
      const to = Array.isArray(opts.to) ? opts.to : [opts.to];
      const { data, error } = await resend.emails.send({ ...opts, to } as Parameters<typeof resend.emails.send>[0]);
      if (error || !data) throw toError(error ?? { message: 'Resend returned no data' });
      return { messageId: data.id, accepted: to, rejected: [] };
    },

    // Cheap authenticated call; a "sending access" key is restricted from listing domains but is still valid for sending.
    async verify(): Promise<void> {
      const { error } = await resend.domains.list();
      if (error && error.name !== 'restricted_api_key') throw toError(error);
    },
  };
};

// Must be an address on a domain verified in Resend (onboarding@resend.dev only delivers to the account owner).
export const FROM_ADDRESS = process.env.EMAIL_FROM || 'onboarding@resend.dev';
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
export const ADMIN_DASHBOARD_URL = process.env.ADMIN_DASHBOARD_URL || 'http://localhost:8080/admin';
export const SUPPORT_PHONE = '+254727054994';
export const SUPPORT_EMAIL = 'simlabkenya@gmail.com';
