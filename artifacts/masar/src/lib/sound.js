// مؤثرات صوتية خفيفة واختيارية (Opt-in، مُطفأة افتراضياً - راجع
// profile.soundEnabled). مولَّدة برمجياً عبر Web Audio API بدل ملفات صوتية
// جاهزة، حتى لا تُثقل حجم التطبيق بأي حجم إضافي مهما كان صغيراً. كل صوت
// أقل من نصف ثانية، ولا صوت إطلاقاً لأي ضغطة زر عادية - فقط عند نجاح حفظ
// عملية مهمة (تسجيل صلاة، إكمال هدف) أو إكمال إنجاز/تحدي.
import { store } from "./store";

let audioCtx = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  // المتصفحات تُعلّق AudioContext حتى أول إيماءة مستخدم حقيقية - استدعاء
  // هذه الدوال يحدث دائماً من داخل معالج نقرة/ضغطة فعلية (تسجيل صلاة،
  // تأكيد هدف...)، فهذا الشرط محقَّق دوماً عملياً.
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone(ctx, freq, startTime, duration, gainPeak) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

// نجاح حفظ/تسجيل (تسجيل صلاة، إكمال هدف): نغمة واحدة قصيرة وناعمة (~0.15 ثانية).
export function playSaveSound() {
  if (!store.getLocalSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    tone(ctx, 880, ctx.currentTime, 0.14, 0.12);
  } catch (e) { console.error("[sound] playSaveSound failed:", e); }
}

// إكمال إنجاز/تحدي: ثلاث نغمات صاعدة قصيرة احتفالية (المجموع أقل من نصف ثانية).
export function playAchievementSound() {
  if (!store.getLocalSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    tone(ctx, 659, t, 0.1, 0.1);
    tone(ctx, 880, t + 0.09, 0.1, 0.12);
    tone(ctx, 1109, t + 0.18, 0.14, 0.13);
  } catch (e) { console.error("[sound] playAchievementSound failed:", e); }
}
