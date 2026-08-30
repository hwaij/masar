// التقرير اليومي التفصيلي (Priority 2) - طبقة تجميع بحتة (aggregation) تدمج
// الجداول اليومية الموجودة فعلياً (nutrition_log، sleep_log، steps_log،
// workout_log، fitness_log، focus_sessions، weight_log، وentries المُصفّاة
// مسبقاً لفئة "الدراسة" فقط - Priority 4) بمفتاح التاريخ المشترك إلى صف
// واحد مسطَّح لكل يوم - جاهز مباشرة للعرض ولتصدير CSV نحو
// أدوات تحليل إحصائي (Excel/SPSS/R). هذا الملف لا يعرض أي واجهة، ولا يُنتج
// أي استنتاج أو "علاقة" بين المتغيرات - فقط بيانات منظَّمة جنباً إلى جنب،
// كما طُلب صراحةً: "لا نريد تقريراً صحفياً... نريد بيانات منظمة وقابلة
// للتحليل" و"لا نريد من النظام أن يقول إن هناك علاقة سببية".
//
// قاعدة صدق أساسية: أي يوم/حقل بلا بيانات فعلية يبقى null، لا صفراً مُلفَّقاً
// (صفر سعرات ليوم لم يُسجَّل فيه طعام إطلاقاً كان سيبدو كأن المستخدم صام،
// وهذا ادّعاء غير موجود في البيانات الفعلية).

import { MEAL_TYPES } from "./nutrition";

function round1(n) { return Math.round(n * 10) / 10; }

// فرق الدقائق بين وقتين "HH:MM"، مع عبور منتصف الليل (نهاية أصغر من البداية
// تعني أن الفترة عبرت منتصف الليل، لا خطأ إدخال) - نفس منطق diffMinutes في
// helpers.js لكن مستقلة هنا عمداً (هذا الملف بلا أي استيراد من helpers.js).
function hmDiffMinutes(startHHMM, endHHMM) {
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

function avgOrNull(nums) {
  const valid = nums.filter((n) => typeof n === "number" && Number.isFinite(n));
  if (!valid.length) return null;
  return round1(valid.reduce((s, n) => s + n, 0) / valid.length);
}

function sumOrNull(nums) {
  const valid = nums.filter((n) => typeof n === "number" && Number.isFinite(n));
  if (!valid.length) return null;
  return round1(valid.reduce((s, n) => s + n, 0));
}

// ملخص نصي لأصناف وجبة واحدة يوماً واحداً - "ماذا أكل" كما طُلب حرفياً في
// الرؤية، مرفَقاً بجانب الأرقام المجمَّعة لنفس الوجبة، لا بدلاً عنها.
function summarizeFoods(entries) {
  if (!entries.length) return null;
  return entries.map((e) => (e.servingInfo ? `${e.foodName} (${e.servingInfo})` : e.foodName)).join("؛ ");
}

function mealAggregate(entries) {
  if (!entries.length) {
    return { foods: null, calories: null, proteinG: null, carbsG: null, fatG: null, mood: null, stress: null };
  }
  return {
    foods: summarizeFoods(entries),
    calories: sumOrNull(entries.map((e) => e.calories)),
    proteinG: sumOrNull(entries.map((e) => e.protein)),
    carbsG: sumOrNull(entries.map((e) => e.carbs)),
    fatG: sumOrNull(entries.map((e) => e.fat)),
    mood: avgOrNull(entries.map((e) => e.mood)),
    stress: avgOrNull(entries.map((e) => e.stress)),
  };
}

// يبني صفاً واحداً مسطَّحاً ليوم واحد من كل الجداول اليومية المُمرَّرة. لا
// يحسب أي متوسط/اتجاه عبر أيام متعددة هنا - هذا مسؤولية طبقة العرض إن
// احتاجته لاحقاً؛ هذه الدالة تبني فقط سجل اليوم الواحد الخام.
function buildDayRow(date, prevDate, { nutritionLog, sleepLog, stepsLog, workoutLog, fitnessLog, focus, weightLog, studyEntries }) {
  const dayFoods = nutritionLog.filter((e) => e.date === date);
  const mealRows = {};
  MEAL_TYPES.forEach((mt) => { mealRows[mt] = mealAggregate(dayFoods.filter((e) => e.mealType === mt)); });

  const totalCalories = sumOrNull(dayFoods.map((e) => e.calories));
  const totalProteinG = sumOrNull(dayFoods.map((e) => e.protein));
  const totalCarbsG = sumOrNull(dayFoods.map((e) => e.carbs));
  const totalFatG = sumOrNull(dayFoods.map((e) => e.fat));
  const totalFiberG = sumOrNull(dayFoods.map((e) => e.fiber));
  const totalSugarG = sumOrNull(dayFoods.map((e) => e.sugar));
  const totalSodiumMg = sumOrNull(dayFoods.map((e) => e.sodium));
  const totalCholesterolMg = sumOrNull(dayFoods.map((e) => e.cholesterol));

  const sleepEntry = sleepLog.find((s) => s.date === date) || null;
  // مخطَّط (Priority 3، أُدخِل مساءً قبل النوم) مقابل فعلي (sleepBedtime/
  // sleepWakeTime/sleepHours أعلاه) - عمداً منفصلان تماماً، لا افتراض أن
  // أحدهما يساوي الآخر. plannedHours تُحسَب هنا (لا تُخزَّن) من الوقتين
  // المخطَّطين مباشرة - نفس منطق diffMinutes مع عبور منتصف الليل.
  const plannedHours = sleepEntry?.plannedBedtime && sleepEntry?.plannedWakeTime
    ? round1(hmDiffMinutes(sleepEntry.plannedBedtime, sleepEntry.plannedWakeTime) / 60)
    : null;

  const dayWorkouts = workoutLog.filter((w) => w.date === date);
  const exercisesTrainedCount = dayWorkouts.length ? new Set(dayWorkouts.map((w) => w.exerciseId)).size : null;
  const setsCompleted = dayWorkouts.length ? sumOrNull(dayWorkouts.map((w) => w.setsCompleted)) : null;
  const workoutCompleted = date in fitnessLog ? !!fitnessLog[date] : null;

  // خلل حقيقي وُجد وأُصلح: كانت هذه الحسابات تعتمد على focus_sessions
  // (جلسات المؤقّت) فقط، متجاهلة تماماً "عجلة اليوم" العامة (نظام entries/
  // categories الأقدم - فئة "دراسة") التي يدمجها قسم التركيز/الدراسة نفسه
  // (FocusReport) فعلياً في إحصائياته الخاصة. أي مستخدم يسجّل دراسته عبر
  // العجلة بدل المؤقّت كانت أيامه تظهر "لا دراسة إطلاقاً" زوراً في التقرير
  // الشامل رغم وجود بيانات فعلية - studyEntries (مُمرَّرة من ReportsView، مُصفّاة
  // مسبقاً لفئة الدراسة فقط، بنفس منطق الفلترة في FocusView/BotsChallenge)
  // تُدمَج هنا الآن بنفس الأسلوب تماماً.
  const dayFocus = focus.filter((f) => f.date === date);
  const dayStudyEntries = (studyEntries || []).filter((e) => e.date === date);
  const studyEntryMinutesList = dayStudyEntries.map((e) => hmDiffMinutes(e.start, e.end));
  const totalSessionsCount = dayFocus.length + dayStudyEntries.length;
  const focusSessionsCount = totalSessionsCount ? totalSessionsCount : null;
  const focusMinutesTotal = totalSessionsCount
    ? dayFocus.reduce((s, f) => s + f.minutes, 0) + studyEntryMinutesList.reduce((s, m) => s + m, 0)
    : null;
  const studyMinutesList = [...dayFocus.filter((f) => f.isStudy).map((f) => f.minutes), ...studyEntryMinutesList];
  const studyMinutes = studyMinutesList.length ? studyMinutesList.reduce((s, m) => s + m, 0) : null;

  const stepsEntry = stepsLog[date] || null;

  const weightKg = typeof weightLog[date] === "number" ? weightLog[date] : null;
  let weightChangeKg = null;
  if (weightKg != null && prevDate != null) {
    const prevWeight = typeof weightLog[prevDate] === "number" ? weightLog[prevDate] : null;
    if (prevWeight != null) weightChangeKg = round1(weightKg - prevWeight);
  }

  return {
    date,
    plannedBedtime: sleepEntry?.plannedBedtime ?? null,
    plannedWakeTime: sleepEntry?.plannedWakeTime ?? null,
    plannedHours,
    sleepBedtime: sleepEntry?.sleepTime ?? null,
    sleepWakeTime: sleepEntry?.wakeTime ?? null,
    sleepHours: sleepEntry?.hours ?? null,
    breakfastFoods: mealRows.breakfast.foods, breakfastCalories: mealRows.breakfast.calories,
    breakfastProteinG: mealRows.breakfast.proteinG, breakfastCarbsG: mealRows.breakfast.carbsG, breakfastFatG: mealRows.breakfast.fatG,
    breakfastMood: mealRows.breakfast.mood, breakfastStress: mealRows.breakfast.stress,
    lunchFoods: mealRows.lunch.foods, lunchCalories: mealRows.lunch.calories,
    lunchProteinG: mealRows.lunch.proteinG, lunchCarbsG: mealRows.lunch.carbsG, lunchFatG: mealRows.lunch.fatG,
    lunchMood: mealRows.lunch.mood, lunchStress: mealRows.lunch.stress,
    dinnerFoods: mealRows.dinner.foods, dinnerCalories: mealRows.dinner.calories,
    dinnerProteinG: mealRows.dinner.proteinG, dinnerCarbsG: mealRows.dinner.carbsG, dinnerFatG: mealRows.dinner.fatG,
    dinnerMood: mealRows.dinner.mood, dinnerStress: mealRows.dinner.stress,
    snackFoods: mealRows.snack.foods, snackCalories: mealRows.snack.calories,
    snackProteinG: mealRows.snack.proteinG, snackCarbsG: mealRows.snack.carbsG, snackFatG: mealRows.snack.fatG,
    snackMood: mealRows.snack.mood, snackStress: mealRows.snack.stress,
    totalCalories, totalProteinG, totalCarbsG, totalFatG, totalFiberG, totalSugarG, totalSodiumMg, totalCholesterolMg,
    steps: stepsEntry ? stepsEntry.steps : null,
    workoutCompleted,
    exercisesTrainedCount, setsCompleted,
    focusMinutesTotal, studyMinutes, focusSessionsCount,
    weightKg, weightChangeKg,
  };
}

// نقطة الدخول: days مصفوفة تواريخ (YYYY-MM-DD، محلية - localDayKey) مرتَّبة
// تصاعدياً كما تُبنى أصلاً في ReportsView. logs.* هي نفس الأشكال المُحمَّلة
// فعلياً عبر store.js بلا أي تحويل مسبق من المستدعي.
export function buildComprehensiveReport(days, logs) {
  return days.map((date, i) => buildDayRow(date, i > 0 ? days[i - 1] : null, logs));
}

// أعمدة CSV بترتيب ثابت + عناوين إنجليزية واضحة (لتوافق أدوات التحليل
// الإحصائي القياسية التي تتوقع عناوين ASCII) - كل عمود يقابل حقلاً واحداً في
// صف buildDayRow بلا أي تحويل إضافي، والقيم الفارغة تُكتَب كخلية فارغة تماماً
// (لا "0" ولا "N/A") لتبقى قابلة للتفسير الصحيح في Excel/SPSS/R كـ"قيمة
// مفقودة" حقيقية بدل صفر أو نص عشوائي.
export const CSV_COLUMNS = [
  ["date", "Date"],
  ["plannedBedtime", "Planned Bedtime"], ["plannedWakeTime", "Planned Wake Time"], ["plannedHours", "Planned Sleep Hours"],
  ["sleepBedtime", "Sleep Bedtime"], ["sleepWakeTime", "Sleep Wake Time"], ["sleepHours", "Sleep Hours"],
  ["breakfastFoods", "Breakfast Foods"], ["breakfastCalories", "Breakfast Calories"], ["breakfastProteinG", "Breakfast Protein (g)"], ["breakfastCarbsG", "Breakfast Carbs (g)"], ["breakfastFatG", "Breakfast Fat (g)"], ["breakfastMood", "Breakfast Mood (1-5)"], ["breakfastStress", "Breakfast Stress (1-5)"],
  ["lunchFoods", "Lunch Foods"], ["lunchCalories", "Lunch Calories"], ["lunchProteinG", "Lunch Protein (g)"], ["lunchCarbsG", "Lunch Carbs (g)"], ["lunchFatG", "Lunch Fat (g)"], ["lunchMood", "Lunch Mood (1-5)"], ["lunchStress", "Lunch Stress (1-5)"],
  ["dinnerFoods", "Dinner Foods"], ["dinnerCalories", "Dinner Calories"], ["dinnerProteinG", "Dinner Protein (g)"], ["dinnerCarbsG", "Dinner Carbs (g)"], ["dinnerFatG", "Dinner Fat (g)"], ["dinnerMood", "Dinner Mood (1-5)"], ["dinnerStress", "Dinner Stress (1-5)"],
  ["snackFoods", "Snack Foods"], ["snackCalories", "Snack Calories"], ["snackProteinG", "Snack Protein (g)"], ["snackCarbsG", "Snack Carbs (g)"], ["snackFatG", "Snack Fat (g)"], ["snackMood", "Snack Mood (1-5)"], ["snackStress", "Snack Stress (1-5)"],
  ["totalCalories", "Total Calories"], ["totalProteinG", "Total Protein (g)"], ["totalCarbsG", "Total Carbs (g)"], ["totalFatG", "Total Fat (g)"], ["totalFiberG", "Total Fiber (g)"], ["totalSugarG", "Total Sugar (g)"], ["totalSodiumMg", "Total Sodium (mg)"], ["totalCholesterolMg", "Total Cholesterol (mg)"],
  ["steps", "Steps"],
  ["workoutCompleted", "Workout Completed"], ["exercisesTrainedCount", "Exercises Trained"], ["setsCompleted", "Sets Completed"],
  ["focusMinutesTotal", "Focus Minutes"], ["studyMinutes", "Study Minutes"], ["focusSessionsCount", "Focus/Study Sessions"],
  ["weightKg", "Weight (kg)"], ["weightChangeKg", "Weight Change (kg)"],
];

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// owner: مُعرِّف يُكتَب في عمود "Owner" فقط - حالياً اسم المستخدم كما أدخله
// بنفسه في الملف الشخصي (profile.name، أو بديل واضح "User"/"مستخدم" إن لم
// يُدخِله بعد)، لأن هذا تصدير شخصي يُصدِّره المستخدم لنفسه (MasarApp.jsx:
// exportDailyCsv). ملاحظة توثيقية لأي عمل مستقبلي على تصدير بحثي جماعي (بعد
// موافقات أكاديمية/أخلاقية): في ذلك السياق تحديداً يجب استبدال هذا بمعرّف
// بحثي مجهَّل (Participant ID) لا الاسم الحقيقي - لا تُستخدَم هذه الدالة كما
// هي لتصدير عدة مشاركين دفعة واحدة بلا تعديل أولاً. لا تنفيذ فعلي لهذا الآن،
// توثيق فقط.
export function rowsToCsv(rows, owner) {
  const header = ["Owner", ...CSV_COLUMNS.map(([, label]) => label)].join(",");
  const lines = rows.map((row) => [csvEscape(owner), ...CSV_COLUMNS.map(([key]) => csvEscape(row[key]))].join(","));
  return [header, ...lines].join("\n");
}
