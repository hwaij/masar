// رسوم بيانية ثابتة (صور PNG) للتصدير الموحَّد - excelReport.js يُضمِّنها
// كصور داخل ملف Excel. مكتبة exceljs المستخدَمة للتصدير لا تدعم إنشاء
// رسوم بيانية تفاعلية أصلية (native Excel charts)، فقط تنسيق خلايا - راجع
// تعليق أعلى excelReport.js. بدل إضافة مكتبة رسم بياني جديدة، تُبنى هذه
// الصور مباشرة عبر Canvas 2D (متوفر أصلاً في كل متصفح، بلا أي اعتماد
// جديد) من نفس صفوف buildComprehensiveReport المستخدَمة أصلاً لجدول
// البيانات الخام - نفس الفترة الزمنية بالضبط، بلا أي استعلام بيانات مواز.
//
// قاعدة صدق: إن لم توجد بيانات فعلية إطلاقاً لمقياس ما خلال كامل الفترة
// المُصدَّرة، تُرجِع دالة البناء المقابلة null (لا رسم فارغ مُضلِّل بمحور
// بلا معنى) - excelReport.js يتجاهل الرسم وقتها فقط.

const WIDTH = 900;
const HEIGHT = 380;
const PAD_LEFT = 48;
const PAD_RIGHT = 48;
const PAD_TOP = 54;
const PAD_BOTTOM = 40;
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

// series: [{ label, values: (number|null)[] بنفس طول days, color, axis: "primary"|"secondary", unit }]
function renderLineChart(days, series, { title, isEn }) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#1B3A3A";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = isEn ? "left" : "right";
  ctx.fillText(title, isEn ? PAD_LEFT : WIDTH - PAD_RIGHT, 24);

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const primarySeries = series.filter((s) => s.axis !== "secondary");
  const secondarySeries = series.filter((s) => s.axis === "secondary");
  const primaryVals = primarySeries.flatMap((s) => s.values.filter((v) => typeof v === "number"));
  const secondaryVals = secondarySeries.flatMap((s) => s.values.filter((v) => typeof v === "number"));
  const primaryMax = niceMax(primaryVals.length ? Math.max(...primaryVals) : 1);
  const secondaryMax = secondaryVals.length ? niceMax(Math.max(...secondaryVals)) : null;

  // شبكة أفقية + تسميات الأرقام على المحورين (الأساسي يساراً دائماً،
  // الثانوي يميناً إن وُجد) - الأرقام لاتينية دوماً بغض النظر عن اللغة.
  ctx.strokeStyle = "#E5E0D5";
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

  function drawSeries(s, maxVal) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let started = false;
    s.values.forEach((v, i) => {
      if (typeof v !== "number") { started = false; return; }
      const x = xFor(i);
      const y = PAD_TOP + plotH * (1 - Math.min(v, maxVal) / maxVal);
      if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
    });
    ctx.stroke();
    ctx.fillStyle = s.color;
    s.values.forEach((v, i) => {
      if (typeof v !== "number") return;
      const x = xFor(i);
      const y = PAD_TOP + plotH * (1 - Math.min(v, maxVal) / maxVal);
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  primarySeries.forEach((s) => drawSeries(s, primaryMax));
  secondarySeries.forEach((s) => drawSeries(s, secondaryMax || 1));

  // تسميات محور X: أول/أوسط/آخر يوم فقط - كافٍ لتأطير الفترة الزمنية بصرياً
  // بلا ازدحام مع فترات طويلة (شهر كامل مثلاً).
  ctx.fillStyle = "#8A8272";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  const labelIdxs = n <= 1 ? [0] : [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  labelIdxs.forEach((i) => ctx.fillText(days[i], xFor(i), HEIGHT - PAD_BOTTOM + 18));

  ctx.strokeStyle = "#C9BFA5";
  ctx.beginPath();
  ctx.moveTo(PAD_LEFT, PAD_TOP + plotH);
  ctx.lineTo(WIDTH - PAD_RIGHT, PAD_TOP + plotH);
  ctx.stroke();

  // مفتاح الرسم (Legend) تحت العنوان مباشرة.
  ctx.font = "11px sans-serif";
  let lx = isEn ? PAD_LEFT : WIDTH - PAD_RIGHT;
  const ly = 42;
  series.forEach((s) => {
    const label = s.unit ? `${s.label} (${s.unit})` : s.label;
    const textWidth = ctx.measureText(label).width;
    if (isEn) {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx, ly - 8, 10, 10);
      ctx.fillStyle = "#3A342C";
      ctx.textAlign = "left";
      ctx.fillText(label, lx + 14, ly);
      lx += 14 + textWidth + 16;
    } else {
      ctx.fillStyle = s.color;
      ctx.fillRect(lx - 10, ly - 8, 10, 10);
      ctx.fillStyle = "#3A342C";
      ctx.textAlign = "right";
      ctx.fillText(label, lx - 14, ly);
      lx -= 14 + textWidth + 16;
    }
  });

  return { base64: canvas.toDataURL("image/png").split(",")[1], width: WIDTH, height: HEIGHT };
}

export function buildNutritionChart(rows, isEn) {
  if (!rows.some((r) => r.totalCalories != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: isEn ? "Calories" : "السعرات", values: rows.map((r) => r.totalCalories), color: COLORS.calories, axis: "primary", unit: "kcal" },
    { label: isEn ? "Protein" : "بروتين", values: rows.map((r) => r.totalProteinG), color: COLORS.protein, axis: "secondary", unit: "g" },
    { label: isEn ? "Carbs" : "كارب", values: rows.map((r) => r.totalCarbsG), color: COLORS.carbs, axis: "secondary", unit: "g" },
    { label: isEn ? "Fat" : "دهون", values: rows.map((r) => r.totalFatG), color: COLORS.fat, axis: "secondary", unit: "g" },
  ], { title: isEn ? "Calories & Macros Over Time" : "السعرات والماكروز عبر الزمن", isEn });
}

export function buildSleepChart(rows, isEn) {
  if (!rows.some((r) => r.sleepHours != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: isEn ? "Sleep Hours" : "ساعات النوم", values: rows.map((r) => r.sleepHours), color: COLORS.sleep, axis: "primary", unit: isEn ? "h" : "ساعة" },
  ], { title: isEn ? "Sleep Hours Over Time" : "ساعات النوم عبر الزمن", isEn });
}

export function buildActivityChart(rows, isEn) {
  if (!rows.some((r) => r.setsCompleted != null || r.exercisesTrainedCount != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: isEn ? "Sets Completed" : "مجموعات مُنجَزة", values: rows.map((r) => r.setsCompleted), color: COLORS.sets, axis: "primary" },
    { label: isEn ? "Exercises Trained" : "تمارين مُنفَّذة", values: rows.map((r) => r.exercisesTrainedCount), color: COLORS.exercises, axis: "secondary" },
  ], { title: isEn ? "Workout Activity Over Time" : "النشاط الرياضي عبر الزمن", isEn });
}

export function buildStepsChart(rows, isEn) {
  if (!rows.some((r) => r.steps != null)) return null;
  const days = rows.map((r) => r.date);
  return renderLineChart(days, [
    { label: isEn ? "Steps" : "الخطوات", values: rows.map((r) => r.steps), color: COLORS.steps, axis: "primary" },
  ], { title: isEn ? "Steps Over Time" : "الخطوات عبر الزمن", isEn });
}
