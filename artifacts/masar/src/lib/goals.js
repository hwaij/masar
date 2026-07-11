// منطق قسم "أهداف": حساب فترة الهدف (أسبوعي/شهري/سنوي) وخلايا التقويم
// الخاصة به، ومواعيد مراجعته. كل الحسابات بالتاريخ المحلي (لا UTC) —
// نفس منطق localDayKey المستخدم في قسم "بصيرة"، مُعاد استخدامه هنا بدل
// تكراره، لتفادي مشكلة انزياح التوقيت بين الخادم والمستخدم.
import { localDayKey } from "./tips";

export const GOAL_PERIODS = {
  weekly: { label: "أسبوعي", reviewLabel: "منتصف الأسبوع" },
  monthly: { label: "شهري", reviewLabel: "منتصف الشهر" },
  yearly: { label: "سنوي", reviewLabel: "بداية كل شهر" },
};

export const GOAL_POINTS_SUCCESS = 20;
export const GOAL_POINTS_FAILURE = 15;

function parseLocalDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDaysLocal(dateKey, n) {
  const d = parseLocalDate(dateKey);
  d.setDate(d.getDate() + n);
  return formatLocalDate(d);
}
function addMonthsLocal(dateKey, n) {
  const d = parseLocalDate(dateKey);
  d.setMonth(d.getMonth() + n);
  return formatLocalDate(d);
}
function startOfMonth(dateKey) {
  const d = parseLocalDate(dateKey);
  return formatLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
}
function daysInMonth(dateKey) {
  const d = parseLocalDate(dateKey);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// يبني خلايا التقويم (لعرض الهدف موزّعاً على فترته) ومواعيد المراجعة،
// بالاعتماد فقط على تاريخ الإنشاء المحلي — بلا أي محاذاة لحدود أسبوع/شهر
// تقويمية، فالفترة تبدأ دائماً من يوم إنشاء الهدف فعلياً:
// - أسبوعي: 7 أيام من الإنشاء، مراجعة واحدة في اليوم الرابع (منتصف الأسبوع فعلياً).
// - شهري: من يوم الإنشاء حتى نهاية شهره التقويمي، مراجعة واحدة في اليوم 15
//   (أو آخر يوم في الشهر إن كان أقصر).
// - سنوي: 12 شهراً من شهر الإنشاء، مع مراجعة دورية في بداية كل شهر من
//   الأشهر الاثني عشر التالية — آخر مراجعة (الثانية عشرة) هي المحاسبة
//   النهائية لنجاح/فشل الهدف بأكمله.
export function buildGoalPlan(period, createdDateKey) {
  if (period === "weekly") {
    const cells = Array.from({ length: 7 }, (_, i) => addDaysLocal(createdDateKey, i));
    const checkpoints = [addDaysLocal(createdDateKey, 3)];
    return { cells, checkpoints, unit: "day" };
  }
  if (period === "monthly") {
    const som = startOfMonth(createdDateKey);
    const total = daysInMonth(createdDateKey);
    const cells = Array.from({ length: total }, (_, i) => addDaysLocal(som, i));
    const midDay = Math.min(15, total);
    const checkpoints = [addDaysLocal(som, midDay - 1)];
    return { cells, checkpoints, unit: "day" };
  }
  // yearly
  const createdMonthStart = startOfMonth(createdDateKey);
  const cells = Array.from({ length: 12 }, (_, i) => addMonthsLocal(createdMonthStart, i));
  const checkpoints = Array.from({ length: 12 }, (_, i) => addMonthsLocal(createdMonthStart, i + 1));
  return { cells, checkpoints, unit: "month" };
}

// نُنشئ الهدف بخطته الكاملة محسوبة سلفاً (لا حاجة لإعادة حسابها لاحقاً؛
// تُخزَّن كما هي حتى لو تغيّر منطق البناء مستقبلاً، فلا تتأثر أهداف قديمة).
export function createGoal({ id, title, period }) {
  const createdDate = localDayKey();
  const { cells, checkpoints, unit } = buildGoalPlan(period, createdDate);
  return {
    id,
    title,
    period,
    createdDate,
    cells,
    checkpoints,
    unit,
    checkpointIndex: 0,
    status: "active",
    failures: [],
  };
}

// هل حان وقت مراجعة هذا الهدف اليوم (بالتاريخ المحلي)؟ فقط للأهداف
// النشطة التي ما زال لديها مراجعة قادمة لم تُجَب بعد.
export function isReviewDue(goal, todayKey = localDayKey()) {
  if (goal.status !== "active") return false;
  const due = goal.checkpoints[goal.checkpointIndex];
  if (!due) return false;
  return todayKey >= due;
}
