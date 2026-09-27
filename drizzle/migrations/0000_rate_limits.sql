CREATE TABLE public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  client_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rate_limits_key_time ON public.rate_limits (client_key, created_at DESC);
GRANT ALL ON public.rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limits_id_seq TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;