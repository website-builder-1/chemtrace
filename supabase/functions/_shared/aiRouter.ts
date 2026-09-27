// Provider-agnostic model router. Tasks ("reasoning", "fast", "embedding")
// map to an ordered list of provider+model pairs stored in `model_routes`.
// Swapping providers is a data change, not a code change.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

interface RouteRow { priority: number; model: string; provider: { id: string; base_url: string; secret_name: string; kind: string; enabled: boolean } }

async function routesFor(admin: SupabaseClient, task: string): Promise<RouteRow[]> {
  const { data } = await admin.from("model_routes")
    .select("priority, model, provider:ai_providers(id, base_url, secret_name, kind, enabled)")
    .eq("task", task).eq("enabled", true).order("priority");
  // deno-lint-ignore no-explicit-any
  return ((data ?? []) as any[]).filter((r) => r.provider?.enabled && Deno.env.get(r.provider.secret_name));
}

async function log(admin: SupabaseClient, row: Record<string, unknown>) {
  try { await admin.from("request_log").insert(row); } catch { /* best effort */ }
}

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

export async function chat(task: string, messages: ChatMessage[], opts: { maxTokens?: number; temperature?: number; timeoutMs?: number; fn?: string } = {}) {
  const admin = adminClient();
  const routes = await routesFor(admin, task);
  if (!routes.length) throw new Error(`No enabled AI provider for task "${task}"`);
  let lastErr: unknown;
  for (const r of routes) {
    const t0 = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 40_000);
    try {
      const res = await fetch(`${r.provider.base_url}/chat/completions`, {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get(r.provider.secret_name)}` },
        body: JSON.stringify({ model: r.model, messages, temperature: opts.temperature ?? 0.2, max_tokens: opts.maxTokens ?? 1500 }),
      });
      if (!res.ok) throw new Error(`${r.provider.id} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      const text: string = data?.choices?.[0]?.message?.content ?? "";
      if (!text.trim()) throw new Error(`${r.provider.id} returned empty text`);
      await log(admin, { function_name: opts.fn ?? "ai-router", task, provider: r.provider.id, model: r.model, latency_ms: Date.now() - t0, ok: true });
      return { text, provider: r.provider.id, model: r.model };
    } catch (e) {
      lastErr = e;
      await log(admin, { function_name: opts.fn ?? "ai-router", task, provider: r.provider.id, model: r.model, latency_ms: Date.now() - t0, ok: false, detail: String(e).slice(0, 300) });
    } finally { clearTimeout(timer); }
  }
  throw lastErr ?? new Error("All providers failed");
}

// Returns a 384-d embedding, or null if no embedding provider is reachable
// (callers fall back to keyword-only search).
export async function embed(texts: string[]): Promise<{ vectors: number[][]; model: string } | null> {
  const admin = adminClient();
  const routes = await routesFor(admin, "embedding");
  for (const r of routes) {
    try {
      const res = await fetch(`${r.provider.base_url}/${r.model}/pipeline/feature-extraction`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get(r.provider.secret_name)}` },
        body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
      });
      if (!res.ok) { console.error("embed", res.status, (await res.text()).slice(0, 200)); continue; }
      const out = await res.json();
      if (Array.isArray(out) && Array.isArray(out[0]) && typeof out[0][0] === "number") return { vectors: out, model: r.model };
    } catch (e) { console.error("embed failed", e); }
  }
  return null;
}

export function extractJson(raw: string): any {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(cleaned); } catch { /* */ }
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if (s >= 0 && e > s) { try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { /* */ } }
  return null;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Simple per-IP limiter reusing the rate_limits table.
export async function rateLimited(admin: SupabaseClient, req: Request, bucket: string, max: number, windowMs: number) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const key = `${bucket}:${ip}`;
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await admin.from("rate_limits").select("id", { count: "exact", head: true }).eq("client_key", key).gte("created_at", since);
  if ((count ?? 0) >= max) return true;
  await admin.from("rate_limits").insert({ client_key: key });
  return false;
}
