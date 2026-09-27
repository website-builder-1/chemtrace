// Chemical Intelligence orchestrator: safety → analyse → tools/retrieval → compose → verify.
// The LLM only reasons over evidence gathered by deterministic tools and databases.
import { z } from "npm:zod@3";
import { adminClient, chat, corsHeaders, extractJson, json, rateLimited } from "../_shared/aiRouter.ts";
import { canonical, descriptors, functionalGroups } from "../_shared/chem.ts";
import { resolveCompound } from "../_shared/compounds.ts";
import { Evidence, search } from "../_shared/literature.ts";

const Body = z.object({
  question: z.string().min(3).max(2000),
  smiles: z.string().max(500).optional(),
  tier: z.enum(["auto", "easy", "medium", "hard"]).optional(),
});

// Hard safety screen for weaponisation / toxic agents / explosives.
const BLOCK = /\b(sarin|soman|tabun|vx\b|novichok|mustard gas|sulfur mustard|nitrogen mustard|lewisite|ricin|abrin|phosgene|chlorine gas attack|tatp|triacetone triperoxide|hmtd|petn|rdx|hmx|nitroglycerin|tnt|trinitrotoluene|pipe bomb|explosive device|chemical weapon|nerve agent|weaponi[sz]|fentanyl analog|carfentanil|methamphetamine|mdma synthesis|heroin synthesis)\b/i;

type Label = "documented" | "supported" | "hypothesis" | "insufficient";
interface Claim { text: string; label: Label; evidence: string[] }

function heuristicTier(q: string): "easy" | "medium" | "hard" {
  if (/(retrosynth|route|synthes|mechanism|compare|why|design|optimi[sz]e|contradict|best way)/i.test(q)) return "hard";
  if (/(propert|reaction|condition|yield|solvent|catalyst|toxic|hazard|pka|boiling|melting)/i.test(q)) return "medium";
  return "easy";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return json({ error: p.error.flatten() }, 400);
  const admin = adminClient();
  if (await rateLimited(admin, req, "orchestrator", 8, 120_000)) return json({ error: "You're asking quickly — please wait a moment and try again." }, 429);

  const { question } = p.data;
  const trace: string[] = [];
  const t0 = Date.now();

  if (BLOCK.test(question)) {
    return json({
      blocked: true,
      answer: "Chemtraceit can't help with this request. It relates to chemical weapons, explosives, or controlled drugs. For legitimate research on regulated substances, work through your institution's safety and compliance office.",
      claims: [], evidence: [], trace: ["safety: blocked"],
    });
  }
  trace.push("safety: passed");

  try {
    // 1) Question analysis (small model; heuristic fallback).
    let tier = p.data.tier && p.data.tier !== "auto" ? p.data.tier : heuristicTier(question);
    let entities: string[] = [];
    let searchQuery = question;
    try {
      const a = await chat("fast", [
        { role: "system", content: "Extract chemistry entities. Reply with JSON only: {\"entities\": string[] (compound names or SMILES, max 4), \"search_query\": string (concise literature search keywords), \"tier\": \"easy\"|\"medium\"|\"hard\"}" },
        { role: "user", content: question },
      ], { maxTokens: 200, timeoutMs: 15_000, fn: "orchestrator" });
      const j = extractJson(a.text);
      if (j) {
        entities = Array.isArray(j.entities) ? j.entities.slice(0, 4).map(String) : [];
        if (typeof j.search_query === "string" && j.search_query.length > 2) searchQuery = j.search_query;
        if (!p.data.tier || p.data.tier === "auto") tier = ["easy", "medium", "hard"].includes(j.tier) ? j.tier : tier;
      }
    } catch { trace.push("analysis: model unavailable, heuristic used"); }
    if (p.data.smiles) entities.unshift(p.data.smiles);
    trace.push(`tier: ${tier}; entities: ${entities.join(", ") || "none"}`);

    // 2) Deterministic tools + databases.
    const evidence: Array<Evidence & { id: string; kind: string }> = [];
    const compounds = [];
    for (const e of entities.slice(0, 3)) {
      const isSmiles = !!(await canonical(e)) && /[=#()\[\]]|^[A-Za-z0-9@+\-\[\]\(\)=#\\\/\.]+$/.test(e) && !/\s/.test(e) && /[a-z]?[A-Z]/.test(e) && e.length > 1 && !/^[A-Z][a-z]+$/.test(e);
      const c = await resolveCompound(admin, isSmiles ? { smiles: e } : { name: e }).catch(() => null);
      if (!c) continue;
      compounds.push(c);
      const d = await descriptors(c.canonical_smiles);
      const fg = await functionalGroups(c.canonical_smiles);
      evidence.push({
        id: `D${evidence.length + 1}`, kind: "database", n: 0, source: c.source, title: `${c.name ?? e} — compound record`,
        url: c.pubchem_cid ? `https://pubchem.ncbi.nlm.nih.gov/compound/${c.pubchem_cid}` : undefined, score: 1,
        excerpt: `Name: ${c.name}; SMILES: ${c.canonical_smiles}; formula: ${c.formula}; MW: ${c.mw}; InChIKey: ${c.inchikey ?? "n/a"}; logP: ${d?.logp}; TPSA: ${d?.tpsa}; HBD/HBA: ${d?.hbd}/${d?.hba}; functional groups: ${fg.join(", ")}.`,
      });
      if (tier !== "easy") {
        const { data: rx } = await admin.from("reactions").select("reaction_smiles, name, reaction_class, source, reaction_conditions(*)").eq("product_smiles", c.canonical_smiles).limit(3);
        for (const r of rx ?? []) {
          // deno-lint-ignore no-explicit-any
          const cond: any = (r as any).reaction_conditions?.[0] ?? {};
          evidence.push({
            id: `R${evidence.length + 1}`, kind: "reaction", n: 0, source: r.source ?? "reaction database", title: r.reaction_class ?? r.name ?? "Documented reaction", score: 1,
            excerpt: `${r.name}. Reaction SMILES: ${r.reaction_smiles}. Conditions: catalyst ${cond.catalyst ?? "-"}, reagents ${cond.reagents ?? "-"}, solvent ${cond.solvent ?? "-"}, T ${cond.temperature ?? "-"}, P ${cond.pressure ?? "-"}.`,
          });
        }
      }
    }
    trace.push(`tools: ${compounds.length} compound(s) resolved`);

    if (tier !== "easy" || compounds.length === 0) {
      const lit = await search(admin, searchQuery, { entities: compounds.map((c) => c.name ?? c.canonical_smiles), k: tier === "hard" ? 8 : 5 }).catch(() => []);
      for (const l of lit) evidence.push({ ...l, id: `L${evidence.length + 1}`, kind: "literature" });
      trace.push(`literature: ${lit.length} source(s)`);
    }
    const { data: facts } = await admin.from("validated_facts").select("subject, statement, source").textSearch("statement", searchQuery.split(/\s+/).slice(0, 4).join(" | "), { type: "websearch" }).limit(3);
    for (const f of facts ?? []) evidence.push({ id: `V${evidence.length + 1}`, kind: "validated", n: 0, source: f.source, title: `Validated fact: ${f.subject}`, excerpt: f.statement, score: 1 });

    // 3) Compose over evidence only.
    const evidenceBlock = evidence.map((e) => `[${e.id}] (${e.kind}; ${e.source}${e.year ? ", " + e.year : ""}) ${e.title}\n${e.excerpt}`).join("\n\n") || "(no evidence retrieved)";
    const composeSys = `You are Chemtraceit's chemistry answer composer. Answer ONLY using the evidence provided. ` +
      `Cite evidence ids in square brackets, e.g. [D1] or [L3]. Never invent properties, yields or references. ` +
      `If the evidence does not cover something, say so explicitly. Refuse any weaponisation or harmful synthesis detail. ` +
      `Reply with JSON only: {"answer": string (markdown, concise, with [id] citations), "claims": [{"text": string, "label": "documented"|"supported"|"hypothesis"|"insufficient", "evidence": string[]}]}. ` +
      `Label rules: documented = directly stated in cited evidence; supported = reasonable inference from cited evidence; hypothesis = your own chemical reasoning without direct support; insufficient = question part the evidence cannot answer. List 3-8 key claims.`;
    const composed = await chat(tier === "easy" ? "fast" : "reasoning", [
      { role: "system", content: composeSys },
      { role: "user", content: `Question: ${question}\n\nEvidence:\n${evidenceBlock}` },
    ], { maxTokens: 1600, timeoutMs: 45_000, fn: "orchestrator" });
    const out = extractJson(composed.text) ?? { answer: composed.text, claims: [] };
    trace.push(`compose: ${composed.provider}/${composed.model}`);

    // 4) Verification: deterministic citation check, then (hard tier) model check.
    const ids = new Set(evidence.map((e) => e.id));
    let claims: Claim[] = (Array.isArray(out.claims) ? out.claims : []).slice(0, 10).map((c: any) => {
      const ev = (Array.isArray(c.evidence) ? c.evidence : []).map(String).filter((x: string) => ids.has(x));
      let label: Label = ["documented", "supported", "hypothesis", "insufficient"].includes(c.label) ? c.label : "hypothesis";
      if ((label === "documented" || label === "supported") && ev.length === 0) label = "hypothesis";
      return { text: String(c.text ?? ""), label, evidence: ev };
    }).filter((c: Claim) => c.text);

    if (tier === "hard" && claims.some((c) => c.label === "documented")) {
      try {
        const toCheck = claims.map((c, i) => ({ i, text: c.text, evidence: c.evidence.map((id) => evidence.find((e) => e.id === id)?.excerpt ?? "").join(" | ").slice(0, 1200) }))
          .filter((c) => c.evidence);
        const v = await chat("fast", [
          { role: "system", content: "For each claim, decide if the evidence text directly states it. Reply JSON only: {\"results\": [{\"i\": number, \"supported\": boolean}]}" },
          { role: "user", content: JSON.stringify(toCheck) },
        ], { maxTokens: 400, timeoutMs: 20_000, fn: "orchestrator" });
        const vr = extractJson(v.text);
        for (const r of vr?.results ?? []) {
          const c = claims[r.i];
          if (c && c.label === "documented" && r.supported === false) c.label = "supported";
        }
        trace.push("verify: claim-evidence check done");
      } catch { trace.push("verify: model check skipped"); }
    }
    // Strip citations to ids that don't exist.
    const answer = String(out.answer ?? "").replace(/\[([A-Z]\d+)\]/g, (m, id) => ids.has(id) ? m : "");
    const ms = Date.now() - t0;
    await admin.from("request_log").insert({ function_name: "orchestrator", task: tier, ok: true, latency_ms: ms, detail: `${evidence.length} evidence` });
    return json({ tier, answer, claims, evidence, compounds, trace, model: `${composed.provider}/${composed.model}`, latency_ms: ms });
  } catch (e) {
    console.error(e);
    await admin.from("request_log").insert({ function_name: "orchestrator", ok: false, detail: String(e).slice(0, 300) });
    return json({ error: e instanceof Error ? e.message : "Unknown error", trace }, 500);
  }
});
