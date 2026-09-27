
- Routes: `/` marketing landing, `/app` synthesis tool, `/team` team page — separates public site from tool.
- Route engine rate limit: 5 uncached runs per IP per 2 min via `rate_limits` table — protects free AI quota during demos.
- Retrosynthesis AI routes must pass the RDKit atom-balance check (`filterBalancedRoutes`) before being returned or served from cache — free models often propose impossible reactions.
- AI calls go through `supabase/functions/_shared/aiRouter.ts` (task → `model_routes` → `ai_providers`) — swapping providers is a data change, not a code change.
- Chemical properties come only from PubChem/RDKit (`_shared/compounds.ts`, `_shared/chem.ts`); the LLM never computes them.
- Retrosynthesis order: verified_routes → reactions DB → RDKit templates (`retrosynthesis/templates.ts`) → AI gap-fill; every route carries `evidence` (documented/analogous/hypothesis).
- Orchestrator answers only from retrieved evidence with [id] citations; claims without valid citations are downgraded — keeps LLM from being the source of truth.
- Staff accounts are managed only via the `admin-users` edge function (service role + has_role admin check); main admin aryan@chemtraceit.com is protected from changes — prevents privilege escalation from the browser.
