import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient } from "../_shared/aiRouter.ts";
import { hasPlatformAccess } from "../_shared/access.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Groq first (fast), Hugging Face as backup. Both speak the same streaming format.
const PROVIDERS = [
  { url: "https://api.groq.com/openai/v1/chat/completions", key: "GROQ_API_KEY", model: "openai/gpt-oss-120b" },
  { url: "https://router.huggingface.co/v1/chat/completions", key: "HUGGINGFACE_API_TOKEN", model: "meta-llama/Llama-3.3-70B-Instruct:fastest" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!(await hasPlatformAccess(adminClient(), req))) {
    return new Response(JSON.stringify({ error: "Please sign in to use Chemtraceit." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { messages, context, type } = await req.json();

    const systemPrompt = type === 'protocol'
      ? `You are an expert synthetic chemist writing detailed laboratory synthesis protocols. You provide precise quantities, temperatures, reaction times, safety precautions, and QC checkpoints. Use scientific notation and proper chemical nomenclature. Context: ${context}`
      : `You are ChemTraceIt's Chemistry AI, an expert chemistry assistant specializing in organic synthesis, pharmaceutical manufacturing, reagent procurement, and regulatory compliance. Never mention which underlying model or provider you run on. You provide detailed, scientifically accurate answers about synthesis routes, reaction mechanisms, safety considerations, and supply chain logistics. Be concise but thorough. Use chemical nomenclature correctly. Context about the current analysis: ${context}`;

    let lastStatus = 500;
    for (const p of PROVIDERS) {
      const token = Deno.env.get(p.key);
      if (!token) continue;
      const response = await fetch(p.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: p.model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: true,
          max_tokens: 2048,
        }),
      });
      if (response.ok) {
        return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }
      lastStatus = response.status;
      console.error("provider failed", p.url, response.status, (await response.text()).slice(0, 300));
    }
    return new Response(JSON.stringify({ error: lastStatus === 429 ? "The assistant is busy right now — please try again in a minute." : "The assistant is temporarily unavailable — please try again shortly." }), {
      status: lastStatus === 429 ? 429 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chemtrace-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
