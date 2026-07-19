// Netlify Function: server-side proxy for Gemini so the API key never
// reaches the browser. The client posts the same request body it would
// have sent straight to Google (contents / system_instruction /
// generationConfig) and gets back { text }.
//
// Gemini access is a paid feature (مسار الكامل). This is the real
// enforcement boundary for it — the client-side UI gates are only a
// courtesy shortcut, not security, since anyone could otherwise call this
// URL directly with a valid login and burn through our Gemini quota for
// free. Every request must carry a Supabase access token; it's verified
// against Supabase Auth, then the caller's own subscriptions row is read
// (using that same user token, so the existing owner-scoped RLS select
// policy is what actually grants/denies the read) to decide is_vip / an
// unexpired is_subscriber before Gemini is ever called.
function readSupabaseEnv() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  return { url, anonKey };
}

// راية الفتح المجاني المؤقت (app_flags.free_for_all). فحص عام لا يحتاج
// أي رمز مصادقة، حتى تعمل للضيوف غير المسجّلين أيضاً — جدول app_flags
// مقروء عامةً (anon) بحسب سياسة RLS الخاصة به.
async function isFreeForAllActive(url, anonKey) {
  try {
    const res = await fetch(`${url}/rest/v1/app_flags?id=eq.global&select=free_for_all`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) return false;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    return !!row?.free_for_all;
  } catch (e) {
    console.error("[gemini] free_for_all flag check failed:", e);
    return false;
  }
}

async function requireActiveSubscriber(accessToken) {
  const { url, anonKey } = readSupabaseEnv();
  if (!url || !anonKey) {
    return { ok: false, status: 500, error: "الخدمة غير مهيأة على الخادم." };
  }
  if (await isFreeForAllActive(url, anonKey)) {
    return { ok: true };
  }
  if (!accessToken) {
    return { ok: false, status: 401, error: "سجّل الدخول أولاً لاستخدام هذه الميزة." };
  }

  let userId;
  try {
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey },
    });
    if (!userRes.ok) return { ok: false, status: 401, error: "جلستك غير صالحة، سجّل الدخول مرة أخرى." };
    const user = await userRes.json();
    userId = user?.id;
    if (!userId) return { ok: false, status: 401, error: "جلستك غير صالحة، سجّل الدخول مرة أخرى." };
  } catch (e) {
    console.error("[gemini] auth verification failed:", e);
    return { ok: false, status: 502, error: "تعذّر التحقق من حسابك الآن، حاول مرة أخرى." };
  }

  try {
    const subRes = await fetch(
      `${url}/rest/v1/subscriptions?owner=eq.${encodeURIComponent(userId)}&select=is_subscriber,subscription_end,is_vip`,
      { headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey } }
    );
    if (!subRes.ok) return { ok: false, status: 502, error: "تعذّر التحقق من اشتراكك الآن، حاول مرة أخرى." };
    const rows = await subRes.json();
    const sub = Array.isArray(rows) ? rows[0] : rows;
    const today = new Date().toISOString().slice(0, 10);
    const active = !!sub && (sub.is_vip === true || (sub.is_subscriber === true && sub.subscription_end && sub.subscription_end >= today));
    if (!active) return { ok: false, status: 403, error: "هذه الميزة متاحة لمشتركي مسار الكامل. اشترك الآن لتفعيلها." };
    return { ok: true };
  } catch (e) {
    console.error("[gemini] subscription check failed:", e);
    return { ok: false, status: 502, error: "تعذّر التحقق من اشتراكك الآن، حاول مرة أخرى." };
  }
}

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

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const gate = await requireActiveSubscriber(accessToken);
  if (!gate.ok) {
    return {
      statusCode: gate.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: gate.error }),
    };
  }

  // This endpoint is reachable directly (not only from the app's own UI),
  // so it must not be usable as a free unrestricted Gemini passthrough with
  // our key. Cap the raw request size before even parsing it — no
  // legitimate text-only prompt this app builds gets close to this. Raised
  // from 60KB to accommodate the meal-photo feature (نتيجة تصوير الوجبة),
  // which sends a base64-encoded, client-side-compressed JPEG (resized to
  // ~1024px, so typically well under 1MB as base64) inside the same
  // request body — 5MB stays comfortably under Netlify/Lambda's ~6MB
  // request payload ceiling while still blocking abuse of this endpoint
  // as an arbitrary large-payload passthrough.
  const MAX_BODY_BYTES = 5_000_000;
  if ((event.body || "").length > MAX_BODY_BYTES) {
    return {
      statusCode: 413,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "الطلب كبير جداً" }),
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

  if (!Array.isArray(payload.contents) || payload.contents.length === 0 || payload.contents.length > 50) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "طلب غير صالح" }),
    };
  }

  // Regardless of what the client asks for, never let a request generate
  // more than our own app ever needs — closes off using this key to run up
  // large, expensive completions through this endpoint.
  const MAX_OUTPUT_TOKENS_CEILING = 4096;
  const requestedTokens = payload.generationConfig?.maxOutputTokens;
  payload.generationConfig = {
    ...(payload.generationConfig || {}),
    maxOutputTokens: Math.max(1, Math.min(Number(requestedTokens) || 1024, MAX_OUTPUT_TOKENS_CEILING)),
  };

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

    // Full detail always goes to the Netlify function logs (Netlify UI ->
    // Functions -> gemini -> Logs). The client only ever gets a friendly
    // generic Arabic message, never Gemini's raw error text.
    if (!res.ok) {
      console.error(`[gemini] ${MODEL} -> HTTP ${res.status}:`, rawBody);
      const status = res.status === 429 ? 429 : res.status >= 500 ? 502 : 400;
      const friendly =
        res.status === 429
          ? "الطلبات كثيرة الآن، جرّب بعد قليل."
          : "تعذّر الاتصال بالمساعد الذكي الآن.";
      return {
        statusCode: status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: friendly }),
      };
    }

    console.log(`[gemini] ${MODEL} -> HTTP ${res.status} OK`);
    const candidate = data.candidates?.[0];
    // Thinking-capable models can return the internal reasoning as a
    // separate part (marked `thought: true`) before the real answer part —
    // only parts[0] would silently grab the thought instead of the answer.
    // Filter those out and join whatever text part(s) remain.
    const text = (candidate?.content?.parts || [])
      .filter((p) => p && !p.thought && typeof p.text === "string")
      .map((p) => p.text)
      .join("");
    const finishReason = candidate?.finishReason;
    if (!text) {
      // Empty text with a 200 OK almost always means the model's thinking
      // consumed the whole maxOutputTokens budget before it could write the
      // actual answer (finishReason "MAX_TOKENS" with no visible output).
      console.error(`[gemini] ${MODEL} -> empty text, finishReason=${finishReason}`, rawBody.slice(0, 500));
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "تعذّر الحصول على رد من المساعد الذكي الآن." }),
      };
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, finishReason }),
    };
  } catch (err) {
    console.error("[gemini] network/exception error:", err);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "تعذّر الاتصال بخدمة الذكاء الاصطناعي الآن." }),
    };
  }
};
