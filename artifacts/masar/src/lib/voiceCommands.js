// تفسير أوامر صوتية محدودة ومعروفة مسبقاً فقط (لا فهم لغة حرة، لا استنتاج
// نوايا من نص عشوائي) - نطاق ضيق ومقصود لضمان موثوقية حقيقية: كل أمر مدعوم
// مذكور صراحة في هذا الملف فقط، ولا وعد بفهم أي شيء خارج هذه القائمة.
// "مرونة" المطابقة هنا تعني قبول بضعة مرادفات معروفة مسبقاً لنفس الأمر
// (مثال: "روح للتغذية" أو "افتح التغذية" أو "التغذية" وحدها) وتوحيد بعض
// الفروق الإملائية السطحية في نتائج التعرّف الصوتي (تشكيل، أ/إ/آ، تاء
// مربوطة) - وليست فهماً لغوياً حراً بأي شكل.

import { parseJsonLoose } from "./helpers";

const NAV_PHRASES = {
  ar: {
    nutrition: ["روح للتغذية", "روح التغذية", "افتح التغذية", "التغذية"],
    fitness: ["روح للرياضة", "روح الرياضة", "افتح الرياضة", "الرياضة"],
    reports: ["روح للتقارير", "روح التقارير", "افتح التقارير", "التقارير"],
    goals: ["روح للأهداف", "روح الأهداف", "افتح الأهداف", "الأهداف"],
    tasks: ["روح للمهام", "روح المهام", "افتح المهام", "المهام"],
    // "التخصيص" هو الاسم الفعلي الظاهر في واجهة مسار لهذا القسم (nav.settings)
    // - يُدعم إلى جانب "الإعدادات" لأن المستخدم يقرأ الأول على الشاشة فعلياً.
    settings: ["روح للإعدادات", "روح الإعدادات", "افتح الإعدادات", "الإعدادات", "روح للتخصيص", "افتح التخصيص", "التخصيص"],
    today: ["روح لليوم", "روح اليوم", "الصفحة الرئيسية", "الرئيسية", "اليوم"],
  },
  en: {
    nutrition: ["go to nutrition", "open nutrition", "nutrition"],
    fitness: ["go to fitness", "open fitness", "fitness", "workout"],
    reports: ["go to reports", "open reports", "reports"],
    goals: ["go to goals", "open goals", "goals"],
    tasks: ["go to tasks", "open tasks", "tasks"],
    settings: ["go to settings", "open settings", "settings"],
    today: ["go to today", "home page", "home", "today"],
  },
};

const CONFIRM_PHRASES = {
  ar: ["تأكيد", "تاكيد", "احفظ", "موافق", "نعم"],
  en: ["confirm", "save", "yes", "ok"],
};

const WATER_PHRASES = {
  ar: ["أضف كوب ماء", "اضف كوب ماء", "سجل كوب ماء", "كوب ماء"],
  en: ["add a cup of water", "add cup of water", "log water", "add water"],
};

const LOG_FOOD_RE = {
  ar: /^سجل\s+(\d+(?:\.\d+)?)\s*(غرام|غم|جرام|مل|مليلتر)\s+(.+)$/,
  en: /^log\s+(\d+(?:\.\d+)?)\s*(grams?|g|ml|milliliters?)\s+(.+)$/i,
};

function normalize(text, lang) {
  let t = (text || "").trim().toLowerCase();
  if (lang !== "en") {
    t = t.replace(/[ً-ْ]/g, "").replace(/[إأآا]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  }
  return t.replace(/\s+/g, " ").trim();
}

function matchesAny(normalizedText, phrases, lang) {
  return phrases.some((p) => {
    const np = normalize(p, lang);
    return normalizedText === np || normalizedText.includes(np);
  });
}

// يحلّل نصاً واحداً (نتيجة SpeechRecognition) إلى كائن أمر مُبنيَن:
// { type: "navigate", view } | { type: "addWater" } | { type: "confirmSave" }
// | { type: "logFoodDraft", qty, unit, foodName } | { type: "unrecognized", raw }
export function parseVoiceCommand(rawText, lang) {
  const key = lang === "en" ? "en" : "ar";
  const text = normalize(rawText, key);
  if (!text) return { type: "unrecognized", raw: rawText };

  if (matchesAny(text, CONFIRM_PHRASES[key], key)) return { type: "confirmSave", raw: rawText };
  if (matchesAny(text, WATER_PHRASES[key], key)) return { type: "addWater", raw: rawText };

  // يُطابَق هنا على النص الخام (بعد تبسيط المسافات فقط، بلا أي استبدال
  // حروف/تشكيل) لا النص المُطبَّع - حتى يبقى اسم الطعام المُستخرَج (m[3])
  // بإملاء المستخدم الحقيقي كما نطقه المتعرِّف الصوتي فعلاً (مثال: "مكرونة"
  // تبقى بالتاء المربوطة، لا "مكرونه" التي كانت ستُنتَج لو طُبِّق التطبيع
  // نفسه المُستخدَم لمطابقة الأوامر الثابتة على النص الحر لاسم الطعام أيضاً).
  const rawTrimmed = (rawText || "").trim().replace(/\s+/g, " ");
  const m = rawTrimmed.match(LOG_FOOD_RE[key]);
  if (m) {
    const unit = /مل|مليلتر|ml|milliliter/.test(m[2]) ? "ml" : "g";
    return { type: "logFoodDraft", qty: m[1], unit, foodName: m[3].trim(), raw: rawText };
  }

  for (const [view, phrases] of Object.entries(NAV_PHRASES[key])) {
    if (matchesAny(text, phrases, key)) return { type: "navigate", view, raw: rawText };
  }

  return { type: "unrecognized", raw: rawText };
}

// ============ فهم ذكي بالـAI (Gemini) لأي صياغة حرة ============
// يُستخدَم فقط عندما تفشل المطابقة الثابتة أعلاه (مسار سريع مجاني بلا أي
// استدعاء شبكة يبقى أولاً دائماً لكل الأوامر الصريحة البسيطة) - راجع
// parseVoiceCommandSmart أدناه للتفاصيل الكاملة عن الترتيب والتكلفة.

const GEMINI_ACTIONS = new Set(["navigate", "add_water", "log_food", "confirm", "cancel", "unclear"]);
const GEMINI_TARGETS = new Set(["nutrition", "fitness", "reports", "goals", "tasks", "settings", "home"]);

function buildSmartPrompt(rawText, lang) {
  const escaped = String(rawText || "").replace(/"/g, '\\"');
  if (lang === "en") {
    return `Convert the following spoken voice command (real transcribed speech, may be phrased any way, in English or Arabic) into ONLY a structured JSON object representing the user's intent inside the "Masar" app. Return no extra text or markdown, in exactly this shape:
{"action":"navigate"|"add_water"|"log_food"|"confirm"|"cancel"|"unclear","target":"nutrition"|"fitness"|"reports"|"goals"|"tasks"|"settings"|"home"|null,"food_name":string|null,"quantity":number|null,"unit":"g"|"ml"|null}

Rules:
- "navigate": the user wants to open one of the 7 sections above only (target is required, all other fields null).
- "add_water": the user wants to log drinking a cup of water (all other fields null).
- "log_food": the user wants to log a specific amount of food (food_name, quantity, and unit as available; use unit="g" for a weight in grams, unit="ml" for a volume in milliliters; if no clear quantity or unit was said, use null instead of guessing).
- "confirm": the user is agreeing to a pending action (yes/confirm/save/ok and similar).
- "cancel": the user wants to cancel a pending action (no/cancel/never mind and similar).
- "unclear": it doesn't confidently match any of the above, is ambiguous, or is unrelated to the app entirely. Never guess an unclear intent - use "unclear" instead.

Spoken text: "${escaped}"

Return only a valid JSON object in exactly that shape, with no explanation.`;
  }
  return `حوّل الأمر الصوتي التالي (نص منطوق حقيقي من تعرّف صوتي، قد يكون بأي صياغة، عربياً أو إنجليزياً) إلى كائن JSON منظَّم فقط يمثّل نيّة المستخدم داخل تطبيق "مسار". بلا أي نص أو markdown إضافي، بهذا الشكل بالضبط:
{"action":"navigate"|"add_water"|"log_food"|"confirm"|"cancel"|"unclear","target":"nutrition"|"fitness"|"reports"|"goals"|"tasks"|"settings"|"home"|null,"food_name":string|null,"quantity":number|null,"unit":"g"|"ml"|null}

القواعد:
- "navigate": المستخدم يريد فتح أحد الأقسام السبعة أعلاه فقط (target إلزامي، بقية الحقول null).
- "add_water": المستخدم يريد تسجيل شربه كوب ماء (كل الحقول الأخرى null).
- "log_food": المستخدم يريد تسجيل كمية طعام محددة (food_name وquantity وunit قدر المتاح؛ استخدم unit="g" لوزن بالغرام، وunit="ml" لحجم بالمليلتر؛ إن لم تُذكر كمية أو وحدة واضحة استخدم null بدل التخمين).
- "confirm": المستخدم يوافق على تنفيذ إجراء معلَّق (نعم/تأكيد/احفظ وما شابه).
- "cancel": المستخدم يريد إلغاء إجراء معلَّق (لا/إلغاء/تراجع وما شابه).
- "unclear": لا يطابق أياً مما سبق بثقة كافية، أو غامض، أو غير متعلق بالتطبيق إطلاقاً. لا تخمين أبداً لنية غير واضحة - استخدم "unclear" بدلاً من ذلك.

النص المنطوق: "${escaped}"

أرجع فقط كائن JSON صالحاً بهذا الشكل بالضبط، بلا أي شرح.`;
}

// يتحقق من الشكل الفعلي لرد Gemini قبل الوثوق به إطلاقاً - أي انحراف عن
// المخطط الصارم (قيمة غير معروفة، كمية غير رقمية، اسم طعام فارغ...) يُعامَل
// كـ"unclear" بدل تنفيذ شيء غير متوقَّع؛ لا يُنفَّذ أي حقل من Gemini مباشرة
// بلا هذا التحقق.
export function adaptGeminiCommand(parsed, rawText) {
  if (!parsed || typeof parsed !== "object" || !GEMINI_ACTIONS.has(parsed.action)) {
    return { type: "unrecognized", raw: rawText };
  }
  if (parsed.action === "navigate") {
    if (!GEMINI_TARGETS.has(parsed.target)) return { type: "unrecognized", raw: rawText };
    const view = parsed.target === "home" ? "today" : parsed.target;
    return { type: "navigate", view, raw: rawText };
  }
  if (parsed.action === "add_water") return { type: "addWater", raw: rawText };
  if (parsed.action === "log_food") {
    const qty = Number(parsed.quantity);
    const foodName = typeof parsed.food_name === "string" ? parsed.food_name.trim() : "";
    if (!foodName || !Number.isFinite(qty) || qty <= 0) return { type: "unrecognized", raw: rawText };
    const unit = parsed.unit === "ml" ? "ml" : "g";
    return { type: "logFoodDraft", qty: String(qty), unit, foodName, raw: rawText };
  }
  if (parsed.action === "confirm") return { type: "confirmSave", raw: rawText };
  if (parsed.action === "cancel") return { type: "cancelPending", raw: rawText };
  return { type: "unrecognized", raw: rawText }; // "unclear" أو أي قيمة أخرى غير متوقعة
}

// نقطة الدخول الموصى بها: تجرّب المطابقة الثابتة الفورية أولاً دائماً (مسار
// سريع، مجاني، بلا أي زمن انتظار شبكة) - فقط إن فشلت (نص لم يطابق أي عبارة
// معروفة مسبقاً حرفياً) تلجأ لفهم Gemini الحر (allowAI فقط، عادة مقيَّد
// باشتراك مسار الكامل تماماً كباقي ميزات الذكاء الاصطناعي في التطبيق - نفس
// نقطة نهاية netlify/functions/gemini.js ونفس حارس الاشتراك فيها بلا أي
// تعديل عليها). أي خطأ في استدعاء Gemini (شبكة/حصة/عدم اشتراك) يُعاد فيه
// "unrecognized" بنفس رسالة النظام الثابت الأساسي - هذا هو "خط الاحتياط"
// المطلوب: الميزة الأساسية (الأوامر الثابتة) تستمر بالعمل حتى لو تعطّلت طبقة
// الذكاء الاصطناعي كلياً أو لم تكن الميزة الذكية متاحة لهذا المستخدم.
export async function parseVoiceCommandSmart(rawText, lang, { allowAI = false } = {}) {
  const fast = parseVoiceCommand(rawText, lang);
  if (fast.type !== "unrecognized") return fast;
  if (!allowAI) return { type: "unrecognized", raw: rawText, aiSkipped: true };
  try {
    const { geminiAnalyze } = await import("./gemini.js");
    const prompt = buildSmartPrompt(rawText, lang);
    // ميزانية أرمزة صغيرة جداً - الرد المتوقَّع كائن JSON قصير وحيد، لا أكثر
    // (نفس ميزانية estimateMicronutrientsAI لمهمة JSON قصيرة مشابهة تماماً).
    const text = await geminiAnalyze(prompt, 200);
    const parsed = parseJsonLoose(text);
    return adaptGeminiCommand(parsed, rawText);
  } catch (e) {
    console.error("[voiceCommands] AI understanding failed, falling back to the fixed-command system:", e);
    return { type: "unrecognized", raw: rawText, aiFailed: true };
  }
}
