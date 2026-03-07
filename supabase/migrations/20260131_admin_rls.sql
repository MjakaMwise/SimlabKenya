-- Align admin access with server-side checks and lock down RLS

-- Helper function to determine admin status from JWT claims
-- Prefer role claim, with fallback to allowlist for backward compatibility
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(auth.jwt() ->> 'role', '') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('simlabkenya@gmail.com');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Orders policies
DROP POLICY IF EXISTS "Authenticated users can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;

CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Products policies
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view all products" ON public.products;

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
TO authenticated
USING (public.is_admin());
