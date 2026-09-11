// رسوم بيانية ثابتة (صور PNG) للتصدير الموحَّد - excelReport.js يُضمِّنها
// كصور داخل ملف Excel. مكتبة exceljs المستخدَمة للتصدير لا تدعم إنشاء
// رسوم بيانية تفاعلية أصلية (native Excel charts)، فقط تنسيق خلايا - راجع
// تعليق أعلى excelReport.js. بدل إضافة مكتبة رسم بياني جديدة، تُبنى هذه
// الصور مباشرة عبر Canvas 2D (متوفر أصلاً في كل متصفح، بلا أي اعتماد
// جديد) من نفس صفوف buildComprehensiveReport المستخدَمة أصلاً لجدول
// البيانات الخام - نفس الفترة الزمنية بالضبط، بلا أي استعلام بيانات مواز.
//
// خلل تصميم حقيقي وُجد وأُصلح: رسم "سعرات+ماكروز" واحد مجمّع (بمحور ثانوي
// للماكروز) كان يُظهر خط السعرات (~1500-2500) طاغياً بصرياً على خطوط
// البروتين/الكارب/الدهون (~50-150) رغم فصل المحاور - استُبدل بـ٦ رسوم
// غذائية مستقلة (سعرات/بروتين/كارب/دهون/صوديوم/كوليسترول)، كل رسم بمقياسه
// الخاص بالكامل (renderSingleMetricChart أدناه - محور واحد فقط، لا تعدّد
// محاور إطلاقاً). رسوم النوم/النشاط الرياضي/الخطوات بقيت بلا أي تغيير
// (renderLineChart الأصلية، بما فيها الرسم المزدوج للنشاط الرياضي) لأن
// مشكلة اختلاف المقياس لم تكن موجودة هناك أصلاً.
//
// التقرير كامله بالإنجليزي دائماً (بطلب صريح) بغض النظر عن لغة واجهة
// التطبيق - كل النصوص هنا ثابتة إنجليزية، لا معامل isEn. الأرقام تُرسَم عبر
// ctx.fillText بقيم JS Number->String عادية، وهذه دائماً بالأرقام اللاتينية.
//
// قاعدة صدق: إن لم توجد بيانات فعلية إطلاقاً لمقياس ما خلال كامل الفترة
// المُصدَّرة، تُرجِع دالة البناء المقابلة null (لا رسم فارغ مُضلِّل بمحور
// بلا معنى) - excelReport.js يتجاهل الرسم وقتها فقط. بالمثل، خط الهدف لا
// يُرسَم إلا إن وُجد هدف حقيقي: إما شخصي محسوب (calorieGoal/proteinGoal/
// carbsGoal/fatGoal من getDailyNutritionSummary، dailyStepsGoal من
// health_profile - يُعرَض بمفتاح الرسم كـ"Target") أو إرشاد عام معروف
// وموثوق عالمياً (DAILY_GUIDELINES من nutrition.js - sodiumMaxMg/
// cholesterolMaxMg، نفس الثابتين المستخدَمين أصلاً بشاشة التغذية، لا رقم
// جديد مُختلَق هنا - يُعرَض بوضوح كـ"General Guideline" حتى لا يُفهَم
// كهدف شخصي). لا هدف نوم/نشاط رياضي إطلاقاً (لا حقل هدف يومي مخزَّن لهما
// بهذا التطبيق).
import { DAILY_GUIDELINES } from "./nutrition";

const WIDTH = 960;
const HEIGHT = 380;
const SCALE = 2; // دقة أعلى (2x) لوضوح أفضل عند التكبير داخل Excel

const COLORS = {
  calories: "#C9A24B", protein: "#5B8A72", carbs: "#4C7EA8", fat: "#B5654F",
  sodium: "#8B6BB0", cholesterol: "#C77B4F",
  sleep: "#6B5B95", sets: "#3A7D6B", exercises: "#B08D57", steps: "#8a6d28",
};

function niceMax(max) {
  if (!(max > 0)) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / magnitude;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * magnitude;
}

// ===== الرسوم متعددة السلاسل (بمحور ثانوي اختياري) - غير مُعدَّلة، تُستخدَم
// فقط لرسمي "النشاط الرياضي" (سلسلتان بمحورين) و"النوم"/"الخطوات" (سلسلة
// واحدة، محور واحد فعلياً وإن كانت الدالة تدعم أكثر). =====
// series: [{ label, values: (number|null)[] بنفس طول days, color, axis: "primary"|"secondary",
//   unit, target: number|null (خط أفقي متقطع بنفس اللون - القيمة المستهدفة الثابتة لهذا المقياس) }]
function renderLineChart(days, series, title) {
  const PAD_LEFT = 52, PAD_RIGHT = 52, PAD_TOP = 58, PAD_BOTTOM = 42;
  const H = 420; // ارتفاع هذه الدالة تحديداً غير مُعدَّل عن السابق (راجع تعليق أعلى الملف)
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, H);

  ctx.fillStyle = "#1B3A3A";
  ctx.font = "bold 17px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, PAD_LEFT, 26);

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const primarySeries = series.filter((s) => s.axis !== "secondary");
  const secondarySeries = series.filter((s) => s.axis === "secondary");
  const primaryVals = primarySeries.flatMap((s) => [...s.values.filter((v) => typeof v === "number"), ...(typeof s.target === "number" ? [s.target] : [])]);
  const secondaryVals = secondarySeries.flatMap((s) => [...s.values.filter((v) => typeof v === "number"), ...(typeof s.target === "number" ? [s.target] : [])]);
  const primaryMax = niceMax(primaryVals.length ? Math.max(...primaryVals) : 1);
  const secondaryMax = secondaryVals.length ? niceMax(Math.max(...secondaryVals)) : null;

  ctx.strokeStyle = "#EDEAE2";
  ctx.lineWidth = 1;
  ctx.font = "11px sans-serif";
  for (let i = 0; i <= 4; i++) {
    const y = PAD_TOP + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(WIDTH - PAD_RIGHT, y);
    ctx.stroke();
    ctx.fillStyle = "#8A8272";
    ctx.textAlign = "left";
    ctx.fillText(String(Math.round(primaryMax * (1 - i / 4))), 4, y + 4);
    if (secondaryMax != null) {
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round(secondaryMax * (1 - i / 4))), WIDTH - 4, y + 4);
    }
  }

  const n = days.length;
  const xFor = (i) => PAD_LEFT + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const yFor = (v, maxVal) => PAD_TOP + plotH * (1 - Math.min(v, maxVal) / maxVal);

  function drawSeries(s, maxVal) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    let started = false;
    s.values.forEach((v, i) => {
      if (typeof v !== "number") { started = false; return; }
      const x = xFor(i), y = yFor(v, maxVal);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    });
    ctx.stroke();
    ctx.fillStyle = s.color;
    s.values.forEach((v, i) => {
      if (typeof v !== "number") return;
      const x = xFor(i), y = yFor(v, maxVal);
      ctx.beginPath();
      ctx.arc(x, y, 2.8, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawTarget(s, maxVal) {
    if (typeof s.target !== "number") return;
    const y = yFor(s.target, maxVal);
    ctx.save();
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(WIDTH - PAD_RIGHT, y);
    ctx.stroke();
    ctx.restore();
  }

  primarySeries.forEach((s) => drawTarget(s, primaryMax));
  secondarySeries.forEach((s) => drawTarget(s, secondaryMax || 1));
  primarySeries.forEach((s) => drawSeries(s, primaryMax));
  secondarySeries.forEach((s) => drawSeries(s, secondaryMax || 1));

  ctx.fillStyle = "#8A8272";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  const labelIdxs = n <= 1 ? [0] : [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  labelIdxs.forEach((i) => ctx.fillText(days[i], xFor(i), H - PAD_BOTTOM + 20));

  ctx.strokeStyle = "#C9BFA5";
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, PAD_TOP + plotH);
  ctx.lineTo(WIDTH - PAD_RIGHT, PAD_TOP + plotH);
  ctx.stroke();

  ctx.font = "11px sans-serif";
  let lx = PAD_LEFT;
  const ly = 46;
  series.forEach((s) => {
    const label = s.unit ? `${s.label} (${s.unit})` : s.label;
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, ly - 8, 10, 10);
    ctx.fillStyle = "#3A342C";
    ctx.textAlign = "left";
    ctx.fillText(label, lx + 14, ly);
    lx += 14 + textWidth + 18;
  });
  if (series.some((s) => typeof s.target === "number")) {
    ctx.strokeStyle = "#8A8272";
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 3);
    ctx.lineTo(lx + 18, ly - 3);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#3A342C";
    ctx.textAlign = "left";
    ctx.fillText("Target", lx + 24, ly);
  }

  return { base64: canvas.toDataURL("image/png").split(",")[1], width: WIDTH, height: H };
}

// ===== رسم مقياس واحد فقط (جديد) - خط بيانات فعلية + خط هدف متقطع اختياري
// على نفس المحور، لا محور ثانوي إطلاقاً. هذا هو إصلاح مشكلة اختلاف المقياس
// للرسوم الغذائية الستة أدناه. =====
// target: { value, label } | null - label تُستخدَم بمفتاح الرسم أسفل العنوان
// ("Target" للهدف الشخصي المحسوب، "General Guideline" للإرشاد العام).
function renderSingleMetricChart(days, { label, values, color, unit }, title, target) {
  const PAD_LEFT = 56, PAD_RIGHT = 30, PAD_TOP = 58, PAD_BOTTOM = 42;
  const H = HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, H);

  ctx.fillStyle = "#1B3A3A";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, PAD_LEFT, 28);

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const realVals = values.filter((v) => typeof v === "number");
  const maxCandidate = Math.max(realVals.length ? Math.max(...realVals) : 1, target ? target.value : 0);
  const maxVal = niceMax(maxCandidate);

  ctx.strokeStyle = "#EDEAE2";
  ctx.lineWidth = 1;
  ctx.font = "12px sans-serif";
  for (let i = 0; i <= 4; i++) {
    const y = PAD_TOP + (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, y);
    ctx.lineTo(WIDTH - PAD_RIGHT, y);
    ctx.stroke();
    ctx.fillStyle = "#8A8272";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(maxVal * (1 - i / 4))), PAD_LEFT - 8, y + 4);
  }

  const n = days.length;
  const xFor = (i) => PAD_LEFT + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const yFor = (v) => PAD_TOP + plotH * (1 - Math.min(v, maxVal) / maxVal);

  // خط الهدف أولاً (تحت خط البيانات) - متقطع، رمادي محايد (بخلاف الرسوم
  // القديمة متعددة السلاسل أعلاه حيث كان الهدف بنفس لون مقياسه لتمييزه عن
  // بقية المقاييس على نفس الرسم؛ هنا رسم واحد بمقياس واحد فقط فلا حاجة
  // لذلك، والرمادي المحايد أوضح تباينه مع لون البيانات دائماً).
  if (target) {
    ctx.save();
    ctx.setLineDash([8, 5]);
    ctx.strokeStyle = "#8A8272";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, yFor(target.value));
    ctx.lineTo(WIDTH - PAD_RIGHT, yFor(target.value));
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  let started = false;
  values.forEach((v, i) => {
    if (typeof v !== "number") { started = false; return; }
    const x = xFor(i), y = yFor(v);
    if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
  });
  ctx.stroke();
  ctx.fillStyle = color;
  values.forEach((v, i) => {
    if (typeof v !== "number") return;
    const x = xFor(i), y = yFor(v);
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#8A8272";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  const labelIdxs = n <= 1 ? [0] : [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  labelIdxs.forEach((i) => ctx.fillText(days[i], xFor(i), H - PAD_BOTTOM + 22));

  ctx.strokeStyle = "#C9BFA5";
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, PAD_TOP + plotH);
  ctx.lineTo(WIDTH - PAD_RIGHT, PAD_TOP + plotH);
  ctx.stroke();

  ctx.font = "12px sans-serif";
  ctx.textAlign = "left";
  let lx = PAD_LEFT;
  const ly = 48;
  const dataLabel = unit ? `${label} (${unit})` : label;
  ctx.fillStyle = color;
  ctx.fillRect(lx, ly - 9, 11, 11);
  ctx.fillStyle = "#3A342C";
  ctx.fillText(dataLabel, lx + 15, ly);
  lx += 15 + ctx.measureText(dataLabel).width + 20;

  if (target) {
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "#8A8272";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 4);
    ctx.lineTo(lx + 20, ly - 4);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#3A342C";
    ctx.fillText(`${target.label} (${target.value}${unit ? " " + unit : ""})`, lx + 26, ly);
  }

  return { base64: canvas.toDataURL("image/png").split(",")[1], width: WIDTH, height: H };
}

// goal: رقم (calorieGoal من getDailyNutritionSummary) أو null.
export function buildCaloriesChart(rows, goal) {
  if (!rows.some((r) => r.totalCalories != null)) return null;
  const days = rows.map((r) => r.date);
  return renderSingleMetricChart(
    days, { label: "Calories", values: rows.map((r) => r.totalCalories), color: COLORS.calories, unit: "kcal" },
    "Calories Over Time",
    typeof goal === "number" ? { value: goal, label: "Target" } : null,
  );
}

export function buildProteinChart(rows, goal) {
  if (!rows.some((r) => r.totalProteinG != null)) return null;
  const days = rows.map((r) => r.date);
  return renderSingleMetricChart(
    days, { label: "Protein", values: rows.map((r) => r.totalProteinG), color: COLORS.protein, unit: "g" },
    "Protein Over Time",
    typeof goal === "number" ? { value: goal, label: "Target" } : null,
  );
}

export function buildCarbsChart(rows, goal) {
  if (!rows.some((r) => r.totalCarbsG != null)) return null;
  const days = rows.map((r) => r.date);
  return renderSingleMetricChart(
    days, { label: "Carbs", values: rows.map((r) => r.totalCarbsG), color: COLORS.carbs, unit: "g" },
    "Carbs Over Time",
    typeof goal === "number" ? { value: goal, label: "Target" } : null,
  );
}

export function buildFatChart(rows, goal) {
  if (!rows.some((r) => r.totalFatG != null)) return null;
  const days = rows.map((r) => r.date);
  return renderSingleMetricChart(
    days, { label: "Fat", values: rows.map((r) => r.totalFatG), color: COLORS.fat, unit: "g" },
    "Fat Over Time",
    typeof goal === "number" ? { value: goal, label: "Target" } : null,
  );
}

// DAILY_GUIDELINES.sodiumMaxMg (2300mg) - نفس الحد الإرشادي العام المعروض
// أصلاً بشاشة التغذية (nutrition.js)، لا رقم جديد مُختلَق هنا. يُعرض بوضوح
// كـ"General Guideline" لا "Target" حتى لا يُفهَم كهدف شخصي محسوب.
export function buildSodiumChart(rows) {
  if (!rows.some((r) => r.totalSodiumMg != null)) return null;
  const days = rows.map((r) => r.date);
  return renderSingleMetricChart(
    days, { label: "Sodium", values: rows.map((r) => r.totalSodiumMg), color: COLORS.sodium, unit: "mg" },
    "Sodium Over Time",
    { value: DAILY_GUIDELINES.sodiumMaxMg, label: "General Guideline" },
  );
}

// DAILY_GUIDELINES.cholesterolMaxMg (300mg) - نفس المبدأ أعلاه بالضبط.
export function buildCholesterolChart(rows) {
  if (!rows.some((r) => r.totalCholesterolMg != null)) return null;
  const days = rows.map((r) => r.date);
  return renderSingleMetricChart(
    days, { label: "Cholesterol", values: rows.map((r) => r.totalCholesterolMg), color: COLORS.cholesterol, unit: "mg" },
    "Cholesterol Over Time",
    { value: DAILY_GUIDELINES.cholesterolMaxMg, label: "General Guideline" },
  );
}

// لا هدف نوم مخزَّن بهذا التطبيق حالياً (health_profile لا يحمل أي حقل
// "ساعات نوم مستهدَفة") - الرسم بلا خط هدف عمداً، لا رقماً مُختلَقاً. غير
// مُعدَّل عن السابق.
export function buildSleepChart(rows) {
  if (!rows.some((r) => r.sleepHours != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: "Sleep Hours", values: rows.map((r) => r.sleepHours), color: COLORS.sleep, axis: "primary", unit: "h" },
  ], "Sleep Hours Over Time");
}

// لا هدف رقمي يومي مخزَّن لمجموعات/تمارين النشاط الرياضي بهذا التطبيق -
// غير مُعدَّل عن السابق (سلسلتان بمحورين على نفس الرسم، لا فصل هنا - لم
// يُطلَب، ولا مشكلة اختلاف مقياس فعلية بين مجموعات/تمارين بنفس النطاق
// الرقمي التقريبي).
export function buildActivityChart(rows) {
  if (!rows.some((r) => r.setsCompleted != null || r.exercisesTrainedCount != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: "Sets Completed", values: rows.map((r) => r.setsCompleted), color: COLORS.sets, axis: "primary" },
    { label: "Exercises Trained", values: rows.map((r) => r.exercisesTrainedCount), color: COLORS.exercises, axis: "secondary" },
  ], "Workout Activity Over Time");
}

// stepsGoal: health_profile.dailyStepsGoal كما اختاره المستخدم فعلياً (Batch 2
// Item 2) - null إن لم يُحدِّد هدفاً بعد، فيُرسَم الرسم بلا خط هدف. غير
// مُعدَّل عن السابق.
export function buildStepsChart(rows, stepsGoal = null) {
  if (!rows.some((r) => r.steps != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: "Steps", values: rows.map((r) => r.steps), color: COLORS.steps, axis: "primary", target: typeof stepsGoal === "number" ? stepsGoal : null },
  ], "Steps Over Time");
}
