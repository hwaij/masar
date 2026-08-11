// محرك القرار المركزي لنظام الإشعارات الذكي (Phase 1) - دوال منطقية خالصة
// فقط (pure functions): لا اتصال بقاعدة بيانات هنا، لا استدعاء web-push،
// لا أي I/O إطلاقاً. الهدف: القرار (هل نرسل؟ بأي نص؟) قابل للاختبار بالكامل
// بمعطيات وهمية دون لمس أي بيانات حقيقية - المكالمات الفعلية لـSupabase
// وweb-push تُضاف حول هذا الملف في مرحلة لاحقة (Phase 2/3)، لا داخله.
// CommonJS عمداً (require/module.exports)، بنفس نمط بقية netlify/functions/*.js
// الموجودة فعلاً (gemini.js/usda.js/send-test-push.js) - لا نمط استيراد مواز.
//
// الفئات المدعومة، والفئة الوحيدة التي تتجاوز Quiet Hours (الصلاة، بموافقة
// صريحة من صاحب المنتج - يختارها المستخدم عمداً، بخلاف تذكيرات الماء/
// الوجبات/المهام التي يجب أن تحترم وقت هدوئه بصرامة).
const CATEGORIES = ["prayer", "water", "meals", "sleep", "quran", "tasks"];
const QUIET_HOURS_EXEMPT_CATEGORIES = new Set(["prayer"]);

function assertValidCategory(category) {
  if (!CATEGORIES.includes(category)) {
    throw new Error(`فئة إشعار غير معروفة: ${category}`);
  }
}

// "HH:MM" -> دقائق منذ منتصف الليل، للمقارنة الرقمية البسيطة.
function hhmmToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

// نطاق الهدوء قد يعبر منتصف الليل (مثال افتراضي: 22:00 -> 06:00) - يُعامَل
// بشكل مختلف عن نطاق عادي لا يعبره (مثال: 13:00 -> 15:00 لو استُخدم يوماً).
function isWithinQuietHours(nowHHMM, quietStartHHMM, quietEndHHMM) {
  const now = hhmmToMinutes(nowHHMM);
  const start = hhmmToMinutes(quietStartHHMM);
  const end = hhmmToMinutes(quietEndHHMM);
  if (start === end) return false; // نطاق بطول صفر يعني تعطيل Quiet Hours فعلياً
  if (start < end) return now >= start && now < end;
  // يعبر منتصف الليل: داخل النطاق إن كان بعد البداية أو قبل النهاية
  return now >= start || now < end;
}

// مفتاح المناسبة الفريد الذي يمنع تكرار نفس الإشعار (يُقارَن لاحقاً بجدول
// notification_log عبر قيد unique (owner, category, occurrence_key)) -
// dateKey بصيغة "YYYY-MM-DD" دائماً (بتوقيت الكويت الثابت في طبقة الاستدعاء
// لا هنا)، subKey يميّز المناسبة داخل نفس اليوم (مثل "dhuhr" لصلاة الظهر،
// أو "morning"/"afternoon" لنافذة تذكير ماء واحدة في الفترة).
function buildOccurrenceKey(dateKey, subKey) {
  if (!dateKey || !subKey) throw new Error("dateKey وsubKey مطلوبان لبناء occurrence_key");
  return `${dateKey}:${subKey}`;
}

// القرار المركزي: هل يجوز إرسال هذا الإشعار الآن؟ كل مدخلاته مُجهَّزة مسبقاً
// من طبقة الاستدعاء (قراءات Supabase الفعلية تحدث هناك، لا هنا) - يجعل هذا
// الاختبار بمعطيات وهمية كافياً ودقيقاً بلا أي قاعدة بيانات حقيقية.
//
// المعاملات:
//   category                   واحدة من CATEGORIES
//   preferences                { quietHoursStart, quietHoursEnd, dailyCap,
//                                categoryEnabled: {prayer,water,meals,...} }
//   nowHHMM                    الوقت الحالي "HH:MM" (بتوقيت الكويت الثابت)
//   sentTodayCount              عدد الإشعارات المُرسَلة لهذا المستخدم اليوم (كل الفئات)
//   alreadySentThisOccurrence   true إن وُجد صف مطابق في notification_log بالفعل
//
// يُرجع { send: boolean, reason: string } - reason دائماً موجود (حتى عند
// send:true، القيمة "ok") لتسهيل تتبّع/تسجيل القرارات لاحقاً بلا تخمين.
function shouldSend({ category, preferences, nowHHMM, sentTodayCount, alreadySentThisOccurrence }) {
  assertValidCategory(category);

  if (alreadySentThisOccurrence) {
    return { send: false, reason: "ALREADY_SENT_THIS_OCCURRENCE" };
  }

  const categoryEnabled = preferences?.categoryEnabled?.[category];
  if (categoryEnabled === false) {
    return { send: false, reason: "CATEGORY_DISABLED" };
  }

  const dailyCap = Number.isFinite(preferences?.dailyCap) ? preferences.dailyCap : 8;
  if ((sentTodayCount || 0) >= dailyCap) {
    return { send: false, reason: "DAILY_CAP_REACHED" };
  }

  const respectsQuietHours = !QUIET_HOURS_EXEMPT_CATEGORIES.has(category);
  if (respectsQuietHours && preferences?.quietHoursStart && preferences?.quietHoursEnd) {
    if (isWithinQuietHours(nowHHMM, preferences.quietHoursStart, preferences.quietHoursEnd)) {
      return { send: false, reason: "QUIET_HOURS" };
    }
  }

  return { send: true, reason: "ok" };
}

// نصوص ودودة ومحترمة بلا سخرية ولا تأنيب ولا إلحاح - جملة واحدة غالباً،
// بأسلوب "أنجز"/مسار نفسه. context اختياري (مثل اسم الصلاة) لتخصيص بسيط
// بلا استخدام فشل/تقصير المستخدم كمادة للرسالة أبداً.
const MESSAGES = {
  prayer: {
    ar: (ctx) => ({ title: "🕌 اقترب وقت الصلاة", body: `صلاة ${ctx?.prayerName || ""} بعد 5 دقائق تقريباً.` }),
    en: (ctx) => ({ title: "🕌 Prayer time is near", body: `${ctx?.prayerName || "Prayer"} is in about 5 minutes.` }),
  },
  water: {
    ar: () => ({ title: "💧 وقت كوب ماء؟", body: "لا تنسَ ترطيب جسمك اليوم." }),
    en: () => ({ title: "💧 Time for some water?", body: "Don't forget to stay hydrated today." }),
  },
  meals: {
    ar: (ctx) => ({ title: "🍽️ وجبتك بانتظارك", body: `يمكنك تسجيل ${ctx?.mealLabel || "وجبتك"} في مسار متى ناسبك.` }),
    en: (ctx) => ({ title: "🍽️ Your meal awaits", body: `You can log ${ctx?.mealLabel || "your meal"} in Masar whenever it suits you.` }),
  },
  sleep: {
    ar: () => ({ title: "🌙 وقت راحة قريب", body: "قد يكون هذا وقتاً جيداً للتحضير للنوم." }),
    en: () => ({ title: "🌙 Rest time approaching", body: "This might be a good time to wind down for sleep." }),
  },
  quran: {
    ar: () => ({ title: "📖 لحظة مع القرآن", body: "وقت هادئ لبعض الذكر أو القراءة، إن أحببت." }),
    en: () => ({ title: "📖 A moment with the Quran", body: "A quiet moment for some dhikr or reading, if you'd like." }),
  },
  tasks: {
    ar: () => ({ title: "✅ مهامك اليوم", body: "لديك مهام لم تُنجَز بعد في مسار." }),
    en: () => ({ title: "✅ Today's tasks", body: "You have some tasks still open in Masar." }),
  },
};

function buildMessage(category, lang, context) {
  assertValidCategory(category);
  const table = MESSAGES[category];
  const build = table[lang === "en" ? "en" : "ar"];
  return build(context || {});
}

module.exports = {
  CATEGORIES,
  QUIET_HOURS_EXEMPT_CATEGORIES,
  isWithinQuietHours,
  buildOccurrenceKey,
  shouldSend,
  buildMessage,
};
