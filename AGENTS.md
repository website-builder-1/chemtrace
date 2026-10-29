
- Routes: `/` marketing landing, `/app` synthesis tool, `/team` team page — separates public site from tool.
- Route engine rate limit: 5 uncached runs per IP per 2 min via `rate_limits` table — protects free AI quota during demos.
- Retrosynthesis AI routes must pass the RDKit atom-balance check (`filterBalancedRoutes`) before being returned or served from cache — free models often propose impossible reactions.
- AI calls go through `supabase/functions/_shared/aiRouter.ts` (task → `model_routes` → `ai_providers`) — swapping providers is a data change, not a code change.
- Chemical properties come only from PubChem/RDKit (`_shared/compounds.ts`, `_shared/chem.ts`); the LLM never computes them.
- Retrosynthesis order: verified_routes → reactions DB → RDKit templates (`retrosynthesis/templates.ts`) → AI gap-fill; every route carries `evidence` (documented/analogous/hypothesis).
- Orchestrator answers only from retrieved evidence with [id] citations; claims without valid citations are downgraded — keeps LLM from being the source of truth.
- Staff accounts are managed only via the `admin-users` edge function (service role + has_role admin check); main admin aryan@chemtraceit.com is protected from changes — prevents privilege escalation from the browser.

- Platform is invite-only: sign-ups disabled; /app and /research wrapped in `RequireAuth` (role client/moderator/admin + first-sign-in setup done); tool edge functions check `_shared/access.ts` — confidential client platform.
- First sign-in: `profiles.must_change_password` → `admin-users` `change_own_password`; terms signed via `complete_onboarding` RPC against `TERMS_VERSION` in `src/content/terms.ts` (bump to force re-sign).
- Moderators may manage client accounts only; enforced in `admin-users`.
- Keep route cost data in GBP and supplier prices in their original currency; all price views and exports use the shared currency helpers and the tool's selected currency to prevent double conversion.
- Brand styling is centralised in global CSS tokens and shared BrandLogo/BrandHero components; read `docs/brand-guidelines.html` for future design changes, keeping the original PNG master and using its derived cutout mask so logo details match each background.
- Every page sets head tags via `PageMeta` (react-helmet-async); private routes get noindex in `App.tsx`, and new public routes must be added to `scripts/generate-sitemap.ts` — keeps search indexing limited to public pages.
- All AI-generated text renders through `src/components/chemtrace/Markdown.tsx` (GFM tables + KaTeX maths) — never use raw ReactMarkdown, so LaTeX/table syntax never leaks to users.
