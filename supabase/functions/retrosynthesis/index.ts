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

const ENGINE_VERSION = "hf-qwen2.5-72b-v1";
const AI_MODEL = "Qwen/Qwen2.5-72B-Instruct";
const HF_URL = "https://router.huggingface.co/v1/chat/completions";

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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(HF_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        if (res.status === 429 || res.status === 402) {
          clearTimeout(timeout);
          throw new Error(`Hugging Face ${res.status}: ${body}`);
        }
        lastErr = new Error(`Hugging Face ${res.status}: ${body}`);
        continue; // retry once
      }
      const data = await res.json();
      clearTimeout(timeout);
      const raw = data?.choices?.[0]?.message?.content ?? "{}";
      if (typeof raw !== "string") return raw;
      // Strip code fences if the model added them despite instructions.
      const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      return JSON.parse(cleaned);
    } catch (e) {
      lastErr = e;
      if ((e as { name?: string }).name === "AbortError") break;
    }
  }
  clearTimeout(timeout);
  throw lastErr ?? new Error("Retrosynthesis engine failed");
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
            engine: ENGINE_VERSION,
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
        engine: ENGINE_VERSION,
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