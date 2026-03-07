-- Create products table
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    has_sizes BOOLEAN NOT NULL DEFAULT false,
    available_sizes TEXT[] DEFAULT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 100,
    is_available BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can view available products
CREATE POLICY "Anyone can view available products"
ON public.products
FOR SELECT
USING (is_available = true);

-- Create orders table
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
    delivery_location TEXT,
    delivery_address TEXT,
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    additional_notes TEXT,
    order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'contacted', 'confirmed', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    contacted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert orders (place orders without account)
CREATE POLICY "Anyone can place orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the 5 products
INSERT INTO public.products (name, description, price, category, has_sizes, available_sizes, image_url) VALUES
('Element Fusion Card Game', 'An exciting educational card game that teaches chemistry through strategic gameplay. Perfect for students and families.', 500, 'Educational Games', false, NULL, '/placeholder.svg'),
('SIM-Lab T-Shirt', 'Premium quality cotton t-shirt featuring the SIM-Lab logo. Show your love for science!', 800, 'Merchandise', true, ARRAY['S', 'M', 'L', 'XL', 'XXL'], '/placeholder.svg'),
('SIM-Lab Lab Coat', 'Professional lab coat with SIM-Lab branding. Perfect for experiments and demonstrations.', 1500, 'Merchandise', true, ARRAY['S', 'M', 'L', 'XL', 'XXL'], '/placeholder.svg'),
('SIM-Lab Science Calendar', 'A beautiful 12-month calendar featuring science facts, experiments, and important dates in scientific history.', 350, 'Educational Resources', false, NULL, '/placeholder.svg'),
('Science-Based Clock', 'Unique clock featuring periodic table elements instead of numbers. A must-have for science enthusiasts.', 1200, 'Educational Resources', false, NULL, '/placeholder.svg');