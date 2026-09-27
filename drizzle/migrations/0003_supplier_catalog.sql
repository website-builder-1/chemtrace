CREATE TABLE public.suppliers (
  id text PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  website text NOT NULL,
  kind text NOT NULL DEFAULT 'chemicals'
);
CREATE TABLE public.supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id text NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  material_key text NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',
  product_name text NOT NULL,
  cas text,
  grade text,
  pack_size text NOT NULL,
  price numeric,
  currency text NOT NULL DEFAULT 'USD',
  product_url text NOT NULL,
  price_note text NOT NULL DEFAULT 'Indicative list price — confirm on supplier site',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX supplier_products_key_idx ON public.supplier_products(material_key);
GRANT SELECT ON public.suppliers, public.supplier_products TO anon, authenticated;
GRANT ALL ON public.suppliers, public.supplier_products TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Public read supplier products" ON public.supplier_products FOR SELECT USING (true);
CREATE POLICY "Admins manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage supplier products" ON public.supplier_products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));