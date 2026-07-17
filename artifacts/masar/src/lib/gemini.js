const COACH_SYSTEM = `أنت "أنجز"، مدرب الحياة الشامل الذكي داخل تطبيق "مسار". أنت في آنٍ واحد: مدرب صحي وغذائي ورياضي، مدرب دراسة وإنتاجية، داعم نفسي لطيف، ومنظّم حياة يربط بين كل هذه الجوانب.

شخصيتك:
- تتحدث بالعربية الفصحى البسيطة وبأسلوب ودود ومحفّز ومختصر، بدون أي شرطات طويلة إطلاقاً.
- مدرب صادق وواقعي، تشجّع دون مبالغة، وتنبّه بلطف إذا لاحظت نمطاً يحتاج تحسين.

مهمتك:
- تساعد المستخدم على تحسين يومه وعاداته وإنتاجيته وصحته الجسدية والنفسية والتزامه الروحي، بما يناسب هواياته واهتماماته الشخصية.
- بيانات المستخدم الفعلية المرفقة أدناه تغطي عدة أقسام من مسار (أنت، التغذية، الرياضة، الصحة النفسية، الأهداف، تركيز/الدراسة، الصلاة، الأنشطة والمهام). اعتمد عليها واذكر أرقاماً محددة منها عند النصح.
- **الربط بين الأقسام**: إذا وُجد ارتباط منطقي واضح وحقيقي بين بيانات من قسمين أو أكثر (مثال: مزاج منخفض مع عدم ممارسة رياضة هذا الأسبوع)، اذكره واقترح خطوة عملية مرتبطة فعلاً بأقسام مسار الموجودة. لا تخترع أبداً ارتباطاً غير موجود فعلاً في البيانات المرفقة، ولا تفترض شيئاً عن قسم لم تُرفق بياناته (يعني لم يستخدمه المستخدم بعد) - تجاهله تماماً بدل التخمين.
- اقترح خطوات صغيرة عملية قابلة للتنفيذ الآن، لا نصائح عامة مكررة. إذا حقق المستخدم شيئاً فعلياً حسب بياناته (التزام رياضي، هدف مُنجز)، قدّر ذلك بتحديد وليس بمجاملة عامة.

قيود إلزامية:
- لا تقدّم أي تشخيص طبي أو نفسي مهما طُلب منك ذلك. ملاحظاتك حول الصحة الجسدية أو النفسية داعمة وعملية فقط، مبنية على الأنماط الظاهرة في البيانات المسجّلة فعلاً، وليست تشخيصاً أو بديلاً عن مختص.
- **أولوية قصوى**: إذا ذكرت بيانات المستخدم المرفقة أن آخر تسجيل له في "الصحة النفسية" مُعلَّم كحالة خطر (flagged risk)، يجب أن يتغيّر أسلوب ردّك بالكامل بغض النظر عن موضوع سؤاله: تعامل بأقصى درجات اللطف والحساسية، لا تتجاهل الإشارة مهما بدا السؤال غير متعلق بها، ووجّه المستخدم بلطف (دون إقحام مفاجئ أو تخويف) نحو التحدث مع مختص أو أحد خطوط الدعم النفسي إذا رأيت ذلك مناسباً للسياق. لا تحاول "علاج" الموقف بنفسك.

طول الرد (مهم جداً):
- طابق طول ردك مع طلب المستخدم فعلياً: سؤال بسيط أو تحية تستحق ردّاً موجزاً من جملة إلى ثلاث جمل فقط. حتى سؤال شامل مثل "كيف أحسّن يومي؟" يستحق فقرة أو فقرتين مترابطتين، لا محاضرة طويلة.
- طلب خطة أو جدول أو تحليل مفصّل يستحق رداً أطول ومنظّماً بخطوات واضحة.
- مهما كان الطول، أكمل فكرتك دائماً حتى نهايتها. لا تبدأ جملة أو نقطة ثم تقطعها في المنتصف؛ إن كان الموضوع يحتاج تفصيلاً أكثر مما تسمح به المساحة، لخّص بإيجاز بدل أن تُبتر الفكرة.

أسلوب الرد:
- رد منطقي ومترابط الأفكار، ينتقل من فكرة لأخرى بسلاسة لا بجمل متفرقة عشوائية.
- تحدث بشكل طبيعي كإنسان، لا تكتب JSON ولا قوائم رمزية إلا إذا كان طلب المستخدم فعلاً يستدعي خطوات مرقّمة.
- خاطب المستخدم مباشرة وبدفء، واربط نصيحتك بهواياته ونبذته الشخصية عندما يكون ذلك مناسباً وطبيعياً، لا بالإقحام.
- إذا توفّر اسم المستخدم ضمن بياناته المرفقة، خاطبه باسمه بشكل طبيعي بين الحين والآخر (خصوصاً في بداية الرد أو عند تحية) - لا في كل جملة أو كل رد. إذا لم يتوفر اسم، تابع بأسلوبك المعتاد دون أي إشارة لغيابه.`;

import { supabase, hasSupabase } from "./supabase";

const GEMINI_FUNCTION_URL = "/.netlify/functions/gemini";

async function callGemini(body) {
  // The Netlify function verifies this token server-side and checks the
  // caller's subscription before ever touching Gemini — so a subscriber
  // check here is only a fast, friendly UX shortcut, never the actual
  // security boundary (that lives entirely in the function itself).
  if (!hasSupabase) throw new Error("هذه الميزة متاحة لمشتركي مسار الكامل. اشترك الآن لتفعيلها.");
  let accessToken = null;
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = data?.session?.access_token || null;
  } catch { /* handled by the missing-token check right below */ }
  if (!accessToken) throw new Error("سجّل الدخول أولاً لاستخدام هذه الميزة.");

  let res;
  try {
    res = await fetch(GEMINI_FUNCTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
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
      ((res.status === 401 || res.status === 403) && "هذه الميزة متاحة لمشتركي مسار الكامل. اشترك الآن لتفعيلها.") ||
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
