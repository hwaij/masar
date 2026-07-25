import { Component, type ErrorInfo, type ReactNode } from "react";
import MasarApp from "./pages/MasarApp";
import i18n from "./i18n";
import "./masar.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] المسار توقف بسبب:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      const isEn = i18n.language === "en";
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0A0A0B",
            color: "#E8E6E1",
            direction: isEn ? "ltr" : "rtl",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: 24,
            textAlign: "center",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          <div style={{ fontSize: 40 }}>◐</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {isEn ? "Something went wrong" : "حدث خطأ غير متوقع"}
          </div>
          <div style={{ fontSize: 13, color: "#8A8782", maxWidth: 320, lineHeight: 1.7 }}>
            {isEn
              ? "Couldn't load Masar right now. Try refreshing the page, and if the problem continues, contact us."
              : "تعذّر تحميل مسار الآن. جرّب تحديث الصفحة، وإذا استمرت المشكلة تواصل معنا."}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "rgba(201,162,75,0.14)",
              border: "1px solid rgba(201,162,75,0.4)",
              color: "#C9A24B",
              borderRadius: 12,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {isEn ? "Reload page" : "إعادة تحميل الصفحة"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <MasarApp />
    </ErrorBoundary>
  );
}

export default App;
