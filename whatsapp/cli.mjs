// Runs inside the container: node cli.mjs qr | pair <phone>
import qrcode from 'qrcode-terminal';

const base = `http://127.0.0.1:${process.env.WA_PORT || 8080}`;
const headers = { 'X-API-Key': process.env.WA_API_KEY || '', 'Content-Type': 'application/json' };
const get = async (p) => (await fetch(base + p, { headers })).json();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [cmd, arg] = process.argv.slice(2);

const waitReady = async (secs) => {
  for (let i = 0; i < secs / 2; i++) {
    const h = await get('/health').catch(() => null);
    if (h?.session?.ready) return true;
    await sleep(2000);
  }
  return false;
};

if (cmd === 'qr') {
  let shown = null;
  const end = Date.now() + 300000;
  while (Date.now() < end) {
    const h = await get('/health').catch(() => null);
    if (h?.session?.ready) { console.log('\nNumber linked.'); process.exit(0); }
    if (h?.qr && h.qr !== shown) {
      shown = h.qr;
      console.log('\nScan this code (a new one replaces it about every 20 seconds):\n');
      qrcode.generate(h.qr, { small: true });
    } else if (!h) {
      console.log('waiting for the WhatsApp server...');
    }
    await sleep(2000);
  }
  console.log('\nTimed out without a scan.');
  process.exit(2);
} else if (cmd === 'pair') {
  let r;
  for (let i = 0; i < 20; i++) {
    const h = await get('/health').catch(() => null);
    if (h?.session?.ready) { console.log('A number is already linked.'); process.exit(0); }
    if (h?.qr) break; // socket is up and waiting to be linked
    await sleep(2000);
  }
  r = await (await fetch(base + '/pair', { method: 'POST', headers, body: JSON.stringify({ phone: arg }) })).json();
  if (!r.success) { console.error('Could not get a code:', r.error); process.exit(1); }
  console.log(`\nPairing code:  ${r.code.match(/.{1,4}/g).join('-')}\n`);
  console.log('On the phone: WhatsApp > Settings > Linked devices > Link a device >');
  console.log('"Link with phone number instead", then type the code. It expires in about 60 seconds.');
  console.log('\nWaiting for the link...');
  if (await waitReady(180)) { console.log('Number linked.'); process.exit(0); }
  console.log('Not linked yet. Run the script again for a fresh code.');
  process.exit(2);
} else {
  console.error('usage: node cli.mjs qr | pair <phone>');
  process.exit(64);
}
