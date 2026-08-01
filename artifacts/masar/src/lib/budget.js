// منطق قسم "الخزنة" (ميزانية): أنواع الحسابات، التصنيفات الافتراضية،
// نموذج 50/30/20، ومساعدات الشهر/المعاملات المتكررة. بلا أي استدعاء
// شبكة هنا - كل شيء حسابي بحت، تماماً كمبدأ lib/goals.js.

// أنواع الحسابات المدعومة - إضافة نوع جديد (محفظة إلكترونية، بطاقة
// ائتمانية...) لاحقاً = سطر واحد هنا + توسيع check constraint في
// vault_accounts.type بقاعدة البيانات، بلا أي تغيير بنيوي آخر.
export const ACCOUNT_TYPES = [
  { id: "cash", name: "كاش", nameEn: "Cash", icon: "Wallet" },
  { id: "bank", name: "حساب بنكي", nameEn: "Bank Account", icon: "Landmark" },
];

// عملات مسار الحالية (نفس قائمة VAULT_CURRENCIES التاريخية في التطبيق) -
// كل حساب يحمل عملته الخاصة (لا عملة واحدة إلزامية لكل حسابات المستخدم).
export const VAULT_CURRENCIES = [
  { code: "KWD", label: "دينار كويتي", symbol: "د.ك" },
  { code: "SAR", label: "ريال سعودي", symbol: "ر.س" },
  { code: "AED", label: "درهم إماراتي", symbol: "د.إ" },
  { code: "QAR", label: "ريال قطري", symbol: "ر.ق" },
  { code: "BHD", label: "دينار بحريني", symbol: "د.ب" },
  { code: "OMR", label: "ريال عماني", symbol: "ر.ع" },
  { code: "EGP", label: "جنيه مصري", symbol: "ج.م" },
  { code: "JOD", label: "دينار أردني", symbol: "د.أ" },
  { code: "USD", label: "دولار أمريكي", symbol: "$" },
  { code: "EUR", label: "يورو", symbol: "€" },
  { code: "GBP", label: "جنيه إسترليني", symbol: "£" },
];
export function vaultCurrencySymbol(code) {
  return (VAULT_CURRENCIES.find((c) => c.code === code) || VAULT_CURRENCIES[0]).symbol;
}
export function formatVaultAmount(amount, code) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${vaultCurrencySymbol(code)}`;
}

// التصنيفات الجاهزة - قائمة ثابتة في الكود (لا صفوف قاعدة بيانات، بلا
// حاجة لأي seeding لكل مستخدم جديد) بنفس مبدأ DEFAULT_CATEGORIES في
// store.js. إضافة تصنيف افتراضي جديد لاحقاً = سطر واحد هنا فقط. icon اسم
// أيقونة Lucide حقيقي (يُستورَد ديناميكياً حيث تُعرض)، color لون hex من
// هوية مسار البصرية (ذهبي/كحلي ومتدرجاتهما + ألوان دلالية إضافية).
// لا تصنيف "أخرى" هنا عمداً بعد الآن - كان ملاذاً إجبارياً للمعاملات عند حذف
// تصنيف آخر، لكن المستخدم صار يختار تصنيفاً بديلاً فعلياً بنفسه عند الحذف
// (انظر منطق الحذف في VaultView.jsx)، فلا حاجة لتصنيف "ملاذ" ثابت غير قابل
// للحذف بعد الآن. معاملات قديمة قد تحمل category_id='other' من استخدام
// سابق لهذا الملاذ - انظر resolveCategory أدناه لكيفية عرضها بأمان دون
// إعادتها كخيار نشط قابل للاختيار من جديد.
export const DEFAULT_BUDGET_CATEGORIES = [
  { id: "restaurants", name: "مطاعم", nameEn: "Restaurants", icon: "UtensilsCrossed", color: "#D17B5F" },
  { id: "coffee", name: "قهوة", nameEn: "Coffee", icon: "Coffee", color: "#9A7529" },
  { id: "transport", name: "مواصلات", nameEn: "Transport", icon: "Car", color: "#6FA8DC" },
  { id: "health", name: "صحة", nameEn: "Health", icon: "HeartPulse", color: "#5FA8A0" },
  { id: "shopping", name: "تسوق", nameEn: "Shopping", icon: "ShoppingBag", color: "#C9A24B" },
  { id: "entertainment", name: "ترفيه", nameEn: "Entertainment", icon: "Popcorn", color: "#8A7BD1" },
  { id: "bills", name: "فواتير", nameEn: "Bills", icon: "Receipt", color: "#E0955F" },
  { id: "groceries", name: "بقالة", nameEn: "Groceries", icon: "ShoppingCart", color: "#7FB069" },
  { id: "education", name: "تعليم", nameEn: "Education", icon: "GraduationCap", color: "#6B8FD1" },
  { id: "rent", name: "إيجار/سكن", nameEn: "Rent/Housing", icon: "Home", color: "#1B3A3A" },
];

// دلو "غير مصنّف" - يغطي حالتين بنفس العرض المحايد: (أ) معاملة لم يختر لها
// المستخدم أي تصنيف أصلاً (categoryId فارغ)، و(ب) معاملة قديمة تحمل
// category_id='other' فعلياً من نظام سابق (قبل إزالة تصنيف "أخرى" الثابت
// نهائياً). كلاهما يعني عملياً "بلا تصنيف نشط محدَّد" من منظور المستخدم، فلا
// داعٍ لتمييزهما بلافتة "قديم" مربكة - عرض محايد واحد أبسط وأوضح. تُعرَض
// بأمان بتاريخها الكامل في السجل والرسم الدائري (بلا فقدان بيانات)، لكنها
// لا تظهر إطلاقاً في allCategories بـVaultView.jsx (لا يمكن اختيارها
// كتصنيف جديد لمعاملة أو ميزانية جديدة - هذا الدلو عرضي فقط، ليس تصنيفاً).
const UNCATEGORIZED = { id: "other", name: "غير مصنّف", nameEn: "Uncategorized", icon: "MoreHorizontal", color: "#8C8578" };

// يبحث عن تصنيف بمعرّفه - أولاً في الافتراضية الثابتة، ثم في المخصَّصة التي
// أنشأها المستخدم بنفسه (custom)، ثم دلو "غير مصنّف" (انظر UNCATEGORIZED
// أعلاه) - عمود category_id واحد في vault_transactions يخدم كل الحالات دون
// تفرّع. يُرجع null إن لم يوجد فعلاً (تصنيف مخصَّص حُذف لاحقاً مثلاً) بدل
// اختراع تصنيف وهمي.
export function resolveCategory(categoryId, customCategories = []) {
  if (!categoryId) return null;
  const builtIn = DEFAULT_BUDGET_CATEGORIES.find((c) => c.id === categoryId);
  if (builtIn) return builtIn;
  const custom = customCategories.find((c) => c.id === categoryId);
  if (custom) return { id: custom.id, name: custom.name, nameEn: custom.name, icon: custom.icon || "Tag", color: custom.color || "#C9A24B" };
  if (categoryId === "other") return UNCATEGORIZED;
  return null;
}

// الشهر الحالي بصيغة نصية 'YYYY-MM' بالتاريخ المحلي (لا UTC) - نفس مبدأ
// localDayKey المستخدم في tips.js/goals.js، مُعاد استخدامه بنفس الروح هنا
// لتفادي انزياح التوقيت بين الخادم والمستخدم.
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
// يحوّل أي مفتاح يوم 'YYYY-MM-DD' لمفتاح شهره 'YYYY-MM' مباشرة (بدون
// إنشاء كائن Date جديد) - يُستخدم لتجميع المعاملات (نصوص تواريخ) حسب
// الشهر بأمان تام حتى مع نصوص تواريخ محلية.
export function monthKeyFromDateKey(dateKey) {
  return String(dateKey || "").slice(0, 7);
}
export function shiftMonthKey(mk, delta) {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(d);
}

// نموذج 50/30/20 المعروف (احتياجات/رغبات/ادخار) - نقطة بداية جاهزة قابلة
// للتعديل دائماً، لا قاعدة صارمة. needsCategoryIds/wantsCategoryIds
// تُستخدَم فقط لتوزيع مبلغ "الاحتياجات"/"الرغبات" المقترح على التصنيفات
// الجاهزة ذات الصلة بالتساوي كبداية معقولة - المستخدم يُعدّل كل رقم بعدها
// بحرية تامة.
export const NEEDS_CATEGORY_IDS = ["rent", "bills", "groceries", "health", "transport"];
export const WANTS_CATEGORY_IDS = ["restaurants", "coffee", "shopping", "entertainment"];

export function computeBudget503020(monthlyIncome) {
  const income = Number(monthlyIncome) || 0;
  const needs = Math.round(income * 0.5 * 100) / 100;
  const wants = Math.round(income * 0.3 * 100) / 100;
  const savings = Math.round((income - needs - wants) * 100) / 100;
  return { needs, wants, savings };
}

// توزيع مبلغ إجمالي (احتياجات أو رغبات) بالتساوي على قائمة تصنيفات -
// نقطة بداية تقديرية فقط (لا افتراض حقيقي عن نمط صرف المستخدم الفعلي)،
// يُستبدَل حالاً بأرقام أدق إن استخدم المستخدم "الاقتراح الذكي" بالذكاء
// الاصطناعي بدلاً منه، أو يُعدَّل يدوياً بحرية تامة بعد التوليد الأولي.
export function splitEqually(totalAmount, categoryIds) {
  if (categoryIds.length === 0) return {};
  const each = Math.round((totalAmount / categoryIds.length) * 100) / 100;
  const result = {};
  for (const id of categoryIds) result[id] = each;
  return result;
}

// المعاملات المتكررة (فواتير/رواتب ثابتة): أول معاملة يُفعَّل لها التكرار
// تصبح "القالب" (isRecurring=true, recurringSourceId=null). كل شهر لاحق،
// تُفحص قائمة المعاملات المحمَّلة فعلياً (لا حاجة لعمود "آخر شهر طُبِّق
// فيه" منفصل): إن لم توجد أي معاملة بنفس معرّف القالب (القالب نفسه أو
// نسخة منه عبر recurringSourceId) بتاريخ ضمن الشهر الحالي، فهي "مستحقة"
// - تُنشأ نسخة جديدة تلقائياً بنفس المبلغ/السبب/الحساب/التصنيف بتاريخ
// اليوم، فلا تُطبَّق مرتين لنفس الشهر حتى لو فُتح التطبيق عدة مرات فيه.
export function findDueRecurringTemplates(transactions, currentMonthKey = monthKey()) {
  const templates = transactions.filter((t) => t.isRecurring && !t.recurringSourceId);
  return templates.filter((tpl) => {
    const hasInstanceThisMonth = transactions.some(
      (t) => (t.id === tpl.id || t.recurringSourceId === tpl.id) && monthKeyFromDateKey(t.date) === currentMonthKey,
    );
    return !hasInstanceThisMonth;
  });
}
