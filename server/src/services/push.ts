import webpush from 'web-push';
import pool from '../config/postgres.js';

// Web Push needs a VAPID key pair (`npx web-push generate-vapid-keys`). Without one, push is simply off
// and the chat still works through polling.
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
export const pushEnabled = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (pushEnabled) {
  webpush.setVapidDetails(VAPID_SUBJECT || process.env.ADMIN_DASHBOARD_URL || 'mailto:admin@simlabkenya.co.ke', VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}
export const publicKey = () => VAPID_PUBLIC_KEY ?? null;

export interface PushPayload {
  title: string;
  body: string;
  /** Page to open when the notification is tapped. */
  url: string;
  tag?: string;
}

// Sends to every device a person has registered. Failures never reach the caller; dead subscriptions are removed.
export const notifyUsers = async (userIds: string[], payload: PushPayload): Promise<void> => {
  if (!pushEnabled || userIds.length === 0) return;
  const { rows } = await pool.query(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1::uuid[])',
    [userIds]
  );
  const body = JSON.stringify(payload);
  await Promise.all(
    rows.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24 });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [s.id]);
        else console.error('[push] send failed:', (err as Error).message);
      }
    })
  );
};
