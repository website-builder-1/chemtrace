CREATE TABLE public.verified_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_smiles TEXT NOT NULL UNIQUE,
  common_name TEXT NOT NULL,
  routes JSONB NOT NULL,
  references_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.verified_routes TO anon, authenticated;
GRANT ALL ON public.verified_routes TO service_role;
ALTER TABLE public.verified_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verified routes are publicly readable" ON public.verified_routes FOR SELECT USING (true);
CREATE TRIGGER update_verified_routes_updated_at BEFORE UPDATE ON public.verified_routes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();