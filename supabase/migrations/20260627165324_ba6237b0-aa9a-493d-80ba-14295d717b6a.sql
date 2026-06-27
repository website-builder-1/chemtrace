CREATE TABLE public.retrosynthesis_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_smiles TEXT NOT NULL UNIQUE,
  engine TEXT NOT NULL DEFAULT 'llm-gemini-v1',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX retrosynthesis_cache_smiles_idx ON public.retrosynthesis_cache (canonical_smiles);

GRANT SELECT ON public.retrosynthesis_cache TO anon, authenticated;
GRANT ALL ON public.retrosynthesis_cache TO service_role;

ALTER TABLE public.retrosynthesis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache is publicly readable"
  ON public.retrosynthesis_cache
  FOR SELECT
  USING (true);

-- No insert/update/delete policy for anon/authenticated; only service_role (which bypasses RLS) writes.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_retrosynthesis_cache_updated_at
  BEFORE UPDATE ON public.retrosynthesis_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();