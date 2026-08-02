// منطق قسم "الفواتير الشهرية" داخل الخزنة - بلا أي استدعاء شبكة هنا، كل
// شيء حسابي بحت (نفس مبدأ budget.js/goals.js). الفاتورة تحمل next_due_date
// كمرجع استحقاق وحيد يتقدَّم حسابياً بعد كل دفعة (لا محفّز/دالة في القاعدة -
// نفس مبدأ رصيد الحساب في budget.js/VaultView.jsx المحسوب بالكامل من
// الواجهة). دورة كل شهر تُحدَّد بدالة مستقلة (dueDateInMonth) لا تتأثر
// بتقدُّم next_due_date، حتى تبقى فاتورة "مدفوعة هذا الشهر" ظاهرة بصفتها
// كذلك طوال الشهر حتى بعد أن يتقدَّم next_due_date فعلياً للدورة القادمة.
import { localDayKey } from "./tips";
import { monthKeyFromDateKey } from "./budget";

export const BILL_RECURRENCES = [
  { id: "monthly", name: "شهري", nameEn: "Monthly" },
  { id: "yearly", name: "سنوي", nameEn: "Yearly" },
  { id: "custom", name: "فترة مخصّصة", nameEn: "Custom period" },
];

function toDateKey(d) {
  return localDayKey(d);
}
function lastDayOfMonth(year, monthIndex0) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

// أول next_due_date عند إنشاء الفاتورة - أقرب دورة قادمة لم تمضِ بعد
// (اليوم نفسه يُحتسَب "لم يمضِ" حتى تُتاح دفعة اليوم فوراً عند الإنشاء).
export function computeInitialNextDueDate(bill, today = new Date()) {
  const todayStr = toDateKey(today);
  if (bill.recurrence === "monthly") {
    const day = Math.min(bill.dueDay, lastDayOfMonth(today.getFullYear(), today.getMonth()));
    let candidate = new Date(today.getFullYear(), today.getMonth(), day);
    if (toDateKey(candidate) < todayStr) {
      const y = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
      const m = (today.getMonth() + 1) % 12;
      candidate = new Date(y, m, Math.min(bill.dueDay, lastDayOfMonth(y, m)));
    }
    return toDateKey(candidate);
  }
  if (bill.recurrence === "yearly") {
    const src = new Date(bill.dueDate);
    let candidate = new Date(today.getFullYear(), src.getMonth(), src.getDate());
    if (toDateKey(candidate) < todayStr) candidate = new Date(today.getFullYear() + 1, src.getMonth(), src.getDate());
    return toDateKey(candidate);
  }
  // custom: المستخدم يحدّد أول تاريخ استحقاق صراحة
  return bill.dueDate;
}

// يُستدعى بعد تسجيل دفعة لدورة بتاريخ استحقاقها dueDateStr (وليس بالضرورة
// bill.nextDueDate الحالي - قد تُدفع فاتورة متأخرة، فتُحسَب الدورة التالية
// من تاريخ استحقاقها الأصلي لا من تاريخ اليوم، حتى لا ينزاح جدول الاستحقاق
// كله بسبب تأخير دفعة واحدة).
export function advanceDueDate(dueDateStr, bill) {
  const d = new Date(dueDateStr);
  if (bill.recurrence === "monthly") {
    const y = d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear();
    const m = (d.getMonth() + 1) % 12;
    return toDateKey(new Date(y, m, Math.min(bill.dueDay, lastDayOfMonth(y, m))));
  }
  if (bill.recurrence === "yearly") {
    return toDateKey(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()));
  }
  const next = new Date(d);
  next.setDate(next.getDate() + (bill.customIntervalDays || 30));
  return toDateKey(next);
}

// تاريخ استحقاق الفاتورة ضمن شهر تقويمي مُحدَّد (mk بصيغة 'YYYY-MM') -
// مستقل تماماً عن bill.nextDueDate الحالي (الذي يتقدَّم بعد كل دفعة)، حتى
// يبقى بالإمكان معرفة "هل دُفعت فاتورة هذا الشهر؟" ولو تقدَّم next_due_date
// فعلياً لدورة الشهر القادم. يُرجع null إن كانت الفاتورة غير مستحقة أصلاً
// خلال هذا الشهر (فاتورة سنوية بشهر مختلف، أو فترة مخصّصة لا تقع دورتها
// الحالية ضمنه).
export function dueDateInMonth(bill, mk) {
  const [y, m] = mk.split("-").map(Number);
  if (bill.recurrence === "monthly") {
    const day = Math.min(bill.dueDay, lastDayOfMonth(y, m - 1));
    return `${mk}-${String(day).padStart(2, "0")}`;
  }
  if (bill.recurrence === "yearly" && bill.dueDate) {
    const dueMonth = Number(bill.dueDate.slice(5, 7));
    if (dueMonth !== m) return null;
    return `${mk}-${bill.dueDate.slice(8, 10)}`;
  }
  if (bill.recurrence === "custom" && bill.nextDueDate) {
    return monthKeyFromDateKey(bill.nextDueDate) === mk ? bill.nextDueDate : null;
  }
  return null;
}

// حالة عرض الفاتورة الآن: مدفوعة هذا الشهر (أخضر) تعلو أي حالة أخرى، ثم
// متأخرة (أحمر)، ثم مستحقة قريباً خلال 7 أيام (أصفر)، وإلا عادية. فاتورة
// موقوفة (isActive=false) لها حالة مستقلة بمعزل عن التواريخ.
export function billStatus(bill, payments, currentMonthKey, today = new Date()) {
  if (!bill.isActive) return "paused";
  const dueThisMonth = dueDateInMonth(bill, currentMonthKey);
  const paidThisMonth = dueThisMonth && payments.some((p) => p.billId === bill.id && p.dueDateForCycle === dueThisMonth);
  if (paidThisMonth) return "paid";
  const todayStr = toDateKey(today);
  if (bill.nextDueDate < todayStr) return "overdue";
  const diffDays = Math.round((new Date(bill.nextDueDate) - new Date(todayStr)) / 86400000);
  if (diffDays <= 7) return "dueSoon";
  return "ok";
}

// نسبة الالتزام الشهري: من بين الفواتير النشطة المستحقة فعلياً خلال هذا
// الشهر (حسب dueDateInMonth)، كم منها له دفعة مسجَّلة لنفس تاريخ استحقاقها؟
// فواتير الفترة المخصّصة تُحتسَب فقط إن وقعت دورتها الحالية ضمن هذا الشهر
// تحديداً (تقريب صريح - انظر تعليق dueDateInMonth أعلاه - يُذكر كقيد معروف
// في ملخص الميزة، لا يُخفى).
export function computeMonthlyCommitment(bills, payments, mk) {
  const relevant = bills
    .filter((b) => b.isActive)
    .map((b) => ({ bill: b, dueDate: dueDateInMonth(b, mk) }))
    .filter((x) => x.dueDate);
  const total = relevant.length;
  const paid = relevant.filter(({ bill, dueDate }) => payments.some((p) => p.billId === bill.id && p.dueDateForCycle === dueDate)).length;
  return { paid, total, pct: total > 0 ? Math.round((paid / total) * 100) : 0 };
}

// الإجماليات: مجموع القيم الثابتة المعروفة الآن (فواتير متغيّرة القيمة لا
// تُحتسَب هنا - قيمتها غير معروفة قبل الدفع فعلياً، لا تقدير مخترَع).
export function computeBillTotals(bills) {
  const active = bills.filter((b) => b.isActive);
  const monthlyFixed = active.filter((b) => b.recurrence === "monthly" && b.amountType === "fixed").reduce((s, b) => s + (b.amount || 0), 0);
  const yearlyFixed = active.filter((b) => b.recurrence === "yearly" && b.amountType === "fixed").reduce((s, b) => s + (b.amount || 0), 0);
  const hasVariable = active.some((b) => b.amountType === "variable");
  return { monthlyFixed, yearlyFixed, hasVariable };
}

// كل الفواتير (نشطة وموقوفة معاً) مرتبة بالأقرب استحقاقاً - تُستخدَم لقائمة
// "الفواتير القادمة". الفاتورة الموقوفة تبقى ظاهرة عمداً (باهتة في الواجهة،
// انظر opacity في VaultView.jsx) حتى يقدر المستخدم استئنافها لاحقاً - لو
// اختفت تماماً من القائمة عند الإيقاف لما وُجدت وسيلة لاستئنافها إطلاقاً.
export function upcomingBills(bills, limit = 20) {
  return [...bills].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)).slice(0, limit);
}
