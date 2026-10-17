import pool from '../config/postgres.js';

export const isShopEnabled = async (): Promise<boolean> => {
  const { rows } = await pool.query(`SELECT value FROM site_settings WHERE key = 'shop_enabled'`);
  return rows[0]?.value === true;
};

export const setShopEnabled = async (enabled: boolean): Promise<void> => {
  await pool.query(
    `INSERT INTO site_settings (key, value) VALUES ('shop_enabled', $1::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(enabled)]
  );
};
