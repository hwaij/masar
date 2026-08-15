import WidgetKit
import SwiftUI

// نقطة البيانات الفعلية لكل تحديث - يقرأ الجلسة من App Group (SharedSession)
// التي كتبها التطبيق المضيف بعد تسجيل الدخول، ثم يجلب بيانات اليوم الحقيقية
// عبر نفس SupabaseClient REST المشترك (لا مصدر بيانات مختلف عن التطبيق).
struct NutritionEntry: TimelineEntry {
    let date: Date
    let summary: NutritionSummary.Summary?
    let waterCups: Int
    let waterGoal: Int?
}

struct NutritionProvider: TimelineProvider {
    func placeholder(in context: Context) -> NutritionEntry {
        NutritionEntry(date: Date(), summary: nil, waterCups: 0, waterGoal: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (NutritionEntry) -> Void) {
        Task {
            let entry = await fetchEntry()
            completion(entry)
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NutritionEntry>) -> Void) {
        Task {
            let entry = await fetchEntry()
            // WidgetKit يتحكّم بميزانية التحديث الفعلية (لا تحديث فوري مضمون) -
            // نطلب إعادة محاولة كل 30 دقيقة كحد أقصى معقول لبيانات تغذية/ماء
            // (ليست بحاجة لحظية كتذكيرات Push الحقيقية المنفصلة تماماً).
            let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }

    private func fetchEntry() async -> NutritionEntry {
        guard let userId = SharedSession.userId, let accessToken = SharedSession.accessToken else {
            return NutritionEntry(date: Date(), summary: nil, waterCups: 0, waterGoal: nil)
        }
        do {
            async let entries = SupabaseClient.fetchTodayNutritionEntries(userId: userId, accessToken: accessToken)
            async let healthProfile = SupabaseClient.fetchHealthProfile(userId: userId, accessToken: accessToken)
            async let plan = SupabaseClient.fetchActiveNutritionPlan(userId: userId, accessToken: accessToken)
            async let waterCups = SupabaseClient.fetchTodayWaterCups(userId: userId, accessToken: accessToken)

            let totals = NutritionSummary.sumEntries(try await entries)
            let hp = try await healthProfile
            let np = try await plan
            let summary = NutritionSummary.summarize(totals: totals, healthProfile: hp, nutritionPlan: np)
            let waterGoal = NutritionSummary.waterGoalCups(weightKg: hp?.weightKg)

            return NutritionEntry(date: Date(), summary: summary, waterCups: try await waterCups, waterGoal: waterGoal)
        } catch {
            // فشل شبكي/مصادقة - لا بيانات وهمية بديلة، فقط ملخّص فارغ يوضّح
            // للمستخدم عدم توفر بيانات الآن بدل رقم مضلِّل.
            return NutritionEntry(date: Date(), summary: nil, waterCups: 0, waterGoal: nil)
        }
    }
}

struct MasarNutritionWidgetView: View {
    var entry: NutritionProvider.Entry

    var body: some View {
        if let summary = entry.summary {
            NutritionSummaryView(summary: summary, waterCups: entry.waterCups, waterGoal: entry.waterGoal, lastUpdated: entry.date)
        } else {
            VStack {
                Text("سجّل الدخول من تطبيق مسار لعرض بياناتك")
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
    }
}

@main
struct MasarNutritionWidget: Widget {
    let kind: String = "MasarNutritionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NutritionProvider()) { entry in
            MasarNutritionWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("تغذية مسار")
        .description("سعرات وماكروز وماء اليوم من حسابك في مسار.")
        .supportedFamilies([.systemMedium])
    }
}
