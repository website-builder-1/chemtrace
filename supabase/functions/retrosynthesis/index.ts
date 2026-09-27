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
  "Qwen/Qwen2.5-72B-Instruct:fastest",
  "meta-llama/Llama-3.3-70B-Instruct:fastest",
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
    `Prefer commercially available starting materials. Reaction SMILES MUST be ` +
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
    const timeout = setTimeout(() => controller.abort(), Math.min(45_000, remaining));
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
        usedModel = model;
        return parsed;
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

    // Cache lookup
    if (!force) {
      const { data: cached } = await admin
        .from("retrosynthesis_cache")
        .select("payload, engine, created_at")
        .eq("canonical_smiles", v.canonical)
        .maybeSingle();
      if (cached?.payload) {
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