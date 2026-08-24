// محرّك بناء برنامج التمارين - "المدرب الشخصي الذكي". هذا هو الأساس
// الموثوق الذي يعمل دائماً (بلا أي اتصال شبكة)، حتى لو استُخدمت طبقة
// Gemini إضافية للتنويع اللغوي فوقه لاحقاً (لا تعتمد الوظائف الأساسية هنا
// على أي استدعاء AI إطلاقاً).
//
// كل المبادئ أدناه (اختيار التقسيم split حسب الأيام والمستوى، حجم التدريب
// sets/reps حسب الهدف، ترتيب التمارين المركّبة قبل العزل، progressive
// overload) مبادئ علمية عامة متّفق عليها في علم التدريب - لا اسم مدرب أو
// برنامج تجاري محدَّد مذكور أو منسوخ هنا.
import { EXERCISES, EXERCISES_BY_ID } from "./exercises-db";

// ===== 1) اختيار التقسيم (Split) حسب عدد الأيام ومستوى الخبرة =====
// مبدأ عام معروف: كلما زادت الأيام المتاحة، أمكن تخصيص كل يوم لعدد أقل من
// العضلات (حجم أعلى لكل عضلة/جلسة) بدل توزيعها كلها في كل جلسة.
const SPLITS = {
  2: ["full_body", "full_body"],
  3: {
    beginner: ["full_body", "full_body", "full_body"],
    intermediate: ["push", "pull", "legs"],
    advanced: ["push", "pull", "legs"],
  },
  4: ["upper", "lower", "upper", "lower"],
  5: ["push", "pull", "legs", "upper", "lower"],
  6: ["push", "pull", "legs", "push", "pull", "legs"],
};

function pickSplit(daysPerWeek, experience) {
  const entry = SPLITS[daysPerWeek] || SPLITS[3];
  if (Array.isArray(entry)) return entry;
  return entry[experience] || entry.beginner;
}

// أي مجموعات عضلية دقيقة يستهدفها كل نوع يوم - مبدأ عام (توزيع دفع/سحب/
// أرجل أو علوي/سفلي أو كامل الجسم).
const DAY_TYPE_MUSCLES = {
  full_body: ["chest", "back", "quads", "shoulders", "hamstrings", "abs"],
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves", "abs"],
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps", "abs"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
};

export const DAY_TYPE_LABELS = {
  full_body: { ar: "تمرين كامل الجسم", en: "Full body" },
  upper: { ar: "الجزء العلوي", en: "Upper body" },
  lower: { ar: "الجزء السفلي", en: "Lower body" },
  push: { ar: "الدفع (صدر/أكتاف/ترايسبس)", en: "Push (chest/shoulders/triceps)" },
  pull: { ar: "السحب (ظهر/باي)", en: "Pull (back/biceps)" },
  legs: { ar: "الأرجل", en: "Legs" },
};

// ===== 2) حجم التدريب (sets/reps/راحة) حسب الهدف - نطاقات علمية عامة =====
const VOLUME_BY_GOAL = {
  lose_weight: { sets: 3, reps: "12-15", restSeconds: 45 },
  build_muscle: { sets: 4, reps: "8-12", restSeconds: 75 },
  general_fitness: { sets: 3, reps: "10-15", restSeconds: 60 },
  maintain_weight: { sets: 3, reps: "10-12", restSeconds: 60 },
};

// ===== 1ب) ميل اختيار نوع التمرين حسب الهدف =====
// "default": بلا أي تغيير سلوكي - نفس مسار الاختيار الأصلي بالحرف
// (مركّب أولاً دائماً، مع ثغرة تفضيل النمط الحركي الجديد الحالية).
// "strict_compound" (تنشيف): إغلاق تلك الثغرة تحديداً - يبقى التركيز على
// التمارين المركّبة (طلب أيضي/حرق أعلى - مبدأ عام)، لا يفشل أبداً حتى لو
// لم يبقَ تمرين مركّب (يتراجع للمجموعة الكاملة).
// "balanced" (بناء عضل): تجاوز الفرز الصارم "مركّب أولاً" كلياً، استخدام
// ترتيب الخلط المحسوب أصلاً كما هو - تمثيل حقيقي مختلط بين مركّب/عزل
// (تدريب العزل جزء علمي معتبر في تضخيم العضل)، بلا أي استدعاء rng إضافي.
const GOAL_COMPOUND_BIAS = {
  lose_weight: "strict_compound",
  build_muscle: "balanced",
  general_fitness: "default",
  maintain_weight: "default",
};

// مبدأ علمي عام معروف في تصميم برامج التمارين: التمارين المركّبة (تشغّل
// عدة مفاصل/عضلات كبرى معاً) تحتاج راحة أطول للتعافي العصبي-عضلي الكافي
// قبل المجموعة التالية، بينما تمارين العزل (عضلة واحدة صغيرة) تحتاج راحة
// أقصر. الكارديو/المرونة أصلاً تعتمد مددًا زمنية لا مجموعات ثقيلة فتكفيها
// راحة قصيرة جداً بين الجولات. هذا مجرّد اقتراح ابتدائي - المستخدم يمكنه
// تعديل راحة أي تمرين يدوياً من شاشة البرنامج (انظر adjustExerciseRest في
// FitnessView.jsx) وتعديله يُحفَظ ويُستخدَم بدل هذا الافتراض من حينها.
function restSecondsForType(baseRest, type) {
  if (type === "compound") return baseRest + 15;
  if (type === "isolation") return Math.max(30, baseRest - 15);
  if (type === "cardio") return 20;
  if (type === "mobility") return 15;
  return baseRest;
}

// مصدر حقيقة واحد لحساب راحة تمرين معيَّن حسب هدف المستخدم ونوع التمرين -
// يُستخدَم عند بناء البرنامج، ويجب استخدامه أيضاً عند استبدال تمرين واحد
// يدوياً (Swap) بدل إبقاء راحة التمرين القديم: البديل قد يكون من نوع مختلف
// تماماً لنفس العضلة (مثال: ضغط بار مركّب ← فتح صدر بالكابل عزل) فيحتاج
// راحة مختلفة علمياً حتى لو استهدف نفس العضلة بالضبط.
export function restSecondsForGoalAndType(goal, type) {
  const volume = VOLUME_BY_GOAL[goal] || VOLUME_BY_GOAL.general_fitness;
  return restSecondsForType(volume.restSeconds, type);
}

// المبتدئ يبدأ بحجم أقل (إتقان الأداء أولاً)، المتقدم يتحمّل حجماً أعلى.
const SETS_ADJUST_BY_EXPERIENCE = { beginner: -1, intermediate: 0, advanced: 1 };

// عدد التمارين المناسب لمدة الحصة (وقت إحماء/انتقال متضمَّن تقديرياً).
const EXERCISE_COUNT_BY_DURATION = { 30: 4, 45: 5, 60: 6, 90: 8 };

const DIFFICULTY_ALLOWED = {
  beginner: ["beginner"],
  intermediate: ["beginner", "intermediate"],
  advanced: ["beginner", "intermediate", "advanced"],
};

// إن استُبعدت كل تمارين عضلة بسبب إصابة (مثال: كل تمارين الكوادس تقريباً
// تُحمّل الركبة)، نستبدل العضلة نفسها بعضلة مجاورة آمنة تخدم نفس الهدف
// العام لليوم (Hip-hinge كبديل آمن للركبة معروف علمياً) بدل ترك خانة فارغة
// في البرنامج - مع رفع علم الاستبدال لعرض التنبيه الإلزامي دائماً.
const MUSCLE_FALLBACK = {
  quads: "hamstrings", hamstrings: "glutes", glutes: "hamstrings",
  chest: "shoulders", shoulders: "chest", back: "shoulders",
  biceps: "triceps", triceps: "biceps", calves: "quads", abs: "mobility",
};

// ===== مولّد أرقام شبه عشوائي بذرة ثابتة (mulberry32) - نفس البذرة تُعطي
// نفس النتيجة دائماً (استقرار البرنامج بين الزيارات)، وبذرة مختلفة (زر
// "نوّع" أو تدوير أسبوعي) تُعطي تنويعاً حقيقياً - بلا أي مكتبة خارجية.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// يدوّر مصفوفة العضلات المستهدَفة بإزاحة ثابتة - يُستخدَم فقط حين لا تتسع
// مدة الحصة لكل عضلات اليوم (انظر التعليق عند استخدامها في buildProgram):
// بلا تدوير، كانت آخر عضلة/عضلتين في DAY_TYPE_MUSCLES (مثال: hamstrings/abs
// في full_body) تُهمَلان دائماً، في كل توليدة، لكل مستخدم يختار حصة قصيرة -
// عيب حقيقي مؤكَّد بالاختبار (30 دقيقة "جسم كامل" لا تلمس الأرجل الخلفية أو
// البطن إطلاقاً مهما تغيّر seed). التدوير لا يضمن تغطية الكل في يوم واحد
// (هذا مستحيل رياضياً حين تكون عضلات اليوم أكثر من عدد التمارين المتاحة)،
// لكنه يضمن أن العضلة المُهمَلة تتغيّر بين توليدات مختلفة (تنويع أسبوعي/
// إعادة توليد) بدل أن تكون نفس العضلة مُهمَلة للأبد.
function rotateArray(arr, offset) {
  if (arr.length === 0) return arr;
  const o = ((offset % arr.length) + arr.length) % arr.length;
  return [...arr.slice(o), ...arr.slice(0, o)];
}

// بذرة افتراضية مشتقّة من هوية المستخدم (owner) - ثابتة عبر الزيارات لنفس
// المستخدم (لا يتغيّر برنامجه عشوائياً بلا سبب)، لكنها مختلفة عن أي مستخدم
// آخر بنفس بالضبط نفس الملف الرياضي - هذا ما يحقق "لا يرى الجميع نفس
// التمارين حرفياً" دون أي عشوائية غير محكومة.
export function seedFromOwner(owner) {
  let h = 0;
  const s = String(owner || "solo");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function candidatesFor(muscle, equipment, injuries, experience) {
  const allowedDifficulties = DIFFICULTY_ALLOWED[experience] || DIFFICULTY_ALLOWED.beginner;
  return EXERCISES.filter((e) =>
    e.muscle === muscle &&
    e.equipment.includes(equipment) &&
    allowedDifficulties.includes(e.difficulty) &&
    !e.joints.some((j) => injuries.includes(j)),
  );
}

// يختار تمريناً واحداً لعضلة معيّنة، مفضِّلاً المركّب على العزل ومستبعداً
// المستخدَم بالفعل هذا الأسبوع (تنويع بين الأيام) - مع تراجع لعضلة بديلة
// آمنة إن لم يبقَ أي مرشح صالح (انظر MUSCLE_FALLBACK أعلاه).
//
// visitedMuscles (داخلي فقط - لا يُمرَّر من أي نداء خارجي): يمنع الدخول في
// حلقة تراجع لا نهائية. MUSCLE_FALLBACK يحوي أزواجاً متبادلة عمداً
// (chest↔shoulders، biceps↔triceps، hamstrings↔glutes) لأن كل عضلة فيها
// بديل آمن معقول للأخرى - لكن هذا يعني أنه إن أصبحت مجموعتا التمارين
// المسموحتين لكلتا العضلتين فارغتين معاً في آن واحد (تركيبة معدات/خبرة/
// إصابة معيّنة - مؤكَّد حدوثه فعلياً: مبتدئ في نادي رياضي كامل مصاب
// بالمرفق)، كان التراجع يتنقّل بين العضلتين إلى ما لا نهاية ويُسقط
// التطبيق (Maximum call stack size exceeded). تتبّع العضلات المُجرَّبة في
// نفس سلسلة التراجع الحالية يوقف الحلقة بأمان (يعيد null لهذه الفتحة بدل
// الانهيار - المستدعي (buildProgram) يتجاهل بالفعل أي نتيجة null).
//
// usedPatternsToday (اختياري): مجموعة أنماط الحركة (movementPattern) المستخدَمة
// بالفعل في نفس جلسة اليوم - مبدأ تدريبي عام معروف: استهداف العضلة عبر أكثر
// من نمط حركة واحد ضمن نفس اليوم (دفع أفقي + رأسي مثلاً) يعطي تطوراً أعمّ من
// تكرار نفس النمط الحركي بأدوات مختلفة فقط. يُستخدَم فقط كتفضيل ثانوي بعد
// المركّب/العزل - لا يستبعد أي مرشح، فقط يعيد ترتيب الأولوية بينها.
function pickOneForMuscle(muscle, equipment, injuries, experience, usedIds, rng, substitutionFlag, usedPatternsToday, goal, avoidExerciseId, visitedMuscles) {
  const visited = visitedMuscles || new Set();
  visited.add(muscle);
  let pool = candidatesFor(muscle, equipment, injuries, experience).filter((e) => !usedIds.has(e.id));
  if (pool.length === 0) pool = candidatesFor(muscle, equipment, injuries, experience);
  if (pool.length === 0) {
    const fallbackMuscle = MUSCLE_FALLBACK[muscle];
    if (fallbackMuscle && !visited.has(fallbackMuscle)) {
      substitutionFlag.value = true;
      return pickOneForMuscle(fallbackMuscle, equipment, injuries, experience, usedIds, rng, substitutionFlag, usedPatternsToday, goal, avoidExerciseId, visited);
    }
    return null;
  }
  // تنويع بين إعادات التوليد: استبعاد التمرين المستخدَم سابقاً لنفس الفتحة
  // فقط إن بقي مرشَّح حقيقي واحد على الأقل بعد الاستبعاد - وإلا تكرار صادق
  // (لا بديل مُختلَق حين لا يوجد بديل فعلي).
  if (avoidExerciseId) {
    const withoutAvoided = pool.filter((e) => e.id !== avoidExerciseId);
    if (withoutAvoided.length > 0) pool = withoutAvoided;
  }
  const shuffled = seededShuffle(pool, rng);
  const bias = GOAL_COMPOUND_BIAS[goal] || "default";

  // "balanced": تجاوز فرز "مركّب أولاً" كلياً - استخدام ترتيب الخلط كما هو.
  if (bias === "balanced") return shuffled[0];

  const compoundOnly = shuffled.filter((e) => e.type === "compound" || e.type === "cardio");
  const compoundFirst = [...compoundOnly, ...shuffled.filter((e) => e.type === "isolation" || e.type === "mobility")];

  if (usedPatternsToday) {
    if (bias === "strict_compound") {
      // إغلاق الثغرة: البحث عن نمط جديد ضمن المركّب فقط (يتراجع للمجموعة
      // الكاملة إن لم يبقَ أي تمرين مركّب - لا فشل صلب أبداً).
      const searchPool = compoundOnly.length > 0 ? compoundOnly : compoundFirst;
      const novelPattern = searchPool.find((e) => e.movementPattern && !usedPatternsToday.has(e.movementPattern));
      if (novelPattern) return novelPattern;
    } else {
      const novelPattern = compoundFirst.find((e) => e.movementPattern && !usedPatternsToday.has(e.movementPattern));
      if (novelPattern) return novelPattern;
    }
  }
  return compoundFirst[0] || shuffled[0];
}

// ===== فرق عام عند "نقطة الانطلاق الأولى" فقط بين الجنسين (Cold Start) =====
// لا يمنع أو يقيّد أي مستخدم من أي تمرين أو مستوى شدة إطلاقاً، ولا يغيّر
// اختيار أي تمرين - يعدّل فقط عدد مجموعات (sets) تمرين مركّب واحد للجزء
// العلوي في اليوم (حد أقصى مجموعة إضافية واحدة).
//
// المرجع العلمي العام (فسيولوجيا تمرين عامة، لا تخصص طبي دقيق): نمط عام
// متكرر في أدبيات علم التدريب لدى غير المتمرّنين هو أن الفجوة النسبية في
// القوة القصوى المطلقة بين الجنسين تميل لأن تكون أوسع في حركات الجزء
// العلوي (دفع/سحب بالذراعين والكتفين والصدر) منها في حركات الجزء السفلي -
// نمط عام ملاحَظ، لا قاعدة مطلقة تنطبق على كل فرد، ولا يعني أي فرق في
// القدرة على التطور بالتدريب مع الوقت. الانعكاس العملي المحافظ هنا: مبدأ
// تدريبي عام مقبول هو منح حجم إضافي بسيط لنقطة الضعف النسبية الأكثر شيوعاً
// (مجموعة واحدة إضافية على تمرين مركّب واحد لا على الجلسة كاملة) بدل تركها
// بلا أي أولوية - في الملفات الأنثوية تحديداً. لم نطبّق أي تعديل معاكس على
// ملفات الذكور لعدم وجود نمط عام موثّق بنفس القوة في الاتجاه المقابل
// يستحق تفعيله افتراضياً - لا داعي لاختلاق تناظر غير موجود فعلياً في
// الأدبيات.
//
// الأهم: هذا "نقطة انطلاق أولية" فقط - hasPerformanceHistory (أي سجل أداء
// فعلي واحد على الأقل للمستخدم) يعطّله كلياً فيعود عدد المجموعات المحايد
// الأصلي لكل التمارين - عندها تتفوّق بيانات المستخدم الحقيقية (تقدّمه
// المسجَّل ومقارنات الأداء والإحصائيات) على أي متوسط عام. الأوزان
// والتكرارات نفسها لم تتأثر بهذا إطلاقاً في أي وقت - كانت ولا تزال تُدخَل
// يدوياً من أداء المستخدم الفعلي فقط، لا من أي افتراض جنسي.
const UPPER_BODY_MUSCLES = new Set(["chest", "back", "shoulders", "biceps", "triceps"]);

// ===== 3) بناء البرنامج الكامل =====
// assessment: { goal, experience, daysPerWeek, sessionMinutes, equipment, injuries: [], gender }
// hasPerformanceHistory: هل يملك المستخدم أي سجل أداء فعلي مسجَّل سابقاً؟
// (انظر التعليق أعلاه - يعطّل الافتراض الجنسي العام كلياً بمجرد توفّر
// بيانات حقيقية عن هذا المستخدم تحديداً).
// previousProgram (اختياري): البرنامج الحالي قبل الاستبدال - يُستخدَم فقط
// لتجنّب تكرار نفس التمرين في نفس "الفتحة" (نفس ترتيب اليوم/العضلة) إن
// وُجد بديل حقيقي (انظر avoidExerciseId في pickOneForMuscle أعلاه). لا
// يغيّر الحتمية - نفس (assessment, seed, previousProgram) يُعطي نفس النتيجة
// دائماً. آمن للتمرير فقط حين تكون بنية الأيام/العضلات للمدخلات الجديدة
// مطابقة للبرنامج السابق (نفس المستخدم يعيد توليد بنفس ملفه الرياضي) -
// لا يُمرَّر عند تغيّر الملف الشخصي فعلياً (معدات/أيام/هدف مختلفة).
export function buildProgram(assessment, seed, hasPerformanceHistory = false, previousProgram = null) {
  const { goal, experience, daysPerWeek, sessionMinutes, equipment, injuries = [], gender } = assessment;
  const actualSeed = Number.isFinite(seed) ? seed : seedFromOwner("solo");
  const split = pickSplit(daysPerWeek, experience);
  const exerciseCount = EXERCISE_COUNT_BY_DURATION[sessionMinutes] || 5;
  const volume = VOLUME_BY_GOAL[goal] || VOLUME_BY_GOAL.general_fitness;
  const sets = Math.max(2, volume.sets + (SETS_ADJUST_BY_EXPERIENCE[experience] || 0));

  const usedThisWeek = new Set();
  const substitutionFlag = { value: false };
  const genderAdjustedFlag = { value: false };

  const days = split.map((dayType, dayIndex) => {
    const dayMuscles = DAY_TYPE_MUSCLES[dayType] || DAY_TYPE_MUSCLES.full_body;
    // إزاحة تدوير مستقلة عن dayRng (بذرة مختلفة، لا تستهلك من مسار العشوائية
    // المستخدَم لاختيار التمارين نفسها) - صفر دائماً حين تتسع مدة الحصة لكل
    // عضلات اليوم أصلاً (لا تغيير سلوكي هنا)، وقيمة حقيقية فقط حين يوجد
    // احتمال إهمال دائم لعضلة (انظر rotateArray أعلاه).
    const rotationOffset = dayMuscles.length > exerciseCount
      ? (actualSeed + dayIndex * 613) % dayMuscles.length
      : 0;
    const muscles = rotateArray(dayMuscles, rotationOffset);
    const dayRng = mulberry32((actualSeed + dayIndex * 977) >>> 0);
    const picked = [];
    const usedPatternsToday = new Set();
    const addPicked = (ex) => { picked.push(ex); usedThisWeek.add(ex.id); if (ex.movementPattern) usedPatternsToday.add(ex.movementPattern); };

    // فهرسة معرّفات اليوم المقابل من البرنامج السابق حسب العضلة (بترتيب
    // ظهورها) - لاستبعاد نفس التمرين في نفس "الفتحة" الترتيبية لهذه العضلة
    // إن وُجد بديل حقيقي (انظر التعليق أعلى buildProgram).
    const prevDay = previousProgram?.days?.[dayIndex];
    const prevIdsByMuscle = {};
    if (prevDay) {
      for (const e of prevDay.exercises) {
        (prevIdsByMuscle[e.muscle] || (prevIdsByMuscle[e.muscle] = [])).push(e.id);
      }
    }
    const muscleOccurrence = {};
    const avoidIdFor = (muscle) => {
      const idx = muscleOccurrence[muscle] || 0;
      muscleOccurrence[muscle] = idx + 1;
      const list = prevIdsByMuscle[muscle];
      return list ? list[idx] : undefined;
    };
    // مرحلة أولى: تمرين واحد لكل عضلة مستهدَفة (تغطية متوازنة أولاً) - بنفس
    // الترتيب الأصلي المحايد دائماً (لا تأثير جنسي هنا) حتى تبقى تغطية كل
    // عضلات اليوم الأساسية مضمونة بالتساوي لكل مستخدم بغض النظر عن جنسه.
    for (const muscle of muscles) {
      if (picked.length >= exerciseCount) break;
      const ex = pickOneForMuscle(muscle, equipment, injuries, experience, usedThisWeek, dayRng, substitutionFlag, usedPatternsToday, goal, avoidIdFor(muscle));
      if (ex) addPicked(ex);
    }
    // مرحلة ثانية: إن سمحت مدة الحصة بتمارين إضافية، أضف تمريناً ثانياً
    // للعضلات الأساسية لليوم (أولوية للعضلات الكبرى) بالدوران عليها - بنفس
    // الترتيب المحايد دائماً، بلا أي تأثير جنسي هنا (انظر تعديل المجموعات
    // أدناه بعد بناء قائمة التمارين النهائية لليوم).
    let round = 0;
    while (picked.length < exerciseCount && round < muscles.length) {
      const muscle = muscles[round % muscles.length];
      const ex = pickOneForMuscle(muscle, equipment, injuries, experience, usedThisWeek, dayRng, substitutionFlag, usedPatternsToday, goal, avoidIdFor(muscle));
      if (ex) addPicked(ex);
      round++;
    }
    // إن كان الهدف تنشيفاً، أضف تمريناً كارديو ختامياً قصيراً (مبدأ عام:
    // عجز سعرات أكبر باستهلاك إضافي، لا يستبدل تمارين المقاومة الأساسية).
    if (goal === "lose_weight" && picked.length < exerciseCount + 1) {
      const cardioEx = pickOneForMuscle("cardio", equipment, injuries, experience, usedThisWeek, dayRng, substitutionFlag, usedPatternsToday, goal, avoidIdFor("cardio"));
      if (cardioEx) addPicked(cardioEx);
    }
    // تمرين تهدئة/مرونة واحد في ختام كل يوم بغضّ النظر عن الهدف - مبدأ
    // تدريبي عام (تمدد بعد تمرين المقاومة يساعد المرونة والتعافي). يُفعّل
    // هذا فعلياً مجموعة تمارين "المرونة" في قاعدة البيانات التي لم تكن تظهر
    // لأي مستخدم من قبل (لا split يستهدف mobility كعضلة رئيسية) - بيانات
    // كانت ميتة فعلياً حتى الآن.
    const cooldownEx = pickOneForMuscle("mobility", equipment, injuries, experience, usedThisWeek, dayRng, substitutionFlag, usedPatternsToday, goal, avoidIdFor("mobility"));
    if (cooldownEx) addPicked(cooldownEx);

    const exercises = picked.map((e) => ({
      ...e,
      sets: (e.muscle === "cardio" || e.muscle === "mobility") ? 1 : sets,
      reps: (e.type === "cardio" || e.type === "mobility") ? e.reps : volume.reps,
      restSeconds: restSecondsForType(volume.restSeconds, e.type),
    }));

    // نقطة انطلاق أولية فقط (انظر التعليق العلمي أعلاه UPPER_BODY_MUSCLES) -
    // مجموعة واحدة إضافية كحد أقصى، على تمرين مركّب واحد للجزء العلوي إن
    // وُجد في هذا اليوم تحديداً، لملفات الإناث بلا سجل أداء فعلي بعد.
    if (gender === "female" && !hasPerformanceHistory) {
      const target = exercises.find((e) => UPPER_BODY_MUSCLES.has(e.muscle) && e.type === "compound")
        || exercises.find((e) => UPPER_BODY_MUSCLES.has(e.muscle));
      if (target) { target.sets += 1; genderAdjustedFlag.value = true; }
    }

    return { dayIndex, dayType, exercises };
  });

  return {
    days,
    goal,
    experience,
    daysPerWeek,
    sessionMinutes,
    equipment,
    injuries,
    // ملاحظة: هذا العلم يعكس فقط استبدال عضلة مستهدَفة كاملة بأخرى فعلياً
    // (تراجع MUSCLE_FALLBACK حين تفرغ كل مجموعة العضلة الأصلية) - لا يعني
    // مجرد وجود إصابة في الملف الشخصي (ذلك مغطّى بتنبيه injuryDisclaimer
    // العام المنفصل في الواجهة). كان هذا العلم محسوباً سابقاً لكنه لم
    // يُعرَض في أي واجهة إطلاقاً - أصبح الآن يغذّي ملاحظة مخصَّصة في شاشة
    // البرنامج (انظر FitnessView.jsx) تُعلم المستخدم تحديداً أن عضلة
    // مستهدَفة استُبدلت بعضلة مجاورة آمنة بسبب إصابته.
    hasInjurySubstitutions: substitutionFlag.value,
    genderAdjusted: genderAdjustedFlag.value,
    seed: actualSeed,
    generatedAt: new Date().toISOString(),
  };
}

// ===== 4) بدائل تمرين مرتّبة بالأولوية (Priority 3: بدائل ذكية وكافية) =====
// نفس الفلاتر الصارمة المستخدَمة في محرّك بناء البرنامج نفسه (معدات/إصابات/
// مستوى خبرة - انظر candidatesFor أعلاه) تُطبَّق هنا حرفياً: أي بديل يظهر في
// القائمة كان سيُقبل أصلاً لو بُني برنامج المستخدم من الصفر بنفس شروطه
// بالضبط. الترتيب بعد الفلترة الصارمة (لا عشوائي) حسب معايير علمية عامة
// معروفة في تصميم برامج التمارين: تشابه نمط الحركة أولاً (أهم إشارة على
// أن البديل يخدم نفس الغرض التدريبي)، ثم توافق نوع التمرين (مركّب/عزل) مع
// نوع التمرين الأصلي وهدف المستخدم (المركّب عموماً أنسب لأهداف بناء العضل/
// خسارة الوزن)، ثم تطابق مستوى الصعوبة مع مستوى خبرة المستخدم نفسه تحديداً
// (لا فقط ضمن النطاق المسموح به عموماً)، وأخيراً تفضيل عتاد مختلف عن
// التمرين الأصلي (أكثر سبب واقعي لطلب بديل: المعدة الحالية مشغولة/غير
// متاحة). لا حد أدنى مُجبَر على عدد النتائج - الجودة أهم من الكمية: إن لم
// توجد بدائل كافية عالية الجودة (عضلة نادرة أو بيئة معدات محدودة)، تُعاد
// كل البدائل الصالحة المتوفرة فعلياً مهما قلّ عددها، بدل حشو القائمة.
function scoreAlternative(candidate, original, goal, experience) {
  let score = 0;
  if (candidate.movementPattern && candidate.movementPattern === original.movementPattern) score += 3;
  if (candidate.type === original.type) score += 2;
  if ((goal === "build_muscle" || goal === "lose_weight") && candidate.type === "compound") score += 1;
  if (candidate.difficulty === experience) score += 1;
  if (candidate.gear !== original.gear) score += 1;
  return score;
}

export function pickAlternatives(exercise, assessment, excludeIds = [], limit = 10) {
  const { equipment, injuries = [], experience, goal } = assessment;
  const allowedDifficulties = DIFFICULTY_ALLOWED[experience] || DIFFICULTY_ALLOWED.beginner;
  const pool = EXERCISES.filter((e) =>
    e.id !== exercise.id &&
    e.muscle === exercise.muscle &&
    !excludeIds.includes(e.id) &&
    e.equipment.includes(equipment) &&
    allowedDifficulties.includes(e.difficulty) &&
    !e.joints.some((j) => injuries.includes(j)),
  );
  return pool
    .map((e) => ({ e, score: scoreAlternative(e, exercise, goal, experience) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.e);
}

// ===== 5) التطوّر التلقائي (Progressive Overload) =====
// يحلّل آخر جلسة مسجَّلة لهذا التمرين: إن حقّق المستخدم الحد الأعلى لنطاق
// التكرارات المستهدَف بكل المجموعات المقرَّرة، يقترح زيادة صغيرة (وزن إن
// كان مسجَّلاً، وإلا تكرار إضافي لتمارين وزن الجسم) - مبدأ عام معروف.
export function parseRepRange(reps) {
  const s = String(reps || "");
  const range = s.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return [Number(range[1]), Number(range[2])];
  const single = s.match(/(\d+)/);
  const n = single ? Number(single[1]) : 10;
  return [n, n];
}

// يجمع صفوف سجل تمرين واحد حسب التاريخ في صف واحد ممثِّل لكل يوم - ضروري
// لأن "وضع التركيز" (Focus Mode) في FitnessView.jsx يسجّل كل مجموعة كصف
// مستقل (setsCompleted: 1 لكل صف) بدل صف تجميعي واحد كالتسجيل اليدوي
// القديم، فيصبح ليوم واحد عدة صفوف بدل صف واحد. عدد المجموعات = مجموع
// الصفوف لذلك اليوم، والوزن = أثقل وزن استُخدم (أصعب مجموعة فعلية)،
// والتكرارات = أقل عدد تكرارات أُنجز بين المجموعات (القياس المحافظ: "هل
// حقّق الهدف في كل مجموعة" لا في مجموعة واحدة فقط). سجل قديم بصف واحد لكل
// يوم يمر عبر هذه الدالة بلا أي تغيير في النتيجة (توافق كامل مع البيانات
// السابقة).
export function aggregateLogsByDate(logsForExercise) {
  const byDate = {};
  for (const log of logsForExercise || []) {
    if (!byDate[log.date]) byDate[log.date] = { date: log.date, setsCompleted: 0, maxWeight: 0, minReps: Infinity, lastReps: 0 };
    const bucket = byDate[log.date];
    bucket.setsCompleted += log.setsCompleted || 0;
    if ((log.weight || 0) > bucket.maxWeight) bucket.maxWeight = log.weight || 0;
    if ((log.reps || 0) < bucket.minReps) bucket.minReps = log.reps || 0;
    bucket.lastReps = log.reps || bucket.lastReps;
  }
  return Object.values(byDate)
    .map((b) => ({
      date: b.date, setsCompleted: b.setsCompleted,
      weight: b.maxWeight > 0 ? b.maxWeight : null,
      reps: b.minReps === Infinity ? b.lastReps : b.minReps,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function suggestProgression(exercise, logsForExercise) {
  // التطوّر التدريجي (وزن/تكرار إضافي) مفهوم خاص بتمارين المقاومة - حقل
  // "reps" في الكارديو/المرونة هو في الحقيقة مدة بالثواني (مثال: "20-30
  // seconds per side")، فاقتراح "جرّب رقماً+1 تكراراً" كان يعرض رقم الثواني
  // على أنه تكرار (مربك وغير دقيق علمياً - "جرّب 31" لتمديد كان يبدو وكأنه
  // 31 تكراراً بدل 31 ثانية). لا معنى علمياً لإيقاف الحساب هنا بديل صحيح -
  // ببساطة لا نقترح شيئاً لهذين النوعين.
  if (exercise.type === "cardio" || exercise.type === "mobility") return null;
  const aggregated = aggregateLogsByDate(logsForExercise);
  if (aggregated.length === 0) return null;
  const last = aggregated[aggregated.length - 1];
  const [, repUpper] = parseRepRange(exercise.reps);
  const metTarget = (last.reps || 0) >= repUpper && (last.setsCompleted || 0) >= exercise.sets;
  if (!metTarget) return null;
  if (last.weight && last.weight > 0) {
    const increment = last.weight >= 20 ? 2.5 : 1.25;
    const [repLower] = parseRepRange(exercise.reps);
    return { type: "weight", suggestedWeight: Math.round((last.weight + increment) * 100) / 100, suggestedReps: repLower };
  }
  return { type: "reps", suggestedReps: (last.reps || repUpper) + 1 };
}

// تقدير أقصى وزن لمرة واحدة (1RM) بمعادلة Epley - معادلة علمية عامة منشورة
// منذ عقود (Epley, 1985) لا حقوق ملكية عليها، مستخدَمة في كل مصادر علم
// التدريب كنقطة بداية تقديرية (ليست قياساً دقيقاً حقيقياً - تختلف كل جسم
// عن الأخرى، والتقدير يفقد دقته مع التكرارات العالية جداً).
export function estimateOneRepMax(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r <= 0) return null;
  if (r === 1) return Math.round(w * 10) / 10;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

// ===== 6) مقارنة الأداء مع الجلسة السابقة =====
// آخر أداء مسجَّل لهذا التمرين (باستثناء تاريخ الجلسة الحالية، حتى لا تُقارَن
// مجموعات اليوم ببعضها أثناء وضع التركيز، بل بالجلسة السابقة الفعلية).
export function getLastPerformance(exerciseId, workoutLog, excludeDate) {
  const logs = (workoutLog || []).filter((l) => l.exerciseId === exerciseId && l.date !== excludeDate);
  const aggregated = aggregateLogsByDate(logs);
  return aggregated.length > 0 ? aggregated[aggregated.length - 1] : null;
}

// ===== 7) حجم التدريب (Training Volume = وزن × تكرارات × مجموعات) =====
// نجمعه فقط للتمارين التي بها وزن رقمي فعلي مسجَّل - الحجم بتعريفه العلمي هو
// "حمل × تكرار × مجموعات"، وتمارين وزن الجسم بلا وزن مسجَّل ليس لها حمل رقمي
// حقيقي لتضمينه بأمانة (لا نستخدم رقماً وهمياً كبديل عن الوزن).
export function setVolume(log) {
  return log.weight && log.weight > 0 ? log.weight * (log.reps || 0) * (log.setsCompleted || 0) : 0;
}

export function computeSessionVolumeByMuscle(workoutLog, date) {
  const byMuscle = {};
  for (const log of workoutLog || []) {
    if (log.date !== date) continue;
    const exercise = EXERCISES_BY_ID[log.exerciseId];
    if (!exercise) continue;
    const vol = setVolume(log);
    if (vol <= 0) continue;
    byMuscle[exercise.muscle] = (byMuscle[exercise.muscle] || 0) + vol;
  }
  return byMuscle;
}

// آخر تاريخ يحمل أي سجل أداء - لعرض حجم/سعرات "آخر جلسة" دون افتراض أنها اليوم.
export function mostRecentLoggedDate(workoutLog) {
  let latest = null;
  for (const log of workoutLog || []) {
    if (!latest || log.date > latest) latest = log.date;
  }
  return latest;
}

// ===== 8) تقدير السعرات الحرارية المحروقة في الجلسة =====
// معادلة MET العامة والمعروفة في علم الفسيولوجيا الرياضية (ACSM):
// سعرات/دقيقة = (MET × 3.5 × وزن الجسم كغ) / 200. قيم MET أدناه تقريبية عامة
// حسب نوع التمرين (مركّب/عزل أثقل شدةً من كارديو خفيف، إلخ) - مرجع علمي عام
// (Compendium of Physical Activities) لا نسخ من أي تطبيق. مدة كل مجموعة
// تقديرية أيضاً (وقت أداء + راحة معتادان) لأن سجل الأداء لا يخزّن التوقيت
// الفعلي - النتيجة تقدير عام يجب عرضه دائماً موصوفاً بذلك، لا رقماً دقيقاً.
const MET_BY_TYPE = { compound: 6, isolation: 3.5, cardio: 8, mobility: 2.5 };
const MINUTES_PER_SET_BY_TYPE = { compound: 1.5, isolation: 1.2, cardio: 1, mobility: 0.75 };

export function estimateSessionCalories(workoutLog, date, bodyWeightKg) {
  if (!bodyWeightKg || bodyWeightKg <= 0) return null;
  let totalCalories = 0;
  let matchedAnyLog = false;
  for (const log of workoutLog || []) {
    if (log.date !== date) continue;
    const exercise = EXERCISES_BY_ID[log.exerciseId];
    if (!exercise) continue;
    matchedAnyLog = true;
    const met = MET_BY_TYPE[exercise.type] || 5;
    const minutes = (MINUTES_PER_SET_BY_TYPE[exercise.type] || 1.2) * (log.setsCompleted || 0);
    totalCalories += ((met * 3.5 * bodyWeightKg) / 200) * minutes;
  }
  return matchedAnyLog ? Math.round(totalCalories) : null;
}
