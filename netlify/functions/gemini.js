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

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      const status = res.status === 429 ? 429 : res.status >= 500 ? 502 : 400;
      return {
        statusCode: status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: data.error?.message || "تعذّر الاتصال بخدمة الذكاء الاصطناعي" }),
      };
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "تعذّر الاتصال بخدمة الذكاء الاصطناعي الآن" }),
    };
  }
};
