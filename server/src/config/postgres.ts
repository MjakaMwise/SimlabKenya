import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL (e.g. postgres://user:pass@db:5432/simlab)');
}

const pool = new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });

pool.on('error', (err) => console.error('[Postgres] idle client error:', err.message));

export default pool;
