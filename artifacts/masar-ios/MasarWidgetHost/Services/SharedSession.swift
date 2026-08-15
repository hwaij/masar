import Foundation

// يخزّن جلسة Supabase (access token) في App Group مشترك بين التطبيق
// المضيف والـWidget Extension - الآلية القياسية الوحيدة المدعومة من Apple
// لمشاركة بيانات بين عمليتين منفصلتين تماماً (الـWidget عملية مستقلة، لا
// تصل لذاكرة التطبيق المضيف إطلاقاً). group.com.masar.app.shared معرَّف في
// project.yml (entitlements كل من الهدفين) - يجب أن يطابق حرفياً هنا.
enum SharedSession {
    static let appGroupID = "group.com.masar.app.shared"

    private static let accessTokenKey = "masar_access_token"
    private static let refreshTokenKey = "masar_refresh_token"
    private static let userIdKey = "masar_user_id"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupID)
    }

    static var hasSession: Bool {
        defaults?.string(forKey: accessTokenKey) != nil && userId != nil
    }

    static var accessToken: String? {
        defaults?.string(forKey: accessTokenKey)
    }

    static var userId: String? {
        defaults?.string(forKey: userIdKey)
    }

    static func save(accessToken: String, refreshToken: String, userId: String) {
        defaults?.set(accessToken, forKey: accessTokenKey)
        defaults?.set(refreshToken, forKey: refreshTokenKey)
        defaults?.set(userId, forKey: userIdKey)
    }

    static func clear() {
        defaults?.removeObject(forKey: accessTokenKey)
        defaults?.removeObject(forKey: refreshTokenKey)
        defaults?.removeObject(forKey: userIdKey)
    }
}
