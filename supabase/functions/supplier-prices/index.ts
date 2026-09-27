// Checks supplier product pages for a published price and updates supplier_products.
// Called daily by a scheduler, or on demand by an admin/moderator ("Check prices now").
// Staff-set prices (manual_override) are never overwritten; the auto price is still recorded.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function isStaff(req: Request): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await admin.auth.getUser(token).catch(() => ({ data: null }));
  const uid = data?.user?.id; if (!uid) return false;
  const { data: r } = await admin.from("user_roles").select("role").eq("user_id", uid).in("role", ["admin", "moderator"]);
  return (r ?? []).length > 0;
}

function extractPrice(html: string): { price: number; currency?: string } | null {
  // JSON-LD Product offers
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o: any): any => {
        if (!o || typeof o !== "object") return null;
        if (o.price != null && !isNaN(Number(o.price))) return { price: Number(o.price), currency: o.priceCurrency };
        for (const v of Object.values(o)) { const r = walk(v); if (r) return r; }
        return null;
      };
      const r = walk(JSON.parse(m[1])); if (r && r.price > 0) return r;
    } catch { /* ignore */ }
  }
  const meta = html.match(/(?:product:price:amount|og:price:amount|itemprop=["']price["'])[^>]*content=["']([\d.,]+)["']/i);
  if (meta) { const p = Number(meta[1].replace(/,/g, "")); if (p > 0) return { price: p }; }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const staff = await isStaff(req);
  if (!staff) {
    // Scheduler path: at most one run every 6 hours.
    const { data } = await admin.from("supplier_products").select("price_checked_at").order("price_checked_at", { ascending: false, nullsFirst: false }).limit(1);
    const last = data?.[0]?.price_checked_at ? new Date(data[0].price_checked_at).getTime() : 0;
    if (Date.now() - last < 6 * 3600_000) return json({ skipped: "checked recently" });
  }
  const { data: rows, error } = await admin.from("supplier_products").select("id, product_url, price, currency, manual_override");
  if (error) return json({ error: error.message }, 500);
  let updated = 0, found = 0, blocked = 0;
  const now = new Date().toISOString();
  await Promise.all((rows ?? []).map(async (r) => {
    let status = "no price published", hit: ReturnType<typeof extractPrice> = null;
    try {
      const res = await fetch(r.product_url, { headers: { "User-Agent": "Mozilla/5.0 ChemTraceIt price check", Accept: "text/html" }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) { status = `blocked (${res.status})`; blocked++; }
      else { hit = extractPrice(await res.text()); if (hit) { status = "price found"; found++; } }
    } catch { status = "unreachable"; blocked++; }
    const patch: Record<string, unknown> = { price_checked_at: now, auto_status: status, auto_price: hit?.price ?? null };
    if (hit && !r.manual_override && hit.price !== Number(r.price)) {
      Object.assign(patch, { price: hit.price, currency: hit.currency ?? r.currency, price_source: "auto", updated_by: null, updated_at: now, price_note: "Live price from supplier page" });
      updated++;
    }
    await admin.from("supplier_products").update(patch).eq("id", r.id);
  }));
  return json({ checked: rows?.length ?? 0, found, updated, blocked });
});
