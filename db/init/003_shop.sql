-- Shop catalogue and orders (previously in Supabase). Idempotent: safe to re-run.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT          NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  category        TEXT          NOT NULL,
  has_sizes       BOOLEAN       NOT NULL DEFAULT false,
  available_sizes TEXT[],
  stock_quantity  INTEGER       NOT NULL DEFAULT 100,
  is_available    BOOLEAN       NOT NULL DEFAULT true,
  image_url       TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      TEXT          NOT NULL UNIQUE,
  customer_name     TEXT          NOT NULL,
  customer_email    TEXT          NOT NULL,
  customer_phone    TEXT          NOT NULL,
  delivery_method   TEXT          NOT NULL CHECK (delivery_method IN ('pickup','delivery')),
  delivery_location TEXT,
  delivery_address  TEXT,
  items             JSONB         NOT NULL,
  total_amount      NUMERIC(10,2) NOT NULL,
  additional_notes  TEXT,
  order_status      TEXT          NOT NULL DEFAULT 'pending'
                      CHECK (order_status IN ('pending','contacted','confirmed','completed','cancelled')),
  payment_status    TEXT          NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid')),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  contacted_at      TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders (order_status);

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Starter catalogue, only into an empty table so re-running never duplicates or resurrects deleted items.
INSERT INTO products (name, description, price, category, has_sizes, available_sizes, image_url)
SELECT * FROM (VALUES
  ('Element Fusion Card Game', 'An exciting educational card game that teaches chemistry through strategic gameplay. Perfect for students and families.', 500::numeric, 'Educational Games', false, NULL::text[], '/placeholder.svg'),
  ('SIM-Lab T-Shirt', 'Premium quality cotton t-shirt featuring the SIM-Lab logo. Show your love for science!', 800, 'Merchandise', true, ARRAY['S','M','L','XL','XXL'], '/placeholder.svg'),
  ('SIM-Lab Lab Coat', 'Professional lab coat with SIM-Lab branding. Perfect for experiments and demonstrations.', 1500, 'Merchandise', true, ARRAY['S','M','L','XL','XXL'], '/placeholder.svg'),
  ('SIM-Lab Science Calendar', 'A beautiful 12-month calendar featuring science facts, experiments, and important dates in scientific history.', 350, 'Educational Resources', false, NULL, '/placeholder.svg'),
  ('Science-Based Clock', 'Unique clock featuring periodic table elements instead of numbers. A must-have for science enthusiasts.', 1200, 'Educational Resources', false, NULL, '/placeholder.svg')
) AS seed(name, description, price, category, has_sizes, available_sizes, image_url)
WHERE NOT EXISTS (SELECT 1 FROM products);
