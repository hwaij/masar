// تصدير Excel حقيقي (.xlsx) للتقرير اليومي الشامل - يضيف فوق نفس بيانات
// rowsToCsv (comprehensiveReport.js) طبقتين جديدتين فقط لكل يوم:
// 1) عمودا "احتياج" لكل عنصر غذائي أساسي (سعرات/بروتين/كارب/دهون)، محسوبان
//    فعلياً عبر getDailyNutritionSummary (nutrition-plan.js) - نفس الدالة
//    المستخدمة أصلاً في NutritionView.jsx/AssistantView لعرض هدف اليوم، لا
//    حساب موازٍ جديد. nutritionPlan تُمرَّر دائماً null هنا عمداً - مطابقةً
//    للسلوك القائم في كلا الموضعين أعلاه (خطة غذائية نشطة مختارة لا تُستخدَم
//    كمصدر الهدف خارج شاشتها المخصّصة؛ المصدر دائماً هو TEE) - قرار موجود
//    مسبقاً في الكود، لا قرار جديد اتُّخذ هنا.
// 2) عمود "حالة" نصي واحد لكل عنصر (نسبة % + تصنيف نصي معاً في خلية واحدة)،
//    وتلوين تلقائي لخلية الاستهلاك الفعلي (الإجمالي اليومي) لنفس العنصر.
//
// الاحتياج اليومي يعتمد فقط على healthProfile.tee الحالي (لا يوجد تخزين
// تاريخي لسجل صحي لكل يوم في هذا التطبيق) - لذا قيمته متقاربة/متطابقة عبر
// كل الأيام لنفس المستخدم ما لم يتغيّر ملفه الصحي، لكنها تُحسَب فعلياً لكل
// صف عبر الدالة الحقيقية، لا رقماً ثابتاً مكتوباً يدوياً.
//
// حدود التصنيف النصي (4 مستويات، على كل من السعرات/البروتين/الكارب/الدهون
// كل عنصر بمعزل عن الآخرين): منخفض ≤50%، متوسط 50-90%، ضمن الحد 90-110%،
// تجاوز >110%. التلوين أبسط عمداً (3 حالات فقط، مطابقة لحدَّي "منخفض"
// و"تجاوز" بالضبط): أزرق لـ≤50%، أحمر لـ>110%، بلا تلوين لما بينهما (يشمل
// كلاً من "متوسط" و"ضمن الحد" النصيَّين معاً).
import ExcelJS from "exceljs";
import { getDailyNutritionSummary } from "./nutrition-plan";

// ألوان تعبئة آمنة قياسية (ARGB) - خلفية فاتحة مقروءة بنص أسود افتراضي في
// أي برنامج (Excel/Sheets/Numbers)، بمعزل تام عن أي "وضع داكن" لواجهة ذلك
// البرنامج نفسه (تلوين الخلية في ملف .xlsx صريح وثابت، لا يتأثر بثيم التطبيق
// الذي يفتحه - الملف يُفتح خارج مسار مسار نفسه دائماً).
const FILL_EXCEEDED = "FFF8D7DA"; // أحمر فاتح
const FILL_LOW = "FFD6E4FF"; // أزرق فاتح
const TEXT_EXCEEDED = "FF842029";
const TEXT_LOW = "FF1B4F91";

function pctOf(consumed, goal) {
  if (typeof consumed !== "number" || typeof goal !== "number" || goal <= 0) return null;
  return Math.round((consumed / goal) * 100);
}

// تصنيف نصي بأربعة مستويات - راجع تعليق الملف أعلاه للحدود المختارة.
function statusTier(pct) {
  if (pct == null) return null;
  if (pct <= 50) return "low";
  if (pct <= 90) return "medium";
  if (pct <= 110) return "within";
  return "exceeded";
}

const TIER_LABEL = {
  low: { ar: "منخفض", en: "Low" },
  medium: { ar: "متوسط", en: "Medium" },
  within: { ar: "ضمن الحد", en: "Within range" },
  exceeded: { ar: "تجاوز", en: "Exceeded" },
};

// نص حالة واحد يجمع الرقم والتصنيف معاً كما طُلب صراحةً ("رقمياً ونصياً
// معاً") - noGoal/noData حالتان صادقتان منفصلتان (لا افتراض صفر أو "منخفض"
// لبيانات غير موجودة أصلاً - نفس مبدأ الصدق المتَّبع في كل هذا التطبيق).
function statusText(consumed, goal, isEn) {
  if (typeof goal !== "number" || goal <= 0) return isEn ? "Need not calculated" : "الاحتياج غير محسوب";
  if (typeof consumed !== "number") return isEn ? "No data logged" : "لا بيانات مسجَّلة";
  const pct = pctOf(consumed, goal);
  const tier = statusTier(pct);
  return `${pct}% - ${TIER_LABEL[tier][isEn ? "en" : "ar"]}`;
}

// تعبئة اللون الفعلي لخلية الاستهلاك (3 حالات فقط - راجع تعليق الملف).
function fillForConsumption(consumed, goal) {
  const pct = pctOf(consumed, goal);
  if (pct == null) return null;
  if (pct > 110) return { fill: FILL_EXCEEDED, font: TEXT_EXCEEDED };
  if (pct <= 50) return { fill: FILL_LOW, font: TEXT_LOW };
  return null;
}

// أعمدة التقرير الأساسية (نفس بيانات CSV_COLUMNS بالضبط، بنفس المفاتيح) -
// [key, تسمية عربية, English label] - يُضاف بعدها 8 أعمدة احتياج/حالة جديدة.
const BASE_COLUMNS = [
  ["date", "التاريخ", "Date"],
  ["plannedBedtime", "موعد النوم المخطَّط", "Planned Bedtime"],
  ["plannedWakeTime", "موعد الاستيقاظ المخطَّط", "Planned Wake Time"],
  ["plannedHours", "ساعات النوم المخطَّطة", "Planned Sleep Hours"],
  ["sleepBedtime", "وقت النوم الفعلي", "Sleep Bedtime"],
  ["sleepWakeTime", "وقت الاستيقاظ الفعلي", "Sleep Wake Time"],
  ["sleepHours", "ساعات النوم الفعلية", "Sleep Hours"],
  ["breakfastFoods", "أصناف الفطور", "Breakfast Foods"],
  ["breakfastCalories", "سعرات الفطور", "Breakfast Calories"],
  ["breakfastProteinG", "بروتين الفطور (غم)", "Breakfast Protein (g)"],
  ["breakfastCarbsG", "كارب الفطور (غم)", "Breakfast Carbs (g)"],
  ["breakfastFatG", "دهون الفطور (غم)", "Breakfast Fat (g)"],
  ["breakfastMood", "مزاج الفطور (١-٥)", "Breakfast Mood (1-5)"],
  ["breakfastStress", "توتر الفطور (١-٥)", "Breakfast Stress (1-5)"],
  ["lunchFoods", "أصناف الغداء", "Lunch Foods"],
  ["lunchCalories", "سعرات الغداء", "Lunch Calories"],
  ["lunchProteinG", "بروتين الغداء (غم)", "Lunch Protein (g)"],
  ["lunchCarbsG", "كارب الغداء (غم)", "Lunch Carbs (g)"],
  ["lunchFatG", "دهون الغداء (غم)", "Lunch Fat (g)"],
  ["lunchMood", "مزاج الغداء (١-٥)", "Lunch Mood (1-5)"],
  ["lunchStress", "توتر الغداء (١-٥)", "Lunch Stress (1-5)"],
  ["dinnerFoods", "أصناف العشاء", "Dinner Foods"],
  ["dinnerCalories", "سعرات العشاء", "Dinner Calories"],
  ["dinnerProteinG", "بروتين العشاء (غم)", "Dinner Protein (g)"],
  ["dinnerCarbsG", "كارب العشاء (غم)", "Dinner Carbs (g)"],
  ["dinnerFatG", "دهون العشاء (غم)", "Dinner Fat (g)"],
  ["dinnerMood", "مزاج العشاء (١-٥)", "Dinner Mood (1-5)"],
  ["dinnerStress", "توتر العشاء (١-٥)", "Dinner Stress (1-5)"],
  ["snackFoods", "أصناف السناك", "Snack Foods"],
  ["snackCalories", "سعرات السناك", "Snack Calories"],
  ["snackProteinG", "بروتين السناك (غم)", "Snack Protein (g)"],
  ["snackCarbsG", "كارب السناك (غم)", "Snack Carbs (g)"],
  ["snackFatG", "دهون السناك (غم)", "Snack Fat (g)"],
  ["snackMood", "مزاج السناك (١-٥)", "Snack Mood (1-5)"],
  ["snackStress", "توتر السناك (١-٥)", "Snack Stress (1-5)"],
  ["unclassifiedFoods", "أصناف غير مصنَّفة", "Unclassified Foods"],
  ["unclassifiedCalories", "سعرات غير مصنَّفة", "Unclassified Calories"],
  ["unclassifiedProteinG", "بروتين غير مصنَّف (غم)", "Unclassified Protein (g)"],
  ["unclassifiedCarbsG", "كارب غير مصنَّف (غم)", "Unclassified Carbs (g)"],
  ["unclassifiedFatG", "دهون غير مصنَّفة (غم)", "Unclassified Fat (g)"],
  ["unclassifiedMood", "مزاج غير مصنَّف (١-٥)", "Unclassified Mood (1-5)"],
  ["unclassifiedStress", "توتر غير مصنَّف (١-٥)", "Unclassified Stress (1-5)"],
  ["totalCalories", "إجمالي السعرات", "Total Calories"],
  ["totalProteinG", "إجمالي البروتين (غم)", "Total Protein (g)"],
  ["totalCarbsG", "إجمالي الكارب (غم)", "Total Carbs (g)"],
  ["totalFatG", "إجمالي الدهون (غم)", "Total Fat (g)"],
  ["totalFiberG", "إجمالي الألياف (غم)", "Total Fiber (g)"],
  ["totalSugarG", "إجمالي السكر (غم)", "Total Sugar (g)"],
  ["totalSodiumMg", "إجمالي الصوديوم (مغ)", "Total Sodium (mg)"],
  ["totalCholesterolMg", "إجمالي الكوليسترول (مغ)", "Total Cholesterol (mg)"],
  ["dailyMoodAvg", "متوسط المزاج اليومي (١-٥)", "Daily Mood Avg (1-5)"],
  ["dailyStressAvg", "متوسط التوتر اليومي (١-٥)", "Daily Stress Avg (1-5)"],
  ["steps", "الخطوات", "Steps"],
  ["workoutCompleted", "إنجاز التمرين", "Workout Completed"],
  ["exercisesTrainedCount", "عدد التمارين المُنفَّذة", "Exercises Trained"],
  ["setsCompleted", "عدد المجموعات المُنجَزة", "Sets Completed"],
  ["focusMinutesTotal", "دقائق التركيز", "Focus Minutes"],
  ["studyMinutes", "دقائق الدراسة", "Study Minutes"],
  ["focusSessionsCount", "جلسات التركيز/الدراسة", "Focus/Study Sessions"],
  ["weightKg", "الوزن (كغم)", "Weight (kg)"],
  ["weightChangeKg", "تغيّر الوزن (كغم)", "Weight Change (kg)"],
];

// [مفتاح عمود الاستهلاك في الصف, مفتاح فريد لعمود الاحتياج, تسمية الاحتياج
// عربي/إنجليزي, مفتاح فريد لعمود الحالة, تسمية الحالة عربي/إنجليزي، مفتاح
// الاحتياج في نتيجة getDailyNutritionSummary]
const NEED_METRICS = [
  ["totalCalories", "calorieGoal", "احتياج السعرات (سعرة)", "Calorie Need (kcal)", "calorieStatus", "حالة السعرات", "Calorie Status"],
  ["totalProteinG", "proteinGoal", "احتياج البروتين (غم)", "Protein Need (g)", "proteinStatus", "حالة البروتين", "Protein Status"],
  ["totalCarbsG", "carbGoal", "احتياج الكارب (غم)", "Carb Need (g)", "carbStatus", "حالة الكارب", "Carb Status"],
  ["totalFatG", "fatGoal", "احتياج الدهون (غم)", "Fat Need (g)", "fatStatus", "حالة الدهون", "Fat Status"],
];
const GOAL_FIELD = { calorieGoal: "calorieGoal", proteinGoal: "proteinGoal", carbGoal: "carbsGoal", fatGoal: "fatGoal" };

// rows: نفس مخرجات buildComprehensiveReport بالضبط (bilaحاجة لأي تحويل).
// healthProfile: نفس الكائن الممرَّر أصلاً لـReportsView (يحمل tee إن حُسِب).
// owner: اسم المستخدم كما في exportDailyCsv. isEn: لغة الواجهة وقت التصدير.
// يُرجع ArrayBuffer جاهزاً لتغليفه في Blob من طرف المستدعي.
export async function buildDailyReportExcelBuffer(rows, { healthProfile, owner, isEn }) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(isEn ? "Daily Report" : "التقرير اليومي", {
    views: [{ rightToLeft: !isEn }],
  });

  const columns = [
    { header: isEn ? "Owner" : "المستخدم", key: "__owner", width: 16 },
    ...BASE_COLUMNS.map(([key, ar, en]) => ({ header: isEn ? en : ar, key, width: key.toLowerCase().includes("foods") ? 28 : 14 })),
  ];
  for (const [, goalKey, goalAr, goalEn, statusKey, statusAr, statusEn] of NEED_METRICS) {
    columns.push({ header: isEn ? goalEn : goalAr, key: goalKey, width: 16 });
    columns.push({ header: isEn ? statusEn : statusAr, key: statusKey, width: 20 });
  }
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: isEn ? "left" : "right" };

  for (const row of rows) {
    const totals = { calories: row.totalCalories, protein: row.totalProteinG, carbs: row.totalCarbsG, fat: row.totalFatG };
    // nutritionPlan: null عمداً - راجع تعليق أعلى الملف.
    const needs = getDailyNutritionSummary({ totals, healthProfile, nutritionPlan: null });

    const rowData = { __owner: owner };
    for (const [key] of BASE_COLUMNS) rowData[key] = row[key];
    for (const [consumedKey, goalKey, , , statusKey] of NEED_METRICS) {
      const goal = needs[GOAL_FIELD[goalKey]];
      rowData[goalKey] = goal ?? null;
      rowData[statusKey] = statusText(row[consumedKey], goal, isEn);
    }

    const addedRow = sheet.addRow(rowData);
    addedRow.alignment = { horizontal: isEn ? "left" : "right" };

    for (const [consumedKey, goalKey] of NEED_METRICS) {
      const goal = needs[GOAL_FIELD[goalKey]];
      const style = fillForConsumption(row[consumedKey], goal);
      if (style) {
        const cell = addedRow.getCell(consumedKey);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.fill } };
        cell.font = { color: { argb: style.font } };
      }
    }
  }

  return workbook.xlsx.writeBuffer();
}
