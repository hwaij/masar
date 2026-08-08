// بطاقات إنجاز قابلة للمشاركة - أربعة قوالب، كلها مُرسَومة بالكامل عبر
// Canvas API الأصلي (لا مكتبة خارجية، لا تصميم منسوخ من أي تطبيق) بألوان
// هوية مسار (ذهبي #C9A24B، أحمر #E05252، تدرّج داكن). القالب "ملخّص كامل"
// يستخدم نفس بيانات مخطط العضلات التشريحي (muscleAnatomyPaths.js، مصدرها
// موثَّق في THIRD_PARTY_NOTICES.md) مُصيَّراً كصورة SVG داخل الـCanvas.
//
// المشاركة عبر Share Sheet القياسي للمتصفح (navigator.share) - لا تصميم
// مخصَّص لمنصة اجتماعية بعينها. عند عدم الدعم: نسخ الصورة للحافظة، ثم نص
// كبديل ثانٍ، ثم تنزيل الصورة كملف كحل أخير يعمل في كل مكان دائماً.
import { FRONT_VIEWBOX, BACK_VIEWBOX, FRONT_REGIONS, FRONT_NEUTRAL, BACK_REGIONS, BACK_NEUTRAL } from "./muscleAnatomyPaths";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const GOLD = "#C9A24B";
const RED = "#E05252";
const INK = "#F2F0EA";
const MUTED = "#9C968A";
const FOOTER_MUTED = "#6B6558";

const FRONT_MUSCLES = new Set(["chest", "shoulders", "biceps", "quads", "abs"]);
const BACK_MUSCLES = new Set(["back", "triceps", "hamstrings", "glutes", "calves"]);

async function ensureFontsReady() {
  try {
    if (document.fonts && document.fonts.ready) {
      // document.fonts.ready لا يُحل أبداً إن تعطّل تحميل خط Google Fonts
      // شبكياً (مثلاً شبكة محظورة/بطيئة) - مهلة زمنية تمنع تجمّد بطاقة
      // المشاركة كلياً بانتظار خط لن يصل أبداً؛ الخط الافتراضي يكفي عندها.
      await Promise.race([
        Promise.all([
          document.fonts.load("bold 64px Tajawal"),
          document.fonts.load("400 36px Tajawal"),
          document.fonts.ready,
        ]),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
  } catch { /* الخط الافتراضي يكفي إن تعذّر تحميل Tajawal لأي سبب */ }
}

// Canvas fillText لا يطبّق خوارزمية Unicode Bidi كما تفعل طبقة تخطيط
// HTML العادية - نص RTL يتضمّن أرقاماً متعددة (مثال: "1 من 6" أو "40 كغ ×
// 10 تكرار") قد يُرسَم بترتيب مقلوب خاطئ. إحاطة النص بعلامتَي عزل اتجاه
// صريحتين (RLI...PDI) يُجبر محرك رسم النص على معاملته ككتلة RTL واحدة
// متماسكة، فتُحَل المشكلة دون أي تغيير على النص نفسه - تمّ التحقق تجريبياً.
const RLI = "⁧";
const PDI = "⁩";
function bidiSafe(text, isRtl) {
  return isRtl ? `${RLI}${text}${PDI}` : text;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, align) {
  const words = String(text || "").split(" ");
  let line = "";
  let curY = y;
  let lines = 0;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
      lines++;
    } else {
      line = testLine;
    }
  }
  if (line) { ctx.fillText(line, x, curY); lines++; }
  return lines;
}

function drawBackground(ctx, colorA = "#0A0A0B", colorB = "#1C1710") {
  const grad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
}

function drawGoldGlow(ctx, x, y, r) {
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBrandRow(ctx, brandLabel, x, align, y = 130) {
  ctx.textAlign = align;
  ctx.fillStyle = GOLD;
  ctx.font = "700 46px Tajawal, sans-serif";
  ctx.fillText(brandLabel, x, y);
}

function drawFooter(ctx, footer, x, align) {
  ctx.textAlign = align;
  ctx.fillStyle = FOOTER_MUTED;
  ctx.font = "400 30px Tajawal, sans-serif";
  ctx.fillText(footer, x, CARD_HEIGHT - 60);
}

// ===== مخطط عضلات مصغَّر (SVG مُصيَّر كصورة) لبطاقة "ملخّص كامل" =====
// نختار المشهد (أمامي/خلفي) الذي يضم أكبر عدد من العضلات المستهدَفة هذه
// الجلسة - تبسيط مقصود (بطاقة مشاركة زخرفية، لا مخطط طبي دقيق يلزمه عرض
// مشهدين معاً).
function buildBodySvgMarkup(targetMuscles) {
  const list = targetMuscles || [];
  const frontCount = list.filter((m) => FRONT_MUSCLES.has(m)).length;
  const backCount = list.filter((m) => BACK_MUSCLES.has(m)).length;
  const view = backCount > frontCount ? "back" : "front";
  const viewBox = view === "front" ? FRONT_VIEWBOX : BACK_VIEWBOX;
  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const neutral = view === "front" ? FRONT_NEUTRAL : BACK_NEUTRAL;
  const targetSet = new Set(list);
  const parts = [];
  for (const d of neutral) parts.push(`<path d="${d}" fill="#33302A" stroke="#4A4438" stroke-width="3"/>`);
  for (const [key, paths] of Object.entries(regions)) {
    const fill = targetSet.has(key) ? RED : "#33302A";
    for (const d of paths) parts.push(`<path d="${d}" fill="${fill}" stroke="#4A4438" stroke-width="3"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBox.w}" height="${viewBox.h}" viewBox="${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}">${parts.join("")}</svg>`;
}

function loadImageFromSvgMarkup(svgMarkup) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgMarkup)))}`;
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// ===== القوالب الأربعة =====

// 1) ملخّص كامل: التمارين المنجزة، مخطط مصغَّر للعضلات المستهدَفة، المدة، الحجم.
async function drawFullSummary(ctx, opts) {
  const { brandLabel, title, footer, isRtl, durationText, volumeText, exercisesText, targetMuscles } = opts;
  drawBackground(ctx);
  drawGoldGlow(ctx, isRtl ? CARD_WIDTH - 60 : 60, 100, 300);
  const align = isRtl ? "right" : "left";
  const x = isRtl ? CARD_WIDTH - 80 : 80;

  drawBrandRow(ctx, brandLabel, x, align);
  ctx.fillStyle = INK;
  ctx.font = "700 58px Tajawal, sans-serif";
  wrapText(ctx, title, x, 240, CARD_WIDTH - 160, 68, align);

  const stats = [
    [opts.summaryExercisesLabel, exercisesText],
    [opts.summaryDurationLabel, durationText],
    [opts.summaryVolumeLabel, volumeText],
  ];
  let y = 400;
  for (const [label, value] of stats) {
    ctx.fillStyle = MUTED;
    ctx.font = "400 32px Tajawal, sans-serif";
    ctx.fillText(bidiSafe(label, isRtl), x, y);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 50px Tajawal, sans-serif";
    ctx.fillText(bidiSafe(value, isRtl), x, y + 58);
    y += 140;
  }

  try {
    const svgMarkup = buildBodySvgMarkup(targetMuscles);
    const img = await loadImageFromSvgMarkup(svgMarkup);
    const boxH = 480;
    const boxW = boxH * (img.width / img.height);
    const boxX = isRtl ? 90 : CARD_WIDTH - boxW - 90;
    const boxY = CARD_HEIGHT - boxH - 190;
    ctx.drawImage(img, boxX, boxY, boxW, boxH);
  } catch (e) { console.error("[achievementShare] body diagram render failed:", e); }

  drawFooter(ctx, footer, x, align);
}

// 2) صورة شخصية + إنجاز: صورة المستخدم (اختيارية) كخلفية مع تراكب نصي.
async function drawPhotoCard(ctx, opts, photoImage) {
  const { brandLabel, footer, isRtl, durationText, volumeText, exercisesText } = opts;
  const align = isRtl ? "right" : "left";
  const x = isRtl ? CARD_WIDTH - 80 : 80;

  if (photoImage) {
    const scale = Math.max(CARD_WIDTH / photoImage.width, CARD_HEIGHT / photoImage.height);
    const drawW = photoImage.width * scale;
    const drawH = photoImage.height * scale;
    ctx.drawImage(photoImage, (CARD_WIDTH - drawW) / 2, (CARD_HEIGHT - drawH) / 2, drawW, drawH);
    const scrim = ctx.createLinearGradient(0, CARD_HEIGHT * 0.45, 0, CARD_HEIGHT);
    scrim.addColorStop(0, "rgba(10,10,11,0)");
    scrim.addColorStop(1, "rgba(10,10,11,0.92)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    const topScrim = ctx.createLinearGradient(0, 0, 0, 220);
    topScrim.addColorStop(0, "rgba(10,10,11,0.55)");
    topScrim.addColorStop(1, "rgba(10,10,11,0)");
    ctx.fillStyle = topScrim;
    ctx.fillRect(0, 0, CARD_WIDTH, 220);
  } else {
    drawBackground(ctx);
    drawGoldGlow(ctx, isRtl ? CARD_WIDTH - 60 : 60, 100, 300);
  }

  drawBrandRow(ctx, brandLabel, x, align);

  const stats = [
    [opts.summaryExercisesLabel, exercisesText],
    [opts.summaryDurationLabel, durationText],
    [opts.summaryVolumeLabel, volumeText],
  ];
  let y = CARD_HEIGHT - 460;
  for (const [label, value] of stats) {
    ctx.fillStyle = MUTED;
    ctx.font = "400 30px Tajawal, sans-serif";
    ctx.fillText(bidiSafe(label, isRtl), x, y);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 48px Tajawal, sans-serif";
    ctx.fillText(bidiSafe(value, isRtl), x, y + 54);
    y += 110;
  }

  drawFooter(ctx, footer, x, align);
}

// 3) بسيط وأنيق: رقم واحد بارز بلا تفاصيل كثيرة.
function drawMinimalCard(ctx, opts) {
  const { brandLabel, footer, isRtl, heroNumber, heroCaption } = opts;
  drawBackground(ctx, "#0A0A0B", "#141110");
  drawGoldGlow(ctx, CARD_WIDTH / 2, CARD_HEIGHT / 2, 420);
  const align = isRtl ? "right" : "left";
  const x = isRtl ? CARD_WIDTH - 80 : 80;

  drawBrandRow(ctx, brandLabel, x, align);

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = "800 340px Tajawal, sans-serif";
  ctx.fillText(String(heroNumber), CARD_WIDTH / 2, CARD_HEIGHT / 2 + 100);

  ctx.fillStyle = INK;
  ctx.font = "700 52px Tajawal, sans-serif";
  ctx.fillText(bidiSafe(heroCaption, isRtl), CARD_WIDTH / 2, CARD_HEIGHT / 2 + 200);

  ctx.textAlign = align;
  drawFooter(ctx, footer, x, align);
}

// 4) إحصائي: الأرقام في تخطيط شبكي أنيق (2x2).
function drawStatsGridCard(ctx, opts) {
  const { brandLabel, title, footer, isRtl, durationText, volumeText, exercisesText, totalSetsText } = opts;
  drawBackground(ctx, "#0A0A0B", "#15130F");
  const align = isRtl ? "right" : "left";
  const x = isRtl ? CARD_WIDTH - 80 : 80;

  drawBrandRow(ctx, brandLabel, x, align);
  ctx.fillStyle = INK;
  ctx.font = "700 52px Tajawal, sans-serif";
  wrapText(ctx, title, x, 240, CARD_WIDTH - 160, 62, align);

  const cells = [
    [opts.summaryDurationLabel, durationText],
    [opts.summaryVolumeLabel, volumeText],
    [opts.summarySetsLabel, totalSetsText],
    [opts.summaryExercisesLabel, exercisesText],
  ];
  const gridTop = 440;
  const gridLeft = 80;
  const cellW = (CARD_WIDTH - 160) / 2;
  const cellH = 260;
  for (let i = 0; i < cells.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = gridLeft + col * cellW;
    const cy = gridTop + row * cellH;
    ctx.strokeStyle = "rgba(201,162,75,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(cx + 10, cy, cellW - 20, cellH - 30);
    ctx.textAlign = "center";
    ctx.fillStyle = MUTED;
    ctx.font = "400 30px Tajawal, sans-serif";
    ctx.fillText(bidiSafe(cells[i][0], isRtl), cx + cellW / 2, cy + 70);
    ctx.fillStyle = GOLD;
    ctx.font = "800 66px Tajawal, sans-serif";
    ctx.fillText(bidiSafe(cells[i][1], isRtl), cx + cellW / 2, cy + 150);
  }

  ctx.textAlign = align;
  drawFooter(ctx, footer, x, align);
}

async function drawTemplate(ctx, template, opts, photoImage) {
  switch (template) {
    case "photo": return drawPhotoCard(ctx, opts, photoImage);
    case "minimal": return drawMinimalCard(ctx, opts);
    case "stats": return drawStatsGridCard(ctx, opts);
    case "full":
    default: return drawFullSummary(ctx, opts);
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

// بعض المتصفحات/الأغلفة (WebView) تُعرِّف navigator.share لكن بلا معالج
// نظام تشغيل حقيقي خلفها، فيبقى الوعد معلَّقاً للأبد بلا حل ولا رفض - ما
// يجمّد تجربة المستخدم كلياً دون وصول أي بديل احتياطي إطلاقاً. مهلة زمنية
// هنا تضمن التقدّم دائماً نحو النسخ للحافظة أو التنزيل حتى في أسوأ الحالات.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("share-timeout")), ms)),
  ]);
}

// opts: { template, photoFile, brandLabel, title, footer, isRtl, shareText,
//   durationText, volumeText, exercisesText, totalSetsText, heroNumber,
//   heroCaption, targetMuscles, summaryExercisesLabel, summaryDurationLabel,
//   summaryVolumeLabel, summarySetsLabel }
export async function shareAchievementCard(opts) {
  await ensureFontsReady();
  let canvas = null;
  try {
    canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext("2d");
    let photoImage = null;
    if (opts.template === "photo" && opts.photoFile) {
      try { photoImage = await loadImageFromFile(opts.photoFile); } catch (e) { console.error("[achievementShare] photo load failed:", e); }
    }
    await drawTemplate(ctx, opts.template, opts, photoImage);
  } catch (e) {
    console.error("[achievementShare] canvas draw failed:", e);
    canvas = null;
  }
  const blob = canvas ? await canvasToBlob(canvas) : null;
  const { brandLabel, shareText } = opts;

  if (blob && navigator.canShare && navigator.share) {
    try {
      const file = new File([blob], "masar-achievement.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await withTimeout(navigator.share({ files: [file], title: brandLabel, text: shareText }), 8000);
        return { ok: true, method: "share-file" };
      }
    } catch (e) {
      if (e && e.name === "AbortError") return { ok: true, method: "cancelled" };
      console.error("[achievementShare] file share failed:", e);
    }
  }
  if (navigator.share) {
    try {
      await withTimeout(navigator.share({ title: brandLabel, text: shareText }), 8000);
      return { ok: true, method: "share-text" };
    } catch (e) {
      if (e && e.name === "AbortError") return { ok: true, method: "cancelled" };
      console.error("[achievementShare] text share failed:", e);
    }
  }
  if (blob && navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      return { ok: true, method: "clipboard-image" };
    } catch (e) { console.error("[achievementShare] clipboard image failed:", e); }
  }
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareText);
      return { ok: true, method: "clipboard-text" };
    } catch (e) { console.error("[achievementShare] clipboard text failed:", e); }
  }
  if (blob) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "masar-achievement.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { ok: true, method: "download" };
    } catch (e) { console.error("[achievementShare] download failed:", e); }
  }
  return { ok: false, method: null };
}
