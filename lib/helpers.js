export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
export function fmtHM(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h} س ${m} د`;
}
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function diffMinutes(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins;
}
export function arabicDate(key, opts) {
  // أرقام إنجليزية (latn) مع أسماء أيام وأشهر عربية
  return new Date(key).toLocaleDateString("ar-KW-u-nu-latn", opts);
}
export function computeStreak(entries) {
  if (!entries.length) return 0;
  const days = new Set(entries.map((e) => e.date));
  let streak = 0;
  let d = new Date();
  if (!days.has(todayKey(d))) {
    d.setDate(d.getDate() - 1);
    if (!days.has(todayKey(d))) return 0;
  }
  while (days.has(todayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export const COLOR_CHOICES = [
  "#C9A24B", "#8A7BD1", "#5FA8A0", "#D17B5F", "#6FA8DC",
  "#B25D7D", "#9AA84C", "#D4A04C", "#7BA05B", "#C76B6B",
];

export const BADGES = [
  { id: "first_step", name: "الخطوة الأولى", desc: "سجّلت أول نشاط لك", icon: "◐", threshold: (s) => s.totalEntries >= 1 },
  { id: "streak3", name: "ثلاثة أيام", desc: "التزمت 3 أيام متتالية", icon: "✦", threshold: (s) => s.streak >= 3 },
  { id: "streak7", name: "أسبوع كامل", desc: "أسبوع من الالتزام", icon: "✶", threshold: (s) => s.streak >= 7 },
  { id: "task_master", name: "منجِز", desc: "أنهيت 20 مهمة", icon: "✓", threshold: (s) => s.tasksDone >= 20 },
  { id: "deep_work", name: "تركيز عميق", desc: "5 ساعات عمل في يوم", icon: "◆", threshold: (s) => s.maxDayHours >= 5 },
  { id: "century", name: "المئة", desc: "سجّلت 100 نشاط", icon: "★", threshold: (s) => s.totalEntries >= 100 },
  { id: "focus_first", name: "أول تركيز", desc: "أكملت أول جلسة تركيز", icon: "⏣", threshold: (s) => s.focusSessions >= 1 },
  { id: "focus_master", name: "سيّد التركيز", desc: "10 ساعات تركيز إجمالاً", icon: "❂", threshold: (s) => s.focusHours >= 10 },
];

// مهام يومية بديهية تُضاف تلقائياً لمن يريد أساسيات الانضباط
export const DEFAULT_DAILY_TASKS = [
  "قم الساعة 6 صباحاً",
  "رتّب سريرك",
  "نظّف أسنانك",
  "مارس الرياضة ساعة واحدة",
  "ادرس ساعة واحدة",
];

// مساعد لاستدعاء مسار API الخادمي
export async function analyze(prompt, maxTokens = 1000) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "تعذّر التحليل");
  return data.text;
}

export function parseJsonLoose(text) {
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}
