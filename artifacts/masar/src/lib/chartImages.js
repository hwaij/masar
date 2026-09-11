// رسوم بيانية ثابتة (صور PNG) للتصدير الموحَّد - excelReport.js يُضمِّنها
// كصور داخل ملف Excel. مكتبة exceljs المستخدَمة للتصدير لا تدعم إنشاء
// رسوم بيانية تفاعلية أصلية (native Excel charts)، فقط تنسيق خلايا - راجع
// تعليق أعلى excelReport.js. بدل إضافة مكتبة رسم بياني جديدة، تُبنى هذه
// الصور مباشرة عبر Canvas 2D (متوفر أصلاً في كل متصفح، بلا أي اعتماد
// جديد) من نفس صفوف buildComprehensiveReport المستخدَمة أصلاً لجدول
// البيانات الخام - نفس الفترة الزمنية بالضبط، بلا أي استعلام بيانات مواز.
//
// التقرير كامله بالإنجليزي دائماً (بطلب صريح) بغض النظر عن لغة واجهة
// التطبيق - كل النصوص هنا ثابتة إنجليزية، لا معامل isEn. الأرقام تُرسَم عبر
// ctx.fillText بقيم JS Number->String عادية، وهذه دائماً بالأرقام اللاتينية
// (Canvas لا يُعيد تفسير شكل الأرقام حسب لغة النظام كما قد يفعل Excel نفسه
// لاحقاً مع خلايا رقمية عادية - قيد خارج نطاق التحكم بهذا الملف).
//
// قاعدة صدق: إن لم توجد بيانات فعلية إطلاقاً لمقياس ما خلال كامل الفترة
// المُصدَّرة، تُرجِع دالة البناء المقابلة null (لا رسم فارغ مُضلِّل بمحور
// بلا معنى) - excelReport.js يتجاهل الرسم وقتها فقط. بالمثل، خط "الهدف
// المستهدف" لا يُرسَم إلا إن وُجد هدف حقيقي محسوب/محدَّد فعلياً (calorieGoal
// من getDailyNutritionSummary، أو dailyStepsGoal من health_profile) - لا
// هدف مُختلَق لمقياس بلا هدف معروف بالتطبيق أصلاً (النوم والنشاط الرياضي
// حالياً بلا أي هدف يومي مخزَّن، فتُرسَمان بلا خط هدف).

const WIDTH = 960;
const HEIGHT = 420;
const PAD_LEFT = 52;
const PAD_RIGHT = 52;
const PAD_TOP = 58;
const PAD_BOTTOM = 42;
const SCALE = 2; // دقة أعلى (2x) لوضوح أفضل عند التكبير داخل Excel

const COLORS = {
  calories: "#C9A24B", protein: "#5B8A72", carbs: "#4C7EA8", fat: "#B5654F",
  sleep: "#6B5B95", sets: "#3A7D6B", exercises: "#B08D57", steps: "#8a6d28",
};

function niceMax(max) {
  if (!(max > 0)) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const norm = max / magnitude;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * magnitude;
}

// series: [{ label, values: (number|null)[] بنفس طول days, color, axis: "primary"|"secondary",
//   unit, target: number|null (خط أفقي متقطع بنفس اللون - القيمة المستهدفة الثابتة لهذا المقياس) }]
function renderLineChart(days, series, title) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#1B3A3A";
  ctx.font = "bold 17px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, PAD_LEFT, 26);

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const primarySeries = series.filter((s) => s.axis !== "secondary");
  const secondarySeries = series.filter((s) => s.axis === "secondary");
  const primaryVals = primarySeries.flatMap((s) => [...s.values.filter((v) => typeof v === "number"), ...(typeof s.target === "number" ? [s.target] : [])]);
  const secondaryVals = secondarySeries.flatMap((s) => [...s.values.filter((v) => typeof v === "number"), ...(typeof s.target === "number" ? [s.target] : [])]);
  const primaryMax = niceMax(primaryVals.length ? Math.max(...primaryVals) : 1);
  const secondaryMax = secondaryVals.length ? niceMax(Math.max(...secondaryVals)) : null;

  // شبكة أفقية خفيفة + تسميات الأرقام على المحورين (الأساسي يساراً، الثانوي
  // يميناً إن وُجد).
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

  // خط الهدف المستهدف: متقطع (dashed)، بنفس لون بيانات المقياس الفعلية
  // (يميّزه التقطّع لا اللون - إشارة بصرية أوضح لـ"نفس المقياس، خط مرجعي")،
  // بلا نقاط بيانات (خط مرجعي ثابت فقط).
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

  // تسميات محور X: أول/أوسط/آخر يوم فقط - كافٍ لتأطير الفترة الزمنية بصرياً
  // بلا ازدحام مع فترات طويلة (شهر كامل مثلاً). التواريخ نفسها "YYYY-MM-DD"
  // (row.date) - مقروءة ومباشرة بلا حاجة لأي تنسيق لغة إضافي.
  ctx.fillStyle = "#8A8272";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  const labelIdxs = n <= 1 ? [0] : [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  labelIdxs.forEach((i) => ctx.fillText(days[i], xFor(i), HEIGHT - PAD_BOTTOM + 20));

  ctx.strokeStyle = "#C9BFA5";
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, PAD_TOP + plotH);
  ctx.lineTo(WIDTH - PAD_RIGHT, PAD_TOP + plotH);
  ctx.stroke();

  // مفتاح الرسم (Legend) تحت العنوان مباشرة - إدخال إضافي "Target" (خط
  // متقطع رمادي محايد بالمفتاح) فقط إن وُجد هدف واحد على الأقل بهذا الرسم،
  // بلا تكرار مفتاح لكل مقياس على حدة (يكفي رمز واحد موضّح للمبدأ).
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

  return { base64: canvas.toDataURL("image/png").split(",")[1], width: WIDTH, height: HEIGHT };
}

// goals: { calorieGoal, proteinGoal, carbsGoal, fatGoal } من getDailyNutritionSummary -
// كل قيمة إما رقم ثابت (نفس الهدف عبر كل الأيام - لا تخزين تاريخي لملف صحي
// يومي بهذا التطبيق) أو null (بلا هدف محسوب، لا خط مرجعي وقتها لذلك المقياس
// تحديداً فقط).
export function buildNutritionChart(rows, goals = {}) {
  if (!rows.some((r) => r.totalCalories != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: "Calories", values: rows.map((r) => r.totalCalories), color: COLORS.calories, axis: "primary", unit: "kcal", target: goals.calorieGoal ?? null },
    { label: "Protein", values: rows.map((r) => r.totalProteinG), color: COLORS.protein, axis: "secondary", unit: "g", target: goals.proteinGoal ?? null },
    { label: "Carbs", values: rows.map((r) => r.totalCarbsG), color: COLORS.carbs, axis: "secondary", unit: "g", target: goals.carbsGoal ?? null },
    { label: "Fat", values: rows.map((r) => r.totalFatG), color: COLORS.fat, axis: "secondary", unit: "g", target: goals.fatGoal ?? null },
  ], "Calories & Macros Over Time");
}

// لا هدف نوم مخزَّن بهذا التطبيق حالياً (health_profile لا يحمل أي حقل
// "ساعات نوم مستهدَفة") - الرسم بلا خط هدف عمداً، لا رقماً مُختلَقاً.
export function buildSleepChart(rows) {
  if (!rows.some((r) => r.sleepHours != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: "Sleep Hours", values: rows.map((r) => r.sleepHours), color: COLORS.sleep, axis: "primary", unit: "h" },
  ], "Sleep Hours Over Time");
}

// لا هدف رقمي يومي مخزَّن لمجموعات/تمارين النشاط الرياضي بهذا التطبيق -
// بلا خط هدف لنفس السبب أعلاه.
export function buildActivityChart(rows) {
  if (!rows.some((r) => r.setsCompleted != null || r.exercisesTrainedCount != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: "Sets Completed", values: rows.map((r) => r.setsCompleted), color: COLORS.sets, axis: "primary" },
    { label: "Exercises Trained", values: rows.map((r) => r.exercisesTrainedCount), color: COLORS.exercises, axis: "secondary" },
  ], "Workout Activity Over Time");
}

// stepsGoal: health_profile.dailyStepsGoal كما اختاره المستخدم فعلياً (Batch 2
// Item 2) - null إن لم يُحدِّد هدفاً بعد، فيُرسَم الرسم بلا خط هدف.
export function buildStepsChart(rows, stepsGoal = null) {
  if (!rows.some((r) => r.steps != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: "Steps", values: rows.map((r) => r.steps), color: COLORS.steps, axis: "primary", target: typeof stepsGoal === "number" ? stepsGoal : null },
  ], "Steps Over Time");
}
