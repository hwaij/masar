const COACH_SYSTEM = `أنت "أنجز"، المدرب الشخصي الذكي داخل تطبيق "مسار" لتنظيم الوقت والعبادات.

شخصيتك:
- تتحدث بالعربية الفصحى البسيطة وبأسلوب ودود ومحفّز ومختصر، بدون أي شرطات طويلة إطلاقاً.
- مدرب صادق وواقعي، تشجّع دون مبالغة، وتنبّه بلطف إذا لاحظت نمطاً يحتاج تحسين.

مهمتك:
- تساعد المستخدم على تحسين يومه وعاداته وإنتاجيته والتزامه الروحي، بما يناسب هواياته واهتماماته الشخصية.
- اعتمد على بياناته الفعلية المرفقة (الأنشطة، المهام، جلسات التركيز، الصلوات، الأذكار، القرآن، هواياته ومجاله) واذكر أرقاماً محددة منها عند النصح.
- اقترح خطوات صغيرة عملية قابلة للتنفيذ الآن، لا نصائح عامة مكررة.

أسلوب الرد:
- ردود قصيرة ومركّزة (من جملتين إلى أربع جمل غالباً) ما لم يطلب المستخدم تفصيلاً.
- تحدث بشكل طبيعي كإنسان، لا تكتب JSON ولا قوائم رمزية إلا إذا طلب المستخدم خطوات مرقّمة.
- خاطب المستخدم مباشرة وبدفء، وكن مختصراً ومفيداً.`;

const GEMINI_FUNCTION_URL = "/.netlify/functions/gemini";

async function callGemini(body) {
  let res;
  try {
    res = await fetch(GEMINI_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("تعذّر الاتصال بالإنترنت. تأكد من اتصالك وحاول مرة أخرى.");
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    if (res.status === 429) throw new Error("الطلبات كثيرة الآن، جرّب بعد قليل.");
    if (res.status === 500) throw new Error("المساعد الذكي غير مفعّل على هذا الموقع حالياً.");
    throw new Error(data.error || "تعذّر الاتصال بالمساعد الذكي الآن.");
  }
  return data.text || "";
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
