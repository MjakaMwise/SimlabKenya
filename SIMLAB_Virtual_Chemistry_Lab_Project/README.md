# SIMLAB Virtual Chemistry Lab — source package

This archive contains the current SIMLAB Virtual Chemistry Lab source, published as Site version 253.

## Contents

- `dist/` — web application pages, styles, JavaScript modules, and built static assets.
- `worker/` — Cloudflare Worker API source for Teachers Bench, practical assignments, and server features.
- `drizzle/` — database migration files.
- `scripts/` — Worker build script and practical catalog source.
- `.openai/hosting.json` — Site project configuration.

## Preview locally

With Python 3 installed, run this from the extracted folder:

```bash
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`. The static preview demonstrates the client-side lab. Server-backed Teachers Bench and assignment features require the Worker, its D1 database, and identity headers.

## Build the Worker bundle

With Node.js installed, run:

```bash
node scripts/build-worker.mjs
```

This creates `dist/server/index.js`. Production deployment also requires the Site hosting environment and its D1 binding.

## Editing

The browser application is maintained directly in `dist/`. Edit the relevant HTML, JavaScript, or CSS files. Update `worker/index.js` for server behavior and `scripts/practicals-catalog.mjs` for practical catalog data.
