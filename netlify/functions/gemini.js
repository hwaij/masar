// Netlify Function: server-side proxy for Gemini so the API key never
// reaches the browser. The client posts the same request body it would
// have sent straight to Google (contents / system_instruction /
// generationConfig) and gets back { text }.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "GEMINI_API_KEY غير مضبوط على الخادم" }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "طلب غير صالح" }),
    };
  }

  // gemini-2.0-flash was deprecated and shut down on 2026-06-01. Use the
  // current stable free-tier model. Auth keys (the new "AQ." prefix format
  // that AI Studio now issues by default) must be sent via the
  // x-goog-api-key header — the legacy "?key=" query-string form is only
  // reliable for old "AIza..." standard keys and returns 401
  // UNAUTHENTICATED for auth keys on some routes.
  const MODEL = "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });
    const rawBody = await res.text();
    let data = {};
    try { data = JSON.parse(rawBody); } catch { /* non-JSON body, keep raw for logging */ }

    console.log(`[gemini] ${MODEL} -> HTTP ${res.status}`, res.ok ? "OK" : rawBody);

    if (!res.ok) {
      const status = res.status === 429 ? 429 : res.status >= 500 ? 502 : 400;
      return {
        statusCode: status,
        headers: { "Content-Type": "application/json" },
        // TEMP: surfacing the real upstream error for diagnosis. Tighten
        // this back to a generic Arabic message once auth is confirmed
        // working end to end.
        body: JSON.stringify({
          error: data.error?.message || rawBody || "تعذّر الاتصال بخدمة الذكاء الاصطناعي",
          upstreamStatus: res.status,
          upstreamStatusText: data.error?.status,
        }),
      };
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    console.error("[gemini] network/exception error:", err);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: `تعذّر الاتصال بخدمة الذكاء الاصطناعي الآن: ${err.message}` }),
    };
  }
};
