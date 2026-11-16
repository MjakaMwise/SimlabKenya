// Small WhatsApp bridge on Baileys (no browser). Speaks the same HTTP contract the API uses:
//   GET  /health                     { connected, session: { ready, state }, qr }
//   POST /api/messages/sendText      { to, content }  ->  { success, data: messageId }
//   GET  /api/events                 server-sent events, message.received
// plus linking helpers used by deploy/whatsapp-qr.sh and deploy/whatsapp-link.sh:
//   POST /pair { phone }             ->  { code }   (link by 8-letter code instead of a QR)
//   POST /logout                     forget the linked number and start a fresh pairing
import http from 'node:http';
import fs from 'node:fs';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';

const PORT = Number(process.env.WA_PORT || 8080);
const API_KEY = process.env.WA_API_KEY || '';
const AUTH_DIR = process.env.WA_AUTH_DIR || '/sessions/simlab';
const log = pino({ level: process.env.WA_LOG_LEVEL || 'warn' });
const say = (...a) => console.log('[whatsapp]', ...a);

let sock = null;
let state = 'starting';
let ready = false;
let qr = null;
let registered = false;
const clients = new Set();

const phoneOf = (jid) => (jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
const toJid = (to) => (to.includes('@') ? to.replace('@c.us', '@s.whatsapp.net') : `${to.replace(/\D/g, '')}@s.whatsapp.net`);

const textOf = (message) => {
  const m = message || {};
  const t = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || m.documentMessage?.caption;
  if (t) return { body: t, type: 'chat' };
  const kind = Object.keys(m).find((k) => k.endsWith('Message'));
  return { body: '', type: kind ? kind.replace('Message', '') : 'unknown' };
};

const emit = (event, payload) => {
  const data = `data: ${JSON.stringify({ event, payload })}\n\n`;
  for (const res of clients) res.write(data);
};

async function connect() {
  const { state: auth, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  registered = !!auth.creds.registered;
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
  sock = makeWASocket({
    version,
    auth: auth,
    logger: log,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  const mine = sock;
  mine.ev.on('creds.update', saveCreds);

  mine.ev.on('connection.update', async (u) => {
    if (mine !== sock) return;
    if (u.qr) { qr = u.qr; state = 'waiting for scan'; }
    if (u.connection === 'connecting' && !qr) state = 'connecting';
    if (u.connection === 'open') { ready = true; qr = null; registered = true; state = 'connected'; say('linked and ready as', phoneOf(mine.user?.id)); }
    if (u.connection === 'close') {
      ready = false;
      const code = u.lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        say('logged out from the phone; clearing the session');
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        state = 'logged out';
      } else {
        state = 'reconnecting';
        say('connection closed', code ?? '', '- reconnecting');
      }
      qr = null;
      setTimeout(() => connect().catch((e) => say('reconnect failed:', e.message)), code === DisconnectReason.restartRequired ? 500 : 3000);
    }
  });

  mine.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      const k = msg.key;
      if (k.fromMe || !k.remoteJid || k.remoteJid.endsWith('@g.us') || k.remoteJid === 'status@broadcast') continue;
      // Newer WhatsApp hides the number behind an @lid id; the real number rides along in the key.
      let real = k.remoteJid.endsWith('@lid') ? (k.senderPn || k.remoteJidAlt) : k.remoteJid;
      if (!real && k.remoteJid.endsWith('@lid')) real = await mine.signalRepository?.lidMapping?.getPNForLID?.(k.remoteJid).catch(() => null);
      if (!real) { say('dropped: no phone number for', k.remoteJid); continue; }
      const { body, type: kind } = textOf(msg.message);
      emit('message.received', {
        message: { id: k.id, from: `${phoneOf(real)}@c.us`, body, type: kind, fromMe: false, isGroupMsg: false, notifyName: msg.pushName || undefined },
      });
    }
  });
}

const authed = (req) => !API_KEY || req.headers['x-api-key'] === API_KEY || req.headers['api_key'] === API_KEY;
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve) => {
  let s = '';
  req.on('data', (d) => { s += d; if (s.length > 1e6) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(s || '{}')); } catch { resolve({}); } });
});

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!authed(req)) return json(res, 401, { success: false, error: 'bad api key' });
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { connected: ready, session: { ready, state, registered }, qr: ready ? null : qr });
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      const beat = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => { clearInterval(beat); clients.delete(res); });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/messages/sendText') {
      const { to, content } = await readBody(req);
      if (!ready || !sock) return json(res, 503, { success: false, error: 'WhatsApp is not linked yet' });
      if (!to || !content) return json(res, 400, { success: false, error: 'to and content are required' });
      const sent = await sock.sendMessage(toJid(String(to)), { text: String(content) });
      return json(res, 200, { success: true, data: sent?.key?.id ?? null });
    }
    if (req.method === 'POST' && url.pathname === '/pair') {
      const { phone } = await readBody(req);
      const digits = String(phone || '').replace(/\D/g, '');
      if (digits.length < 10) return json(res, 400, { success: false, error: 'give the number with country code, e.g. 254712345678' });
      if (ready) return json(res, 409, { success: false, error: 'a number is already linked' });
      if (!sock) return json(res, 503, { success: false, error: 'not started yet, try again in a few seconds' });
      const code = await sock.requestPairingCode(digits);
      return json(res, 200, { success: true, code });
    }
    if (req.method === 'POST' && url.pathname === '/logout') {
      try { await sock?.logout(); } catch { /* not linked */ }
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      ready = false; qr = null; state = 'starting';
      try { sock?.end(undefined); } catch { /* already closed */ }
      return json(res, 200, { success: true });
    }
    json(res, 404, { success: false, error: 'not found' });
  } catch (err) {
    json(res, 500, { success: false, error: err.message });
  }
}).listen(PORT, '0.0.0.0', () => say('listening on', PORT));

connect().catch((e) => { console.error('[whatsapp] start failed:', e); process.exit(1); });
