// Literature ingestion + hybrid retrieval (keyword + vector, RRF) over open sources.
import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { embed } from "./aiRouter.ts";

interface Doc { source: string; external_id: string; doi?: string; title: string; abstract?: string; year?: number; journal?: string; url?: string }

async function europePmc(q: string): Promise<Doc[]> {
  try {
    const r = await fetch(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(q)}&format=json&resultType=core&pageSize=8`);
    if (!r.ok) return [];
    const j = await r.json();
    // deno-lint-ignore no-explicit-any
    return (j?.resultList?.result ?? []).filter((x: any) => x.title).map((x: any) => ({
      source: "europepmc", external_id: String(x.id), doi: x.doi, title: x.title,
      abstract: (x.abstractText ?? "").replace(/<[^>]+>/g, ""), year: Number(x.pubYear) || undefined,
      journal: x.journalInfo?.journal?.title, url: x.doi ? `https://doi.org/${x.doi}` : `https://europepmc.org/article/${x.source}/${x.id}`,
    }));
  } catch { return []; }
}

function openAlexAbstract(inv?: Record<string, number[]>): string {
  if (!inv) return "";
  const words: string[] = [];
  for (const [w, pos] of Object.entries(inv)) for (const p of pos) words[p] = w;
  return words.join(" ");
}

async function openAlex(q: string): Promise<Doc[]> {
  try {
    const r = await fetch(`https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=8&mailto=admin@chemtraceit.com`);
    if (!r.ok) return [];
    const j = await r.json();
    // deno-lint-ignore no-explicit-any
    return (j?.results ?? []).filter((x: any) => x.title).map((x: any) => ({
      source: "openalex", external_id: String(x.id).split("/").pop()!, doi: x.doi?.replace("https://doi.org/", ""),
      title: x.title, abstract: openAlexAbstract(x.abstract_inverted_index), year: x.publication_year,
      journal: x.primary_location?.source?.display_name, url: x.doi ?? x.id,
    }));
  } catch { return []; }
}

function chunk(text: string, size = 900): string[] {
  const sents = text.split(/(?<=[.!?])\s+/);
  const out: string[] = []; let cur = "";
  for (const s of sents) { if ((cur + " " + s).length > size && cur) { out.push(cur.trim()); cur = s; } else cur += " " + s; }
  if (cur.trim()) out.push(cur.trim());
  return out.slice(0, 6);
}

export async function ingest(admin: SupabaseClient, q: string, entities: string[] = []) {
  const [a, b] = await Promise.all([europePmc(q), openAlex(q)]);
  const seen = new Set<string>();
  const docs = [...a, ...b].filter((d) => {
    const k = (d.doi ?? d.title).toLowerCase();
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  let chunksAdded = 0;
  for (const d of docs) {
    const { data: row } = await admin.from("literature_docs")
      .upsert({ ...d, entities }, { onConflict: "source,external_id" }).select("id").single();
    if (!row) continue;
    const { count } = await admin.from("literature_chunks").select("id", { count: "exact", head: true }).eq("doc_id", row.id);
    if (count) continue;
    const pieces = chunk(`${d.title}. ${d.abstract ?? ""}`);
    const emb = await embed(pieces);
    await admin.from("literature_chunks").upsert(pieces.map((c, i) => ({
      doc_id: row.id, chunk_index: i, content: c,
      embedding: emb ? JSON.stringify(emb.vectors[i]) : null, embed_model: emb?.model ?? null,
    })), { onConflict: "doc_id,chunk_index" });
    chunksAdded += pieces.length;
  }
  return { docs: docs.length, chunksAdded };
}

export interface Evidence { n: number; title: string; year?: number; journal?: string; url?: string; doi?: string; source: string; excerpt: string; score: number }

export async function search(admin: SupabaseClient, q: string, opts: { ingestFirst?: boolean; entities?: string[]; k?: number } = {}): Promise<Evidence[]> {
  const key = `lit:${q.toLowerCase().trim()}`;
  const { data: cached } = await admin.from("search_cache").select("payload, created_at").eq("cache_key", key).maybeSingle();
  if (cached && Date.now() - new Date(cached.created_at).getTime() < 7 * 86400_000) return cached.payload as Evidence[];

  if (opts.ingestFirst !== false) await ingest(admin, q, opts.entities ?? []);
  const e = await embed([q]);
  const { data, error } = await admin.rpc("hybrid_search_chunks", {
    query_text: q, query_embedding: e ? JSON.stringify(e.vectors[0]) : null, match_count: opts.k ?? 8,
  });
  if (error) { console.error("hybrid search", error); return []; }
  // deno-lint-ignore no-explicit-any
  const rows = (data ?? []) as any[];
  const docIds = [...new Set(rows.map((r) => r.doc_id))];
  const { data: docs } = docIds.length ? await admin.from("literature_docs").select("*").in("id", docIds) : { data: [] };
  // deno-lint-ignore no-explicit-any
  const byId = new Map((docs ?? []).map((d: any) => [d.id, d]));
  const seenDoc = new Set<string>();
  const out: Evidence[] = [];
  for (const r of rows) {
    if (seenDoc.has(r.doc_id)) continue; seenDoc.add(r.doc_id);
    // deno-lint-ignore no-explicit-any
    const d: any = byId.get(r.doc_id); if (!d) continue;
    out.push({ n: out.length + 1, title: d.title, year: d.year, journal: d.journal, url: d.url, doi: d.doi, source: d.source, excerpt: r.content.slice(0, 600), score: r.score });
  }
  if (out.length) await admin.from("search_cache").upsert({ cache_key: key, payload: out, created_at: new Date().toISOString() });
  return out;
}
