// Hybrid literature search over Europe PMC (incl. PubMed) + OpenAlex, cached and embedded.
import { z } from "npm:zod@3";
import { adminClient, corsHeaders, json, rateLimited } from "../_shared/aiRouter.ts";
import { search } from "../_shared/literature.ts";

const Body = z.object({ query: z.string().min(2).max(300), entities: z.array(z.string().max(200)).max(10).optional() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return json({ error: p.error.flatten() }, 400);
  const admin = adminClient();
  if (await rateLimited(admin, req, "lit", 20, 120_000)) return json({ error: "Too many searches — please wait a moment." }, 429);
  try {
    const evidence = await search(admin, p.data.query, { entities: p.data.entities });
    return json({ evidence });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
