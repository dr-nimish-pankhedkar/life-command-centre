import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { prompt, history = [], system = "" } = await req.json();
    const contents = [];
    if (system) {
      contents.push({ role: "user", parts: [{ text: system }] });
      contents.push({ role: "model", parts: [{ text: "Understood." }] });
    }
    for (const m of history) {
      contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] });
    }
    contents.push({ role: "user", parts: [{ text: prompt }] });
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 1024, temperature: 0.7 } })
      }
    );
    const data = await res.json();
    if (!res.ok) return new Response(JSON.stringify({ error: data?.error?.message || "Gemini error" }), { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return new Response(JSON.stringify({ text }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
