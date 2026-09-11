// شريط علوي موحّد لصفحتي معاينة "اليوم" التجريبيتين (نسخة أ ونسخة ب) -
// يوضّح للمستخدم أنه بشاشة معاينة منفصلة تماماً عن التطبيق الفعلي، ويتيح
// له التنقّل بين النسختين أو العودة لشاشة "اليوم" الحقيقية. لا علاقة له
// بأي منطق بيانات أو حفظ - عرض واستدعاء setView(القائم أصلاً) فقط.
import React from "react";

export default function PreviewBanner({ titleAr, titleEn, language, setView, otherView, otherLabel }) {
  const isEn = language === "en";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        flexWrap: "wrap",
        background: "var(--warm-tint)",
        border: "1px dashed var(--gold)",
        borderRadius: "var(--m-radius-lg)",
        padding: "10px 14px",
        marginBottom: "var(--space-3)",
      }}
    >
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gold)" }}>
          {isEn ? "🧪 Preview only — not part of the app's normal navigation" : "🧪 معاينة تجريبية فقط — غير مرتبطة بتنقّل التطبيق الطبيعي"}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted2)", marginTop: 2 }}>{isEn ? titleEn : titleAr}</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {setView && otherView && (
          <button
            onClick={() => setView(otherView)}
            style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--m-radius-pill)", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
          >
            {otherLabel}
          </button>
        )}
        {setView && (
          <button
            onClick={() => setView("today")}
            style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted2)", background: "transparent", border: "1px solid var(--line)", borderRadius: "var(--m-radius-pill)", padding: "6px 12px", cursor: "pointer", fontFamily: "inherit" }}
          >
            {isEn ? "Back to real Today screen" : "رجوع لشاشة اليوم الحقيقية"}
          </button>
        )}
      </div>
    </div>
  );
}
