// قسم "الصحة النفسية": ثوابت التتبع اليومي، تمرين التنفس، كشف كلمات
// الخطر، واقتراحات الربط الذكي بأقسام مسار الأخرى.

export const MOOD_LEVELS = [
  { value: 1, label: "سيء جداً", icon: "Angry" },
  { value: 2, label: "سيء", icon: "Frown" },
  { value: 3, label: "متوسط", icon: "Meh" },
  { value: 4, label: "جيد", icon: "Smile" },
  { value: 5, label: "ممتاز", icon: "Laugh" },
];

export const STRESS_LEVELS = [
  { value: 1, label: "منخفض" },
  { value: 2, label: "خفيف" },
  { value: 3, label: "متوسط" },
  { value: 4, label: "مرتفع" },
  { value: 5, label: "مرتفع جداً" },
];

export const ENERGY_LEVELS = [
  { value: 1, label: "منخفضة" },
  { value: 2, label: "خفيفة" },
  { value: 3, label: "متوسطة" },
  { value: 4, label: "مرتفعة" },
  { value: 5, label: "مرتفعة جداً" },
];

// نمط 4-7-8 المعروف لتهدئة الجهاز العصبي.
export const BREATHING_PHASES = [
  { key: "inhale", label: "شهيق...", seconds: 4 },
  { key: "hold", label: "احبس...", seconds: 7 },
  { key: "exhale", label: "زفير...", seconds: 8 },
];

export const BREATHING_DURATIONS = [
  { minutes: 1, label: "دقيقة واحدة" },
  { minutes: 3, label: "3 دقائق" },
  { minutes: 5, label: "5 دقائق" },
];

export const MENTAL_HEALTH_DISCLAIMER =
  "مسار أداة دعم يومي بسيط، وليس بديلاً عن استشارة مختص. إذا كنت تمر بأزمة نفسية حقيقية، يرجى التواصل مع مختص أو أحد خطوط الدعم.";

// نص عام مؤقت لحين تزويد مسار برقم خط الدعم النفسي الرسمي الدقيق (مثلاً في
// الكويت)، حتى لا يُعرض أي رقم غير موثّق لمستخدم في أزمة حقيقية.
export const CRISIS_SUPPORT_MESSAGE =
  "نحن نهتم بك، وما تشعر به مهم، وأنت لست وحدك. يوجد أشخاص مختصون جاهزون لمساعدتك الآن. يرجى التواصل فوراً مع الطوارئ 112 أو أقرب مستشفى، أو أقرب خط دعم نفسي متاح في بلدك.";

const RISK_KEYWORDS = [
  "انتحار", "انتحر", "بنتحر", "أنتحر",
  "اقتل نفسي", "أقتل نفسي", "اذي نفسي", "أذي نفسي", "ايذاء نفسي", "إيذاء نفسي", "جرح نفسي",
  "ابغى اموت", "أبغى أموت", "ابي اموت", "أبي أموت", "نفسي اموت", "نفسي أموت",
  "يريحني الموت", "افضل اموت", "أفضل أموت", "بدون رجعة",
  "ما فيه داعي اعيش", "ما فيه داعي أعيش", "مافي داعي اعيش", "مو عايز اعيش",
  "ما ابي اعيش", "ما أبي أعيش", "تعبت من الحياة", "مليت من الحياة",
  "suicide", "kill myself", "self harm", "self-harm", "self injury", "self-injury",
  "want to die", "end my life", "no reason to live", "ending it all", "hurt myself",
];

export function detectRisk(note) {
  if (!note) return false;
  const lower = note.toLowerCase();
  return RISK_KEYWORDS.some((k) => lower.includes(k.toLowerCase()));
}

function averageOf(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// اقتراحات "ربط ذكي" بأقسام مسار الموجودة، مبنية على تسجيل اليوم والأيام
// الأخيرة. seed (رقم مشتقّ من تاريخ اليوم) يُستخدم لتدوير الصياغة بين عدة
// خيارات حتى لا يظهر نفس النص بحذافيره كل مرة.
export function computeSuggestions({ todayEntry, recentEntries, seed = 0 }) {
  if (!todayEntry) return [];
  const suggestions = [];
  const pick = (arr) => arr[Math.abs(seed) % arr.length];

  if (todayEntry.mood <= 2 || todayEntry.energy <= 2) {
    suggestions.push({
      type: "fitness",
      text: pick([
        "جرب تسجّل نشاط رياضي بسيط اليوم، حتى لو خفيف — يساعد كثيراً.",
        "نشاط بدني بسيط الآن قد يرفع مزاجك وطاقتك قليلاً. جرّب قسم الرياضة.",
        "خطوة صغيرة في قسم الرياضة اليوم قد تصنع فرقاً في شعورك.",
      ]),
      actionLabel: "الذهاب لقسم الرياضة",
      targetView: "fitness",
    });
  }

  if (todayEntry.stress >= 4) {
    suggestions.push({
      type: "focus",
      text: pick([
        "جرب تمرين التنفس أعلاه لتهدئة أعصابك بضع دقائق.",
        "جلسة تركيز قصيرة قد تساعدك تفرّغ ذهنك من التوتر.",
        "خذ نفساً عميقاً — جرب تمرين التنفس، أو ابدأ جلسة تركيز قصيرة.",
      ]),
      actionLabel: "جلسة تركيز قصيرة",
      targetView: "focus",
    });
  }

  const last5 = recentEntries.slice(0, 5);
  const lowMoodDays = last5.filter((e) => e.mood <= 2).length;
  if (last5.length >= 3 && lowMoodDays >= 3) {
    suggestions.push({
      type: "goals",
      text: pick([
        "لاحظنا مزاجك منخفض عدة أيام متتالية. ربما حان الوقت لمراجعة أهدافك.",
        "نمط مزاجك هذه الأيام يستحق وقفة. جرب مراجعة أهدافك، ربما تحتاج تعديلها.",
      ]),
      actionLabel: "مراجعة أهدافي",
      targetView: "goals",
    });
  }

  return suggestions;
}

// ملاحظة نمط وصفية وحذرة (وليست تشخيصاً): تقارن متوسط المزاج في الأيام التي
// أُنجز فيها تمرين رياضي (fitness_log) مقابل الأيام التي لم يُنجز فيها، ولا
// تُنشئ أي استنتاج إن لم تكن العينة كافية أو الفرق واضحاً فعلاً في البيانات.
export function computeMoodFitnessInsight(entries, fitnessLog) {
  const withWorkout = [];
  const withoutWorkout = [];
  entries.forEach((e) => {
    if (typeof e.mood !== "number") return;
    if (fitnessLog && fitnessLog[e.date]) withWorkout.push(e.mood);
    else withoutWorkout.push(e.mood);
  });
  if (withWorkout.length < 2 || withoutWorkout.length < 2) return null;
  const avgWith = averageOf(withWorkout);
  const avgWithout = averageOf(withoutWorkout);
  if (avgWith - avgWithout < 0.5) return null;
  return "لاحظنا مزاجك أعلى في الأيام التي مارست فيها نشاطاً رياضياً في قسم الرياضة — استمر على هذا!";
}
