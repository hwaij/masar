// شاشة إدارية محصورة بحساب واحد فقط (مالك المشروع) - لا بريد ولا أي منطق
// تحقق هوية هنا إطلاقاً؛ الوصول الفعلي محكوم بالكامل من
// netlify/functions/admin-report.js على الخادم (راجع تعليقها). هذه الشاشة
// نفسها لا تُعرَض أصلاً لغير المالك (MasarApp.jsx يتحقق عبر checkIsAdmin()
// قبل حتى تحميل هذا المكوّن)، لكنها أيضاً لا تفترض ذلك - أي استجابة 403 من
// الخادم (مثال: جلسة انتهت أثناء الاستخدام) تُعرَض كرسالة رفض واضحة، لا شاشة
// معطوبة.
//
// البحث: autocomplete فوري أثناء الكتابة (بداية الرقم الجامعي أو احتواء جزء
// من الاسم، راجع mode=suggest في admin-report.js) بدل كتابة رقم كامل والضغط
// على زر بحث - الاختيار الفعلي دائماً بمعرّف حساب الطالب (owner) من نتيجة
// الاقتراح، لا بإعادة كتابة نص، فلا التباس بين طلاب متشابهين بالاسم/الرقم.
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, Download, ShieldAlert, ClipboardList, Calendar } from "lucide-react";
import { suggestStudents, fetchStudentReport } from "../lib/adminReport";
import { localDayKey } from "../lib/tips";
import { getDailyNutritionSummary } from "../lib/nutrition-plan";
import { S } from "./styles";

const AR = {
  wrap: { padding: "18px 18px 40px" },
  searchWrap: { position: "relative", marginBottom: 16 },
  searchInput: { ...S.input },
  suggestBox: { position: "absolute", top: "calc(100% + 4px)", insetInlineStart: 0, insetInlineEnd: 0, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 20, maxHeight: 280, overflowY: "auto" },
  suggestItem: { display: "flex", flexDirection: "column", gap: 2, width: "100%", textAlign: "start", border: "none", background: "transparent", padding: "10px 12px", cursor: "pointer", fontFamily: "inherit", borderBottom: "1px solid var(--line)" },
  suggestId: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  suggestName: { fontSize: 12, color: "var(--muted2)" },
  suggestEmpty: { padding: "12px", fontSize: 12.5, color: "var(--muted2)", textAlign: "center" },
  rangeRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 },
  rangeBtn: { border: "1px solid var(--border2)", background: "var(--surface-sunken)", color: "var(--ink-soft)", borderRadius: 10, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  rangeBtnActive: { background: "var(--gold)", color: "var(--bg)", borderColor: "var(--gold)" },
  customDates: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  dateInput: { ...S.input, width: "auto" },
  errorBox: { display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(209,123,95,0.1)", border: "1px solid rgba(209,123,95,0.35)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "var(--ink)", lineHeight: 1.7 },
  emptyBox: { textAlign: "center", padding: "30px 10px", color: "var(--muted2)", fontSize: 13 },
  resultHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 },
  resultTitle: { fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  resultCount: { fontSize: 12.5, color: "var(--muted2)" },
  tableWrap: { overflowX: "auto", border: "1px solid var(--line)", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 720 },
  th: { textAlign: "start", padding: "9px 10px", background: "var(--surface-sunken)", borderBottom: "1px solid var(--line)", fontWeight: 700, color: "var(--muted2)", whiteSpace: "nowrap" },
  td: { padding: "8px 10px", borderBottom: "1px solid var(--line)", color: "var(--ink)", whiteSpace: "nowrap" },
  tdFood: { padding: "8px 10px", borderBottom: "1px solid var(--line)", color: "var(--ink)", minWidth: 160 },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "var(--ink)", margin: "18px 0 8px" },
  noteBox: { display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(201,162,75,0.08)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 12, padding: "10px 12px", marginBottom: 16, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 },
  badge: { display: "inline-block", borderRadius: 8, padding: "2px 7px", fontSize: 11, fontWeight: 700 },
};

const TIER_STYLE = {
  low: { bg: "rgba(76,126,168,0.14)", color: "#4C7EA8" },
  medium: { bg: "rgba(138,130,114,0.14)", color: "#8A8272" },
  within: { bg: "rgba(91,138,114,0.16)", color: "#5B8A72" },
  exceeded: { bg: "rgba(181,101,79,0.16)", color: "#B5654F" },
};
const TIER_TEXT = {
  ar: { low: "أقل بكثير", medium: "أقل من المعتاد", within: "ضمن النطاق", exceeded: "تجاوز الاحتياج" },
  en: { low: "Much lower", medium: "Below target", within: "Within range", exceeded: "Exceeded" },
};

function pctStatus(consumed, goal) {
  if (typeof goal !== "number" || goal <= 0 || typeof consumed !== "number") return null;
  const pct = Math.round((consumed / goal) * 100);
  const tier = pct <= 50 ? "low" : pct <= 90 ? "medium" : pct <= 110 ? "within" : "exceeded";
  return { pct, tier };
}

function groupEntriesByDate(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!map.has(e.date)) map.set(e.date, { date: e.date, calories: 0, protein: 0, carbs: 0, fat: 0 });
    const t = map.get(e.date);
    t.calories += Number(e.calories) || 0;
    t.protein += Number(e.protein) || 0;
    t.carbs += Number(e.carbs) || 0;
    t.fat += Number(e.fat) || 0;
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

const RANGES = ["today", "week", "month", "custom"];
const RANGE_LABEL = {
  ar: { today: "اليوم", week: "آخر أسبوع", month: "آخر شهر", custom: "مخصّص" },
  en: { today: "Today", week: "Last week", month: "Last month", custom: "Custom" },
};

function computeRange(rangeId, customFrom, customTo) {
  const today = localDayKey();
  if (rangeId === "today") return { from: today, to: today };
  if (rangeId === "week") {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return { from: localDayKey(d), to: today };
  }
  if (rangeId === "month") {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return { from: localDayKey(d), to: today };
  }
  return { from: customFrom || null, to: customTo || null };
}

export default function AdminReportView() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const L = isEn ? RANGE_LABEL.en : RANGE_LABEL.ar;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef(null);

  const [selected, setSelected] = useState(null); // { owner, universityId, name }
  const [rangeId, setRangeId] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // بحث مؤجَّل (debounce 350ms) - لا نرسل طلب شبكة مع كل حرف فور كتابته.
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) { setSuggestions([]); setShowSuggestions(false); return undefined; }
    setSuggestLoading(true);
    debounceRef.current = setTimeout(async () => {
      const list = await suggestStudents(q);
      setSuggestions(list);
      setShowSuggestions(true);
      setSuggestLoading(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const range = useMemo(() => computeRange(rangeId, customFrom, customTo), [rangeId, customFrom, customTo]);

  // مقارنة الاحتياج اليومي (health_profile.tee للطالب المختار) مقابل
  // الاستهلاك الفعلي لكل يوم ضمن الفترة - بنفس محرك الحساب المستخدَم أصلاً
  // بالتطبيق (getDailyNutritionSummary، nutritionPlan:null بنفس اتفاقية
  // excelReport.js الحالية: لا خطة نشطة كمصدر هدف خارج شاشتها المخصّصة، فقط
  // tee). hasGoal=false يعني tee غير محسوب (بيانات صحية ناقصة) - لا رقم
  // مُختلَق، فقط استهلاك فعلي.
  const { dailySummaries, hasGoal } = useMemo(() => {
    if (!result?.found || !result.entries?.length) return { dailySummaries: [], hasGoal: false };
    const tee = result.healthProfile?.tee;
    const hasGoalVal = typeof tee === "number";
    const summaries = groupEntriesByDate(result.entries).map((t) => {
      const summary = getDailyNutritionSummary({ totals: t, healthProfile: result.healthProfile, nutritionPlan: null });
      return {
        date: t.date,
        caloriesConsumed: Math.round(t.calories), caloriesGoal: summary.calorieGoal,
        proteinConsumed: Math.round(t.protein), proteinGoal: summary.proteinGoal,
        carbsConsumed: Math.round(t.carbs), carbsGoal: summary.carbsGoal,
        fatConsumed: Math.round(t.fat), fatGoal: summary.fatGoal,
      };
    });
    return { dailySummaries: summaries, hasGoal: hasGoalVal };
  }, [result]);

  async function loadReport(student, r) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchStudentReport(student.owner, r);
      setResult(data);
    } catch (e) {
      setError(e.status === 403
        ? (isEn ? "Access denied." : "الوصول مرفوض.")
        : (isEn ? "Failed to load the report, please try again." : "تعذّر جلب السجل الآن، حاول مرة أخرى."));
    } finally {
      setLoading(false);
    }
  }

  function pickSuggestion(s) {
    setSelected(s);
    setQuery(s.universityId || s.name || "");
    setShowSuggestions(false);
    loadReport(s, range);
  }

  // تغيّر الفترة الزمنية وطالب مختار بالفعل -> إعادة جلب تلقائية بالفترة
  // الجديدة (فلترة فعلية على الاستعلام، لا إخفاء صفوف بالواجهة فقط).
  useEffect(() => {
    if (selected) loadReport(selected, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeId, customFrom, customTo]);

  async function exportExcel() {
    if (!result?.entries?.length || exporting) return;
    setExporting(true);
    try {
      const [{ buildStudentNutritionLogExcelBuffer }, chartLib] = await Promise.all([
        import("../lib/excelReport"),
        import("../lib/chartImages"),
      ]);
      const days = dailySummaries.map((d) => d.date);
      const charts = {
        calories: chartLib.buildCaloriesNeedVsActualChart(days, dailySummaries.map((d) => d.caloriesConsumed), hasGoal ? dailySummaries[0]?.caloriesGoal ?? null : null),
        protein: chartLib.buildProteinNeedVsActualChart(days, dailySummaries.map((d) => d.proteinConsumed), hasGoal ? dailySummaries[0]?.proteinGoal ?? null : null),
        carbs: chartLib.buildCarbsNeedVsActualChart(days, dailySummaries.map((d) => d.carbsConsumed), hasGoal ? dailySummaries[0]?.carbsGoal ?? null : null),
        fat: chartLib.buildFatNeedVsActualChart(days, dailySummaries.map((d) => d.fatConsumed), hasGoal ? dailySummaries[0]?.fatGoal ?? null : null),
      };
      const buffer = await buildStudentNutritionLogExcelBuffer(result.entries, result.universityId || result.name || "", { dailySummaries, hasGoal, charts });
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nutrition-log-${result.universityId || result.owner}.xlsx`;
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
          ? "Type part of a university ID or student name to search."
          : "اكتب جزءاً من الرقم الجامعي أو اسم الطالب للبحث."}
      </p>

      <div style={AR.searchWrap}>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          onFocus={() => { if (suggestions.length) setShowSuggestions(true); }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={isEn ? "University ID or student name" : "الرقم الجامعي أو اسم الطالب"}
          style={AR.searchInput}
        />
        {showSuggestions && (
          <div style={AR.suggestBox}>
            {suggestLoading ? (
              <div style={AR.suggestEmpty}><Loader2 size={14} className="spin" /></div>
            ) : suggestions.length === 0 ? (
              <div style={AR.suggestEmpty}>{isEn ? "No matches." : "لا نتائج مطابقة."}</div>
            ) : (
              suggestions.map((s) => (
                <button key={s.owner} style={AR.suggestItem} onMouseDown={(e) => e.preventDefault()} onClick={() => pickSuggestion(s)}>
                  <span style={AR.suggestId}>{s.universityId || (isEn ? "(no ID)" : "(بلا رقم جامعي)")}</span>
                  {s.name && <span style={AR.suggestName}>{s.name}</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div style={AR.rangeRow}>
        {RANGES.map((r) => (
          <button key={r} onClick={() => setRangeId(r)} style={{ ...AR.rangeBtn, ...(rangeId === r ? AR.rangeBtnActive : {}) }}>
            {L[r]}
          </button>
        ))}
      </div>
      {rangeId === "custom" && (
        <div style={{ ...AR.customDates, marginTop: -8, marginBottom: 16 }}>
          <Calendar size={15} color="var(--muted2)" />
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={AR.dateInput} />
          <span style={{ color: "var(--muted2)" }}>{isEn ? "to" : "إلى"}</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={AR.dateInput} />
        </div>
      )}

      {loading && (
        <div style={AR.emptyBox}><Loader2 size={20} className="spin" /></div>
      )}

      {error && (
        <div style={AR.errorBox}>
          <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {!loading && result && result.found === false && (
        <div style={AR.emptyBox}>
          {isEn ? "No student found." : "لا يوجد طالب مطابق."}
        </div>
      )}

      {!loading && result && result.found && (
        <>
          <div style={AR.resultHead}>
            <div>
              <div style={AR.resultTitle}>{result.universityId || (isEn ? "(no university ID)" : "(بلا رقم جامعي)")}{result.name ? ` · ${result.name}` : ""}</div>
              <div style={AR.resultCount}>
                {isEn ? `${result.entries.length} entries` : `${result.entries.length} إدخال`}
              </div>
            </div>
            <button onClick={exportExcel} disabled={exporting || !result.entries.length} style={{ ...S.exportBtn, width: "auto", padding: "9px 16px", marginBottom: 0, opacity: exporting || !result.entries.length ? 0.6 : 1 }}>
              {exporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
              {isEn ? "Export Excel" : "تصدير Excel"}
            </button>
          </div>

          {result.entries.length === 0 ? (
            <div style={AR.emptyBox}>
              <ClipboardList size={22} style={{ marginBottom: 6, opacity: 0.6 }} />
              <div>
                {isEn
                  ? "No meals were logged for this student in the selected period."
                  : "لم يتم تسجيل أي وجبات لهذا الطالب بالفترة المحددة."}
              </div>
            </div>
          ) : (
            <>
              <div style={AR.sectionLabel}>{isEn ? "Daily need vs actual" : "الاحتياج اليومي مقابل الاستهلاك الفعلي"}</div>
              {!hasGoal && (
                <div style={AR.noteBox}>
                  <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>
                    {isEn
                      ? "This student's health profile (height/weight/age/gender/activity level) is incomplete, so daily need cannot be calculated. Showing actual consumption only."
                      : "بيانات هذا الطالب الصحية (الطول/الوزن/العمر/الجنس/مستوى النشاط) غير مكتملة، فلا يمكن حساب الاحتياج اليومي. المعروض أدناه الاستهلاك الفعلي فقط."}
                  </span>
                </div>
              )}
              <div style={{ ...AR.tableWrap, marginBottom: 20 }}>
                <table style={AR.table}>
                  <thead>
                    <tr>
                      <th style={AR.th}>{isEn ? "Date" : "التاريخ"}</th>
                      <th style={AR.th}>{isEn ? "Calories" : "سعرات"}</th>
                      <th style={AR.th}>{isEn ? "Protein" : "بروتين"}</th>
                      <th style={AR.th}>{isEn ? "Carbs" : "كارب"}</th>
                      <th style={AR.th}>{isEn ? "Fat" : "دهون"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySummaries.map((d) => (
                      <tr key={d.date}>
                        <td style={AR.td}>{d.date}</td>
                        {[
                          ["caloriesConsumed", "caloriesGoal"],
                          ["proteinConsumed", "proteinGoal"],
                          ["carbsConsumed", "carbsGoal"],
                          ["fatConsumed", "fatGoal"],
                        ].map(([ck, gk]) => {
                          const status = hasGoal ? pctStatus(d[ck], d[gk]) : null;
                          return (
                            <td style={AR.td} key={ck}>
                              {d[ck]}{hasGoal && d[gk] != null ? ` / ${d[gk]}` : ""}
                              {status && (
                                <span style={{ ...AR.badge, background: TIER_STYLE[status.tier].bg, color: TIER_STYLE[status.tier].color, marginInlineStart: 6 }}>
                                  {TIER_TEXT[isEn ? "en" : "ar"][status.tier]}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={AR.sectionLabel}>{isEn ? "Raw log" : "السجل الخام"}</div>
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
            </>
          )}
        </>
      )}
    </div>
  );
}
