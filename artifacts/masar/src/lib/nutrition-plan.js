// حسابات قسم "النظام الغذائي" (الخطة الشخصية الحيّة) - كل دالة هنا حسابية
// بحتة، بلا أي استدعاء ذكاء اصطناعي إطلاقاً. Gemini يُستخدَم فقط في طبقة
// منفصلة أعلى هذه الحسابات (اقتراح أصناف الوجبات + نصيحة اليوم في
// NutritionPlanView.jsx) ولا يُدخل أرقاماً هنا أو يُعدّلها.
import { DAILY_GUIDELINES } from "./nutrition";

// تعديل السعرات اليومية حسب الهدف - عجز للتنشيف، فائض للتضخيم، بلا تغيير
// للمحافظة/اللياقة العامة. نسب معتدلة عامة (لا نسب متطرفة) لتبقى آمنة
// افتراضياً لعموم المستخدمين.
export const GOAL_CALORIE_ADJUST_PCT = {
  lose_weight: -0.18,
  build_muscle: 0.12,
  general_fitness: 0,
  maintain_weight: 0,
};

// بروتين لكل كغم وزن جسم حسب الهدف - أعلى في التنشيف (حماية الكتلة
// العضلية أثناء العجز) والتضخيم، أقل عند المحافظة/اللياقة العامة.
export const PROTEIN_G_PER_KG_BY_GOAL = {
  lose_weight: 2.0,
  build_muscle: 1.8,
  general_fitness: 1.4,
  maintain_weight: 1.2,
};

const FAT_PCT_OF_CALORIES = 0.28;

// يحسب الاحتياج اليومي وتوزيع الماكروز - يتطلب tee محسوباً مسبقاً من
// "أنت" (computeHealthMetrics في health.js) ووزناً وهدفاً صالحين، وإلا
// يُرجع null بدل اختراع رقم. extraBurnedCalories: سعرات محروقة إضافية من
// مصدر نشاط حقيقي (حالياً 0 دائماً - لا مصدر مقيس فعلياً في مسار بعد؛
// انظر التعليق في NutritionPlanView.jsx حول جهوزية الربط المستقبلي).
export function computeDailyTargets({ tee, weightKg, goal }, extraBurnedCalories = 0) {
  if (!tee || !weightKg) return null;
  const adjustPct = GOAL_CALORIE_ADJUST_PCT[goal] ?? 0;
  const dailyCalories = Math.max(1200, Math.round(tee * (1 + adjustPct)) + Math.round(extraBurnedCalories || 0));
  const proteinPerKg = PROTEIN_G_PER_KG_BY_GOAL[goal] ?? 1.4;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const proteinCalories = proteinG * 4;
  const fatCalories = dailyCalories * FAT_PCT_OF_CALORIES;
  const fatG = Math.round(fatCalories / 9);
  const carbCalories = Math.max(0, dailyCalories - proteinCalories - fatCalories);
  const carbsG = Math.round(carbCalories / 4);
  return { dailyCalories, proteinG, carbsG, fatG, fiberG: DAILY_GUIDELINES.fiberMinG };
}

// توزيع الاحتياج اليومي على 3 أو 4 وجبات بنسب معقولة (غداء أكبر حصة، وجبة
// خفيفة اختيارية عند 4 وجبات) - نقطة بداية حسابية، لا قاعدة صارمة.
const MEAL_SPLIT_3 = [
  { key: "breakfast", pct: 0.3 },
  { key: "lunch", pct: 0.4 },
  { key: "dinner", pct: 0.3 },
];
const MEAL_SPLIT_4 = [
  { key: "breakfast", pct: 0.25 },
  { key: "lunch", pct: 0.35 },
  { key: "snack", pct: 0.1 },
  { key: "dinner", pct: 0.3 },
];

export function distributeMeals(targets, mealCount = 3) {
  const split = mealCount === 4 ? MEAL_SPLIT_4 : MEAL_SPLIT_3;
  return split.map((m) => ({
    key: m.key,
    calories: Math.round(targets.dailyCalories * m.pct),
    proteinG: Math.round(targets.proteinG * m.pct),
    carbsG: Math.round(targets.carbsG * m.pct),
    fatG: Math.round(targets.fatG * m.pct),
  }));
}

// مقارنة حيّة بين الهدف المحسوب واستهلاك اليوم الفعلي من nutrition_log -
// كل قيمة هنا فرق حسابي مباشر، تتحدّث مع كل تسجيل وجبة جديد بلا أي تأخير
// أو استدعاء شبكة إضافي.
export function computeLiveStatus(targets, todayTotals) {
  const consumed = {
    calories: Math.round(todayTotals.calories || 0),
    protein: Math.round(todayTotals.protein || 0),
    carbs: Math.round(todayTotals.carbs || 0),
    fat: Math.round(todayTotals.fat || 0),
    fiber: Math.round(todayTotals.fiber || 0),
  };
  return {
    consumed,
    caloriesRemaining: targets.dailyCalories - consumed.calories,
    proteinRemaining: targets.proteinG - consumed.protein,
    carbsRemaining: targets.carbsG - consumed.carbs,
    fatRemaining: targets.fatG - consumed.fat,
    fiberRemaining: targets.fiberG - consumed.fiber,
    adherencePct: targets.dailyCalories > 0 ? Math.round(Math.min(150, (consumed.calories / targets.dailyCalories) * 100)) : 0,
  };
}
