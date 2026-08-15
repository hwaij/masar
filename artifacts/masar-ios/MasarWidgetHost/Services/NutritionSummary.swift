import Foundation

// منفذ Swift لـ getDailyNutritionSummary() في مستودع الويب
// (artifacts/masar/src/lib/nutrition-plan.js) - يُعيد إنتاج نفس صيغ
// الحساب بالحرف (لا صيغة "أدق" جديدة): أهداف خطة user_nutrition_plan إن
// وُجدت، وإلا تقسيم 30/40/30 من health_profile.tee، وإلا استهلاك بلا هدف.
// أي تعديل مستقبلي على الصيغة في nutrition-plan.js يجب أن يُطبَّق هنا
// أيضاً يدوياً حتى تبقى النسختان متطابقتين (لا مصدر حقيقة واحد آلي بين
// JS وSwift حالياً - قيد معروف، موثَّق في تقرير التدقيق المعماري).
enum NutritionSummary {
    struct Entry {
        let calories: Double
        let protein: Double
        let carbs: Double
        let fat: Double
    }

    struct Totals {
        let calories: Double
        let protein: Double
        let carbs: Double
        let fat: Double
    }

    struct HealthProfile {
        let tee: Double?
        let weightKg: Double?
    }

    struct NutritionPlan {
        let dailyCalories: Double
        let proteinG: Double
        let carbsG: Double
        let fatG: Double
    }

    enum Source: String {
        case plan
        case tee
        case none
    }

    struct Summary {
        let source: Source
        let caloriesConsumed: Double
        let calorieGoal: Double?
        let caloriesRemaining: Double?
        let proteinConsumed: Double
        let proteinGoal: Double?
        let proteinRemaining: Double?
        let carbsConsumed: Double
        let carbsGoal: Double?
        let carbsRemaining: Double?
        let fatConsumed: Double
        let fatGoal: Double?
        let fatRemaining: Double?
        let adherencePct: Int
    }

    static func sumEntries(_ entries: [Entry]) -> Totals {
        entries.reduce(Totals(calories: 0, protein: 0, carbs: 0, fat: 0)) { acc, e in
            Totals(
                calories: acc.calories + e.calories,
                protein: acc.protein + e.protein,
                carbs: acc.carbs + e.carbs,
                fat: acc.fat + e.fat
            )
        }
    }

    // نفس waterGoalCups(weightKg) في src/lib/nutrition.js بالحرف (33مل/كغم،
    // 250مل/كوب، حد أدنى كوب واحد).
    static func waterGoalCups(weightKg: Double?) -> Int? {
        guard let weightKg, weightKg > 0 else { return nil }
        let ml = weightKg * 33
        return max(1, Int((ml / 250).rounded()))
    }

    static func summarize(totals: Totals, healthProfile: HealthProfile?, nutritionPlan: NutritionPlan?) -> Summary {
        if let plan = nutritionPlan, plan.dailyCalories > 0 {
            // مسار الخطة: القيم مقرَّبة (تطابق computeLiveStatus في JS، التي
            // تُقرِّب consumed أولاً ثم تطرح - نفس الترتيب هنا بالحرف).
            let consumedCalories = totals.calories.rounded()
            let consumedProtein = totals.protein.rounded()
            let consumedCarbs = totals.carbs.rounded()
            let consumedFat = totals.fat.rounded()
            let adherence = plan.dailyCalories > 0
                ? Int(min(150, (consumedCalories / plan.dailyCalories) * 100).rounded())
                : 0
            return Summary(
                source: .plan,
                caloriesConsumed: consumedCalories, calorieGoal: plan.dailyCalories,
                caloriesRemaining: plan.dailyCalories - consumedCalories,
                proteinConsumed: consumedProtein, proteinGoal: plan.proteinG,
                proteinRemaining: plan.proteinG - consumedProtein,
                carbsConsumed: consumedCarbs, carbsGoal: plan.carbsG,
                carbsRemaining: plan.carbsG - consumedCarbs,
                fatConsumed: consumedFat, fatGoal: plan.fatG,
                fatRemaining: plan.fatG - consumedFat,
                adherencePct: min(100, adherence)
            )
        }

        guard let tee = healthProfile?.tee, tee > 0 else {
            return Summary(
                source: .none,
                caloriesConsumed: totals.calories, calorieGoal: nil, caloriesRemaining: nil,
                proteinConsumed: totals.protein, proteinGoal: nil, proteinRemaining: nil,
                carbsConsumed: totals.carbs, carbsGoal: nil, carbsRemaining: nil,
                fatConsumed: totals.fat, fatGoal: nil, fatRemaining: nil,
                adherencePct: 0
            )
        }

        // مسار tee: 30% بروتين / 40% كارب / 30% دهون - نفس NutritionView.jsx بالحرف.
        let proteinGoal = ((tee * 0.3) / 4).rounded()
        let carbsGoal = ((tee * 0.4) / 4).rounded()
        let fatGoal = ((tee * 0.3) / 9).rounded()
        let adherence = Int(min(100, (totals.calories / tee) * 100).rounded())
        return Summary(
            source: .tee,
            caloriesConsumed: totals.calories, calorieGoal: tee, caloriesRemaining: tee - totals.calories,
            proteinConsumed: totals.protein, proteinGoal: proteinGoal, proteinRemaining: proteinGoal - totals.protein,
            carbsConsumed: totals.carbs, carbsGoal: carbsGoal, carbsRemaining: carbsGoal - totals.carbs,
            fatConsumed: totals.fat, fatGoal: fatGoal, fatRemaining: fatGoal - totals.fat,
            adherencePct: adherence
        )
    }
}
