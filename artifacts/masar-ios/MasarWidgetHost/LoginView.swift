import SwiftUI
import WidgetKit

// دخول بريد/كلمة مرور Supabase (نفس مسار signInWithEmail الموجود أصلاً في
// src/lib/auth.js بتطبيق الويب) - لا Google OAuth هنا (يحتاج إعداد إضافي
// (custom URL scheme) خارج نطاق هذا الإثبات الأول). لو الحساب أُنشئ عبر
// Google فقط بلا كلمة مرور، يمكن تعيين واحدة عبر "نسيت كلمة المرور" من
// الموقع - لا حاجة لأي كود جديد لذلك.
struct LoginView: View {
    var onLoggedIn: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 16) {
            Text("🥗 مسار")
                .font(.largeTitle.bold())
            Text("سجّل الدخول بحساب مسار نفسه لعرض بيانات الWidget")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            TextField("البريد الإلكتروني", text: $email)
                .textContentType(.username)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            SecureField("كلمة المرور", text: $password)
                .textContentType(.password)
                .textFieldStyle(.roundedBorder)

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            Button {
                Task { await signIn() }
            } label: {
                if loading {
                    ProgressView()
                } else {
                    Text("تسجيل الدخول").bold()
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(loading || email.isEmpty || password.isEmpty)
        }
        .padding(24)
        .environment(\.layoutDirection, .rightToLeft)
        .task {
            // تسجيل دخول تلقائي في بيئة CI فقط (متغيّرات بيئة يمرّرها سير
            // عمل GitHub Actions عبر `xcrun simctl launch` بادئة
            // SIMCTL_CHILD_ - لا تأثير إطلاقاً على استخدام حقيقي على جهاز
            // (المتغيّرات هذه غير موجودة أصلاً هناك).
            let env = ProcessInfo.processInfo.environment
            if let ciEmail = env["MASAR_CI_EMAIL"], let ciPassword = env["MASAR_CI_PASSWORD"], !loading {
                email = ciEmail
                password = ciPassword
                await signIn()
            }
        }
    }

    private func signIn() async {
        loading = true
        errorMessage = nil
        do {
            let session = try await SupabaseClient.signIn(email: email, password: password)
            SharedSession.save(accessToken: session.accessToken, refreshToken: session.refreshToken, userId: session.userId)
            WidgetCenter.shared.reloadAllTimelines()
            onLoggedIn()
        } catch {
            errorMessage = error.localizedDescription
        }
        loading = false
    }
}
