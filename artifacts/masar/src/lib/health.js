// حسابات صحية عامة (BMI, IBW, REE, TEE) لقسم "أنت" — أساس تُبنى عليه
// أقسام التغذية والرياضة لاحقاً (التي ستحتاج بشكل خاص إلى قيمة TEE).
// هذه تقديرات عامة فقط بمعادلات مرجعية معروفة (WHO لتصنيف BMI، Devine
// لـIBW، Mifflin-St Jeor لـREE) ولا تراعي أي حالة صحية خاصة — الإلزام
// بعرض تنبيه طبي واضح عند اختيار أي حالة صحية يقع على طبقة الواجهة
// (YouView)، لا هنا.

export const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "خامل", factor: 1.2 },
  { key: "light", label: "نشاط خفيف", factor: 1.375 },
  { key: "moderate", label: "نشاط متوسط", factor: 1.55 },
  { key: "active", label: "نشاط عالي", factor: 1.725 },
  { key: "very_active", label: "نشاط عالي جداً", factor: 1.9 },
];

export const HEALTH_CONDITIONS = [
  "سكري",
  "ضغط الدم",
  "أمراض الكلى",
  "أمراض الكبد",
  "أمراض القلب",
  "ارتفاع الكولسترول",
];

export const NO_CONDITION = "لا يوجد";

export const MEDICAL_DISCLAIMER =
  "هذه الأرقام تقديرات عامة ولا تراعي حالتك الصحية الخاصة. يُرجى مراجعة طبيبك أو أخصائي التغذية لتحديد احتياجاتك الغذائية والصحية بدقة بناءً على وضعك الطبي.";

export function activityFactor(activityLevel) {
  return ACTIVITY_LEVELS.find((a) => a.key === activityLevel)?.factor ?? null;
}

export function bmiCategory(bmi) {
  if (bmi < 18.5) return "نقص وزن";
  if (bmi < 25) return "وزن طبيعي";
  if (bmi < 30) return "زيادة وزن";
  return "سمنة";
}

// كل الدوال تُرجع null إن كانت المدخلات ناقصة أو غير صالحة، بدل NaN
// صامتة قد تتسرب إلى الواجهة أو قاعدة البيانات.
export function computeBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi)) return null;
  return { value: Math.round(bmi * 10) / 10, category: bmiCategory(bmi) };
}

export function computeIBW(heightCm, gender) {
  if (!heightCm || (gender !== "male" && gender !== "female")) return null;
  const heightIn = heightCm / 2.54;
  const base = gender === "male" ? 50 : 45.5;
  const ibw = base + 2.3 * (heightIn - 60);
  if (!Number.isFinite(ibw)) return null;
  return Math.round(ibw * 10) / 10;
}

export function computeREE(weightKg, heightCm, age, gender) {
  if (!weightKg || !heightCm || !age || (gender !== "male" && gender !== "female")) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const ree = gender === "male" ? base + 5 : base - 161;
  if (!Number.isFinite(ree)) return null;
  return Math.round(ree);
}

export function computeTEE(ree, activityLevel) {
  const factor = activityFactor(activityLevel);
  if (!ree || !factor) return null;
  return Math.round(ree * factor);
}

// يحسب كل القيم دفعة واحدة من مدخلات نموذج "أنت" — تُستخدم عند الحفظ
// (لتخزين النتائج جاهزة) وعند العرض.
export function computeHealthMetrics({ heightCm, weightKg, age, gender, activityLevel }) {
  const bmi = computeBMI(weightKg, heightCm);
  const ibw = computeIBW(heightCm, gender);
  const ree = computeREE(weightKg, heightCm, age, gender);
  const tee = computeTEE(ree, activityLevel);
  return { bmi, ibw, ree, tee };
}
