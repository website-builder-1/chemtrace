// Deterministic chemistry tools: resolve, descriptors, compare, substructure, functional groups.
import { z } from "npm:zod@3";
import { adminClient, corsHeaders, json, rateLimited } from "../_shared/aiRouter.ts";
import { descriptors, functionalGroups, hasSubstructure, tanimoto } from "../_shared/chem.ts";
import { resolveCompound } from "../_shared/compounds.ts";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("resolve"), smiles: z.string().max(500).optional(), name: z.string().max(200).optional() }),
  z.object({ action: z.literal("descriptors"), smiles: z.string().min(1).max(500) }),
  z.object({ action: z.literal("compare"), a: z.string().min(1).max(500), b: z.string().min(1).max(500) }),
  z.object({ action: z.literal("substructure"), smiles: z.string().min(1).max(500), smarts: z.string().min(1).max(300) }),
  z.object({ action: z.literal("functional_groups"), smiles: z.string().min(1).max(500) }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
  const admin = adminClient();
  if (await rateLimited(admin, req, "chem-tools", 60, 60_000)) return json({ error: "Too many requests — please wait a moment." }, 429);
  const b = parsed.data;
  try {
    switch (b.action) {
      case "resolve": {
        const c = await resolveCompound(admin, { smiles: b.smiles, name: b.name });
        return c ? json({ compound: c, evidence: "database" }) : json({ error: "Could not resolve structure" }, 404);
      }
      case "descriptors": {
        const d = await descriptors(b.smiles);
        return d ? json({ descriptors: d, source: "RDKit" }) : json({ error: "Invalid SMILES" }, 400);
      }
      case "compare": {
        const [da, db, sim] = await Promise.all([descriptors(b.a), descriptors(b.b), tanimoto(b.a, b.b)]);
        if (!da || !db) return json({ error: "Invalid SMILES" }, 400);
        return json({ a: da, b: db, tanimoto_morgan2: sim, identical: da.canonical_smiles === db.canonical_smiles, source: "RDKit" });
      }
      case "substructure": {
        const m = await hasSubstructure(b.smiles, b.smarts);
        return m === null ? json({ error: "Invalid SMILES or SMARTS" }, 400) : json({ match: m, source: "RDKit" });
      }
      case "functional_groups":
        return json({ groups: await functionalGroups(b.smiles), source: "RDKit SMARTS" });
    }
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
