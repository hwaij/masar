// محرّك بناء برنامج التمارين - "المدرب الشخصي الذكي". هذا هو الأساس
// الموثوق الذي يعمل دائماً (بلا أي اتصال شبكة)، حتى لو استُخدمت طبقة
// Gemini إضافية للتنويع اللغوي فوقه لاحقاً (لا تعتمد الوظائف الأساسية هنا
// على أي استدعاء AI إطلاقاً).
//
// كل المبادئ أدناه (اختيار التقسيم split حسب الأيام والمستوى، حجم التدريب
// sets/reps حسب الهدف، ترتيب التمارين المركّبة قبل العزل، progressive
// overload) مبادئ علمية عامة متّفق عليها في علم التدريب - لا اسم مدرب أو
// برنامج تجاري محدَّد مذكور أو منسوخ هنا.
import { EXERCISES } from "./exercises-db";

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
function pickOneForMuscle(muscle, equipment, injuries, experience, usedIds, rng, substitutionFlag) {
  let pool = candidatesFor(muscle, equipment, injuries, experience).filter((e) => !usedIds.has(e.id));
  if (pool.length === 0) pool = candidatesFor(muscle, equipment, injuries, experience);
  if (pool.length === 0) {
    const fallbackMuscle = MUSCLE_FALLBACK[muscle];
    if (fallbackMuscle) {
      substitutionFlag.value = true;
      return pickOneForMuscle(fallbackMuscle, equipment, injuries, experience, usedIds, rng, substitutionFlag);
    }
    return null;
  }
  if (injuries.length > 0) substitutionFlag.value = true;
  const shuffled = seededShuffle(pool, rng);
  const compoundFirst = [...shuffled.filter((e) => e.type === "compound" || e.type === "cardio"), ...shuffled.filter((e) => e.type === "isolation" || e.type === "mobility")];
  return compoundFirst[0] || shuffled[0];
}

// ===== 3) بناء البرنامج الكامل =====
// assessment: { goal, experience, daysPerWeek, sessionMinutes, equipment, injuries: [] }
export function buildProgram(assessment, seed) {
  const { goal, experience, daysPerWeek, sessionMinutes, equipment, injuries = [] } = assessment;
  const actualSeed = Number.isFinite(seed) ? seed : seedFromOwner("solo");
  const split = pickSplit(daysPerWeek, experience);
  const exerciseCount = EXERCISE_COUNT_BY_DURATION[sessionMinutes] || 5;
  const volume = VOLUME_BY_GOAL[goal] || VOLUME_BY_GOAL.general_fitness;
  const sets = Math.max(2, volume.sets + (SETS_ADJUST_BY_EXPERIENCE[experience] || 0));

  const usedThisWeek = new Set();
  const substitutionFlag = { value: false };

  const days = split.map((dayType, dayIndex) => {
    const muscles = DAY_TYPE_MUSCLES[dayType] || DAY_TYPE_MUSCLES.full_body;
    const dayRng = mulberry32((actualSeed + dayIndex * 977) >>> 0);
    const picked = [];
    // مرحلة أولى: تمرين واحد لكل عضلة مستهدَفة (تغطية متوازنة أولاً).
    for (const muscle of muscles) {
      if (picked.length >= exerciseCount) break;
      const ex = pickOneForMuscle(muscle, equipment, injuries, experience, usedThisWeek, dayRng, substitutionFlag);
      if (ex) { picked.push(ex); usedThisWeek.add(ex.id); }
    }
    // مرحلة ثانية: إن سمحت مدة الحصة بتمارين إضافية، أضف تمريناً ثانياً
    // للعضلات الأساسية لليوم (أولوية للعضلات الكبرى) بالدوران عليها.
    let round = 0;
    while (picked.length < exerciseCount && round < muscles.length) {
      const muscle = muscles[round % muscles.length];
      const ex = pickOneForMuscle(muscle, equipment, injuries, experience, usedThisWeek, dayRng, substitutionFlag);
      if (ex) { picked.push(ex); usedThisWeek.add(ex.id); }
      round++;
    }
    // إن كان الهدف تنشيفاً، أضف تمريناً كارديو ختامياً قصيراً (مبدأ عام:
    // عجز سعرات أكبر باستهلاك إضافي، لا يستبدل تمارين المقاومة الأساسية).
    if (goal === "lose_weight" && picked.length < exerciseCount + 1) {
      const cardioEx = pickOneForMuscle("cardio", equipment, injuries, experience, usedThisWeek, dayRng, substitutionFlag);
      if (cardioEx) { picked.push(cardioEx); usedThisWeek.add(cardioEx.id); }
    }

    return {
      dayIndex,
      dayType,
      exercises: picked.map((e) => ({
        ...e,
        sets: e.muscle === "cardio" ? 1 : sets,
        reps: e.type === "cardio" ? e.reps : volume.reps,
        restSeconds: volume.restSeconds,
      })),
    };
  });

  return {
    days,
    goal,
    experience,
    daysPerWeek,
    sessionMinutes,
    equipment,
    injuries,
    hasInjurySubstitutions: substitutionFlag.value || injuries.length > 0,
    seed: actualSeed,
    generatedAt: new Date().toISOString(),
  };
}

// ===== 4) استبدال تمرين واحد ("بديل") - نفس العضلة، معدات/إصابات متوافقة =====
export function pickAlternative(exercise, assessment, excludeIds = []) {
  const { equipment, injuries = [], experience } = assessment;
  const allowedDifficulties = DIFFICULTY_ALLOWED[experience] || DIFFICULTY_ALLOWED.beginner;
  const pool = EXERCISES.filter((e) =>
    e.id !== exercise.id &&
    e.muscle === exercise.muscle &&
    !excludeIds.includes(e.id) &&
    e.equipment.includes(equipment) &&
    allowedDifficulties.includes(e.difficulty) &&
    !e.joints.some((j) => injuries.includes(j)),
  );
  if (pool.length === 0) return null;
  const sameType = pool.filter((e) => e.type === exercise.type);
  const candidates = sameType.length > 0 ? sameType : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
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
