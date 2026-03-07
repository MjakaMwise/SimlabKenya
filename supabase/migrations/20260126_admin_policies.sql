-- Add RLS policy to allow authenticated users to view all orders
-- This is needed for the admin panel to function

-- Allow authenticated users to view all orders
CREATE POLICY "Authenticated users can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update orders
CREATE POLICY "Authenticated users can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete orders (admin only)
CREATE POLICY "Authenticated users can delete orders"
ON public.orders
FOR DELETE
TO authenticated
USING (true);

-- Allow authenticated users to manage products
CREATE POLICY "Authenticated users can manage products"
ON public.products
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to view all products (including unavailable ones)
CREATE POLICY "Authenticated users can view all products"
ON public.products
FOR SELECT
TO authenticated
USING (true);
