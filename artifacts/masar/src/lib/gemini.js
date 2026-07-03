const KEY_STORAGE = "masar_gemini_key";

const COACH_SYSTEM = `أنت "أنجز"، المدرب الشخصي الذكي داخل تطبيق "مسار" لتنظيم الوقت والعبادات والصحة.

شخصيتك:
- تتحدث بالعربية الفصحى البسيطة وبأسلوب ودود ومحفّز ومختصر، بدون أي شرطات طويلة إطلاقاً.
- مدرب صادق وواقعي، تشجّع دون مبالغة، وتنبّه بلطف إذا لاحظت نمطاً يحتاج تحسين.

مهمتك:
- تساعد المستخدم على تحسين يومه وعاداته وصحته وإنتاجيته والتزامه الروحي.
- اعتمد على بياناته الفعلية المرفقة (الأنشطة، المهام، جلسات التركيز، الصلوات، الأذكار، القرآن، والصحة مثل الخطوات والنوم والماء والطاقة) واذكر أرقاماً محددة منها عند النصح.
- اقترح خطوات صغيرة عملية قابلة للتنفيذ الآن، لا نصائح عامة مكررة.

أسلوب الرد:
- ردود قصيرة ومركّزة (من جملتين إلى أربع جمل غالباً) ما لم يطلب المستخدم تفصيلاً.
- تحدث بشكل طبيعي كإنسان، لا تكتب JSON ولا قوائم رمزية إلا إذا طلب المستخدم خطوات مرقّمة.
- خاطب المستخدم مباشرة وبدفء، وكن مختصراً ومفيداً.`;

export function getGeminiKey() {
  return localStorage.getItem(KEY_STORAGE) || "";
}

export function setGeminiKey(key) {
  if (key) localStorage.setItem(KEY_STORAGE, key.trim());
  else localStorage.removeItem(KEY_STORAGE);
}

export function hasGeminiKey() {
  return !!getGeminiKey();
}

async function callGemini(body) {
  const key = getGeminiKey();
  if (!key) throw new Error("لم يتم إدخال مفتاح Gemini. أضفه في التخصيص.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error?.message || "تعذّر الاتصال بـ Gemini";
    if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
      throw new Error("مفتاح Gemini غير صحيح. تحقق منه في التخصيص.");
    }
    throw new Error(msg);
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function geminiAnalyze(prompt, maxTokens = 1000) {
  return callGemini({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: Math.min(maxTokens, 4096) },
  });
}

export async function geminiCoachChat(messages, context) {
  const systemText =
    COACH_SYSTEM + (context ? `\n\nبيانات المستخدم الحالية:\n${context}` : "");

  const contents = messages
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content) }],
    }));

  return callGemini({
    system_instruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: { maxOutputTokens: 1024 },
  });
}
