// تفسير أوامر صوتية محدودة ومعروفة مسبقاً فقط (لا فهم لغة حرة، لا استنتاج
// نوايا من نص عشوائي) - نطاق ضيق ومقصود لضمان موثوقية حقيقية: كل أمر مدعوم
// مذكور صراحة في هذا الملف فقط، ولا وعد بفهم أي شيء خارج هذه القائمة.
// "مرونة" المطابقة هنا تعني قبول بضعة مرادفات معروفة مسبقاً لنفس الأمر
// (مثال: "روح للتغذية" أو "افتح التغذية" أو "التغذية" وحدها) وتوحيد بعض
// الفروق الإملائية السطحية في نتائج التعرّف الصوتي (تشكيل، أ/إ/آ، تاء
// مربوطة) - وليست فهماً لغوياً حراً بأي شكل.

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
