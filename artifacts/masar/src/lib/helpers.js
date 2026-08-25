import { localDayKey } from "./tips";

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// سبب جذري حقيقي لعلوق شاشة التحميل: أي وعد (Promise) - خاصة
// supabase.auth.getSession() أو أي استعلام شبكة - قد لا يُحل ولا يُرفض
// أبداً في ظروف معيّنة (قفل navigator.locks عالق بين تبويبات، أو شبكة
// متذبذبة على الجوال)، مما يجعل Promise.all المنتظِر له معلّقاً للأبد.
// withTimeout يضمن أن أي وعد "يستقر" خلال مهلة محددة دائماً، عبر
// Promise.race مع مؤقّت يُرجع قيمة احتياطية - لا يُلغي الوعد الأصلي (قد
// يكتمل لاحقاً في الخلفية دون تأثير)، لكنه يمنع تعليق واجهة المستخدم.
export function withTimeout(promise, ms, fallbackValue) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
}

// lang هو معامل اختياري (افتراضياً 'ar') لا يغيّر سلوك أي نداء قائم لا
// يمرّره — أُضيف فقط ليدعم صفحة "اليوم" ثنائية اللغة دون المساس بباقي
// الصفحات التي ما زالت تستدعي fmtHM بدون هذا المعامل.
export function fmtHM(mins, lang = "ar") {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (lang === "en") {
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h} س ${m} د`;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export function diffMinutes(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

// locale معامل اختياري (افتراضياً العربي كما كان دائماً) — أُضيف فقط
// لدعم صفحة "اليوم" ثنائية اللغة؛ أي نداء قائم بدون هذا المعامل يبقى
// يعمل بالضبط كالسابق.
export function arabicDate(key, opts, locale = "ar-KW-u-nu-latn") {
  return new Date(key).toLocaleDateString(locale, opts);
}

// خلل حقيقي وُجد وأُصلح: toLocaleString("ar-SA") على رقم (لا تاريخ) يُحوّل
// الأرقام فعلياً لأرقام هندية (١٬٢٣٤ بدل 1,234) - نفس المخاطرة التي
// arabicDate أعلاه تحاشتها عمداً عبر "ar-KW-u-nu-latn" لكن لم تُطبَّق يومها
// على عدّاد الاستغفار (الاستثناء الوحيد الفعلي في التطبيق). هذه الدالة
// تُنسّق أي رقم بفواصل الآلاف مع ضمان أرقام إنجليزية دائماً بغضّ النظر عن
// اللغة الحالية - نفس منطقة "ar-KW" المستخدَمة في arabicDate تحديداً
// (لا "ar-SA") توحيداً للسلوك بين كل دوال هذا الملف.
export function formatNumberLatin(n, lang = "ar") {
  const locale = lang === "en" ? "en-US" : "ar-KW-u-nu-latn";
  return Number(n).toLocaleString(locale);
}

// خلل حقيقي وُجد وأُصلح: كانت هذه الدالة تفحص "هل اليوم ضمن الأيام
// المسجَّلة؟" عبر todayKey (تاريخ UTC للحظة الحالية)، بينما التواريخ التي
// تُمرَّر لها فعلياً (fitnessLog، nutritionLog.date، tasks.due) مؤرَّخة
// محلياً. لمستخدم بتوقيت أمامي عن UTC (كالكويت +3)، هذا يعني أن أول 3
// ساعات من كل يوم محلي جديد كانت تجعل سلسلة نشاط حقيقية غير منقطعة تظهر
// "منقطعة" (streak=0) رغم أن المستخدم سجَّل نشاطه اليوم فعلاً بالتوقيت
// المحلي - تجربة مؤثرة سلباً في ميزة مبنية أصلاً على تحفيز الاستمرارية.
export function computeStreak(dates) {
  if (!dates.length) return 0;
  const days = new Set(dates.map((d) => (typeof d === "string" ? d : d.date)));
  let streak = 0;
  let d = new Date();
  if (!days.has(localDayKey(d))) {
    d.setDate(d.getDate() - 1);
    if (!days.has(localDayKey(d))) return 0;
  }
  while (days.has(localDayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// أطول سلسلة تاريخية (لا الحالية فقط كما في computeStreak أعلاه) - تُستخدَم
// في "التقرير الشامل" (Priority 4، القسم الكلي/All-Time) لعرض أفضل إنجاز
// اتساق حقّقه المستخدم عبر كامل تاريخه، لا سلسلته الجارية فقط. تعمل بفرز
// التواريخ الفريدة زمنياً ثم عدّ أطول تتابع أيام متلاصقة.
export function longestStreak(dates) {
  if (!dates.length) return 0;
  const uniqueDays = Array.from(new Set(dates.map((d) => (typeof d === "string" ? d : d.date)))).sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = parseLocalDateKey(uniqueDays[i - 1]);
    const curr = parseLocalDateKey(uniqueDays[i]);
    const diffDays = Math.round((curr - prev) / 86400000);
    current = diffDays === 1 ? current + 1 : 1;
    if (current > longest) longest = current;
  }
  return longest;
}

function parseLocalDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// lang معامل اختياري (افتراضياً العربي) — أُضيف فقط لدعم شارة المستوى
// في الشريط العلوي ثنائي اللغة؛ النداء الوحيد القائم (بدون هذا المعامل)
// يستمر يعمل بالضبط كالسابق.
export function getLevel(points, lang = "ar") {
  const FIXED_LABELS_AR = [
    "مبتدئ",
    "منتظم",
    "ملتزم",
    "متقدم",
    "محترف",
    "خبير",
    "نخبة",
    "أسطورة",
    "بطل",
    "خارق",
    "عبقري",
    "أسطوري",
    "لا يُهزم",
    "خرافي",
    "إلهي",
  ];
  const FIXED_LABELS_EN = [
    "Beginner",
    "Regular",
    "Committed",
    "Advanced",
    "Professional",
    "Expert",
    "Elite",
    "Legend",
    "Champion",
    "Superhuman",
    "Genius",
    "Legendary",
    "Unbeatable",
    "Mythical",
    "Divine",
  ];
  const FIXED_LABELS = lang === "en" ? FIXED_LABELS_EN : FIXED_LABELS_AR;

  function threshold(n) {
    return 25 * n * (n + 3);
  }

  let lvl = 0;
  while (points >= threshold(lvl + 1)) lvl++;

  const label = FIXED_LABELS[lvl] || (lang === "en" ? `Level ${lvl + 1}` : `مستوى ${lvl + 1}`);
  const cur = threshold(lvl);
  const nxt = threshold(lvl + 1);

  return {
    level: lvl + 1,
    label,
    current: cur,
    next: nxt,
    progress: Math.min((points - cur) / (nxt - cur), 1),
  };
}

export function addMinutesToTime(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const nm = ((total % 60) + 60) % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function nowHHMM() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export const AUTO_CLASSIFY_RULES = [
  { keywords: ["دراس", "جامعة", "مادة", "اختبار", "امتحان", "محاضرة", "مذاكرة"], catId: "study" },
  { keywords: ["تصوير", "كاميرا", "لقطة", "جلسة تصوير"], catId: "shoot" },
  { keywords: ["مونتاج", "تعديل", "تحرير", "بريمير"], catId: "edit" },
  { keywords: ["عميل", "تواصل", "اجتماع"], catId: "client" },
  { keywords: ["رياضة", "تمرين", "جيم", "ركض", "ملاكمة"], catId: "fitness" },
  { keywords: ["راحة", "نوم", "قيلولة"], catId: "rest" },
];

export function autoClassify(note, categories) {
  if (!note || !categories || !categories.length) return null;
  const lower = note;
  const STUDY_TRIGGERS = ["دراسة", "جامعة", "درس", "دراس", "امتحان", "اختبار", "محاضرة", "مذاكرة"];
  const isStudy = STUDY_TRIGGERS.some((kw) => lower.includes(kw));
  if (isStudy) {
    const studyCat = categories.find((c) => c.id === "study" || c.name.includes("دراس") || c.name.includes("جامعة"));
    if (studyCat) return studyCat.id;
  }
  const generalCat = categories.find((c) => c.id === "general" || c.name.includes("عام") || c.name.includes("أخرى") || c.name.includes("عامة"));
  return generalCat?.id || categories[0]?.id || null;
}

export const MANDATORY_TASKS = [
  { key: "bed", label: "ترتيب السرير", labelEn: "Make the bed", points: 5, penalty: 5, icon: "🛏" },
  { key: "teeth_morning", label: "أسنان الصباح", labelEn: "Morning teeth brushing", points: 5, penalty: 3, icon: "🦷" },
  { key: "teeth_evening", label: "أسنان المساء", labelEn: "Evening teeth brushing", points: 5, penalty: 3, icon: "🦷" },
  // quran_daily و alkahf يبقيان بدون labelEn عمداً — راجع RELIGIOUS_MANDATORY_TASK_KEYS
  // في MasarApp.jsx: هاتان المهمتان دينيتان وتبقيان بالعربية فقط دائماً.
  { key: "quran_daily", label: "قراءة القرآن اليومية", points: 15, penalty: 10, icon: "📖" },
  { key: "alkahf", label: "سورة الكهف", points: 10, penalty: 5, icon: "📗", fridayOnly: true },
];

export const AZKAR_MORNING = [
  { id: "sub_m", text: "سبحان الله", count: 33, short: "سبحان الله (33)" },
  { id: "ham_m", text: "الحمد لله", count: 33, short: "الحمد لله (33)" },
  { id: "akb_m", text: "الله أكبر", count: 33, short: "الله أكبر (33)" },
  { id: "lailaha_m", text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير", count: 1, short: "لا إله إلا الله" },
  { id: "kursi_m", text: "آية الكرسي", count: 1, short: "آية الكرسي" },
  { id: "morning_dua", text: "اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور", count: 1, short: "دعاء الصباح" },
];

export const AZKAR_EVENING = [
  { id: "sub_e", text: "سبحان الله", count: 33, short: "سبحان الله (33)" },
  { id: "ham_e", text: "الحمد لله", count: 33, short: "الحمد لله (33)" },
  { id: "akb_e", text: "الله أكبر", count: 33, short: "الله أكبر (33)" },
  { id: "lailaha_e", text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير", count: 1, short: "لا إله إلا الله" },
  { id: "kursi_e", text: "آية الكرسي", count: 1, short: "آية الكرسي" },
  { id: "evening_dua", text: "اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير", count: 1, short: "دعاء المساء" },
];

const QURAN_JUZ_NAMES = [
  "الم","سيقول","تلك الرسل","لن تنالوا","والمحصنات","لا يحب الله",
  "وإذا سمعوا","ولو أننا","قال الملأ","واعلموا","يعتذرون","وما من دابة",
  "وما أبرئ","ربما","سبحان الذي","قال ألم","اقترب","قد أفلح",
  "وقال الذين","أمن خلق","اتل ما أوحي","ومن يقنت","وما لي",
  "فمن أظلم","ومن يرد","حم","قال فما خطبكم","قد سمع الله",
  "تبارك الذي","عم",
];

// nameEn/descEn هنا مترجمتان، لكن اسم الجزء نفسه (name من QURAN_JUZ_NAMES)
// يبقى عربياً دائماً حتى داخل النص الإنجليزي — محتوى ديني لا يُترجم أبداً.
const _quranBadges = QURAN_JUZ_NAMES.map((name, i) => ({
  id: `juz_${i + 1}`,
  name: `الجزء ${i + 1}`,
  nameEn: `Juz ${i + 1}`,
  desc: `أتممت الجزء ${i + 1}: ${name}`,
  descEn: `Completed Juz ${i + 1}: ${name}`,
  icon: "📖",
  threshold: (s) => (s.quranJuzDone || 0) >= i + 1,
}));

// المجموعة الأصلية العشرة تبقى أول عشرة عناصر بلا أي تغيير - أي فئة قديمة
// تستخدم إحداها (أو أي لون حر آخر خزَّنه مستخدم قديم) تبقى كما هي تماماً،
// هذا توسيع للخيارات المستقبلية فقط لا تعديل لألوان محفوظة. الأربعة عشر
// الإضافية تملأ الفجوات الكبيرة في عجلة الألوان الأصلية (أخضر↔تركواز،
// بنفسجي↔وردي) بنفس مستوى التشبّع/الإضاءة المتوسط للمجموعة الأصلية، حتى
// تبقى كل الألوان مقروءة وواضحة في الوضعين الفاتح والداكن معاً (لا لون
// فاتح جداً يختفي على خلفية فاتحة، ولا داكن جداً يختفي على خلفية داكنة).
export const COLOR_CHOICES = [
  "#C9A24B", "#8A7BD1", "#5FA8A0", "#D17B5F", "#6FA8DC",
  "#B25D7D", "#9AA84C", "#D4A04C", "#7BA05B", "#C76B6B",
  "#C87C41", "#9E952E", "#799442", "#589146", "#3F8D46",
  "#429464", "#469B86", "#3999AC", "#6B7DC7", "#8867C1",
  "#9E61B8", "#BA5EB7", "#BE609B", "#C46475",
];

export const BADGES = [
  { id: "first_step", name: "الخطوة الأولى", nameEn: "The First Step", desc: "سجّلت أول نشاط لك", descEn: "You logged your first activity", icon: "◐", threshold: (s) => s.totalEntries >= 1 },
  { id: "streak3", name: "ثلاثة أيام", nameEn: "Three Days", desc: "التزمت 3 أيام متتالية", descEn: "You stayed committed for 3 days in a row", icon: "✦", threshold: (s) => s.streak >= 3 },
  { id: "streak7", name: "أسبوع كامل", nameEn: "A Full Week", desc: "أسبوع من الالتزام", descEn: "A week of commitment", icon: "✶", threshold: (s) => s.streak >= 7 },
  { id: "task_master", name: "منجِز", nameEn: "Achiever", desc: "أنهيت 20 مهمة", descEn: "You completed 20 tasks", icon: "✓", threshold: (s) => s.tasksDone >= 20 },
  { id: "deep_work", name: "تركيز عميق", nameEn: "Deep Focus", desc: "5 ساعات عمل في يوم", descEn: "5 hours of work in one day", icon: "◆", threshold: (s) => s.maxDayHours >= 5 },
  { id: "century", name: "المئة", nameEn: "The Century", desc: "سجّلت 100 نشاط", descEn: "You logged 100 activities", icon: "★", threshold: (s) => s.totalEntries >= 100 },
  { id: "focus_first", name: "أول تركيز", nameEn: "First Focus", desc: "أكملت أول جلسة تركيز", descEn: "You completed your first focus session", icon: "⏣", threshold: (s) => s.focusSessions >= 1 },
  { id: "focus_master", name: "سيّد التركيز", nameEn: "Master of Focus", desc: "10 ساعات تركيز إجمالاً", descEn: "10 total hours of focus", icon: "❂", threshold: (s) => s.focusHours >= 10 },
  { id: "prayer_week", name: "صفوف منتظمة", nameEn: "Steady Rows", desc: "صليت جميع الصلوات 7 أيام", descEn: "You prayed all five prayers for 7 days", icon: "🕌", threshold: (s) => (s.prayerStreak || 0) >= 7 },
  { id: "azkar_streak7", name: "مداوم الأذكار", nameEn: "Devoted to Adhkar", desc: "أذكار صباح ومساء 7 أيام متتالية", descEn: "Morning and evening adhkar for 7 days in a row", icon: "📿", threshold: (s) => (s.azkarStreak || 0) >= 7 },
  { id: "istighfar_1k", name: "ألف استغفار", nameEn: "A Thousand Istighfar", desc: "أكملت 1000 استغفار", descEn: "You completed 1,000 istighfar", icon: "📿", threshold: (s) => (s.istighfarTotal || 0) >= 1000 },
  { id: "istighfar_5k", name: "خمسة آلاف", nameEn: "Five Thousand", desc: "أكملت 5000 استغفار", descEn: "You completed 5,000 istighfar", icon: "🌿", threshold: (s) => (s.istighfarTotal || 0) >= 5000 },
  { id: "istighfar_10k", name: "عشرة آلاف", nameEn: "Ten Thousand", desc: "أكملت 10000 استغفار", descEn: "You completed 10,000 istighfar", icon: "🌙", threshold: (s) => (s.istighfarTotal || 0) >= 10000 },
  { id: "quran_5juz", name: "خمسة أجزاء", nameEn: "Five Juz", desc: "أتممت 5 أجزاء من القرآن", descEn: "You completed 5 juz of the Quran", icon: "📗", threshold: (s) => (s.quranJuzDone || 0) >= 5 },
  { id: "quran_10juz", name: "عشرة أجزاء", nameEn: "Ten Juz", desc: "أتممت 10 أجزاء من القرآن", descEn: "You completed 10 juz of the Quran", icon: "📘", threshold: (s) => (s.quranJuzDone || 0) >= 10 },
  { id: "quran_30juz", name: "ختم القرآن", nameEn: "Completing the Quran", desc: "أتممت ختمة كاملة للقرآن الكريم", descEn: "You completed a full reading (khatma) of the Quran", icon: "🌟", threshold: (s) => (s.quranJuzDone || 0) >= 30 },
  ..._quranBadges,
];

// لا يوجد أي نداء قائم لهذه المصفوفة في المشروع بأكمله (تحقق بالبحث) لذا
// تم تحويلها مباشرة من مصفوفة نصوص عربية مسطّحة إلى كائنات {ar, en} دون
// الحاجة لتحديث أي موقع استدعاء.
export const DEFAULT_DAILY_TASKS = [
  { ar: "قم الساعة 6 صباحاً", en: "Wake up at 6 AM" },
  { ar: "رتّب سريرك", en: "Make your bed" },
  { ar: "نظّف أسنانك", en: "Brush your teeth" },
  { ar: "مارس الرياضة ساعة واحدة", en: "Exercise for one hour" },
  { ar: "ادرس ساعة واحدة", en: "Study for one hour" },
];

export async function analyze(prompt, maxTokens = 1000) {
  const { geminiAnalyze } = await import("./gemini.js");
  return geminiAnalyze(prompt, maxTokens);
}

export async function coachChat(messages, context, lang = "ar") {
  const { geminiCoachChat } = await import("./gemini.js");
  return geminiCoachChat(messages, context, lang);
}

export function parseJsonLoose(text) {
  const cleaned = String(text || "").replace(/```json|```/g, "").trim();
  // Models sometimes add a preamble/postamble sentence despite instructions
  // not to, or the JSON gets cut off if the response hits the token limit.
  // Extracting the outermost {...} span (instead of assuming the whole
  // trimmed string is valid JSON) makes this tolerant of stray text around
  // the object; it still throws (and callers fall back) on a genuinely
  // truncated or missing object.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("لم يتم العثور على JSON صالح في رد النموذج");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

const LOCAL_TASK_BANK = {
  تصوير: [
    { title: "التقط صورة لغروب الشمس اليوم", titleEn: "Take a photo of today's sunset", detail: "اخرج قبل الغروب بـ 15 دقيقة وجرّب زاوية جديدة لم تستخدمها من قبل.", detailEn: "Head out 15 minutes before sunset and try a new angle you haven't used before." },
    { title: "صوّر 3 لقطات بإضاءة طبيعية مختلفة", titleEn: "Shoot 3 photos in different natural light", detail: "جرّب نفس الموضوع في ثلاثة أوقات نهارية مختلفة وقارن النتيجة.", detailEn: "Try the same subject at three different times of day and compare the results." },
    { title: "نظّم مجلد صورك الأخيرة وانتقِ أفضل 5", titleEn: "Organize your recent photo folder and pick the best 5", detail: "مراجعة أرشيفك تطوّر عينك في الانتقاء بقدر التصوير نفسه.", detailEn: "Reviewing your archive sharpens your eye for selection as much as shooting does." },
    { title: "جرّب تصوير لقطة مقربة (Macro) لشيء صغير", titleEn: "Try a macro shot of a small object", detail: "استخدم هاتفك أو عدستك وركّز على التفاصيل الدقيقة.", detailEn: "Use your phone or lens and focus on the fine details." },
  ],
  فيلم: [
    { title: "صوّر مشهداً قصيراً من 10 ثوانٍ بزاوية غير مألوفة", titleEn: "Film a short 10-second scene from an unusual angle", detail: "تجربة زاوية جديدة تبني حسّك البصري بسرعة.", detailEn: "Trying a new angle quickly builds your visual instinct." },
    { title: "راجع فيديو قديم لك وحدد 3 أشياء تحسّنها", titleEn: "Review an old video of yours and identify 3 things to improve", detail: "النقد الذاتي البنّاء أسرع طريق للتطور.", detailEn: "Constructive self-criticism is the fastest path to improvement." },
  ],
  مونتاج: [
    { title: "جرّب انتقالاً (Transition) جديداً لم تستخدمه قبل", titleEn: "Try a new transition you haven't used before", detail: "ابحث عن تقنية مونتاج بسيطة وطبّقها على مقطع قصير.", detailEn: "Look up a simple editing technique and apply it to a short clip." },
  ],
  دراس: [
    { title: "راجع فصل واحد من كتابك أو مذكراتك", titleEn: "Review one chapter from your book or notes", detail: "حدد فصلاً واحداً فقط وراجعه بتركيز كامل دون تشتت.", detailEn: "Pick just one chapter and review it with full focus, no distractions." },
    { title: "اكتب ملخصاً من 5 نقاط لآخر موضوع درسته", titleEn: "Write a 5-point summary of the last topic you studied", detail: "كتابة الملخص بكلماتك تثبّت الفهم أكثر من القراءة المكررة.", detailEn: "Writing a summary in your own words cements understanding better than re-reading." },
    { title: "حل 10 أسئلة تدريبية في أي مادة تدرسها", titleEn: "Solve 10 practice questions in any subject you're studying", detail: "التطبيق العملي أهم من القراءة النظرية وحدها.", detailEn: "Practical application matters more than theory alone." },
    { title: "اشرح فكرة درستها لشخص آخر بصوت عال", titleEn: "Explain something you studied to someone else out loud", detail: "إن استطعت تبسيطها لغيرك فأنت فهمتها فعلاً.", detailEn: "If you can simplify it for someone else, you truly understand it." },
  ],
  تغذية: [
    { title: "اكتب 3 نصائح غذائية صحية تعلّمتها", titleEn: "Write down 3 healthy nutrition tips you've learned", detail: "تدوين ما تعرفه يرسّخه ويجهّزك لمشاركته مع آخرين.", detailEn: "Writing down what you know reinforces it and readies you to share it." },
    { title: "جرّب وصفة صحية جديدة اليوم", titleEn: "Try a new healthy recipe today", detail: "اختر وصفة بسيطة بمكونات قليلة وجرّبها لأول مرة.", detailEn: "Pick a simple recipe with few ingredients and try it for the first time." },
    { title: "راجع وجبة يومك وحدد نقطة تحسين واحدة", titleEn: "Review today's meals and pick one point to improve", detail: "تحسين واحد صغير كل يوم يبني عادة غذائية قوية.", detailEn: "One small improvement a day builds a strong nutrition habit." },
  ],
  رياض: [
    { title: "قم بـ 20 تمرين ضغط الآن", titleEn: "Do 20 push-ups right now", detail: "لا تحتاج معدات، فقط 3 دقائق من وقتك.", detailEn: "No equipment needed, just 3 minutes of your time." },
    { title: "تمرين إطالة لمدة 5 دقائق", titleEn: "5 minutes of stretching", detail: "الإطالة تمنع الإصابات وتحسّن المرونة على المدى الطويل.", detailEn: "Stretching prevents injuries and improves long-term flexibility." },
    { title: "اتقال أو ملاكمة: 3 مجموعات تمرين تسخين", titleEn: "Kickboxing or boxing: 3 warm-up sets", detail: "ركّز على التقنية الصحيحة قبل القوة.", detailEn: "Focus on proper technique before power." },
  ],
  ملاكمة: [
    { title: "تمرين ظل (Shadow boxing) لمدة 5 دقائق", titleEn: "5 minutes of shadow boxing", detail: "ركّز على الحركة والتوازن أكثر من السرعة.", detailEn: "Focus on movement and balance more than speed." },
  ],
  تصميم: [
    { title: "صمّم عنصراً واحداً بسيطاً (شعار أو أيقونة)", titleEn: "Design one simple element (a logo or icon)", detail: "قيّد نفسك بـ 20 دقيقة فقط لتنشيط الإبداع السريع.", detailEn: "Limit yourself to just 20 minutes to spark quick creativity." },
  ],
};

const DAILY_CHALLENGES = [
  { title: "اكتب 5 أشياء أنت ممتن لها اليوم", titleEn: "Write down 5 things you're grateful for today", detail: "تمرين الامتنان اليومي يحسّن المزاج والتركيز بشكل ملموس.", detailEn: "Daily gratitude practice noticeably improves mood and focus." },
  { title: "اقرأ 10 صفحات من كتاب تحبه", titleEn: "Read 10 pages of a book you love", detail: "حتى 10 صفحات يومياً تجمع كتاباً كاملاً في أسابيع قليلة.", detailEn: "Even 10 pages a day adds up to a whole book in a few weeks." },
  { title: "اتصل أو تواصل مع شخص تقدّره ولم تتحدث معه مؤخراً", titleEn: "Call or reach out to someone you value but haven't spoken to lately", detail: "العلاقات تحتاج صيانة دورية مثل أي شيء آخر.", detailEn: "Relationships need regular upkeep like anything else." },
  { title: "نظّف وريّح مساحة عملك لمدة 10 دقائق", titleEn: "Tidy up your workspace for 10 minutes", detail: "البيئة المرتبة تقلل التشتت الذهني فعلياً.", detailEn: "A tidy environment genuinely reduces mental clutter." },
  { title: "اكتب هدفاً واحداً واضحاً لهذا الأسبوع", titleEn: "Write one clear goal for this week", detail: "هدف واحد محدد أقوى من خمسة أهداف غامضة.", detailEn: "One specific goal beats five vague ones." },
  { title: "جرّب نشاطاً جديداً لم تجربه من قبل لمدة 15 دقيقة", titleEn: "Try a new activity you've never done for 15 minutes", detail: "الخروج من الروتين يفتح زوايا تفكير جديدة.", detailEn: "Breaking your routine opens new angles of thinking." },
  { title: "راجع مصاريفك أو وقتك المستهلك اليوم", titleEn: "Review your spending or time usage today", detail: "الوعي بالاستهلاك (وقت أو مال) أول خطوة للتحسين.", detailEn: "Awareness of consumption (time or money) is the first step to improving it." },
];

function dayIndex(arrLength) {
  const days = Math.floor(Date.now() / 86400000);
  return days % arrLength;
}

export function localAchieveSuggestions(profile, kind, excludeTitles = []) {
  const text = `${profile?.hobbies || ""} ${profile?.field || ""} ${profile?.about || ""}`;
  const matchedKeys = Object.keys(LOCAL_TASK_BANK).filter((k) => text.includes(k));
  let pool = [];
  matchedKeys.forEach((k) => pool.push(...LOCAL_TASK_BANK[k].map((t) => ({ ...t, topic: k }))));
  if (pool.length === 0) {
    Object.entries(LOCAL_TASK_BANK).forEach(([k, items]) => pool.push(...items.map((t) => ({ ...t, topic: k }))));
  }
  const challenge = DAILY_CHALLENGES[dayIndex(DAILY_CHALLENGES.length)];
  pool.push({ ...challenge, topic: "تحدي اليوم" });

  const filtered = pool.filter((t) => !excludeTitles.includes(t.title));
  const source = filtered.length ? filtered : pool;
  const start = dayIndex(source.length);
  const picked = [];
  for (let i = 0; i < Math.min(3, source.length); i++) {
    picked.push(source[(start + i) % source.length]);
  }
  return picked.map((t) => ({
    title: t.title,
    titleEn: t.titleEn,
    detail: t.detail,
    detailEn: t.detailEn,
    steps: [],
    topic: t.topic,
  }));
}

// جدول الردود ثنائي اللغة مفهرس بمفتاح مزاج كانوني (excited/normal/tired/
// distracted) وليس بالنص الظاهر للمستخدم، لأن ذلك النص يختلف حسب لغة
// الواجهة (أزرار المزاج بالعربية أو بالإنجليزية).
const COACH_REPLIES = {
  excited: {
    ar: { message: "حماسك اليوم فرصة ذهبية، استثمرها فوراً.", activity: "ابدأ أهم مهمة بقائمتك الآن قبل أن يهدأ الحماس", why: "الزخم العاطفي وقود قوي لكنه قصير المدى، استغلّه بسرعة." },
    en: { message: "Your excitement today is a golden opportunity — use it right now.", activity: "Start the most important task on your list now, before the excitement fades", why: "Emotional momentum is powerful but short-lived fuel — use it quickly." },
  },
  normal: {
    ar: { message: "يوم عادي هو يوم ممتاز للتقدم الهادئ والمستمر.", activity: "أنجز مهمة صغيرة واحدة من قائمتك خلال 15 دقيقة", why: "التقدم الصغير المتكرر يبني نتائج كبيرة بمرور الوقت." },
    en: { message: "An ordinary day is a great day for calm, steady progress.", activity: "Complete one small task from your list within 15 minutes", why: "Small, repeated progress builds big results over time." },
  },
  tired: {
    ar: { message: "التعب رسالة من جسمك، استمع له ولا تتجاهله بالكامل.", activity: "خذ راحة 10 دقائق ثم اختر مهمة خفيفة جداً", why: "الراحة القصيرة المدروسة أفضل من إنتاجية مجهدة منخفضة الجودة." },
    en: { message: "Fatigue is a message from your body — listen to it, don't ignore it entirely.", activity: "Take a 10-minute break, then pick a very light task", why: "A brief, deliberate rest beats exhausted, low-quality output." },
  },
  distracted: {
    ar: { message: "التشتت طبيعي، يحتاج فقط نقطة ارتكاز واحدة.", activity: "اختر مهمة واحدة فقط واطفئ كل الإشعارات لـ 10 دقائق", why: "تضييق التركيز لمهمة واحدة يكسر حلقة التشتت بسرعة." },
    en: { message: "Distraction is natural — it just needs one point of focus.", activity: "Choose just one task and turn off all notifications for 10 minutes", why: "Narrowing focus to one task quickly breaks the distraction cycle." },
  },
};

// يقبل مفتاح المزاج إما بالعربية (مع/بدون شدّة، مثل "متحمّس" أو "متحمس")
// أو بالإنجليزية (case-insensitive، مثل "excited" أو "Excited") — العقد
// الوحيد على المستدعي هو تمرير أحد التسميات الثمانية أدناه؛ الدالة تحدد
// لغة الرد تلقائياً من لغة المفتاح الممرَّر نفسه، فلا حاجة لمعامل lang
// منفصل. أي مفتاح غير معروف يُرَدّ عليه بالرد الافتراضي "normal" بالعربية.
const EN_MOOD_KEYS = { excited: "excited", normal: "normal", tired: "tired", distracted: "distracted" };
const AR_MOOD_KEYS = {
  "متحمّس": "excited", "متحمس": "excited",
  "عادي": "normal",
  "متعب": "tired",
  "مشتّت": "distracted", "مشتت": "distracted",
};

export function localCoachReply(mood) {
  const raw = String(mood ?? "").trim();
  const lower = raw.toLowerCase();
  if (EN_MOOD_KEYS[lower]) return COACH_REPLIES[EN_MOOD_KEYS[lower]].en;
  if (AR_MOOD_KEYS[raw]) return COACH_REPLIES[AR_MOOD_KEYS[raw]].ar;
  return COACH_REPLIES.normal.ar;
}
