// تفسير أوامر صوتية إلى نيّات (Intents) مُبنينة، بمسارين متكاملين لا متناقضين:
// (1) مطابقة نصية فورية مجانية لعبارات/أنماط معروفة مسبقاً (مسار سريع، يعمل
// بلا اشتراك ولا اتصال شبكة، ويغطي الصياغات الشائعة الأكثر ترجيحاً)، و(2) فهم
// حر بـGemini لأي صياغة طبيعية أخرى (اشتراك مسار الكامل، انظر parseVoiceCommandSmart
// أسفل الملف). هذا ليس "نظاماً يدّعي فهم كل شيء 100%" - المسار الأول محدود
// بتصميم عمدي (سرعة/مجانية/موثوقية)، والمسار الثاني محدود بحدود Gemini نفسه
// وبحدود إعادة التعرّف الصوتي في المتصفح أصلاً (SpeechRecognition) - كلا
// الحدين موثَّقان بصدق في تقرير المهمة، لا يُخفيان هنا.

import { parseJsonLoose } from "./helpers";

// ============ التنقّل: كل الأقسام الحقيقية القابلة للفتح في مسار ============
// القائمة الكاملة الفعلية من SideMenu.jsx (MENU_SECTIONS) - لا قسم وهمي، ولا
// نسيان لقسم حقيقي. "today" ليس عنصر قائمة فعلياً (هو الشاشة الافتراضية) لكنه
// مُبقًى كوجهة صوتية لأن "الصفحة الرئيسية" طلب طبيعي جداً.
const NAV_PHRASES = {
  ar: {
    today: ["روح لليوم", "روح اليوم", "الصفحة الرئيسية", "رجعني للرئيسية", "ارجعني للرئيسية", "الرئيسية", "اليوم"],
    prayer: ["روح للصلاة", "افتح الصلاة", "قسم الصلاة", "تتبع الصلاة"],
    adhkar: ["روح للأذكار", "افتح الأذكار", "الأذكار"],
    tips: ["روح لبصيرة", "افتح بصيرة", "بصيرة", "الحكمة"],
    you: ["روح لأنت", "افتح أنت", "قسم أنت", "بياناتي الصحية"],
    nutrition: ["روح للتغذية", "روح التغذية", "افتح التغذية", "التغذية"],
    nutritionPlan: ["روح للنظام الغذائي", "افتح النظام الغذائي", "النظام الغذائي", "خطة التغذية"],
    dietPlans: ["روح للأنظمة الغذائية", "افتح الأنظمة الغذائية", "الأنظمة الغذائية"],
    fitness: ["روح للرياضة", "روح الرياضة", "افتح الرياضة", "الرياضة"],
    focus: ["روح للتركيز", "افتح التركيز", "تركيز", "الدراسة"],
    tasks: ["روح للمهام", "روح المهام", "افتح المهام", "المهام"],
    goals: ["روح للأهداف", "روح الأهداف", "افتح الأهداف", "الأهداف"],
    vault: ["روح للخزنة", "افتح الخزنة", "الخزنة"],
    reports: ["روح للتقارير", "روح التقارير", "افتح التقارير", "التقارير"],
    groups: ["روح للمجتمع", "افتح تحديات الأصدقاء", "تحديات الأصدقاء", "المجتمع"],
    assistant: ["روح للمساعد", "افتح المساعد", "المساعد الذكي", "مساعد"],
    achieve: ["روح لأنجز", "افتح أنجز", "أنجز"],
    // "التخصيص" هو الاسم الفعلي الظاهر في واجهة مسار لهذا القسم (nav.settings)
    // - يُدعم إلى جانب "الإعدادات" لأن المستخدم يقرأ الأول على الشاشة فعلياً.
    settings: ["روح للإعدادات", "روح الإعدادات", "افتح الإعدادات", "الإعدادات", "روح للتخصيص", "افتح التخصيص", "التخصيص"],
  },
  en: {
    today: ["go to today", "home page", "take me home", "home", "today"],
    prayer: ["go to prayer", "open prayer", "prayer tracker", "prayer"],
    adhkar: ["go to adhkar", "open adhkar", "adhkar", "remembrance"],
    tips: ["go to wisdom", "open wisdom", "wisdom", "daily wisdom"],
    you: ["go to you", "open you", "my health profile"],
    nutrition: ["go to nutrition", "open nutrition", "nutrition"],
    nutritionPlan: ["go to nutrition plan", "open nutrition plan", "nutrition plan", "diet plan"],
    dietPlans: ["go to diet plans", "open diet plans", "diet plans"],
    fitness: ["go to fitness", "open fitness", "fitness", "workout"],
    focus: ["go to focus", "open focus", "focus", "study"],
    tasks: ["go to tasks", "open tasks", "tasks"],
    goals: ["go to goals", "open goals", "goals"],
    vault: ["go to vault", "open my vault", "open vault", "vault"],
    reports: ["go to reports", "open reports", "show my reports", "reports"],
    groups: ["go to groups", "open friend challenges", "friend challenges", "community"],
    assistant: ["go to assistant", "open assistant", "ai assistant", "assistant"],
    achieve: ["go to achieve", "open achieve", "achieve"],
    settings: ["go to settings", "open settings", "settings"],
  },
};

const CONFIRM_PHRASES = {
  ar: ["تأكيد", "تاكيد", "احفظ", "موافق", "نعم", "إي", "اي", "أكيد", "اكيد", "ايوه", "إيه"],
  en: ["confirm", "save", "yes", "ok", "yep", "sure", "yeah"],
};

const CANCEL_PHRASES = {
  ar: ["لا تسجل", "لا تحفظ", "إلغاء", "الغاء", "تراجع", "كنسل", "لا شكراً", "لا"],
  en: ["cancel", "never mind", "nevermind", "no thanks", "don't save", "no"],
};

const WATER_PHRASES = {
  ar: ["أضف كوب ماء", "اضف كوب ماء", "سجل كوب ماء", "كوب ماء"],
  en: ["add a cup of water", "add cup of water", "log water", "add water"],
};

// إنهاء جلسة الاستماع المستمرة (انظر MasarApp.jsx) - كلمات قصيرة عمداً
// كما اقتُرحت، بنفس هامش المخاطرة المقبول أصلاً لكلمات قصيرة أخرى في هذا
// الملف (مثل "yes"/"ok" ضمن CONFIRM_PHRASES): قد تُطابَق خطأً داخل جملة
// أطول غير متعلقة، لكن نطاق الاستخدام هنا (أمر صوتي قصير مقصود) يجعل هذا
// مقبولاً، تماماً كبقية القائمة.
const END_SESSION_PHRASES = {
  ar: ["خلاص", "إيقاف الاستماع", "أوقف الاستماع", "انتهيت", "كفى", "إيقاف", "اقفل المساعد"],
  en: ["stop listening", "end session", "that's all", "close assistant", "stop", "done"],
};

// قراءة الوضع الغذائي الحقيقي اليوم (نفس دالة readStatusAloud الموجودة فعلاً
// في NutritionView.jsx - لا حساب مواز جديد هنا، هذا الملف يُنتج فقط نوع
// الأمر "readStatus" الذي يُوجَّه لتلك الدالة نفسها).
const READ_STATUS_PHRASES = {
  ar: ["اقرأ لي وضعي اليوم", "اقرأ وضعي اليوم", "كم أكلت اليوم", "شنو أكلت اليوم", "وش أكلت اليوم", "وضعي اليوم"],
  en: ["read my status", "read my status today", "how many calories do i have left", "what have i eaten today"],
};

// قراءة نصيحة اليوم المعروضة فعلياً (dailyTip state في MasarApp.jsx) - نص
// حقيقي مُراجَع مسبقاً من lib/tips.js، لا نص مُختلَق.
const READ_TIP_PHRASES = {
  ar: ["اقرأ نصيحة اليوم", "اقرأ لي النصيحة", "شنو نصيحة اليوم", "اقرأ البصيرة"],
  en: ["read the tip", "read today's tip", "read my daily tip", "what's the tip today"],
};

// "اقرأ الصفحة" - يُعيد استخدام آلية القراءة الموجودة فعلاً لكل قسم (نفس نص
// speech.sections.<قسم> المُراجَع مسبقاً والمستخدَم أصلاً للقراءة التلقائية
// عند الدخول وزر "أعد القراءة") - لا قراءة عشوائية لعناصر DOM تقنية.
const READ_PAGE_PHRASES = {
  ar: ["اقرأ لي الصفحة", "اقرأ الصفحة", "اقرأ الموجود", "شنو مكتوب هنا", "اقرأ كل شيء", "اقرأ هذا"],
  en: ["read this page", "read the page", "read this", "what's on this screen", "read everything"],
};

// تسجيل صلاة منجَزة - يتطلب استخراج اسم الصلاة (fajr/dhuhr/asr/maghrib/isha)
// من النص، لا مجرد مطابقة عبارة ثابتة كاملة (النطاق هنا أوسع قليلاً من بقية
// هذا الملف عمداً، لأن "سجل صلاة الظهر" و"سجل أني صليت الظهر" و"صليت الظهر"
// كلها صياغات شائعة جداً تستحق تغطية مباشرة بلا اللجوء لـGemini في كل مرة).
const PRAYER_TRIGGER_WORDS = { ar: ["صلاة", "صليت", "صلّيت"], en: ["prayer", "pray", "prayed"] };
const PRAYER_NAMES = {
  ar: { fajr: ["الفجر", "فجر"], dhuhr: ["الظهر", "ظهر"], asr: ["العصر", "عصر"], maghrib: ["المغرب", "مغرب"], isha: ["العشاء", "عشاء"] },
  en: { fajr: ["fajr"], dhuhr: ["dhuhr", "noon prayer"], asr: ["asr"], maghrib: ["maghrib", "sunset prayer"], isha: ["isha", "night prayer"] },
};
const NEXT_PRAYER_PHRASES = {
  ar: ["الصلاة الجاية", "الصلاة القادمة", "شنو الصلاة الجاية", "متى الصلاة الجاية", "متى الصلاة القادمة"],
  en: ["next prayer", "what's the next prayer", "when is the next prayer"],
};
const PRAYER_TIME_QUERY_WORDS = { ar: ["متى", "وقت"], en: ["when", "what time"] };

function normalize(text, lang) {
  let t = (text || "").trim().toLowerCase();
  if (lang !== "en") {
    t = t.replace(/[ً-ْ]/g, "").replace(/[إأآا]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  }
  return t.replace(/\s+/g, " ").trim();
}

function tokenize(s) {
  return s.split(" ").filter(Boolean);
}

// مطابقة على حدود كلمات كاملة (توكِنات مفصولة بمسافة)، لا احتواء نص خام -
// ضروري بعد إضافة كلمات إلغاء قصيرة جداً مثل "لا" (عربي) و"no" (إنجليزي):
// مطابقة substring ساذجة كانت لتُطابق "لا" داخل كلمة "طويلاً" (بعد إزالة
// التشكيل: "طويلا" تنتهي بحرفي "لا" تماماً) رغم أنها لا تعني إلغاءً إطلاقاً.
// هذه الدالة تبحث عن تسلسل توكِنات العبارة كاملاً متتالياً داخل توكِنات
// النص، فتبقى المرونة نفسها (عبارة مضمَّنة داخل جملة أطول) بلا هذا الخطر.
function matchesAny(normalizedText, phrases, lang) {
  const textTokens = tokenize(normalizedText);
  return phrases.some((p) => {
    const pTokens = tokenize(normalize(p, lang));
    if (pTokens.length === 0 || pTokens.length > textTokens.length) return false;
    for (let i = 0; i <= textTokens.length - pTokens.length; i++) {
      if (pTokens.every((tok, j) => textTokens[i + j] === tok)) return true;
    }
    return false;
  });
}

function findPrayerId(normalizedText, key) {
  for (const [id, names] of Object.entries(PRAYER_NAMES[key])) {
    if (matchesAny(normalizedText, names, key)) return id;
  }
  return null;
}

const LOG_FOOD_RE = {
  ar: /^سجل\s+(\d+(?:\.\d+)?)\s*(غرام|غم|جرام|مل|مليلتر)\s+(.+)$/,
  en: /^log\s+(\d+(?:\.\d+)?)\s*(grams?|g|ml|milliliters?)\s+(.+)$/i,
};

// نمط ثانٍ: كمية معدودة بلا وحدة وزن/حجم (بيضتان، تفاحتان، "2 بيضة"...) -
// أي رقم صريح غير متبوع مباشرة بكلمة وزن/حجم معروفة يُعامَل كـ"قطعة" (unit
// الموجودة فعلاً في UNIT_OPTIONS بـlib/nutrition.js). صياغات عربية بلا رقم
// صريح إطلاقاً (المثال المذكور فعلياً: "أكلت بيضتين" بصيغة المثنى بلا رقم
// مكتوب) تتجاوز هذا النمط بتصميم - نطاق regex الثابت لا يمتد لتصريف الأسماء
// العربي، وهذا بالضبط الموضع الذي يُترَك فيه العمل لفهم Gemini الحر (انظر
// أسفل الملف)، لا محاولة اختراع قواعد صرفية هشة هنا.
const LOG_FOOD_COUNT_RE = {
  ar: /^سجل\s+(\d+(?:\.\d+)?)\s+(?!غرام|غم|جرام|مل|مليلتر)(.+)$/,
  en: /^log\s+(\d+(?:\.\d+)?)\s+(?!grams?\b|g\b|ml\b|milliliters?\b)(.+)$/i,
};

// يحلّل نصاً واحداً (نتيجة SpeechRecognition) إلى كائن أمر مُبنيَن:
// { type: "navigate", view } | { type: "addWater" } | { type: "confirmSave" }
// | { type: "cancelPending" } | { type: "endSession" } | { type: "readStatus" }
// | { type: "readTip" } | { type: "readPage" } | { type: "logPrayer", prayerId }
// | { type: "nextPrayerQuery" } | { type: "prayerTimeQuery", prayerId }
// | { type: "logFoodDraft", qty, unit, foodName } | { type: "unrecognized", raw }
export function parseVoiceCommand(rawText, lang) {
  const key = lang === "en" ? "en" : "ar";
  const text = normalize(rawText, key);
  if (!text) return { type: "unrecognized", raw: rawText };

  if (matchesAny(text, END_SESSION_PHRASES[key], key)) return { type: "endSession", raw: rawText };
  if (matchesAny(text, CONFIRM_PHRASES[key], key)) return { type: "confirmSave", raw: rawText };
  if (matchesAny(text, CANCEL_PHRASES[key], key)) return { type: "cancelPending", raw: rawText };
  if (matchesAny(text, WATER_PHRASES[key], key)) return { type: "addWater", raw: rawText };
  if (matchesAny(text, READ_STATUS_PHRASES[key], key)) return { type: "readStatus", raw: rawText };
  if (matchesAny(text, READ_TIP_PHRASES[key], key)) return { type: "readTip", raw: rawText };
  if (matchesAny(text, READ_PAGE_PHRASES[key], key)) return { type: "readPage", raw: rawText };

  // الصلاة: كلمة مشغِّلة (صلاة/صليت أو prayer/pray) + اسم صلاة صريح = تسجيل.
  if (matchesAny(text, PRAYER_TRIGGER_WORDS[key], key)) {
    const prayerId = findPrayerId(text, key);
    if (prayerId) {
      const isTimeQuery = matchesAny(text, PRAYER_TIME_QUERY_WORDS[key], key);
      return isTimeQuery
        ? { type: "prayerTimeQuery", prayerId, raw: rawText }
        : { type: "logPrayer", prayerId, raw: rawText };
    }
  }
  if (matchesAny(text, NEXT_PRAYER_PHRASES[key], key)) return { type: "nextPrayerQuery", raw: rawText };

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
  const mCount = rawTrimmed.match(LOG_FOOD_COUNT_RE[key]);
  if (mCount) {
    return { type: "logFoodDraft", qty: mCount[1], unit: "piece", foodName: mCount[2].trim(), raw: rawText };
  }

  for (const [view, phrases] of Object.entries(NAV_PHRASES[key])) {
    if (matchesAny(text, phrases, key)) return { type: "navigate", view, raw: rawText };
  }

  return { type: "unrecognized", raw: rawText };
}

// ============ فهم ذكي بالـAI (Gemini) لأي صياغة حرة ============
// يُستخدَم فقط عندما تفشل المطابقة الثابتة أعلاه (مسار سريع مجاني بلا أي
// استدعاء شبكة يبقى أولاً دائماً لكل الأوامر الصريحة البسيطة) - راجع
// parseVoiceCommandSmart أدناه للتفاصيل الكاملة عن الترتيب والتكلفة. هذا هو
// الموضع المناسب لصياغات مثل "أكلت بيضتين" أو "خل نسجل البيض" أو "يا مسار
// أنا توني متغدي دجاج ورز" - تراكيب حرة لا يعقل تغطيتها بقوائم عبارات ثابتة.
const GEMINI_ACTIONS = new Set([
  "navigate", "add_water", "log_food", "confirm", "cancel", "end_session",
  "read_status", "read_tip", "read_page", "log_prayer", "next_prayer_query", "prayer_time_query",
  "unclear",
]);
const GEMINI_TARGETS = new Set([
  "today", "prayer", "adhkar", "tips", "you", "nutrition", "nutritionPlan", "dietPlans",
  "fitness", "focus", "tasks", "goals", "vault", "reports", "groups", "assistant", "achieve", "settings", "home",
]);
const GEMINI_PRAYERS = new Set(["fajr", "dhuhr", "asr", "maghrib", "isha"]);

function buildSmartPrompt(rawText, lang) {
  const escaped = String(rawText || "").replace(/"/g, '\\"');
  const shape = `{"action":"navigate"|"add_water"|"log_food"|"confirm"|"cancel"|"end_session"|"read_status"|"read_tip"|"read_page"|"log_prayer"|"next_prayer_query"|"prayer_time_query"|"unclear","target":"today"|"prayer"|"adhkar"|"tips"|"you"|"nutrition"|"nutritionPlan"|"dietPlans"|"fitness"|"focus"|"tasks"|"goals"|"vault"|"reports"|"groups"|"assistant"|"achieve"|"settings"|"home"|null,"food_name":string|null,"quantity":number|null,"unit":"g"|"ml"|"piece"|null,"prayer":"fajr"|"dhuhr"|"asr"|"maghrib"|"isha"|null}`;
  if (lang === "en") {
    return `Convert the following spoken voice command (real transcribed speech, may be phrased any way, in English or Arabic, any Arabic dialect) into ONLY a structured JSON object representing the user's intent inside the "Masar" app (a personal wellbeing app covering nutrition, fitness, prayer, remembrance/adhkar, tasks, goals, a personal finance vault, reports, focus/study, and an AI assistant). Return no extra text or markdown, in exactly this shape:
${shape}

Rules:
- "navigate": open one of the sections above (target required).
- "add_water": log drinking a cup of water.
- "log_food": log a specific food. Extract food_name always. For quantity+unit: use unit="g" for a weight in grams, "ml" for a volume in milliliters, "piece" for a plain count of items with no weight/volume mentioned (e.g. "two eggs" -> quantity:2, unit:"piece"; "a sandwich" with no number -> quantity:1, unit:"piece"). Never guess a specific gram weight for a counted item - use "piece" instead.
- "confirm": the user agrees to a pending action (yes/confirm/save/ok/sure and similar, in any phrasing).
- "cancel": the user rejects a pending action (no/cancel/never mind and similar).
- "end_session": the user wants to stop the whole voice session, not just cancel one action (stop/done/that's all/close assistant).
- "read_status": the user asks to hear their real logged nutrition status today (calories/water), not a general question.
- "read_tip": the user asks to hear today's tip/wisdom.
- "read_page": the user asks to have the current screen's content read aloud.
- "log_prayer": the user reports having prayed a specific prayer (prayer field required: fajr/dhuhr/asr/maghrib/isha).
- "next_prayer_query": the user asks what/when the next prayer is.
- "prayer_time_query": the user asks for a SPECIFIC prayer's time (prayer field required).
- "unclear": doesn't confidently match any of the above, is ambiguous, or unrelated to the app. Never guess an unclear intent.

Spoken text: "${escaped}"

Return only a valid JSON object in exactly that shape, with no explanation.`;
  }
  return `حوّل الأمر الصوتي التالي (نص منطوق حقيقي من تعرّف صوتي، قد يكون بأي صياغة أو لهجة عربية، أو إنجليزياً) إلى كائن JSON منظَّم فقط يمثّل نيّة المستخدم داخل تطبيق "مسار" (تطبيق شامل للعناية بالحياة اليومية: التغذية، الرياضة، الصلاة، الأذكار، المهام، الأهداف، خزنة مالية شخصية، التقارير، التركيز/الدراسة، ومساعد ذكي). بلا أي نص أو markdown إضافي، بهذا الشكل بالضبط:
${shape}

القواعد:
- "navigate": فتح أحد الأقسام أعلاه (target إلزامي).
- "add_water": تسجيل شرب كوب ماء.
- "log_food": تسجيل صنف طعام محدد. استخرج food_name دائماً. للكمية والوحدة: استخدم unit="g" لوزن بالغرام، "ml" لحجم بالمليلتر، "piece" لعدد بلا وزن أو حجم مذكور (مثال: "بيضتين" أو "أكلت بيضتين" -> quantity:2, unit:"piece"؛ "ساندويتش" بلا رقم -> quantity:1, unit:"piece"). لا تخترع وزناً بالغرام لصنف مُعدود - استخدم "piece" بدلاً من ذلك.
- "confirm": المستخدم يوافق على إجراء معلَّق (نعم/تأكيد/احفظ/موافق/أكيد وما شابه، بأي صياغة).
- "cancel": المستخدم يرفض إجراء معلَّق (لا/إلغاء/تراجع وما شابه).
- "end_session": المستخدم يريد إنهاء كامل الجلسة، لا إلغاء إجراء واحد فقط (خلاص/إيقاف/انتهيت/كفى).
- "read_status": المستخدم يطلب سماع وضعه الغذائي الحقيقي المسجَّل اليوم (سعرات/ماء)، لا سؤالاً عاماً.
- "read_tip": المستخدم يطلب سماع نصيحة/بصيرة اليوم.
- "read_page": المستخدم يطلب قراءة محتوى الشاشة الحالية بصوت مرتفع.
- "log_prayer": المستخدم يُخبر أنه صلّى صلاة محددة (حقل prayer إلزامي: fajr/dhuhr/asr/maghrib/isha).
- "next_prayer_query": المستخدم يسأل عن الصلاة القادمة أو موعدها.
- "prayer_time_query": المستخدم يسأل عن وقت صلاة محددة بعينها (حقل prayer إلزامي).
- "unclear": لا يطابق أياً مما سبق بثقة كافية، أو غامض، أو غير متعلق بالتطبيق إطلاقاً. لا تخمين أبداً لنية غير واضحة.

النص المنطوق: "${escaped}"

أرجع فقط كائن JSON صالحاً بهذا الشكل بالضبط، بلا أي شرح.`;
}

// يتحقق من الشكل الفعلي لرد Gemini قبل الوثوق به إطلاقاً - أي انحراف عن
// المخطط الصارم (قيمة غير معروفة، كمية غير رقمية، اسم طعام فارغ، اسم صلاة
// غير صحيح...) يُعامَل كـ"unclear" بدل تنفيذ شيء غير متوقَّع؛ لا يُنفَّذ أي
// حقل من Gemini مباشرة بلا هذا التحقق - Gemini يفهم النية فقط، لا يكتب إلى
// أي قاعدة بيانات مباشرة، ولا يتجاوز أي تحقق موجود في طبقة التنفيذ.
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
    const unit = parsed.unit === "ml" ? "ml" : parsed.unit === "piece" ? "piece" : "g";
    return { type: "logFoodDraft", qty: String(qty), unit, foodName, raw: rawText };
  }
  if (parsed.action === "confirm") return { type: "confirmSave", raw: rawText };
  if (parsed.action === "cancel") return { type: "cancelPending", raw: rawText };
  if (parsed.action === "end_session") return { type: "endSession", raw: rawText };
  if (parsed.action === "read_status") return { type: "readStatus", raw: rawText };
  if (parsed.action === "read_tip") return { type: "readTip", raw: rawText };
  if (parsed.action === "read_page") return { type: "readPage", raw: rawText };
  if (parsed.action === "log_prayer") {
    if (!GEMINI_PRAYERS.has(parsed.prayer)) return { type: "unrecognized", raw: rawText };
    return { type: "logPrayer", prayerId: parsed.prayer, raw: rawText };
  }
  if (parsed.action === "next_prayer_query") return { type: "nextPrayerQuery", raw: rawText };
  if (parsed.action === "prayer_time_query") {
    if (!GEMINI_PRAYERS.has(parsed.prayer)) return { type: "unrecognized", raw: rawText };
    return { type: "prayerTimeQuery", prayerId: parsed.prayer, raw: rawText };
  }
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
    const text = await geminiAnalyze(prompt, 220);
    const parsed = parseJsonLoose(text);
    return adaptGeminiCommand(parsed, rawText);
  } catch (e) {
    console.error("[voiceCommands] AI understanding failed, falling back to the fixed-command system:", e);
    return { type: "unrecognized", raw: rawText, aiFailed: true };
  }
}
