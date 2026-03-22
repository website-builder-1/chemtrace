import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HF_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";
const HF_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/v1/chat/completions`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context, type } = await req.json();
    const HF_TOKEN = Deno.env.get("HUGGINGFACE_API_TOKEN");
    if (!HF_TOKEN) throw new Error("HUGGINGFACE_API_TOKEN is not configured");

    const systemPrompt = type === 'protocol'
      ? `You are an expert synthetic chemist writing detailed laboratory synthesis protocols. You provide precise quantities, temperatures, reaction times, safety precautions, and QC checkpoints. Use scientific notation and proper chemical nomenclature. Context: ${context}`
      : `You are ChemTrace AI, an expert chemistry assistant specializing in organic synthesis, pharmaceutical manufacturing, reagent procurement, and regulatory compliance. You provide detailed, scientifically accurate answers about synthesis routes, reaction mechanisms, safety considerations, and supply chain logistics. Be concise but thorough. Use chemical nomenclature correctly. Context about the current analysis: ${context}`;

    const response = await fetch(HF_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Hugging Face rate limit reached. Free tier allows ~5 requests/min. Please wait and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 503) {
        return new Response(JSON.stringify({ error: "Model is loading on Hugging Face (cold start). Please try again in 20-30 seconds." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Hugging Face API error:", response.status, t);
      return new Response(JSON.stringify({ error: `Hugging Face error (${response.status}): ${t}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chemtrace-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
