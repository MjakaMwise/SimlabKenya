import app from './src/app.js';
import { migrate } from './src/db/migrate.js';
import { verifyEmailTransport, explainEmailError } from './src/services/emailService.js';

const PORT = Number(process.env.PORT) || 5000;

await migrate();

app.listen(PORT, () => {
  console.log(`SIM-Lab Kenya API server running on http://localhost:${PORT}`);
  console.log(`  → Products:  http://localhost:${PORT}/api/products`);
  console.log(`  → Orders:    http://localhost:${PORT}/api/orders`);
  console.log(`  → Abstracts: http://localhost:${PORT}/api/abstracts`);
  console.log(`  → Admin:     http://localhost:${PORT}/api/admin`);
  console.log(`  → Health:    http://localhost:${PORT}/api/health`);
});

// Fail loudly in the logs if outgoing email is broken: admin login codes depend on it.
verifyEmailTransport()
  .then(() => console.log('[Email] SMTP login verified'))
  .catch((err) => console.error(`[Email] NOT WORKING — admin login codes and order emails will fail. ${explainEmailError(err)}`));
