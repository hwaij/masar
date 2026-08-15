import SwiftUI

@main
struct MasarWidgetHostApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

// يحوّل بين شاشة الدخول وشاشة معاينة الملخّص حسب وجود جلسة محفوظة في
// App Group (SharedSession) - نفس الجلسة التي يقرأها الـWidget Extension.
struct ContentView: View {
    @State private var loggedIn = SharedSession.hasSession

    var body: some View {
        if loggedIn {
            DebugPreviewView(onSignOut: {
                SharedSession.clear()
                loggedIn = false
            })
        } else {
            LoginView(onLoggedIn: { loggedIn = true })
        }
    }
}
