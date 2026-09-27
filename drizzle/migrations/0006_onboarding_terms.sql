ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS terms_signed_name text,
  ADD COLUMN IF NOT EXISTS terms_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS company text;

CREATE TABLE public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  version text NOT NULL,
  signed_name text NOT NULL,
  user_agent text,
  signed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.terms_acceptances TO authenticated;
GRANT ALL ON public.terms_acceptances TO service_role;
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or staff read acceptances" ON public.terms_acceptances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET must_change_password = false WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding(_signed_name text, _version text, _user_agent text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF length(trim(coalesce(_signed_name,''))) < 3 OR length(_signed_name) > 120 THEN RAISE EXCEPTION 'Please type your full name'; END IF;
  IF length(coalesce(_version,'')) = 0 OR length(_version) > 20 THEN RAISE EXCEPTION 'Invalid version'; END IF;
  INSERT INTO public.terms_acceptances (user_id, version, signed_name, user_agent) VALUES (auth.uid(), _version, trim(_signed_name), left(_user_agent, 300));
  INSERT INTO public.profiles (id, terms_version, terms_signed_name, terms_signed_at) VALUES (auth.uid(), _version, trim(_signed_name), now())
  ON CONFLICT (id) DO UPDATE SET terms_version = EXCLUDED.terms_version, terms_signed_name = EXCLUDED.terms_signed_name, terms_signed_at = now();
END; $$;

REVOKE EXECUTE ON FUNCTION public.mark_password_changed() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.complete_onboarding(text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mark_password_changed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(text, text, text) TO authenticated;