import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('⚠️ Attention : DATABASE_URL non définie dans l\'environnement.');
}


export const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost')
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

// Auto-migration résiliente pour Neon PostgreSQL
(async () => {
  try {
    if (connectionString) {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;');
      await pool.query(`
        UPDATE users 
        SET name = COALESCE(NULLIF(TRIM(name), ''), handle, 'Membre')
        WHERE name IS NULL OR name = '';
      `);
      await pool.query('ALTER TABLE debt_settlements ALTER COLUMN id TYPE VARCHAR(255);');
      await pool.query('ALTER TABLE debt_settlements ALTER COLUMN group_id TYPE VARCHAR(255);');
      await pool.query('ALTER TABLE debt_settlements ALTER COLUMN from_user_id TYPE VARCHAR(255);');
      await pool.query('ALTER TABLE debt_settlements ALTER COLUMN to_user_id TYPE VARCHAR(255);');
    }
  } catch {
    // Non-bloquant en production
  }
})();
