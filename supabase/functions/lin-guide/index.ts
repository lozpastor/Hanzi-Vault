const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Cache-Control": "no-store",
};

function reply(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers });
}

async function readInput(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new Error("Body too large");
    }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "method" });
  const token = request.headers.get("Authorization");
  if (!token?.startsWith("Bearer ")) return reply(401, { error: "session" });
  const supabase = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("LIN_OPENAI_MODEL");
  if (!supabase || !serviceKey || !apiKey || !model) return reply(503, { error: "disabled" });

  let input;
  try {
    input = await readInput(request);
  } catch {
    return reply(400, { error: "input" });
  }
  const question = typeof input?.question === "string" ? input.question.trim() : "";
  const topic = typeof input?.topic === "string" ? input.topic.trim() : "";
  const level = input?.level;
  if (!question || question.length > 480 || topic.length > 80 || ![1, 2, 3].includes(level)) {
    return reply(400, { error: "input" });
  }

  try {
    const identity = await fetch(`${supabase}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: token },
      signal: AbortSignal.timeout(4000),
    });
    if (!identity.ok) return reply(401, { error: "session" });
    const { id } = await identity.json();
    if (!id) return reply(401, { error: "session" });

    const quota = await fetch(`${supabase}/rest/v1/rpc/reserve_lin_request`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ learner: id }),
      signal: AbortSignal.timeout(4000),
    });
    if (!quota.ok) {
      const failure = await quota.json();
      return failure.code === "P0001" ? reply(429, { error: "quota" }) : reply(503, { error: "unavailable" });
    }

    const generation = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 500,
        instructions: "Eres Lin, guía de mandarín cotidiano para hispanohablantes. Responde en español claro y en texto plano breve. Atiende solo a práctica de mandarín. Adapta la dificultad al nivel 1 (primeros intercambios), 2 (autonomía cotidiana) o 3 (viajes e imprevistos). Incluye pinyin con tonos y traducción al introducir una frase. Si corriges, explica un solo cambio prioritario. Si propones un diálogo, da una situación y termina pidiendo al alumno una respuesta oral. No digas haber oído su voz ni haber evaluado su pronunciación.",
        input: JSON.stringify({ level, topic, question }),
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!generation.ok) return reply(503, { error: "unavailable" });
    const result = await generation.json();
    const answer = (result.output || [])
      .filter((item: { type: string }) => item.type === "message")
      .flatMap((item: { content: { type: string; text?: string }[] }) => item.content)
      .filter((item: { type: string }) => item.type === "output_text")
      .map((item: { text: string }) => item.text)
      .join("\n").trim();
    return answer ? reply(200, { answer }) : reply(503, { error: "unavailable" });
  } catch {
    return reply(503, { error: "unavailable" });
  }
});
