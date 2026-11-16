import pool from '../config/postgres.js';
import { can, Area } from './permissions.js';
import { notifyUsers } from './push.js';

type Account = { id: string; role: string; permissions: string[] };

export interface Channel {
  id: string;
  name: string;
  description: string;
  /** Permission area that grants access; null = every signed-in person, 'admin' = administrators only. */
  area: Area | 'admin' | null;
}

// One channel per admin area, so access always mirrors what the person can already open in the admin.
export const CHANNELS: Channel[] = [
  { id: 'general', name: 'general', description: 'Announcements and anything for the whole team.', area: null },
  { id: 'orders', name: 'orders', description: 'Shop orders, payments and deliveries.', area: 'orders' },
  { id: 'abstracts', name: 'abstracts', description: 'Science fair abstracts waiting for review.', area: 'abstracts' },
  { id: 'shop', name: 'shop', description: 'Products, stock and restocking.', area: 'shop' },
  { id: 'ocean-shujaa', name: 'ocean-shujaa', description: 'Registrations for the Ocean Shujaa holiday program.', area: 'ocean' },
];

export const channelById = (id: string) => CHANNELS.find((c) => c.id === id);

export const canAccess = (user: Pick<Account, 'role' | 'permissions'> | undefined, ch: Channel): boolean => {
  if (!user || !can(user, 'chat', 'view')) return false;
  if (ch.area === null) return true;
  if (ch.area === 'admin') return user.role === 'admin';
  return can(user, ch.area, 'view');
};

export const channelsFor = (user: Account) => CHANNELS.filter((c) => canAccess(user, c));

interface Person { id: string; name: string | null; email: string; role: string; permissions: string[] }

export const activePeople = async (): Promise<Person[]> =>
  (await pool.query('SELECT id, name, email, role, permissions FROM admin_users WHERE active ORDER BY lower(coalesce(name, email))')).rows;

export const membersOf = async (ch: Channel) => (await activePeople()).filter((p) => canAccess(p, ch));

export const displayName = (p: { name?: string | null; email: string }) => p.name?.trim() || p.email.split('@')[0];

const link = (channel: string) => `/admin/team?channel=${encodeURIComponent(channel)}`;
const clip = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// Posts a message written by the site (new order, registration, abstract). Never throws: a chat problem
// must not fail the order or registration that triggered it.
export const postEvent = async (
  channelId: string,
  body: string,
  ref: { type: string; id: string; label: string }
): Promise<void> => {
  try {
    const ch = channelById(channelId);
    if (!ch) return;
    await pool.query(
      `INSERT INTO chat_messages (channel, body, ref_type, ref_id, ref_label, is_event) VALUES ($1,$2,$3,$4,$5,true)`,
      [channelId, body, ref.type, ref.id, ref.label]
    );
    const people = await membersOf(ch);
    await notifyUsers(people.map((p) => p.id), { title: `#${ch.name}`, body: clip(body), url: link(channelId), tag: `event-${channelId}` });
  } catch (err) {
    console.error('[chat] could not post event:', (err as Error).message);
  }
};

// Tells people about a message: those @mentioned get a notification of their own.
export const notifyMention = async (channel: Channel, author: string, body: string, mentionIds: string[], authorId: string) => {
  const ids = mentionIds.filter((i) => i !== authorId);
  await notifyUsers(ids, { title: `${author} mentioned you in #${channel.name}`, body: clip(body), url: link(channel.id), tag: `mention-${channel.id}` });
};

export const notifyTask = async (assigneeId: string, byId: string | null, by: string, title: string, channelId: string) => {
  if (assigneeId === byId) return;
  await notifyUsers([assigneeId], { title: `${by} assigned you a task`, body: clip(title), url: `/admin/team?channel=${encodeURIComponent(channelId)}&tab=tasks`, tag: 'task' });
};
