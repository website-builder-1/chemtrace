CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  display_name text,
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile or staff read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE TABLE public.company_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_titles TO authenticated;
GRANT ALL ON public.company_titles TO service_role;
ALTER TABLE public.company_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read titles" ON public.company_titles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Admins manage titles" ON public.company_titles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.user_titles (
  user_id uuid NOT NULL,
  title_id uuid NOT NULL REFERENCES public.company_titles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, title_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_titles TO authenticated;
GRANT ALL ON public.user_titles TO service_role;
ALTER TABLE public.user_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or staff read user titles" ON public.user_titles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Admins manage user titles" ON public.user_titles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
INSERT INTO public.profiles (id, email) SELECT id, email FROM auth.users ON CONFLICT DO NOTHING;

GRANT SELECT ON public.user_roles TO authenticated;
CREATE POLICY "Staff read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "Moderators review feedback" ON public.feedback FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'moderator')) WITH CHECK (public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Moderators read feedback" ON public.feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Moderators write facts" ON public.validated_facts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'moderator')) WITH CHECK (public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Moderators manage supplier products" ON public.supplier_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'moderator')) WITH CHECK (public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Staff read all runs" ON public.runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback, public.validated_facts, public.supplier_products, public.runs TO authenticated;
GRANT SELECT ON public.request_log TO authenticated;