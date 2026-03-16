// Vercel serverless adapter — wraps the Express app so all /api/* requests
// are handled by the unified Express router instead of individual functions.
import app from '../server/src/app.js';

// Disable Vercel's built-in body parser so multer can handle multipart/form-data
// (file uploads). Without this, Vercel pre-consumes the request body and multer
// receives an empty stream, causing 500 errors on /api/abstracts.
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default app;
