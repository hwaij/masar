// شاشة إدارية محصورة بحساب واحد فقط (مالك المشروع) - لا بريد ولا أي منطق
// تحقق هوية هنا إطلاقاً؛ الوصول الفعلي محكوم بالكامل من
// netlify/functions/admin-report.js على الخادم (راجع تعليقها). هذه الشاشة
// نفسها لا تُعرَض أصلاً لغير المالك (MasarApp.jsx يتحقق عبر checkIsAdmin()
// قبل حتى تحميل هذا المكوّن)، لكنها أيضاً لا تفترض ذلك - أي استجابة 403 من
// الخادم (مثال: جلسة انتهت أثناء الاستخدام) تُعرَض كرسالة رفض واضحة، لا شاشة
// معطوبة.
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, Download, ShieldAlert, ClipboardList } from "lucide-react";
import { searchStudentNutritionLog } from "../lib/adminReport";
import { S } from "./styles";

const AR = {
  wrap: { padding: "18px 18px 40px" },
  searchRow: { display: "flex", gap: 8, marginBottom: 16 },
  searchInput: { ...S.input, flex: 1 },
  searchBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },
  errorBox: { display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(209,123,95,0.1)", border: "1px solid rgba(209,123,95,0.35)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "var(--ink)", lineHeight: 1.7 },
  emptyBox: { textAlign: "center", padding: "30px 10px", color: "var(--muted2)", fontSize: 13 },
  resultHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 },
  resultCount: { fontSize: 13, color: "var(--muted2)" },
  tableWrap: { overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 720 },
  th: { textAlign: "start", padding: "9px 10px", background: "var(--surface-sunken)", borderBottom: "1px solid var(--line)", fontWeight: 700, color: "var(--muted2)", whiteSpace: "nowrap" },
  td: { padding: "8px 10px", borderBottom: "1px solid var(--line)", color: "var(--ink)", whiteSpace: "nowrap" },
  tdFood: { padding: "8px 10px", borderBottom: "1px solid var(--line)", color: "var(--ink)", minWidth: 160 },
};

export default function AdminReportView() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function runSearch() {
    const id = query.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await searchStudentNutritionLog(id);
      setResult(data);
    } catch (e) {
      if (e.status === 403) {
        setError(isEn ? "Access denied." : "الوصول مرفوض.");
      } else {
        setError(isEn ? "Search failed, please try again." : "تعذّر البحث الآن، حاول مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function exportExcel() {
    if (!result?.entries?.length || exporting) return;
    setExporting(true);
    try {
      const { buildStudentNutritionLogExcelBuffer } = await import("../lib/excelReport");
      const buffer = await buildStudentNutritionLogExcelBuffer(result.entries, result.universityId);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nutrition-log-${result.universityId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[AdminReportView] export failed:", e);
      setError(isEn ? "Export failed, please try again." : "تعذّر التصدير الآن، حاول مرة أخرى.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={AR.wrap}>
      <h1 style={S.sectionTitle}>{isEn ? "Nutrition Log Lookup" : "استعلام السجل الغذائي"}</h1>
      <p style={S.profileHint}>
        {isEn
          ? "Search by a student's university ID to see their full logged nutrition history."
          : "ابحث برقم الطالب الجامعي لعرض سجله الغذائي الكامل."}
      </p>
      <div style={AR.searchRow}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
          placeholder={isEn ? "University ID" : "الرقم الجامعي"}
          style={AR.searchInput}
        />
        <button onClick={runSearch} disabled={loading || !query.trim()} style={{ ...AR.searchBtn, opacity: loading || !query.trim() ? 0.6 : 1 }}>
          {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
          {isEn ? "Search" : "بحث"}
        </button>
      </div>

      {error && (
        <div style={AR.errorBox}>
          <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {result && result.found === false && (
        <div style={AR.emptyBox}>
          {isEn ? "No student found with this university ID." : "لا يوجد طالب بهذا الرقم الجامعي."}
        </div>
      )}

      {result && result.found && (
        <>
          <div style={AR.resultHead}>
            <span style={AR.resultCount}>
              {isEn
                ? `${result.entries.length} entries for ${result.universityId}`
                : `${result.entries.length} إدخال للرقم الجامعي ${result.universityId}`}
            </span>
            <button onClick={exportExcel} disabled={exporting || !result.entries.length} style={{ ...S.exportBtn, width: "auto", padding: "9px 16px", marginBottom: 0, opacity: exporting || !result.entries.length ? 0.6 : 1 }}>
              {exporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
              {isEn ? "Export Excel" : "تصدير Excel"}
            </button>
          </div>

          {result.entries.length === 0 ? (
            <div style={AR.emptyBox}>
              <ClipboardList size={22} style={{ marginBottom: 6, opacity: 0.6 }} />
              <div>{isEn ? "This student hasn't logged any food yet." : "لم يسجّل هذا الطالب أي طعام بعد."}</div>
            </div>
          ) : (
            <div style={AR.tableWrap}>
              <table style={AR.table}>
                <thead>
                  <tr>
                    <th style={AR.th}>{isEn ? "Date" : "التاريخ"}</th>
                    <th style={AR.th}>{isEn ? "Meal" : "الوجبة"}</th>
                    <th style={AR.th}>{isEn ? "Food" : "الطعام"}</th>
                    <th style={AR.th}>{isEn ? "Qty" : "الكمية"}</th>
                    <th style={AR.th}>{isEn ? "Calories" : "سعرات"}</th>
                    <th style={AR.th}>{isEn ? "Protein" : "بروتين"}</th>
                    <th style={AR.th}>{isEn ? "Carbs" : "كارب"}</th>
                    <th style={AR.th}>{isEn ? "Fat" : "دهون"}</th>
                    <th style={AR.th}>{isEn ? "Source" : "المصدر"}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.entries.map((e, i) => (
                    <tr key={i}>
                      <td style={AR.td}>{e.date}</td>
                      <td style={AR.td}>{e.meal_type || "—"}</td>
                      <td style={AR.tdFood}>{e.food_name}</td>
                      <td style={AR.td}>{e.quantity != null ? `${e.quantity} ${e.unit || ""}` : "—"}</td>
                      <td style={AR.td}>{e.calories}</td>
                      <td style={AR.td}>{e.protein}</td>
                      <td style={AR.td}>{e.carbs}</td>
                      <td style={AR.td}>{e.fat}</td>
                      <td style={AR.td}>{e.source || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
