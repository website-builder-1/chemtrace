ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS smiles text,
  ADD COLUMN IF NOT EXISTS price_source text NOT NULL DEFAULT 'estimate',
  ADD COLUMN IF NOT EXISTS price_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_price numeric,
  ADD COLUMN IF NOT EXISTS auto_status text,
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_by uuid;
CREATE INDEX IF NOT EXISTS supplier_products_smiles_idx ON public.supplier_products(smiles);
CREATE TABLE IF NOT EXISTS public.supplier_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  old_price numeric, new_price numeric, currency text,
  source text NOT NULL, changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.supplier_price_history TO authenticated;
GRANT ALL ON public.supplier_price_history TO service_role;
ALTER TABLE public.supplier_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read price history" ON public.supplier_price_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE OR REPLACE FUNCTION public.log_supplier_price_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price OR NEW.currency IS DISTINCT FROM OLD.currency THEN
    INSERT INTO public.supplier_price_history(product_id, old_price, new_price, currency, source, changed_by)
    VALUES (NEW.id, OLD.price, NEW.price, NEW.currency, NEW.price_source, NEW.updated_by);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS supplier_price_change ON public.supplier_products;
CREATE TRIGGER supplier_price_change AFTER UPDATE ON public.supplier_products FOR EACH ROW EXECUTE FUNCTION public.log_supplier_price_change();
ALTER TABLE public.supplier_products REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_products;