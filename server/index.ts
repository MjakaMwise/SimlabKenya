import app from './src/app.js';

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`SIM-Lab Kenya API server running on http://localhost:${PORT}`);
  console.log(`  → Products:  http://localhost:${PORT}/api/products`);
  console.log(`  → Orders:    http://localhost:${PORT}/api/orders`);
  console.log(`  → Abstracts: http://localhost:${PORT}/api/abstracts`);
  console.log(`  → Admin:     http://localhost:${PORT}/api/admin`);
  console.log(`  → Health:    http://localhost:${PORT}/api/health`);
});
