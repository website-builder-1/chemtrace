// Retrosynthesis edge function.
// Pipeline:
//   1. RDKit-JS validates and canonicalises the SMILES.
//   2. Cache lookup by canonical SMILES.
//   3. Hugging Face Inference (Qwen2.5-72B-Instruct) produces ranked
//      retrosynthetic routes with predicted reaction conditions as JSON.
//   4. Result is cached and returned.
//
// Modular by design: swap the `runRetrosynthesisEngine` function to plug in
// ASKCOS, AiZynthFinder, IBM RXN, or a local GNN later without changing the
// frontend or response contract.

import { createClient } from "npm:@supabase/supabase-js@2";
// @ts-expect-error - no Deno types for npm: specifier
import initRDKitModule from "npm:@rdkit/rdkit@2025.3.4-1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HF_URL = "https://router.huggingface.co/v1/chat/completions";
// Ordered fallback chain (all Hugging Face). ":fastest" lets the HF router
// pick the quickest live provider for that model.
const HF_MODELS = [
  "meta-llama/Llama-3.3-70B-Instruct:fastest",
  "Qwen/Qwen2.5-72B-Instruct:fastest",
  "Qwen/Qwen2.5-7B-Instruct:fastest",
];

// ── RDKit (lazy singleton, reused across invocations) ────────────────────
let rdkitPromise: Promise<unknown> | null = null;
// deno-lint-ignore no-explicit-any
async function getRDKit(): Promise<any> {
  if (!rdkitPromise) rdkitPromise = initRDKitModule();
  return await rdkitPromise;
}

interface ValidationResult {
  valid: boolean;
  canonical?: string;
  error?: string;
  // Structural descriptors useful to the UI when PubChem is unavailable.
  formula?: string;
  mw?: number;
  rings?: number;
}

async function validateAndCanonicalise(
  smiles: string,
): Promise<ValidationResult> {
  if (!smiles || smiles.trim().length === 0) {
    return { valid: false, error: "Empty SMILES string." };
  }
  try {
    const RDKit = await getRDKit();
    const mol = RDKit.get_mol(smiles.trim());
    if (!mol || !mol.is_valid()) {
      try { mol?.delete(); } catch { /* ignore */ }
      return { valid: false, error: `Invalid SMILES: "${smiles}".` };
    }
    const canonical = mol.get_smiles();
    let formula: string | undefined;
    let mw: number | undefined;
    let rings: number | undefined;
    try {
      const descJson = mol.get_descriptors();
      const desc = JSON.parse(descJson);
      formula = desc.formula ?? desc.molecularFormula;
      mw = typeof desc.amw === "number" ? desc.amw : desc.exactmw;
      rings = desc.NumRings ?? desc.numRings;
    } catch { /* descriptors are a bonus, not required */ }
    mol.delete();
    return { valid: true, canonical, formula, mw, rings };
  } catch (e) {
    return {
      valid: false,
      error: `RDKit failed to parse SMILES: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }
}

// ── Retrosynthesis engine (LLM, structured output) ───────────────────────

const ROUTE_SCHEMA = {
  type: "object",
  properties: {
    routes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          score: { type: "number" },
          yieldPercent: { type: "number" },
          complexity: { type: "number" },
          decisionReason: { type: "string" },
          startingMaterials: {
            type: "array",
            items: { type: "string" },
          },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                productSmiles: { type: "string" },
                reactionSmiles: { type: "string" },
                confidence: { type: "number" },
                conditions: {
                  type: "object",
                  properties: {
                    solvent: { type: "string" },
                    catalyst: { type: "string" },
                    reagents: { type: "string" },
                    temperature: { type: "string" },
                    pressure: { type: "string" },
                    time: { type: "string" },
                    confidence: { type: "number" },
                    source: { type: "string" },
                    precedents: { type: "number" },
                  },
                  required: ["solvent", "reagents", "temperature"],
                },
              },
              required: ["description", "conditions"],
            },
          },
        },
        required: ["name", "score", "steps", "startingMaterials"],
      },
    },
  },
  required: ["routes"],
} as const;

async function runRetrosynthesisEngine(
  canonicalSmiles: string,
): Promise<unknown> {
  const HF_TOKEN = Deno.env.get("HUGGINGFACE_API_TOKEN");
  if (!HF_TOKEN) throw new Error("HUGGINGFACE_API_TOKEN not configured");

  const system =
    `You are a senior computational chemist running retrosynthetic analysis. ` +
    `Given a target molecule as canonical SMILES, propose 2–3 plausible ranked ` +
    `convergent synthesis routes. For every step, predict realistic reaction ` +
    `conditions (solvent, catalyst, reagents, temperature, pressure, time) ` +
    `with a confidence score grounded in literature precedent. Cite a model ` +
    `name or DOI in 'source' and an integer 'precedents' count when you can. ` +
    `Prefer commercially available starting materials. Every reaction must be ` +
    `chemically correct and atom-plausible (e.g. hydrolysis of ethylene oxide gives ethylene glycol, NOT ethanol). ` +
    `For simple industrial chemicals, include the real industrial process. `+
    `Reaction SMILES MUST be ` +
    `"reactants>>product". Do not invent CAS numbers. Output JSON only, ` +
    `matching this TypeScript shape: { routes: Array<{ name: string; score: number; ` +
    `yieldPercent?: number; complexity?: number; decisionReason?: string; ` +
    `startingMaterials: string[]; steps: Array<{ description: string; productSmiles?: string; ` +
    `reactionSmiles?: string; confidence?: number; conditions: { solvent: string; catalyst?: string; ` +
    `reagents: string; temperature: string; pressure?: string; time?: string; confidence?: number; ` +
    `source?: string; precedents?: number; } }> }> }. Return ONLY the JSON object, no prose, no code fences.`;

  const user = `Target SMILES (canonical): ${canonicalSmiles}\n` +
    `Return JSON conforming to the provided schema with 2–3 routes ranked best-first.`;

  // Try a chain of HF models, each with its own time budget, so one slow or
  // unavailable provider never blocks the whole request.
  const deadline = Date.now() + 110_000;
  let lastErr: unknown = null;
  for (const model of HF_MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 5_000) break;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(40_000, remaining));
    try {
      const res = await fetch(HF_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.2,
          max_tokens: 3000,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        lastErr = new Error(`Hugging Face ${res.status} (${model}): ${body.slice(0, 300)}`);
        console.error(String(lastErr));
        continue;
      }
      const data = await res.json();
      const raw = data?.choices?.[0]?.message?.content ?? "";
      const parsed = typeof raw === "string" ? extractJson(raw) : raw;
      if (parsed && Array.isArray(parsed.routes) && parsed.routes.length) {
        const good = await filterBalancedRoutes(parsed.routes, canonicalSmiles);
        if (good.length) {
          usedModel = model;
          return { routes: good };
        }
        lastErr = new Error("No chemically consistent route found (every suggested route failed the atom-balance check). Please try again.");
        console.error(`model ${model}: all routes failed atom check`);
        continue;
      }
      lastErr = new Error(`Model ${model} returned unparseable output`);
      console.error(String(lastErr));
    } catch (e) {
      lastErr = e;
      console.error(`model ${model} failed:`, e instanceof Error ? e.message : e);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastErr ?? new Error("Retrosynthesis engine failed");
}

let usedModel = HF_MODELS[0];

// deno-lint-ignore no-explicit-any
function extractJson(raw: string): any {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* ignore */ }
  }
  return null;
}

// ── Atom-balance check ───────────────────────────────────────────────────
// Every step's reaction SMILES must conserve atoms: whatever the reactants
// contain beyond the product must be explainable as common by-products
// (water, HCl, CO2, salts…). Hydrogen may only be added when the step is a
// reduction, and oxygen/hydrogen only removed when it is an oxidation.
// This rejects e.g. "ethylene oxide + water → ethanol" (a stray O atom).

type Counts = Record<string, number>;

async function atomCounts(smiles: string): Promise<Counts | null> {
  if (!smiles || !smiles.trim()) return null;
  const RDKit = await getRDKit();
  const mol = RDKit.get_mol(smiles.trim());
  if (!mol || !mol.is_valid()) { try { mol?.delete(); } catch { /* */ } return null; }
  try {
    const block: string = mol.add_hs();
    const lines = block.split("\n");
    const counts: Counts = {};
    const header = lines[3] ?? "";
    if (header.includes("V3000")) {
      for (const l of lines) {
        const m = l.match(/^M {2}V30 \d+ ([A-Z][a-z]?) /);
        if (m) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
      }
    } else {
      const n = parseInt(header.slice(0, 3), 10);
      for (let i = 0; i < n; i++) {
        const el = (lines[4 + i] ?? "").slice(31, 34).trim();
        if (el) counts[el] = (counts[el] ?? 0) + 1;
      }
    }
    return counts;
  } finally { mol.delete(); }
}

async function canon(smiles: string): Promise<string | null> {
  const RDKit = await getRDKit();
  const mol = RDKit.get_mol(smiles.trim());
  if (!mol || !mol.is_valid()) { try { mol?.delete(); } catch { /* */ } return null; }
  const c = mol.get_smiles(); mol.delete(); return c;
}

const METALS = ["Na", "K", "Li", "Mg", "Zn", "Cs", "Ca", "Cu", "Ag", "Al", "B", "Sn"];
const BASE_BYPRODUCTS: Counts[] = [
  { H: 2, O: 1 }, { H: 1, Cl: 1 }, { H: 1, Br: 1 }, { H: 1, I: 1 }, { H: 1, F: 1 },
  { C: 1, O: 2 }, { C: 1, O: 1 }, { N: 1, H: 3 }, { N: 2 }, { C: 1, H: 4, O: 1 },
  { C: 2, H: 6, O: 1 }, { C: 2, H: 4, O: 2 }, { S: 1, O: 2 }, { H: 2, S: 1, O: 4 },
  { H: 3, P: 1, O: 4 }, { C: 4, H: 10, O: 1 }, { C: 3, H: 6, O: 1 },
  ...METALS.flatMap((m) => [{ [m]: 1 }, { [m]: 1, Cl: 1 }, { [m]: 1, Br: 1 }, { [m]: 1, I: 1 }, { [m]: 1, O: 1, H: 1 }]),
];
const REDUCTIVE = /reduc|hydrogenat|hydrogenoly|\bH2\b|H₂|NaBH4|LiAlH4|hydride|DIBAL|Pd\/C|Raney|Birch|Wolff|Clemmensen/i;
const OXIDATIVE = /oxid|dehydrogen|KMnO4|CrO3|PCC|PDC|Swern|Jones|peroxide|H2O2|mCPBA|\bO2\b|ozon|NaOCl|TEMPO|Dess|air/i;

function decomposable(left: Counts, byproducts: Counts[], depth = 0): boolean {
  const keys = Object.keys(left).filter((k) => left[k] !== 0);
  if (keys.length === 0) return true;
  if (keys.some((k) => left[k] < 0) || depth > 12) return false;
  for (const b of byproducts) {
    if (Object.entries(b).every(([k, v]) => (left[k] ?? 0) >= v)) {
      const next = { ...left };
      for (const [k, v] of Object.entries(b)) next[k] -= v;
      if (decomposable(next, byproducts, depth + 1)) return true;
    }
  }
  return false;
}

// deno-lint-ignore no-explicit-any
async function checkStep(step: any): Promise<"balanced" | "unchecked" | string> {
  const rxn: string | undefined = step.reactionSmiles;
  if (!rxn || !rxn.includes(">")) return "unchecked";
  const parts = rxn.split(">");
  const lhs = parts[0], rhs = parts[parts.length - 1];
  const r = await atomCounts(lhs);
  const p = await atomCounts(rhs.split(".").sort((a, b) => b.length - a.length)[0] ?? "");
  if (!r || !p) return "reaction SMILES could not be parsed";
  const text = `${step.description ?? ""} ${JSON.stringify(step.conditions ?? {})}`;
  const reductive = REDUCTIVE.test(text), oxidative = OXIDATIVE.test(text);
  const left: Counts = {};
  for (const k of new Set([...Object.keys(r), ...Object.keys(p)])) left[k] = (r[k] ?? 0) - (p[k] ?? 0);
  // Missing reagent atoms that the named chemistry legitimately supplies.
  if (reductive && (left.H ?? 0) < 0) left.H = 0;
  if (oxidative && (left.O ?? 0) < 0) left.O = 0;
  const byproducts: Counts[] = oxidative ? [...BASE_BYPRODUCTS, { H: 2 }, { H: 1 }] : [...BASE_BYPRODUCTS];
  if (reductive && (left.H ?? 0) > 0) byproducts.push({ H: 1 });
  const deficit = Object.entries(left).filter(([, v]) => v < 0).map(([k]) => k);
  if (deficit.length) return `product has atoms (${deficit.join(", ")}) not present in reactants`;
  if (!decomposable(left, byproducts)) {
    const extra = Object.entries(left).filter(([, v]) => v > 0).map(([k, v]) => `${k}${v}`).join(" ");
    return `atoms don't add up — unexplained leftover ${extra}`;
  }
  return "balanced";
}

// Returns only routes whose every checkable step balances and whose final
// product is the target. Annotates each step with its atomCheck result.
// deno-lint-ignore no-explicit-any
async function filterBalancedRoutes(routes: any[], canonical: string): Promise<any[]> {
  // deno-lint-ignore no-explicit-any
  const ok: any[] = [];
  for (const route of routes) {
    const steps = Array.isArray(route.steps) ? route.steps : [];
    if (!steps.length) continue;
    let pass = true;
    for (const s of steps) {
      const res = await checkStep(s);
      s.atomCheck = res === "balanced" || res === "unchecked" ? res : "failed";
      if (s.atomCheck === "failed") {
        console.warn(`rejected route "${route.name}": ${res} [${s.reactionSmiles}]`);
        pass = false; break;
      }
    }
    if (!pass) continue;
    const last = steps[steps.length - 1];
    const finalSmi = last.productSmiles ?? last.smiles ??
      (last.reactionSmiles ? last.reactionSmiles.split(">").pop() : undefined);
    if (finalSmi) {
      const frags = await Promise.all(String(finalSmi).split(".").map(canon));
      if (!frags.includes(canonical)) {
        console.warn(`rejected route "${route.name}": final product ${finalSmi} is not the target`);
        continue;
      }
    }
    ok.push(route);
  }
  return ok;
}

// ── Response shaping ─────────────────────────────────────────────────────


// deno-lint-ignore no-explicit-any
function shapeRoutes(engineOutput: any, canonical: string) {
  const routes = Array.isArray(engineOutput?.routes) ? engineOutput.routes : [];
  return routes.map((r: any, i: number) => ({
    id: `R${i + 1}`,
    name: r.name ?? `Computed Route ${i + 1}`,
    score: typeof r.score === "number" ? Math.max(0, Math.min(1, r.score)) : 0.7,
    yieldPercent: typeof r.yieldPercent === "number" ? r.yieldPercent : 50,
    complexity: typeof r.complexity === "number" ? r.complexity : undefined,
    decisionReason: r.decisionReason ?? "",
    startingMaterials: Array.isArray(r.startingMaterials) ? r.startingMaterials : [],
    steps: (Array.isArray(r.steps) ? r.steps : []).map((s: any, j: number) => ({
      number: j + 1,
      description: s.description ?? "",
      smiles: s.productSmiles || (j === (r.steps?.length ?? 0) - 1 ? canonical : undefined),
      reactionSmiles: s.reactionSmiles,
      confidence: typeof s.confidence === "number" ? s.confidence : undefined,
      conditions: s.conditions ?? undefined,
      atomCheck: s.atomCheck,
    })),
  }));
}

// ── HTTP handler ─────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { smiles, force } = await req.json();
    if (typeof smiles !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing 'smiles' string." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const v = await validateAndCanonicalise(smiles);
    if (!v.valid || !v.canonical) {
      return new Response(JSON.stringify({ valid: false, error: v.error }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseKey);

    // Verified literature routes take priority over any AI output.
    const { data: verified } = await admin
      .from("verified_routes")
      .select("routes, common_name, references_text")
      .eq("canonical_smiles", v.canonical)
      .maybeSingle();
    if (verified?.routes) {
      return new Response(JSON.stringify({
        valid: true,
        canonical_smiles: v.canonical,
        descriptors: { formula: v.formula, mw: v.mw, rings: v.rings },
        engine: "verified-literature",
        verified: true,
        references: verified.references_text,
        cached: true,
        routes: verified.routes,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cache lookup
    if (!force) {
      const { data: cached } = await admin
        .from("retrosynthesis_cache")
        .select("payload, engine, created_at")
        .eq("canonical_smiles", v.canonical)
        .maybeSingle();
      const cachedOk = Array.isArray(cached?.payload)
        ? await filterBalancedRoutes(cached!.payload, v.canonical) : [];
      if (cachedOk.length) {
        cached!.payload = cachedOk;
        return new Response(
          JSON.stringify({
            valid: true,
            canonical_smiles: v.canonical,
            descriptors: { formula: v.formula, mw: v.mw, rings: v.rings },
            engine: cached.engine,
            cached: true,
            routes: cached.payload,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Per-visitor limit on fresh (uncached) engine runs: max 5 per 2 minutes.
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const since = new Date(Date.now() - 120_000).toISOString();
    const { count } = await admin.from("rate_limits").select("id", { count: "exact", head: true })
      .eq("client_key", ip).gte("created_at", since);
    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ valid: false, error: "You're running searches quickly — please wait a moment and try again." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await admin.from("rate_limits").insert({ client_key: ip });
    // Opportunistic cleanup of old entries
    admin.from("rate_limits").delete().lt("created_at", new Date(Date.now() - 3_600_000).toISOString()).then(() => {});

    const engineOutput = await runRetrosynthesisEngine(v.canonical);
    const shaped = shapeRoutes(engineOutput, v.canonical);

    // Best-effort cache write (don't fail the request if it errors)
    try {
      await admin
        .from("retrosynthesis_cache")
        .upsert(
          {
            canonical_smiles: v.canonical,
            engine: `hf:${usedModel}`,
            payload: shaped,
          },
          { onConflict: "canonical_smiles" },
        );
    } catch (e) {
      console.error("cache write failed:", e);
    }

    return new Response(
      JSON.stringify({
        valid: true,
        canonical_smiles: v.canonical,
        descriptors: { formula: v.formula, mw: v.mw, rings: v.rings },
        engine: `hf:${usedModel}`,
        cached: false,
        routes: shaped,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("retrosynthesis error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("429") ? 429 : msg.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});