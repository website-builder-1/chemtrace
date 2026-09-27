CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Roles
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','moderator','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Model router
CREATE TABLE public.ai_providers (
  id text PRIMARY KEY,
  base_url text NOT NULL,
  secret_name text NOT NULL,
  kind text NOT NULL DEFAULT 'openai-chat',
  enabled boolean NOT NULL DEFAULT true,
  notes text
);
CREATE TABLE public.model_routes (
  task text NOT NULL,
  priority int NOT NULL DEFAULT 1,
  provider_id text NOT NULL REFERENCES public.ai_providers(id),
  model text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (task, priority)
);
GRANT SELECT ON public.ai_providers, public.model_routes TO anon, authenticated;
GRANT ALL ON public.ai_providers, public.model_routes TO service_role;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read providers" ON public.ai_providers FOR SELECT USING (true);
CREATE POLICY "Public read routes" ON public.model_routes FOR SELECT USING (true);
CREATE POLICY "Admins manage providers" ON public.ai_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage routes" ON public.model_routes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Compounds
CREATE TABLE public.compounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_smiles text UNIQUE NOT NULL,
  name text,
  inchi text,
  inchikey text,
  formula text,
  mw numeric,
  pubchem_cid bigint,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'PubChem',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_compounds_inchikey ON public.compounds(inchikey);
CREATE TABLE public.compound_synonyms (
  compound_id uuid REFERENCES public.compounds(id) ON DELETE CASCADE,
  synonym text NOT NULL,
  PRIMARY KEY (compound_id, synonym)
);
CREATE INDEX idx_synonym_lower ON public.compound_synonyms(lower(synonym));

-- Literature (RAG)
CREATE TABLE public.literature_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  external_id text NOT NULL,
  doi text,
  title text NOT NULL,
  abstract text,
  year int,
  journal text,
  url text,
  entities text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);
CREATE INDEX idx_lit_doi ON public.literature_docs(doi);
CREATE TABLE public.literature_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES public.literature_docs(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  embedding extensions.vector(384),
  embed_model text,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  UNIQUE (doc_id, chunk_index)
);
CREATE INDEX idx_chunks_tsv ON public.literature_chunks USING gin(tsv);
CREATE INDEX idx_chunks_emb ON public.literature_chunks USING hnsw (embedding extensions.vector_cosine_ops);
CREATE TABLE public.search_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reactions + graph
CREATE TABLE public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reaction_smiles text NOT NULL,
  name text,
  reaction_class text,
  product_smiles text NOT NULL,
  evidence_level text NOT NULL DEFAULT 'documented' CHECK (evidence_level IN ('documented','analogous','hypothesis')),
  source text,
  doi text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reaction_smiles)
);
CREATE INDEX idx_reactions_product ON public.reactions(product_smiles);
CREATE TABLE public.reaction_participants (
  reaction_id uuid REFERENCES public.reactions(id) ON DELETE CASCADE,
  smiles text NOT NULL,
  role text NOT NULL CHECK (role IN ('reactant','product','reagent','catalyst','solvent','byproduct')),
  name text,
  PRIMARY KEY (reaction_id, smiles, role)
);
CREATE INDEX idx_participants_smiles ON public.reaction_participants(smiles);
CREATE TABLE public.reaction_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reaction_id uuid REFERENCES public.reactions(id) ON DELETE CASCADE,
  solvent text, catalyst text, reagents text, temperature text, pressure text,
  time text, atmosphere text, yield_percent numeric,
  evidence_level text NOT NULL DEFAULT 'documented' CHECK (evidence_level IN ('documented','analogous','hypothesis')),
  source text
);
CREATE TABLE public.graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type text NOT NULL, from_id text NOT NULL,
  relation text NOT NULL,
  to_type text NOT NULL, to_id text NOT NULL,
  source text,
  UNIQUE (from_type, from_id, relation, to_type, to_id)
);
CREATE INDEX idx_edges_from ON public.graph_edges(from_type, from_id);
CREATE INDEX idx_edges_to ON public.graph_edges(to_type, to_id);

-- Public-read knowledge tables (written only by backend functions)
GRANT SELECT ON public.compounds, public.compound_synonyms, public.literature_docs, public.literature_chunks,
  public.reactions, public.reaction_participants, public.reaction_conditions, public.graph_edges TO anon, authenticated;
GRANT ALL ON public.compounds, public.compound_synonyms, public.literature_docs, public.literature_chunks,
  public.reactions, public.reaction_participants, public.reaction_conditions, public.graph_edges, public.search_cache TO service_role;
ALTER TABLE public.compounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compound_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literature_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literature_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reaction_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reaction_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.compounds FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.compound_synonyms FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.literature_docs FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.literature_chunks FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.reaction_participants FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.reaction_conditions FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.graph_edges FOR SELECT USING (true);

-- Hybrid search (keyword + vector, Reciprocal Rank Fusion)
CREATE OR REPLACE FUNCTION public.hybrid_search_chunks(query_text text, query_embedding extensions.vector(384), match_count int DEFAULT 8)
RETURNS TABLE (chunk_id uuid, doc_id uuid, content text, score double precision)
LANGUAGE sql STABLE SET search_path = public, extensions AS $$
  WITH kw AS (
    SELECT c.id, row_number() OVER (ORDER BY ts_rank_cd(c.tsv, websearch_to_tsquery('english', query_text)) DESC) AS r
    FROM public.literature_chunks c
    WHERE c.tsv @@ websearch_to_tsquery('english', query_text)
    LIMIT 40
  ), sem AS (
    SELECT c.id, row_number() OVER (ORDER BY c.embedding <=> query_embedding) AS r
    FROM public.literature_chunks c
    WHERE query_embedding IS NOT NULL AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT 40
  ), fused AS (
    SELECT id, sum(1.0 / (60 + r)) AS s FROM (SELECT * FROM kw UNION ALL SELECT * FROM sem) u GROUP BY id
  )
  SELECT c.id, c.doc_id, c.content, f.s FROM fused f JOIN public.literature_chunks c ON c.id = f.id
  ORDER BY f.s DESC LIMIT match_count
$$;

-- Projects / memory
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.project_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('compound','reaction','route','answer','note')),
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects, public.project_items TO authenticated;
GRANT ALL ON public.projects, public.project_items TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own projects" ON public.projects FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own project items" ON public.project_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Feedback / validated facts
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('good','bad','correct_this','source_wrong','chemistry_wrong','missing_info')),
  correction text,
  reason text,
  source text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT UPDATE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert own feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Read own or admin" ON public.feedback FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins review" ON public.feedback FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.validated_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  statement text NOT NULL,
  source text NOT NULL,
  validated_by uuid REFERENCES auth.users(id),
  origin text NOT NULL CHECK (origin IN ('trusted_source','reviewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.validated_facts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.validated_facts TO authenticated;
GRANT ALL ON public.validated_facts TO service_role;
ALTER TABLE public.validated_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read facts" ON public.validated_facts FOR SELECT USING (true);
CREATE POLICY "Admins write facts" ON public.validated_facts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Benchmark
CREATE TABLE public.benchmark_cases (
  id text PRIMARY KEY,
  category text NOT NULL,
  question text NOT NULL,
  expected jsonb NOT NULL,
  notes text
);
CREATE TABLE public.benchmark_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  engine_version text,
  summary jsonb NOT NULL,
  results jsonb NOT NULL
);
GRANT SELECT ON public.benchmark_cases, public.benchmark_runs TO anon, authenticated;
GRANT ALL ON public.benchmark_cases, public.benchmark_runs TO service_role;
ALTER TABLE public.benchmark_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON public.benchmark_cases FOR SELECT USING (true);
CREATE POLICY "Public read" ON public.benchmark_runs FOR SELECT USING (true);

-- Request log
CREATE TABLE public.request_log (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  client_key text,
  user_id uuid,
  task text,
  provider text,
  model text,
  latency_ms int,
  ok boolean,
  detail text
);
CREATE INDEX idx_request_log_created ON public.request_log(created_at DESC);
GRANT ALL ON public.request_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.request_log_id_seq TO service_role;
ALTER TABLE public.request_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read log" ON public.request_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.request_log TO authenticated;
