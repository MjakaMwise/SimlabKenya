// Create an admin account, or reset the password of an existing one (also signs that admin out
// everywhere and discards pending login codes). Normally run through deploy/reset-admin.sh.
//   non-interactive: ADMIN_EMAIL=a@b.c ADMIN_PASSWORD='...' npx tsx server/scripts/create-admin.ts
//   interactive:     npx tsx server/scripts/create-admin.ts
import readline from 'node:readline';
import pool from '../src/config/postgres.js';
import { hashPassword } from '../src/services/authService.js';

const ask = (question: string, hidden = false): Promise<string> =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
  });

const email = (process.env.ADMIN_EMAIL || (await ask('Admin email: '))).toLowerCase();
const password = process.env.ADMIN_PASSWORD || (await ask('Password (min 10 chars): ', true));

if (!/^\S+@\S+\.\S+$/.test(email)) { console.error('Invalid email'); process.exit(1); }
if (password.length < 10) { console.error('Password must be at least 10 characters'); process.exit(1); }

const { rows } = await pool.query(
  `INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash, updated_at = now(), sessions_valid_after = now()
   RETURNING id, (xmax = 0) AS created`,
  [email, hashPassword(password)]
);
await pool.query('DELETE FROM admin_otp WHERE admin_id = $1', [rows[0].id]);
console.log(`${rows[0].created ? 'Admin created' : 'Password reset, sessions revoked'}: ${email}`);
await pool.end();
