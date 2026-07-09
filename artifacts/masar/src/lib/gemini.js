const COACH_SYSTEM = `أنت "أنجز"، المدرب الشخصي الذكي داخل تطبيق "مسار" لتنظيم الوقت والعبادات.

شخصيتك:
- تتحدث بالعربية الفصحى البسيطة وبأسلوب ودود ومحفّز ومختصر، بدون أي شرطات طويلة إطلاقاً.
- مدرب صادق وواقعي، تشجّع دون مبالغة، وتنبّه بلطف إذا لاحظت نمطاً يحتاج تحسين.

مهمتك:
- تساعد المستخدم على تحسين يومه وعاداته وإنتاجيته والتزامه الروحي، بما يناسب هواياته واهتماماته الشخصية.
- اعتمد على بياناته الفعلية المرفقة (الأنشطة، المهام، جلسات التركيز، الصلوات، الأذكار، القرآن، هواياته ومجاله) واذكر أرقاماً محددة منها عند النصح.
- اقترح خطوات صغيرة عملية قابلة للتنفيذ الآن، لا نصائح عامة مكررة.

طول الرد (مهم جداً):
- طابق طول ردك مع طلب المستخدم فعلياً: سؤال بسيط أو تحية تستحق ردّاً موجزاً من جملة إلى ثلاث جمل فقط.
- طلب خطة أو جدول أو تحليل مفصّل يستحق رداً أطول ومنظّماً بخطوات واضحة.
- مهما كان الطول، أكمل فكرتك دائماً حتى نهايتها. لا تبدأ جملة أو نقطة ثم تقطعها في المنتصف؛ إن كان الموضوع يحتاج تفصيلاً أكثر مما تسمح به المساحة، لخّص بإيجاز بدل أن تُبتر الفكرة.

أسلوب الرد:
- رد منطقي ومترابط الأفكار، ينتقل من فكرة لأخرى بسلاسة لا بجمل متفرقة عشوائية.
- تحدث بشكل طبيعي كإنسان، لا تكتب JSON ولا قوائم رمزية إلا إذا كان طلب المستخدم فعلاً يستدعي خطوات مرقّمة.
- خاطب المستخدم مباشرة وبدفء، واربط نصيحتك بهواياته ونبذته الشخصية عندما يكون ذلك مناسباً وطبيعياً، لا بالإقحام.`;

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
    // TEMP DIAGNOSTIC (remove once the AI-everywhere regression is
    // confirmed fixed): log the real upstream status/body to the console
    // so we can see exactly what Gemini is rejecting instead of guessing.
    console.error("[gemini] request failed:", res.status, data);
    const err = new Error(
      (res.status === 429 && "الطلبات كثيرة الآن، جرّب بعد قليل.") ||
      (res.status === 500 && "المساعد الذكي غير مفعّل على هذا الموقع حالياً.") ||
      data.error ||
      "تعذّر الاتصال بالمساعد الذكي الآن.",
    );
    err.debug = data.debug;
    throw err;
  }
  return data.text || "";
}

export async function geminiAnalyze(prompt, maxTokens = 1000) {
  return callGemini({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    // thinkingBudget: 0 disables the model's internal "thinking" pass.
    // Thinking tokens are counted against maxOutputTokens, and for a
    // structured-JSON prompt like this one the model was spending most of
    // the budget reasoning internally before writing any of the actual
    // JSON, so the visible output kept coming back empty/truncated no
    // matter how high maxOutputTokens was raised. This task doesn't need
    // deliberation, just direct formatted output.
    generationConfig: {
      maxOutputTokens: Math.min(maxTokens, 4096),
      thinkingConfig: { thinkingBudget: 0 },
    },
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
    // Same reasoning as geminiAnalyze: thinking tokens count against
    // maxOutputTokens and can consume most of a small budget before any
    // visible reply is written, which is what was cutting replies short.
    // Disable thinking and give a generous ceiling so both short answers
    // and longer, detailed plans finish completely.
    generationConfig: {
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
}
