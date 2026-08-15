import SwiftUI

// الواجهة المشتركة الحقيقية بين الـWidget (MasarNutritionWidget.swift) وشاشة
// التصحيح في التطبيق المضيف (DebugPreviewView.swift) - نفس كائن الواجهة
// بالحرف، لا نسخة موازية. هذا ما يجعل لقطة شاشة CI دليلاً حقيقياً على شكل
// الـWidget الفعلي، لا تخميناً.
struct NutritionSummaryView: View {
    let summary: NutritionSummary.Summary
    let waterCups: Int
    let waterGoal: Int?
    let lastUpdated: Date

    private static let numberFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.maximumFractionDigits = 0
        return f
    }()

    private func fmt(_ value: Double?) -> String {
        guard let value else { return "—" }
        return Self.numberFormatter.string(from: NSNumber(value: value)) ?? "0"
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 10) {
            HStack {
                Spacer()
                Text("🥗 مسار — التغذية")
                    .font(.headline)
            }

            if summary.source == .none {
                Text("أكمل بياناتك في «أنت» لعرض هدفك اليومي")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                HStack {
                    Spacer()
                    (Text(fmt(summary.caloriesConsumed)).bold().font(.title2)
                        + Text(" / \(fmt(summary.calorieGoal)) سعرة").font(.subheadline))
                }
                if let remaining = summary.caloriesRemaining {
                    HStack {
                        Spacer()
                        Text(remaining >= 0 ? "تبقّى لك \(fmt(remaining)) سعرة اليوم" : "تجاوزت الهدف بـ\(fmt(-remaining)) سعرة")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(spacing: 14) {
                    macroChip(label: "بروتين", value: summary.proteinConsumed, goal: summary.proteinGoal)
                    macroChip(label: "كارب", value: summary.carbsConsumed, goal: summary.carbsGoal)
                    macroChip(label: "دهون", value: summary.fatConsumed, goal: summary.fatGoal)
                }
            }

            Divider()

            HStack {
                Spacer()
                Text("💧 \(waterCups)\(waterGoal.map { " / \($0)" } ?? "") كوب")
                    .font(.subheadline)
            }

            HStack {
                Spacer()
                Text("آخر تحديث: \(lastUpdated.formatted(date: .omitted, time: .shortened))")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding()
        .environment(\.layoutDirection, .rightToLeft)
    }

    @ViewBuilder
    private func macroChip(label: String, value: Double, goal: Double?) -> some View {
        VStack {
            Text(goal != nil ? "\(fmt(value))/\(fmt(goal))غ" : "\(fmt(value))غ")
                .font(.caption)
                .bold()
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    NutritionSummaryView(
        summary: NutritionSummary.summarize(
            totals: NutritionSummary.Totals(calories: 1523.7, protein: 88.2, carbs: 150.4, fat: 45.9),
            healthProfile: NutritionSummary.HealthProfile(tee: 2210, weightKg: 78),
            nutritionPlan: nil
        ),
        waterCups: 4,
        waterGoal: 10,
        lastUpdated: Date()
    )
}
