CREATE TABLE public.runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  molecule_name TEXT NOT NULL,
  location TEXT NOT NULL,
  batch_size_mg INTEGER NOT NULL,
  recommended_route_name TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own runs"
ON public.runs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users create own runs"
ON public.runs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own runs"
ON public.runs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_runs_user_created ON public.runs(user_id, created_at DESC);