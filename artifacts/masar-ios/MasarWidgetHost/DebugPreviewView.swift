import SwiftUI

// شاشة داخل التطبيق المضيف تعرض نفس NutritionSummaryView المستخدَمة في
// الـWidget الحقيقي حرفياً (لا نسخة موازية) - الغرض الأساسي: إثبات فعلي
// (لقطة شاشة من CI) أن الكود يُصرَّف ويجلب بيانات حقيقية ويعرضها بشكل
// صحيح، دون الاعتماد على أتمتة إضافة widget فعلي لشاشة المحاكي الرئيسية
// (هشة وتعتمد على إصدار iOS). الاستخدام الحقيقي على جهاز فعلي يعتمد على
// الـWidget الحقيقي نفسه (نفس View، نفس البيانات) بعد إضافته يدوياً من
// شاشة تعديل الـwidgets - لا فرق بينهما بصرياً أو بيانياً.
struct DebugPreviewView: View {
    var onSignOut: () -> Void

    @State private var summary: NutritionSummary.Summary?
    @State private var waterCups = 0
    @State private var waterGoal: Int?
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var lastUpdated = Date()

    var body: some View {
        VStack(spacing: 16) {
            Text("معاينة Widget التغذية")
                .font(.headline)

            if loading {
                ProgressView()
            } else if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            } else if let summary {
                NutritionSummaryView(summary: summary, waterCups: waterCups, waterGoal: waterGoal, lastUpdated: lastUpdated)
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal)
            }

            Button("تحديث") { Task { await load() } }
                .buttonStyle(.bordered)
            Button("تسجيل خروج", role: .destructive) { onSignOut() }
        }
        .padding()
        .environment(\.layoutDirection, .rightToLeft)
        .task { await load() }
    }

    private func load() async {
        guard let userId = SharedSession.userId, let accessToken = SharedSession.accessToken else {
            errorMessage = "لا توجد جلسة محفوظة."
            loading = false
            return
        }
        loading = true
        errorMessage = nil
        do {
            async let entries = SupabaseClient.fetchTodayNutritionEntries(userId: userId, accessToken: accessToken)
            async let healthProfile = SupabaseClient.fetchHealthProfile(userId: userId, accessToken: accessToken)
            async let plan = SupabaseClient.fetchActiveNutritionPlan(userId: userId, accessToken: accessToken)
            async let water = SupabaseClient.fetchTodayWaterCups(userId: userId, accessToken: accessToken)

            let totals = NutritionSummary.sumEntries(try await entries)
            let hp = try await healthProfile
            let np = try await plan
            summary = NutritionSummary.summarize(totals: totals, healthProfile: hp, nutritionPlan: np)
            waterGoal = NutritionSummary.waterGoalCups(weightKg: hp?.weightKg)
            waterCups = try await water
            lastUpdated = Date()
        } catch {
            errorMessage = "تعذّر تحميل البيانات: \(error.localizedDescription)"
        }
        loading = false
    }
}
