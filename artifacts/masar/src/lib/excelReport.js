// تصدير Excel موحَّد حقيقي (.xlsx) للتقرير اليومي الشامل - يحل محل تصديري
// CSV/Excel المنفصلين السابقين بملف واحد فقط، بشيتين:
// 1) "Charts": 9 صور (سعرات/بروتين/كارب/دهون/صوديوم/كوليسترول - كل واحد
//    برسم مستقل بمقياسه الخاص - + نوم/نشاط رياضي/خطوات) مبنية من نفس صفوف
//    التقرير عبر chartImages.js (Canvas 2D - exceljs لا يدعم رسوماً بيانية
//    تفاعلية أصلية، راجع تعليق ذلك الملف)، تُمرَّر جاهزة من المستدعي
//    (MasarApp.jsx) بعد بنائها بالمتصفح.
// 2) "Daily Report": نفس جدول البيانات الخام الكامل كما كان، مع طبقتين
//    إضافيتين لكل يوم:
//    - عمودا "احتياج" لكل عنصر غذائي أساسي (سعرات/بروتين/كارب/دهون)، محسوبان
//      فعلياً عبر getDailyNutritionSummary (nutrition-plan.js) - نفس الدالة
//      المستخدمة أصلاً في NutritionView.jsx/AssistantView لعرض هدف اليوم، لا
//      حساب موازٍ جديد. nutritionPlan تُمرَّر دائماً null هنا عمداً - مطابقةً
//      للسلوك القائم في كلا الموضعين أعلاه (خطة غذائية نشطة مختارة لا تُستخدَم
//      كمصدر الهدف خارج شاشتها المخصّصة؛ المصدر دائماً هو TEE) - قرار موجود
//      مسبقاً في الكود، لا قرار جديد اتُّخذ هنا.
//    - عمود "حالة" نصي واحد لكل عنصر (نسبة % + تصنيف نصي معاً في خلية واحدة)،
//      وتلوين تلقائي لخلية الاستهلاك الفعلي (الإجمالي اليومي) لنفس العنصر.
//
// اللغة: بطلب صريح، التقرير بالكامل بالإنجليزي (عناوين أعمدة/شيتات/نصوص
// حالة) دائماً بغض النظر عن لغة واجهة التطبيق - الاستثناءان الوحيدان: اسم
// الطعام (row.*Foods، كما كتبه المستخدم بأي لغة) واسم المستخدم (owner) -
// كلاهما قيمة بيانات لا نص واجهة، فيبقيان كما أُدخلا حرفياً.
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
// كلاً من "متوسط" و"ضمن الحد" النصيَّين معاً) - هذا المنطق لم يتغيّر إطلاقاً.
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
// تنسيق بصري إضافي (لا علاقة له بتلوين الاستهلاك أعلاه): تظليل رأس الجدول،
// وتبطيط صفوف متبادل خفيف (zebra banding) لتسهيل قراءة جدول طويل - يُطبَّق
// قبل تلوين الاستهلاك دائماً بحيث يبقى ذلك التلوين هو الغالب على أي خلية
// يخصّها (لا يُخفيه التبطيط أبداً).
const FILL_HEADER = "FFEFE6CC";
const FILL_BAND = "FFFAF7F0";
const BORDER_THIN = { style: "thin", color: { argb: "FFDCD3BE" } };
const ALL_BORDERS = { top: BORDER_THIN, left: BORDER_THIN, bottom: BORDER_THIN, right: BORDER_THIN };

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

const TIER_LABEL = { low: "Low", medium: "Medium", within: "Within range", exceeded: "Exceeded" };

// نص حالة واحد يجمع الرقم والتصنيف معاً كما طُلب صراحةً ("رقمياً ونصياً
// معاً") - noGoal/noData حالتان صادقتان منفصلتان (لا افتراض صفر أو "منخفض"
// لبيانات غير موجودة أصلاً - نفس مبدأ الصدق المتَّبع في كل هذا التطبيق).
function statusText(consumed, goal) {
  if (typeof goal !== "number" || goal <= 0) return "Need not calculated";
  if (typeof consumed !== "number") return "No data logged";
  const pct = pctOf(consumed, goal);
  const tier = statusTier(pct);
  return `${pct}% - ${TIER_LABEL[tier]}`;
}

// تعبئة اللون الفعلي لخلية الاستهلاك (3 حالات فقط - راجع تعليق الملف).
function fillForConsumption(consumed, goal) {
  const pct = pctOf(consumed, goal);
  if (pct == null) return null;
  if (pct > 110) return { fill: FILL_EXCEEDED, font: TEXT_EXCEEDED };
  if (pct <= 50) return { fill: FILL_LOW, font: TEXT_LOW };
  return null;
}

// أعمدة التقرير الأساسية - [key, English label]. عناوين إنجليزية فقط (راجع
// تعليق اللغة أعلى الملف)؛ القيم نفسها (خاصة أعمدة "Foods") تبقى بلغة
// المستخدم الأصلية كما كتبها.
const BASE_COLUMNS = [
  ["date", "Date"],
  ["plannedBedtime", "Planned Bedtime"],
  ["plannedWakeTime", "Planned Wake Time"],
  ["plannedHours", "Planned Sleep Hours"],
  ["sleepBedtime", "Sleep Bedtime"],
  ["sleepWakeTime", "Sleep Wake Time"],
  ["sleepHours", "Sleep Hours"],
  ["breakfastFoods", "Breakfast Foods"],
  ["breakfastTime", "Breakfast Time"],
  ["breakfastCalories", "Breakfast Calories"],
  ["breakfastProteinG", "Breakfast Protein (g)"],
  ["breakfastCarbsG", "Breakfast Carbs (g)"],
  ["breakfastFatG", "Breakfast Fat (g)"],
  ["breakfastMood", "Breakfast Mood (1-5)"],
  ["breakfastStress", "Breakfast Stress (1-5)"],
  ["lunchFoods", "Lunch Foods"],
  ["lunchTime", "Lunch Time"],
  ["lunchCalories", "Lunch Calories"],
  ["lunchProteinG", "Lunch Protein (g)"],
  ["lunchCarbsG", "Lunch Carbs (g)"],
  ["lunchFatG", "Lunch Fat (g)"],
  ["lunchMood", "Lunch Mood (1-5)"],
  ["lunchStress", "Lunch Stress (1-5)"],
  ["dinnerFoods", "Dinner Foods"],
  ["dinnerTime", "Dinner Time"],
  ["dinnerCalories", "Dinner Calories"],
  ["dinnerProteinG", "Dinner Protein (g)"],
  ["dinnerCarbsG", "Dinner Carbs (g)"],
  ["dinnerFatG", "Dinner Fat (g)"],
  ["dinnerMood", "Dinner Mood (1-5)"],
  ["dinnerStress", "Dinner Stress (1-5)"],
  ["snackFoods", "Snack Foods"],
  ["snackTime", "Snack Time"],
  ["snackCalories", "Snack Calories"],
  ["snackProteinG", "Snack Protein (g)"],
  ["snackCarbsG", "Snack Carbs (g)"],
  ["snackFatG", "Snack Fat (g)"],
  ["snackMood", "Snack Mood (1-5)"],
  ["snackStress", "Snack Stress (1-5)"],
  ["unclassifiedFoods", "Unclassified Foods"],
  ["unclassifiedTime", "Unclassified Time"],
  ["unclassifiedCalories", "Unclassified Calories"],
  ["unclassifiedProteinG", "Unclassified Protein (g)"],
  ["unclassifiedCarbsG", "Unclassified Carbs (g)"],
  ["unclassifiedFatG", "Unclassified Fat (g)"],
  ["unclassifiedMood", "Unclassified Mood (1-5)"],
  ["unclassifiedStress", "Unclassified Stress (1-5)"],
  ["totalCalories", "Total Calories"],
  ["totalProteinG", "Total Protein (g)"],
  ["totalCarbsG", "Total Carbs (g)"],
  ["totalFatG", "Total Fat (g)"],
  ["totalFiberG", "Total Fiber (g)"],
  ["totalSugarG", "Total Sugar (g)"],
  ["totalSodiumMg", "Total Sodium (mg)"],
  ["totalCholesterolMg", "Total Cholesterol (mg)"],
  ["dailyMoodAvg", "Daily Mood Avg (1-5)"],
  ["dailyStressAvg", "Daily Stress Avg (1-5)"],
  ["steps", "Steps"],
  ["workoutCompleted", "Workout Completed"],
  ["exercisesTrainedCount", "Exercises Trained"],
  ["setsCompleted", "Sets Completed"],
  ["focusMinutesTotal", "Focus Minutes"],
  ["studyMinutes", "Study Minutes"],
  ["focusSessionsCount", "Focus/Study Sessions"],
  ["weightKg", "Weight (kg)"],
  ["weightChangeKg", "Weight Change (kg)"],
];

// [مفتاح عمود الاستهلاك في الصف, مفتاح فريد لعمود الاحتياج, تسمية الاحتياج
// الإنجليزية, مفتاح فريد لعمود الحالة, تسمية الحالة الإنجليزية, مفتاح
// الاحتياج في نتيجة getDailyNutritionSummary]
const NEED_METRICS = [
  ["totalCalories", "calorieGoal", "Calorie Need (kcal)", "calorieStatus", "Calorie Status"],
  ["totalProteinG", "proteinGoal", "Protein Need (g)", "proteinStatus", "Protein Status"],
  ["totalCarbsG", "carbGoal", "Carb Need (g)", "carbStatus", "Carb Status"],
  ["totalFatG", "fatGoal", "Fat Need (g)", "fatStatus", "Fat Status"],
];
const GOAL_FIELD = { calorieGoal: "calorieGoal", proteinGoal: "proteinGoal", carbGoal: "carbsGoal", fatGoal: "fatGoal" };

// إدراج صورة رسم بياني واحدة (إن وُجدت - قد تكون null إن لم تتوفر بيانات
// فعلية لهذا المقياس خلال الفترة، راجع تعليق chartImages.js) في شيت الرسوم،
// بعرض ثابت وارتفاع محسوب من نسبة العرض/الارتفاع الأصلية للصورة. يُرجع رقم
// الصف التالي المتاح لإدراج الرسم الذي يليه (تكديس رأسي بلا تداخل).
function addChartImage(workbook, sheet, chart, startRow) {
  if (!chart) return startRow;
  const displayWidth = 760;
  const displayHeight = Math.round(displayWidth * (chart.height / chart.width));
  const imageId = workbook.addImage({ base64: chart.base64, extension: "png" });
  sheet.addImage(imageId, { tl: { col: 0.3, row: startRow }, ext: { width: displayWidth, height: displayHeight } });
  // تقدير تقريبي لعدد الصفوف التي يشغلها الرسم (ارتفاع الصف الافتراضي ~15px)
  // + هامش صغير قبل الرسم التالي.
  return startRow + Math.ceil(displayHeight / 15) + 2;
}

// charts: كائن {calories, protein, carbs, fat, sodium, cholesterol, sleep,
// activity, steps} - كل قيمة إما null (لا بيانات لهذا المقياس بالفترة) أو
// {base64, width, height} من chartImages.js
// (يُبنى بالمتصفح عبر Canvas قبل استدعاء هذه الدالة - راجع تعليق أعلى
// الملف لسبب عدم بنائها هنا).
// rows: نفس مخرجات buildComprehensiveReport بالضبط (بلا حاجة لأي تحويل).
// healthProfile: نفس الكائن الممرَّر أصلاً لـReportsView (يحمل tee إن حُسِب).
// owner: اسم المستخدم كما أدخله في ملفه الشخصي (يبقى بلغته الأصلية - استثناء
// من قاعدة "التقرير كله إنجليزي"، راجع تعليق أعلى الملف).
// يُرجع ArrayBuffer جاهزاً لتغليفه في Blob من طرف المستدعي.
export async function buildUnifiedReportExcelBuffer(rows, { healthProfile, owner, charts }) {
  const workbook = new ExcelJS.Workbook();

  // شيت الرسوم البيانية أولاً (يظهر عند فتح الملف مباشرة) - رسم واحد فقط
  // يُدرَج فعلياً إن توفّرت بياناته (لا رسم فارغ مُضلِّل)؛ إن لم تتوفر بيانات
  // لأي مقياس إطلاقاً بهذه الفترة تبقى ورقة الرسوم موجودة بملاحظة توضيحية
  // بدل الاختفاء الصامت. 8 رسوم إجمالاً: 6 غذائية مستقلة (كل مقياس بمقياسه
  // الخاص - إصلاح مشكلة اختلاف المقياس بين السعرات والماكروز) + النوم +
  // النشاط الرياضي/الخطوات كما كانا.
  const chartsSheet = workbook.addWorksheet("Charts", { views: [{ rightToLeft: false }] });
  const allCharts = [
    charts?.calories, charts?.protein, charts?.carbs, charts?.fat, charts?.sodium, charts?.cholesterol,
    charts?.sleep, charts?.activity, charts?.steps,
  ];
  if (allCharts.every((c) => !c)) {
    chartsSheet.getCell("A1").value = "No data available yet for any chart in this period.";
  } else {
    let row = 0;
    for (const chart of allCharts) row = addChartImage(workbook, chartsSheet, chart, row);
  }

  const sheet = workbook.addWorksheet("Daily Report", {
    views: [{ rightToLeft: false, state: "frozen", ySplit: 1 }],
  });

  const columns = [
    { header: "Owner", key: "__owner", width: 16 },
    ...BASE_COLUMNS.map(([key, en]) => ({ header: en, key, width: key.toLowerCase().includes("foods") ? 28 : 14 })),
  ];
  for (const [, goalKey, goalEn, statusKey, statusEn] of NEED_METRICS) {
    columns.push({ header: goalEn, key: goalKey, width: 16 });
    columns.push({ header: statusEn, key: statusKey, width: 20 });
  }
  sheet.columns = columns;

  // تنسيق رأس الجدول: بارز (bold)، خلفية مميّزة، حدود واضحة، وثابت بأعلى
  // الشاشة عند التمرير لأسفل (frozen pane أعلاه) - يبقى مقروءاً حتى بجدول
  // طويل جداً (شهر كامل مثلاً).
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "left" };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEADER } };
    cell.border = ALL_BORDERS;
  });

  rows.forEach((row, rowIndex) => {
    const totals = { calories: row.totalCalories, protein: row.totalProteinG, carbs: row.totalCarbsG, fat: row.totalFatG };
    // nutritionPlan: null عمداً - راجع تعليق أعلى الملف.
    const needs = getDailyNutritionSummary({ totals, healthProfile, nutritionPlan: null });

    const rowData = { __owner: owner };
    for (const [key] of BASE_COLUMNS) rowData[key] = row[key];
    for (const [consumedKey, goalKey, , statusKey] of NEED_METRICS) {
      const goal = needs[GOAL_FIELD[goalKey]];
      rowData[goalKey] = goal ?? null;
      rowData[statusKey] = statusText(row[consumedKey], goal);
    }

    const addedRow = sheet.addRow(rowData);
    addedRow.alignment = { horizontal: "left" };

    // تبطيط صفوف متبادل خفيف (zebra banding) + حدود لكل خلية - فاصل بصري
    // واضح بين كل يوم والذي يليه بلا إدراج صفوف فارغة (تكسر قابلية استيراد
    // الجدول مباشرة في أدوات تحليل إحصائي كـSPSS/R، راجع تعليق
    // comprehensiveReport.js).
    const isBanded = rowIndex % 2 === 1;
    addedRow.eachCell({ includeEmpty: true }, (cell) => {
      if (isBanded) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_BAND } };
      cell.border = ALL_BORDERS;
    });

    // تلوين الاستهلاك (منطق ثابت لم يتغيّر) يُطبَّق بعد التبطيط دائماً، فيبقى
    // هو الغالب على أي خلية يخصّها بلا أي تعارض.
    for (const [consumedKey, goalKey] of NEED_METRICS) {
      const goal = needs[GOAL_FIELD[goalKey]];
      const style = fillForConsumption(row[consumedKey], goal);
      if (style) {
        const cell = addedRow.getCell(consumedKey);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.fill } };
        cell.font = { color: { argb: style.font } };
      }
    }
  });

  return workbook.xlsx.writeBuffer();
}
