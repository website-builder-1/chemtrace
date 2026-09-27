// Runs the internal chemistry benchmark and stores a scored run.
import { adminClient, corsHeaders, json, rateLimited } from "../_shared/aiRouter.ts";
import { descriptors } from "../_shared/chem.ts";
import { resolveCompound } from "../_shared/compounds.ts";

const ENGINE_VERSION = "cie-0.1";
const FN_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;

async function callFn(name: string, body: unknown) {
  const r = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`, "x-forwarded-for": "benchmark" },
    body: JSON.stringify(body),
  });
  return await r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = adminClient();
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ error: "Admins only." }, 403);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Admins only." }, 403);
  if (await rateLimited(admin, req, "benchmark", 2, 600_000)) return json({ error: "The benchmark was run recently — please wait 10 minutes." }, 429);
  const { data: cases } = await admin.from("benchmark_cases").select("*").order("id");
  // deno-lint-ignore no-explicit-any
  const results: any[] = [];
  await Promise.all((cases ?? []).map(async (c) => {
    const e = c.expected;
    const t0 = Date.now();
    let pass = false; let detail = ""; let evidenceCount = 0; let citationsOk: boolean | null = null;
    try {
      if (c.category === "identification") {
        const comp = await resolveCompound(admin, { name: c.question });
        pass = comp?.formula === e.formula; detail = `got ${comp?.formula ?? "nothing"}`;
      } else if (c.category === "property") {
        const d = await descriptors(c.question);
        pass = !!d && d.mw! >= e.mw_min && d.mw! <= e.mw_max && d.hbd === e.hbd; detail = `mw ${d?.mw}, hbd ${d?.hbd}`;
      } else if (c.category === "reaction" || c.category === "retrosynthesis") {
        const r = await callFn("retrosynthesis", { smiles: c.question });
        // deno-lint-ignore no-explicit-any
        const routes: any[] = r.routes ?? [];
        if (e.route_contains) {
          pass = routes.some((x) => JSON.stringify(x).toLowerCase().includes(e.route_contains));
        } else {
          pass = routes.some((x) => (x.startingMaterials ?? []).some((s: string) => e.precursors_any.includes(s)));
        }
        detail = `${routes.length} route(s) via ${r.engine ?? r.error}`;
      } else {
        const r = await callFn("orchestrator", { question: c.question });
        evidenceCount = (r.evidence ?? []).length;
        // deno-lint-ignore no-explicit-any
        const claims: any[] = r.claims ?? [];
        const cited = claims.flatMap((x) => x.evidence ?? []);
        citationsOk = cited.every((id: string) => (r.evidence ?? []).some((ev: { id: string }) => ev.id === id));
        if (e.expect_blocked) pass = !!r.blocked;
        else if (e.expect_insufficient) {
          pass = !claims.some((x) => x.label === "documented") && (claims.some((x) => x.label === "insufficient") || /insufficient|not (found|available|covered)|no (evidence|information|data)|could not|cannot/i.test(r.answer ?? ""));
        } else {
          const ans = String(r.answer ?? "").toLowerCase();
          pass = e.must_include_any.some((w: string) => ans.includes(w.toLowerCase())) && evidenceCount >= (e.min_evidence ?? 0);
        }
        detail = r.error ?? `${claims.length} claims, ${evidenceCount} sources`;
      }
    } catch (err) { detail = String(err).slice(0, 200); }
    results.push({ id: c.id, category: c.category, pass, detail, evidenceCount, citationsOk, ms: Date.now() - t0 });
  }));
  results.sort((a, b) => a.id.localeCompare(b.id));
  const by = (cat: string[]) => { const r = results.filter((x) => cat.includes(x.category)); return r.length ? Math.round((r.filter((x) => x.pass).length / r.length) * 100) : null; };
  const qa = results.filter((x) => x.citationsOk !== null);
  const summary = {
    accuracy: by(results.map((r) => r.category)),
    identification: by(["identification", "property"]),
    reactions: by(["reaction", "retrosynthesis"]),
    reasoning: by(["reasoning"]),
    hallucination_rate: (() => { const h = results.filter((x) => x.category === "hallucination"); return h.length ? Math.round((h.filter((x) => !x.pass).length / h.length) * 100) : null; })(),
    retrieval: (() => { const r = results.filter((x) => x.category === "reasoning"); return r.length ? Math.round((r.filter((x) => x.evidenceCount > 0).length / r.length) * 100) : null; })(),
    citation_accuracy: qa.length ? Math.round((qa.filter((x) => x.citationsOk).length / qa.length) * 100) : null,
    safety: by(["safety"]),
    cases: results.length,
  };
  await admin.from("benchmark_runs").insert({ engine_version: ENGINE_VERSION, summary, results });
  return json({ summary, results });
});
