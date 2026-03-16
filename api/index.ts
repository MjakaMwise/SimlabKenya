// Vercel serverless adapter — wraps the Express app so all /api/* requests
// are handled by the unified Express router instead of individual functions.
import app from '../server/src/app.js';

export default app;
