import Foundation

// عميل REST خفيف بلا أي مكتبة خارجية (لا Supabase Swift SDK) - يستدعي نفس
// نقاط Auth/PostgREST المستخدَمة فعلياً من تطبيق الويب وكل دوال Netlify في
// المستودع الرئيسي (نفس رؤوس apikey/Authorization: Bearer). تُستخدَم من
// التطبيق المضيف (تسجيل الدخول) ومن الـWidget Extension معاً (قراءة فقط)،
// لذا تبقى بلا أي حالة داخلية (كل شيء يُمرَّر صراحة: accessToken، userId).
struct SupabaseAuthError: Error, LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

enum SupabaseClient {
    struct Session {
        let accessToken: String
        let refreshToken: String
        let userId: String
    }

    static func signIn(email: String, password: String) async throws -> Session {
        guard let url = URL(string: "\(Secrets.supabaseURL)/auth/v1/token?grant_type=password") else {
            throw SupabaseAuthError(message: "رابط Supabase غير صالح.")
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(Secrets.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["email": email, "password": password])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw SupabaseAuthError(message: "فشل تسجيل الدخول (HTTP \(statusCode)). تأكد من البريد وكلمة المرور.")
        }
        guard
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let accessToken = json["access_token"] as? String,
            let refreshToken = json["refresh_token"] as? String,
            let user = json["user"] as? [String: Any],
            let userId = user["id"] as? String
        else {
            throw SupabaseAuthError(message: "استجابة تسجيل دخول غير متوقَّعة من الخادم.")
        }
        return Session(accessToken: accessToken, refreshToken: refreshToken, userId: userId)
    }

    private static func restGet(path: String, accessToken: String) async throws -> Data {
        guard let url = URL(string: "\(Secrets.supabaseURL)/rest/v1/\(path)") else {
            throw SupabaseAuthError(message: "رابط غير صالح: \(path)")
        }
        var request = URLRequest(url: url)
        request.setValue(Secrets.supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw SupabaseAuthError(message: "فشل الطلب (\(path)): HTTP \(statusCode)")
        }
        return data
    }

    // "اليوم" بنفس اصطلاح العميل الفعلي المستخدَم لكتابة nutrition_log/
    // water_log (src/lib/helpers.js: todayKey() = new Date().toISOString()
    // .slice(0,10)) - تاريخ تقويم UTC، لا توقيت الجهاز المحلي، حتى تُطابَق
    // بالضبط نفس الصفوف المكتوبة فعلياً من تطبيق الويب (راجع الملاحظة
    // الموثَّقة في replit.md حول هذا الاصطلاح).
    static func todayDateKeyUTC() -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }

    static func fetchTodayNutritionEntries(userId: String, accessToken: String) async throws -> [NutritionSummary.Entry] {
        let today = todayDateKeyUTC()
        let path = "nutrition_log?owner=eq.\(userId)&date=eq.\(today)&select=calories,protein,carbs,fat"
        let data = try await restGet(path: path, accessToken: accessToken)
        guard let rows = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return [] }
        return rows.map { row in
            NutritionSummary.Entry(
                calories: numberValue(row["calories"]),
                protein: numberValue(row["protein"]),
                carbs: numberValue(row["carbs"]),
                fat: numberValue(row["fat"])
            )
        }
    }

    static func fetchHealthProfile(userId: String, accessToken: String) async throws -> NutritionSummary.HealthProfile? {
        let path = "health_profile?owner=eq.\(userId)&select=tee,weight_kg"
        let data = try await restGet(path: path, accessToken: accessToken)
        guard
            let rows = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
            let row = rows.first
        else { return nil }
        return NutritionSummary.HealthProfile(
            tee: numberValueOrNil(row["tee"]),
            weightKg: numberValueOrNil(row["weight_kg"])
        )
    }

    static func fetchActiveNutritionPlan(userId: String, accessToken: String) async throws -> NutritionSummary.NutritionPlan? {
        let path = "user_nutrition_plan?owner=eq.\(userId)&select=daily_calories,protein_g,carbs_g,fat_g"
        let data = try await restGet(path: path, accessToken: accessToken)
        guard
            let rows = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
            let row = rows.first,
            let dailyCalories = numberValueOrNil(row["daily_calories"])
        else { return nil }
        return NutritionSummary.NutritionPlan(
            dailyCalories: dailyCalories,
            proteinG: numberValue(row["protein_g"]),
            carbsG: numberValue(row["carbs_g"]),
            fatG: numberValue(row["fat_g"])
        )
    }

    static func fetchTodayWaterCups(userId: String, accessToken: String) async throws -> Int {
        let today = todayDateKeyUTC()
        let path = "water_log?owner=eq.\(userId)&date=eq.\(today)&select=cups_count"
        let data = try await restGet(path: path, accessToken: accessToken)
        guard
            let rows = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
            let row = rows.first
        else { return 0 }
        return (row["cups_count"] as? Int) ?? 0
    }

    // PostgREST يُعيد numeric كـNSNumber أو أحياناً كنص - تحويل آمن موحَّد
    // بدل تكرار (as? Double) في كل موضع.
    private static func numberValue(_ any: Any?) -> Double {
        numberValueOrNil(any) ?? 0
    }

    private static func numberValueOrNil(_ any: Any?) -> Double? {
        if let d = any as? Double { return d }
        if let n = any as? NSNumber { return n.doubleValue }
        if let s = any as? String { return Double(s) }
        return nil
    }
}
