// بطاقة إنجاز قابلة للمشاركة - مُرسَومة بالكامل عبر Canvas API الأصلي
// (لا مكتبة خارجية، لا صورة/تصميم منسوخ من أي تطبيق) بألوان هوية مسار
// (ذهبي #C9A24B، تدرّج داكن). تُستخدَم لأي إنجاز مستقبلي (تمرين، صلاة،
// تحدٍّ...) لا لتمارين الرياضة فقط - الدالة عامة، تستقبل نصوصاً جاهزة
// ومترجَمة من المستدعي فقط.
//
// المشاركة عبر Share Sheet القياسي للمتصفح (navigator.share) - لا تصميم
// مخصَّص لمنصة اجتماعية بعينها. عند عدم الدعم: نسخ الصورة للحافظة، ثم نص
// كبديل ثانٍ، ثم تنزيل الصورة كملف كحل أخير يعمل في كل مكان دائماً.
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

async function ensureFontsReady() {
  try {
    if (document.fonts && document.fonts.ready) {
      await Promise.all([
        document.fonts.load("bold 64px Tajawal"),
        document.fonts.load("400 36px Tajawal"),
      ]);
      await document.fonts.ready;
    }
  } catch { /* الخط الافتراضي يكفي إن تعذّر تحميل Tajawal لأي سبب */ }
}

async function drawAchievementCanvas({ brandLabel, title, statLines, footer, isRtl }) {
  await ensureFontsReady();
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");

  const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bgGrad.addColorStop(0, "#0A0A0B");
  bgGrad.addColorStop(1, "#1C1710");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = "#C9A24B";
  ctx.beginPath();
  ctx.arc(CARD_WIDTH - 60, 100, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const align = isRtl ? "right" : "left";
  const x = isRtl ? CARD_WIDTH - 80 : 80;
  ctx.textAlign = align;

  ctx.fillStyle = "#C9A24B";
  ctx.font = "700 46px Tajawal, sans-serif";
  ctx.fillText(brandLabel, x, 130);

  ctx.fillStyle = "#F2F0EA";
  ctx.font = "700 62px Tajawal, sans-serif";
  wrapText(ctx, title, x, 250, CARD_WIDTH - 160, 72, align);

  let y = 460;
  for (const { label, value } of statLines) {
    ctx.fillStyle = "#9C968A";
    ctx.font = "400 34px Tajawal, sans-serif";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "700 54px Tajawal, sans-serif";
    ctx.fillText(value, x, y + 62);
    y += 155;
  }

  ctx.fillStyle = "#6B6558";
  ctx.font = "400 30px Tajawal, sans-serif";
  ctx.fillText(footer, x, CARD_HEIGHT - 60);

  return canvas;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, align) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

// statLines: [{ label, value }], كلها نصوص جاهزة ومترجَمة من المستدعي.
export async function shareAchievementCard({ brandLabel, title, statLines, footer, shareText, isRtl }) {
  let canvas;
  try {
    canvas = await drawAchievementCanvas({ brandLabel, title, statLines, footer, isRtl });
  } catch (e) {
    console.error("[achievementShare] canvas draw failed:", e);
    canvas = null;
  }
  const blob = canvas ? await canvasToBlob(canvas) : null;

  if (blob && navigator.canShare && navigator.share) {
    try {
      const file = new File([blob], "masar-achievement.png", { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: brandLabel, text: shareText });
        return { ok: true, method: "share-file" };
      }
    } catch (e) {
      if (e && e.name === "AbortError") return { ok: true, method: "cancelled" };
      console.error("[achievementShare] file share failed:", e);
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: brandLabel, text: shareText });
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
