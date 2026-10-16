// Verify outgoing email. Exit 0 = working, 1 = broken (with a human-readable reason).
//   verify login only:   npx tsx server/scripts/test-email.ts
//   also send a message: TEST_EMAIL_TO=you@example.com npx tsx server/scripts/test-email.ts
import { verifyEmailTransport, sendTestEmail, explainEmailError } from '../src/services/emailService.js';

const to = process.env.TEST_EMAIL_TO?.trim();

try {
  await verifyEmailTransport();
  console.log(`✔ SMTP login OK (${process.env.GMAIL_USER})`);
  if (to) {
    const id = await sendTestEmail(to);
    console.log(`✔ Test message accepted for ${to} (${id}). Check the inbox (and spam folder).`);
  }
} catch (err) {
  console.error(`✖ Email is not working: ${explainEmailError(err)}`);
  process.exit(1);
}
