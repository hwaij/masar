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
import { Search, Loader2, Download, ShieldAlert, ClipboardList, Calendar, Users, Bell, Send, CheckCircle2, X, ChevronLeft, XCircle } from "lucide-react";
import {
  suggestStudents, fetchStudentReport, fetchOverview, sendReminder, sendCustomReminder,
  fetchStudentsOverview, fetchStudentWindowReport, sendGroupMessage, fetchMessages, fetchMessageReceipts,
} from "../lib/adminReport";
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
  errorBox: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", background: "rgba(209,123,95,0.1)", border: "1px solid rgba(209,123,95,0.35)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "var(--ink)", lineHeight: 1.7 },
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
  topTabs: { display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid var(--line)", flexWrap: "wrap" },
  topTab: { display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: "var(--muted2)", fontSize: 13.5, fontWeight: 700, padding: "10px 4px", cursor: "pointer", fontFamily: "inherit", borderBottom: "2px solid transparent", marginBottom: -1 },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 200, padding: "20px 14px", overflowY: "auto" },
  modalBox: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: 18, width: "100%", maxWidth: 820, marginBottom: 40 },
  modalHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  statChip: { background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 10, padding: "6px 10px", fontSize: 12, color: "var(--ink-soft)" },
  dayCard: { textAlign: "start", border: "1px solid var(--border2)", background: "var(--surface-sunken)", borderRadius: 12, padding: "9px 13px", cursor: "pointer", fontFamily: "inherit", minWidth: 150 },
  dayCardActive: { borderColor: "var(--gold)", background: "rgba(201,162,75,0.12)" },
  topTabActive: { color: "var(--gold)", borderBottomColor: "var(--gold)" },
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

// "البحث": تفاصيل دقيقة لطالب واحد محدَّد بالاسم/الرقم - السجل الكامل +
// الرسوم البيانية + التصدير (كما كانت هذه الشاشة قبل إضافة "نظرة عامة").
function SearchTab() {
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
    <div>
      <p style={S.profileHint}>
        {isEn
          ? "Type part of a university ID or student name to search for one specific student's full log, charts, and export."
          : "اكتب جزءاً من الرقم الجامعي أو اسم الطالب للوصول لسجله الكامل والرسوم البيانية والتصدير."}
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

const OVERVIEW_BADGE = {
  ate: { bg: "rgba(91,138,114,0.16)", color: "#5B8A72" },
  notAte: { bg: "rgba(181,101,79,0.16)", color: "#B5654F" },
  metGoal: { bg: "rgba(91,138,114,0.16)", color: "#5B8A72" },
  notMetGoal: { bg: "rgba(181,101,79,0.16)", color: "#B5654F" },
  noGoal: { bg: "rgba(138,130,114,0.14)", color: "#8A8272" },
};

// "نظرة عامة": جدول سريع لكل الطلاب دفعة واحدة ليوم محدَّد - أكل/لم يأكل
// وهل حقق احتياجه أو لا، بلا أي تفاصيل لكل وجبة (ذلك يبقى حصراً في "البحث").
// نفس getDailyNutritionSummary المستخدَمة في SearchTab بالضبط لكل صف طالب -
// لا منطق حساب احتياج موازٍ هنا.
const ATE_FILTERS = ["all", "ate", "notAte"];
const ATE_FILTER_LABEL = {
  ar: { all: "الكل", ate: "أكلوا اليوم فقط", notAte: "لم يأكلوا اليوم فقط" },
  en: { all: "All", ate: "Ate today only", notAte: "Did not eat today only" },
};

function OverviewTab() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [date, setDate] = useState(() => localDayKey());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  // فلترة فورية بالواجهة فقط على نتيجة الاستعلام المجلوبة أصلاً (data.students
  // عبر rows أدناه) - لا استعلام جديد لقاعدة البيانات، لا أي استدعاء شبكي
  // إضافي عند تبديل الفلتر.
  const [ateFilter, setAteFilter] = useState("all");
  // عدّاد طلب يدوي لإعادة المحاولة (زر "أعد المحاولة" أدناه) - تغييره يعيد
  // تشغيل نفس الأثر (useEffect) بلا تغيّر date نفسه.
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchOverview(date)
      .then((d) => { if (active) setData(d); })
      .catch((e) => {
        if (!active) return;
        // partial=true تعني فشلاً كاملاً وواضحاً من الخادم (RPC فشلت/تعذّر
        // الاتصال) - لا نتيجة جزئية صامتة تُعرَض كأنها كاملة، رسالة خطأ
        // صريحة + زر إعادة المحاولة بدل شاشة فاضية مضلِّلة.
        setError(e.status === 403
          ? (isEn ? "Access denied." : "الوصول مرفوض.")
          : (isEn ? "Failed to load the overview, please try again." : "تعذّر جلب النظرة العامة الآن، حاول مرة أخرى."));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, retryTick]);

  // "حقق احتياجه" يعتمد على السعرات تحديداً (المؤشر الأساسي) بنفس تصنيف
  // pctStatus المستخدَم في SearchTab بالضبط - ضمن النطاق أو تجاوز = نعم.
  const rows = useMemo(() => {
    if (!data?.students) return [];
    return data.students.map((s) => {
      const hasGoalVal = typeof s.tee === "number";
      let metGoal = null;
      if (hasGoalVal && s.ateToday) {
        const summary = getDailyNutritionSummary({
          totals: { calories: s.calories, protein: s.protein, carbs: s.carbs, fat: s.fat },
          healthProfile: { tee: s.tee },
          nutritionPlan: null,
        });
        const status = pctStatus(s.calories, summary.calorieGoal);
        metGoal = status ? (status.tier === "within" || status.tier === "exceeded") : null;
      }
      return { ...s, hasGoal: hasGoalVal, metGoal };
    });
  }, [data]);

  // عداد ثابت بصرف النظر عن الفلتر المختار - دائماً من كل الصفوف (rows)
  // لا من النتيجة المفلترة، حتى يبقى "X من أصل Y" ثابت المرجع مهما بدّل
  // المستخدم الفلتر.
  const ateCount = useMemo(() => rows.filter((r) => r.ateToday).length, [rows]);

  // فلترة فورية محض بالذاكرة - rows نفسها (نتيجة الاستعلام المجلوبة أصلاً)
  // بلا أي طلب شبكي جديد عند تبديل الفلتر.
  const filteredRows = useMemo(() => {
    if (ateFilter === "ate") return rows.filter((r) => r.ateToday);
    if (ateFilter === "notAte") return rows.filter((r) => !r.ateToday);
    return rows;
  }, [rows, ateFilter]);

  return (
    <div>
      <p style={S.profileHint}>
        {isEn
          ? "A quick table of every student with a registered university ID for one day at a time."
          : "جدول سريع بكل الطلاب الذين لديهم رقم جامعي مسجَّل ليوم واحد في كل مرة."}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Calendar size={15} color="var(--muted2)" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={AR.dateInput} max={localDayKey()} />
      </div>

      {loading && <div style={AR.emptyBox}><Loader2 size={20} className="spin" /></div>}

      {error && (
        <div style={AR.errorBox}>
          <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
          <button onClick={() => setRetryTick((n) => n + 1)} style={{ ...S.exportBtn, marginTop: 0, marginBottom: 0, width: "auto", padding: "7px 14px", flexShrink: 0 }}>
            {isEn ? "Retry" : "أعد المحاولة"}
          </button>
        </div>
      )}

      {!loading && !error && data && (
        rows.length === 0 ? (
          <div style={AR.emptyBox}>
            {isEn ? "No students with a registered university ID yet." : "لا يوجد طلاب لديهم رقم جامعي مسجَّل بعد."}
          </div>
        ) : (
          <>
            <div style={AR.resultCount}>
              {isEn ? `Loaded ${rows.length} students · ${ateCount} ate today` : `تم تحميل ${rows.length} طالب · ${ateCount} أكلوا اليوم`}
            </div>
            <div style={{ ...AR.rangeRow, marginTop: 10 }}>
              {ATE_FILTERS.map((f) => (
                <button key={f} onClick={() => setAteFilter(f)} style={{ ...AR.rangeBtn, ...(ateFilter === f ? AR.rangeBtnActive : {}) }}>
                  {(isEn ? ATE_FILTER_LABEL.en : ATE_FILTER_LABEL.ar)[f]}
                </button>
              ))}
            </div>
            {filteredRows.length === 0 ? (
              <div style={AR.emptyBox}>
                {isEn ? "No students match this filter." : "لا يوجد طلاب مطابقون لهذا الفلتر."}
              </div>
            ) : (
            <div style={{ ...AR.tableWrap, marginTop: 8 }}>
              <table style={AR.table}>
                <thead>
                  <tr>
                    <th style={AR.th}>{isEn ? "University ID" : "الرقم الجامعي"}</th>
                    <th style={AR.th}>{isEn ? "Name" : "الاسم"}</th>
                    <th style={AR.th}>{isEn ? "Gender" : "الجنس"}</th>
                    <th style={AR.th}>{isEn ? "Ate today" : "أكل اليوم؟"}</th>
                    <th style={AR.th}>{isEn ? "Calories" : "سعرات"}</th>
                    <th style={AR.th}>{isEn ? "Protein" : "بروتين"}</th>
                    <th style={AR.th}>{isEn ? "Carbs" : "كارب"}</th>
                    <th style={AR.th}>{isEn ? "Fat" : "دهون"}</th>
                    <th style={AR.th}>{isEn ? "Met daily need?" : "حقق احتياجه؟"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.owner}>
                      <td style={AR.td}>{r.universityId || "—"}</td>
                      <td style={AR.td}>{r.name || "—"}</td>
                      <td style={AR.td}>{r.gender === "male" ? (isEn ? "Male" : "ذكر") : r.gender === "female" ? (isEn ? "Female" : "أنثى") : "—"}</td>
                      <td style={AR.td}>
                        <span style={{ ...AR.badge, background: OVERVIEW_BADGE[r.ateToday ? "ate" : "notAte"].bg, color: OVERVIEW_BADGE[r.ateToday ? "ate" : "notAte"].color }}>
                          {r.ateToday ? (isEn ? "Yes" : "نعم") : (isEn ? "No" : "لا")}
                        </span>
                      </td>
                      <td style={AR.td}>{r.ateToday ? r.calories : "—"}</td>
                      <td style={AR.td}>{r.ateToday ? r.protein : "—"}</td>
                      <td style={AR.td}>{r.ateToday ? r.carbs : "—"}</td>
                      <td style={AR.td}>{r.ateToday ? r.fat : "—"}</td>
                      <td style={AR.td}>
                        {!r.ateToday ? (
                          <span style={{ ...AR.badge, background: OVERVIEW_BADGE.notMetGoal.bg, color: OVERVIEW_BADGE.notMetGoal.color }}>{isEn ? "No" : "لا"}</span>
                        ) : !r.hasGoal ? (
                          <span style={{ ...AR.badge, background: OVERVIEW_BADGE.noGoal.bg, color: OVERVIEW_BADGE.noGoal.color }}>{isEn ? "Not calculated" : "غير محسوب"}</span>
                        ) : (
                          <span style={{ ...AR.badge, background: OVERVIEW_BADGE[r.metGoal ? "metGoal" : "notMetGoal"].bg, color: OVERVIEW_BADGE[r.metGoal ? "metGoal" : "notMetGoal"].color }}>
                            {r.metGoal ? (isEn ? "Yes" : "نعم") : (isEn ? "No" : "لا")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </>
        )
      )}

      {/* قسم منفصل: من سجّل أكلاً بنفس اليوم بلا رقم جامعي محفوظ في ملفه -
          سبب حقيقي ثانٍ منفصل تماماً عن مشكلة الصفوف الناقصة (هؤلاء
          مستثنون بنيوياً من الجدول أعلاه بصرف النظر عن أي إصلاح، راجع
          تعليق admin_overview_for_date في supabase-schema.sql) - يظهر هنا
          حتى تُرى كل من يستخدم التطبيق فعلياً، لا فقط من حفظ رقمه الجامعي. */}
      {!loading && !error && data && data.noUniversityId && data.noUniversityId.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={AR.sectionLabel}>
            {isEn ? "Logged food without a university ID" : "سجلوا أكل بدون رقم جامعي"}
          </div>
          <div style={{ ...AR.resultCount, marginBottom: 8 }}>
            {isEn ? `${data.noUniversityId.length} accounts` : `${data.noUniversityId.length} حساب`}
          </div>
          <div style={AR.tableWrap}>
            <table style={AR.table}>
              <thead>
                <tr>
                  <th style={AR.th}>{isEn ? "Name" : "الاسم"}</th>
                  <th style={AR.th}>{isEn ? "Account ID" : "معرّف الحساب"}</th>
                </tr>
              </thead>
              <tbody>
                {data.noUniversityId.map((s) => (
                  <tr key={s.owner}>
                    <td style={AR.td}>{s.name || "—"}</td>
                    <td style={AR.td}>{s.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const SOURCE_LABEL = {
  ar: { barcode: "باركود", manual: "يدوي", search: "بحث", ai_photo: "صورة AI", label: "ملصق", common: "شائع", ai_estimate: "تقدير AI", voice: "صوت" },
  en: { barcode: "Barcode", manual: "Manual", search: "Search", ai_photo: "AI Photo", label: "Label", common: "Common", ai_estimate: "AI Estimate", voice: "Voice" },
};

// تقرير نافذة الأسبوعين الكامل لطالب واحد (Phase 4) - يُفتح بالضغط على طالب
// من جدول تبويب "الطلاب". يوم بيوم: كل ما سجّله (أكل بوقته، ماء، وزن،
// خطوات، تمرين)، مصادر الأكل بالأعداد، معدل كل عنصر غذائي مقابل احتياجه،
// أيام الانقطاع، وآخر نشاط. نداء شبكي واحد فقط (admin_student_window_report)
// بصرف النظر عن عدد الأيام/الإدخالات.
function StudentWindowReportModal({ owner, universityId, name, onClose }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchStudentWindowReport(owner)
      .then((d) => { if (active) setReport(d); })
      .catch(() => { if (active) setError(isEn ? "Failed to load the report, please try again." : "تعذّر جلب التقرير الآن، حاول مرة أخرى."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [owner, isEn]);

  // يوم بيوم: كل مصادر الأنشطة مدموجة بمفتاح التاريخ معاً (نفس أسلوب
  // buildGroupWindowReportExcelBuffer في excelReport.js بالضبط).
  const { days, sourceCounts, avg, lastActivityDate, gapDays } = useMemo(() => {
    if (!report?.found) return { days: [], sourceCounts: {}, avg: null, lastActivityDate: null, gapDays: 0 };
    const byDate = new Map();
    const ensure = (date) => {
      if (!byDate.has(date)) byDate.set(date, { date, calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, mealsCount: 0, waterCups: null, weightKg: null, steps: null, workoutDone: null });
      return byDate.get(date);
    };
    const counts = {};
    for (const e of report.nutritionLog || []) {
      const d = ensure(e.date);
      d.calories += Number(e.calories) || 0;
      d.protein += Number(e.protein) || 0;
      d.carbs += Number(e.carbs) || 0;
      d.fat += Number(e.fat) || 0;
      d.sodium += Number(e.sodium) || 0;
      d.mealsCount += 1;
      if (e.source) counts[e.source] = (counts[e.source] || 0) + 1;
    }
    for (const w of report.waterLog || []) ensure(w.date).waterCups = w.cups_count;
    for (const w of report.weightLog || []) ensure(w.date).weightKg = w.weight_kg;
    for (const st of report.stepsLog || []) ensure(st.date).steps = st.steps;
    for (const f of report.fitnessLog || []) ensure(f.date).workoutDone = !!f.day_completed;

    const sortedDays = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    const loggedDays = sortedDays.filter((d) => d.mealsCount > 0);
    const totalDaysInWindow = Math.round((new Date(report.windowEndDate) - new Date(report.signupDate)) / 86400000) + 1;
    const avgVal = loggedDays.length
      ? {
          calories: Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length),
          protein: Math.round(loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length),
          carbs: Math.round(loggedDays.reduce((s, d) => s + d.carbs, 0) / loggedDays.length),
          fat: Math.round(loggedDays.reduce((s, d) => s + d.fat, 0) / loggedDays.length),
          sodium: Math.round(loggedDays.reduce((s, d) => s + d.sodium, 0) / loggedDays.length),
        }
      : null;
    const lastDate = sortedDays.length ? sortedDays[sortedDays.length - 1].date : null;
    return { days: sortedDays, sourceCounts: counts, avg: avgVal, lastActivityDate: lastDate, gapDays: Math.max(totalDaysInWindow - loggedDays.length, 0) };
  }, [report]);

  const tee = typeof report?.healthProfile?.tee === "number" ? report.healthProfile.tee : null;

  async function handleExport() {
    if (!report?.found || exporting) return;
    setExporting(true);
    try {
      const { buildStudentNutritionLogExcelBuffer } = await import("../lib/excelReport");
      const dailySummaries = days.map((d) => ({
        date: d.date,
        caloriesConsumed: Math.round(d.calories), caloriesGoal: tee,
        proteinConsumed: Math.round(d.protein), proteinGoal: null,
        carbsConsumed: Math.round(d.carbs), carbsGoal: null,
        fatConsumed: Math.round(d.fat), fatGoal: null,
      }));
      const buffer = await buildStudentNutritionLogExcelBuffer(report.nutritionLog || [], universityId || name || owner, { dailySummaries, hasGoal: tee != null });
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `window-report-${universityId || owner}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("[StudentWindowReportModal] export failed:", e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={AR.modalOverlay} onClick={onClose}>
      <div style={AR.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={AR.modalHeaderRow}>
          <button onClick={onClose} style={{ ...S.iconBtn }}>{isEn ? <X size={18} /> : <ChevronLeft size={18} />}</button>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{universityId || "—"}{name ? ` · ${name}` : ""}</div>
          <button onClick={handleExport} disabled={exporting || !report?.found} style={{ ...S.exportBtn, width: "auto", marginTop: 0, marginBottom: 0, padding: "7px 14px", opacity: exporting || !report?.found ? 0.6 : 1 }}>
            {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
          </button>
        </div>

        {loading && <div style={AR.emptyBox}><Loader2 size={20} className="spin" /></div>}
        {error && <div style={AR.errorBox}><ShieldAlert size={16} /><span>{error}</span></div>}

        {!loading && !error && report && !report.found && (
          <div style={AR.emptyBox}>{isEn ? "Account not found." : "الحساب غير موجود."}</div>
        )}

        {!loading && !error && report?.found && (
          <>
            <div style={{ ...AR.resultCount, marginBottom: 12 }}>
              {isEn
                ? `Window: ${report.signupDate} → ${report.windowEndDate}`
                : `النافذة: ${report.signupDate} ← ${report.windowEndDate}`}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <div style={AR.statChip}>{isEn ? `Avg calories: ${avg?.calories ?? "—"}${tee ? ` / ${tee}` : ""}` : `معدل السعرات: ${avg?.calories ?? "—"}${tee ? ` / ${tee}` : ""}`}</div>
              <div style={AR.statChip}>{isEn ? `Avg protein: ${avg?.protein ?? "—"}g` : `معدل البروتين: ${avg?.protein ?? "—"}غ`}</div>
              <div style={AR.statChip}>{isEn ? `Avg carbs: ${avg?.carbs ?? "—"}g` : `معدل الكارب: ${avg?.carbs ?? "—"}غ`}</div>
              <div style={AR.statChip}>{isEn ? `Avg fat: ${avg?.fat ?? "—"}g` : `معدل الدهون: ${avg?.fat ?? "—"}غ`}</div>
              <div style={AR.statChip}>{isEn ? `Avg sodium: ${avg?.sodium ?? "—"}mg` : `معدل الصوديوم: ${avg?.sodium ?? "—"}مغ`}</div>
              <div style={AR.statChip}>{isEn ? `Gap days: ${gapDays}` : `أيام الانقطاع: ${gapDays}`}</div>
              <div style={AR.statChip}>{isEn ? `Last activity: ${lastActivityDate || "—"}` : `آخر نشاط: ${lastActivityDate || "—"}`}</div>
            </div>

            {Object.keys(sourceCounts).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {Object.entries(sourceCounts).map(([src, count]) => (
                  <div key={src} style={AR.statChip}>{(isEn ? SOURCE_LABEL.en : SOURCE_LABEL.ar)[src] || src}: {count}</div>
                ))}
              </div>
            )}

            <div style={AR.tableWrap}>
              <table style={AR.table}>
                <thead>
                  <tr>
                    <th style={AR.th}>{isEn ? "Date" : "التاريخ"}</th>
                    <th style={AR.th}>{isEn ? "Meals" : "الوجبات"}</th>
                    <th style={AR.th}>{isEn ? "Calories" : "سعرات"}</th>
                    <th style={AR.th}>{isEn ? "Protein" : "بروتين"}</th>
                    <th style={AR.th}>{isEn ? "Carbs" : "كارب"}</th>
                    <th style={AR.th}>{isEn ? "Fat" : "دهون"}</th>
                    <th style={AR.th}>{isEn ? "Water" : "ماء"}</th>
                    <th style={AR.th}>{isEn ? "Weight" : "وزن"}</th>
                    <th style={AR.th}>{isEn ? "Steps" : "خطوات"}</th>
                    <th style={AR.th}>{isEn ? "Workout" : "تمرين"}</th>
                  </tr>
                </thead>
                <tbody>
                  {days.length === 0 ? (
                    <tr><td style={AR.td} colSpan={10}>{isEn ? "No activity logged in this window." : "لا نشاط مسجَّل بهذه النافذة."}</td></tr>
                  ) : days.map((d) => (
                    <tr key={d.date}>
                      <td style={AR.td}>{d.date}</td>
                      <td style={AR.td}>{d.mealsCount || "—"}</td>
                      <td style={AR.td}>{d.mealsCount ? Math.round(d.calories) : "—"}</td>
                      <td style={AR.td}>{d.mealsCount ? Math.round(d.protein) : "—"}</td>
                      <td style={AR.td}>{d.mealsCount ? Math.round(d.carbs) : "—"}</td>
                      <td style={AR.td}>{d.mealsCount ? Math.round(d.fat) : "—"}</td>
                      <td style={AR.td}>{d.waterCups ?? "—"}</td>
                      <td style={AR.td}>{d.weightKg ?? "—"}</td>
                      <td style={AR.td}>{d.steps ?? "—"}</td>
                      <td style={AR.td}>{d.workoutDone === null ? "—" : d.workoutDone ? (isEn ? "Yes" : "نعم") : (isEn ? "No" : "لا")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const DAY_NAME = {
  ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDayKey(d);
}

// "الطلاب": قائمة كل الطلاب مع تاريخ/وقت دخولهم ونافذة الأسبوعين (Phase 2) -
// مجمَّعون حسب تاريخ الدخول في خانات قابلة للضغط، بجدول كامل + فلاتر +
// تصدير Excel + ضغط على طالب يفتح تقرير نافذته الكامل (Phase 4).
function StudentsTab() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [retryTick, setRetryTick] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all"); // all | completed | ongoing
  const [selectedDay, setSelectedDay] = useState(null); // signupLocalDate أو null
  const [exporting, setExporting] = useState(false);
  const [openStudent, setOpenStudent] = useState(null); // {owner, universityId, name} أو null

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    // النظرة العامة لليوم الحالي تُستخدَم فقط لمعرفة "كم أكل اليوم" ضمن كل
    // خانة يوم دخول (راجع ateTodayByOwner أدناه) - لا علاقة لها بتاريخ الدخول
    // نفسه.
    Promise.all([fetchStudentsOverview(), fetchOverview(localDayKey())])
      .then(([rosterData, todayData]) => {
        if (!active) return;
        const ateTodayByOwner = new Map((todayData?.students || []).map((s) => [s.owner, s.ateToday]));
        setStudents((rosterData?.students || []).map((s) => ({ ...s, ateToday: ateTodayByOwner.get(s.owner) ?? false })));
      })
      .catch(() => { if (active) setError(isEn ? "Failed to load the students list, please try again." : "تعذّر جلب قائمة الطلاب الآن، حاول مرة أخرى."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryTick]);

  const dayBuckets = useMemo(() => {
    const map = new Map();
    for (const s of students) {
      const key = s.signupLocalDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [students]);

  const enteredToday = useMemo(() => students.filter((s) => s.signupLocalDate === localDayKey()).length, [students]);
  const enteredThisWeek = useMemo(() => {
    const weekAgo = daysAgo(7);
    return students.filter((s) => s.signupLocalDate >= weekAgo).length;
  }, [students]);

  const filteredStudents = useMemo(() => {
    let rows = students;
    if (statusFilter !== "all") rows = rows.filter((s) => s.status === statusFilter);
    if (selectedDay) rows = rows.filter((s) => s.signupLocalDate === selectedDay);
    return rows;
  }, [students, statusFilter, selectedDay]);

  async function handleExport() {
    if (exporting || filteredStudents.length === 0) return;
    setExporting(true);
    try {
      const { buildStudentsRosterExcelBuffer } = await import("../lib/excelReport");
      const buffer = await buildStudentsRosterExcelBuffer(filteredStudents);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "students.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("[StudentsTab] export failed:", e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <p style={S.profileHint}>
        {isEn
          ? "All students with signup dates, the two-week tracking window, and daily logging progress."
          : "كل الطلاب مع تواريخ دخولهم ونافذة تتبّع الأسبوعين وتقدّم تسجيلهم اليومي."}
      </p>

      {loading && <div style={AR.emptyBox}><Loader2 size={20} className="spin" /></div>}
      {error && (
        <div style={AR.errorBox}>
          <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
          <button onClick={() => setRetryTick((n) => n + 1)} style={{ ...S.exportBtn, marginTop: 0, marginBottom: 0, width: "auto", padding: "7px 14px", flexShrink: 0 }}>
            {isEn ? "Retry" : "أعد المحاولة"}
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div style={{ ...AR.resultCount, marginBottom: 12 }}>
            {isEn
              ? `Loaded ${students.length} students · ${enteredToday} entered today · ${enteredThisWeek} entered this week`
              : `تم تحميل ${students.length} طالب · ${enteredToday} دخلوا اليوم · ${enteredThisWeek} دخلوا هذا الأسبوع`}
          </div>

          <div style={AR.sectionLabel}>{isEn ? "By signup day" : "حسب تاريخ الدخول"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {dayBuckets.map(([date, group]) => {
              const dow = new Date(`${date}T00:00:00`).getDay();
              const males = group.filter((s) => s.gender === "male").length;
              const females = group.filter((s) => s.gender === "female").length;
              const ate = group.filter((s) => s.ateToday).length;
              const active = selectedDay === date;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDay(active ? null : date)}
                  style={{ ...AR.dayCard, ...(active ? AR.dayCardActive : {}) }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{(isEn ? DAY_NAME.en : DAY_NAME.ar)[dow]} · {date}</div>
                  <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 2 }}>
                    {isEn ? `${group.length} students · ${males}M/${females}F` : `${group.length} طالب · ${males} ذكر / ${females} أنثى`}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted2)" }}>
                    {isEn ? `${ate} ate today, ${group.length - ate} did not` : `${ate} أكل، ${group.length - ate} لم يأكل اليوم`}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {["all", "ongoing", "completed"].map((f) => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{ ...AR.rangeBtn, ...(statusFilter === f ? AR.rangeBtnActive : {}) }}>
                {isEn
                  ? { all: "All", ongoing: "Ongoing", completed: "Completed two weeks" }[f]
                  : { all: "الكل", ongoing: "جارية", completed: "اكتملوا أسبوعين" }[f]}
              </button>
            ))}
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)} style={{ ...AR.rangeBtn, display: "flex", alignItems: "center", gap: 4 }}>
                <XCircle size={13} /> {isEn ? `Clear date filter (${selectedDay})` : `إزالة فلتر التاريخ (${selectedDay})`}
              </button>
            )}
            <button onClick={handleExport} disabled={exporting || filteredStudents.length === 0} style={{ ...S.exportBtn, width: "auto", marginTop: 0, marginBottom: 0, padding: "7px 14px", opacity: exporting || filteredStudents.length === 0 ? 0.6 : 1 }}>
              {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              {isEn ? "Export Excel" : "تصدير Excel"}
            </button>
          </div>

          {filteredStudents.length === 0 ? (
            <div style={AR.emptyBox}>{isEn ? "No students match this filter." : "لا يوجد طلاب مطابقون لهذا الفلتر."}</div>
          ) : (
            <div style={AR.tableWrap}>
              <table style={AR.table}>
                <thead>
                  <tr>
                    <th style={AR.th}>{isEn ? "University ID" : "الرقم الجامعي"}</th>
                    <th style={AR.th}>{isEn ? "Name" : "الاسم"}</th>
                    <th style={AR.th}>{isEn ? "Gender" : "الجنس"}</th>
                    <th style={AR.th}>{isEn ? "Signup date" : "تاريخ الدخول"}</th>
                    <th style={AR.th}>{isEn ? "First meal" : "أول تسجيل أكل"}</th>
                    <th style={AR.th}>{isEn ? "Window ends" : "نهاية الأسبوعين"}</th>
                    <th style={AR.th}>{isEn ? "Days left" : "الأيام المتبقية"}</th>
                    <th style={AR.th}>{isEn ? "Status" : "الحالة"}</th>
                    <th style={AR.th}>{isEn ? "Days logged / 14" : "أيام التسجيل / 14"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s.owner} onClick={() => setOpenStudent(s)} style={{ cursor: "pointer" }}>
                      <td style={AR.td}>{s.universityId || "—"}</td>
                      <td style={AR.td}>{s.name || "—"}</td>
                      <td style={AR.td}>{s.gender === "male" ? (isEn ? "Male" : "ذكر") : s.gender === "female" ? (isEn ? "Female" : "أنثى") : "—"}</td>
                      <td style={AR.td}>{s.signupLocalDate}</td>
                      <td style={AR.td}>{s.firstLogDate || "—"}</td>
                      <td style={AR.td}>{s.windowEndDate}</td>
                      <td style={AR.td}>{s.status === "completed" ? "—" : s.daysRemaining}</td>
                      <td style={AR.td}>
                        <span style={{ ...AR.badge, ...(s.status === "completed" ? { background: OVERVIEW_BADGE.ate.bg, color: OVERVIEW_BADGE.ate.color } : { background: OVERVIEW_BADGE.noGoal.bg, color: OVERVIEW_BADGE.noGoal.color }) }}>
                          {s.status === "completed" ? (isEn ? "Completed" : "اكتملت") : (isEn ? "Ongoing" : "جارية")}
                        </span>
                      </td>
                      <td style={AR.td}>{s.daysLoggedInWindow} / 14</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {openStudent && (
        <StudentWindowReportModal
          owner={openStudent.owner}
          universityId={openStudent.universityId}
          name={openStudent.name}
          onClose={() => setOpenStudent(null)}
        />
      )}
    </div>
  );
}

// الأنواع الخمسة هنا (فطور/غداء/عشاء/نوم/تسجيل الأكل) هي بالضبط ما أُوقف
// إرسالها التلقائي المجدول (راجع scheduled-prayer-reminders.js) - أصبحت
// تُرسَل يدوياً فقط من هذه الأزرار.
const REMINDER_BUTTONS = [
  { id: "breakfast", ar: "تذكير بالفطور", en: "Breakfast reminder", confirmAr: "متأكدة ترسلين تذكير فطور لجميع المستخدمين؟", confirmEn: "Send a breakfast reminder to all users?" },
  { id: "lunch", ar: "تذكير بالغداء", en: "Lunch reminder", confirmAr: "متأكدة ترسلين تذكير غداء لجميع المستخدمين؟", confirmEn: "Send a lunch reminder to all users?" },
  { id: "dinner", ar: "تذكير بالعشاء", en: "Dinner reminder", confirmAr: "متأكدة ترسلين تذكير عشاء لجميع المستخدمين؟", confirmEn: "Send a dinner reminder to all users?" },
  { id: "sleep", ar: "تذكير بالنوم", en: "Sleep reminder", confirmAr: "متأكدة ترسلين تذكير نوم لجميع المستخدمين؟", confirmEn: "Send a sleep reminder to all users?" },
  { id: "mealLog", ar: "تذكير بتسجيل الأكل", en: "Log your food reminder", confirmAr: "متأكدة ترسلين تذكير تسجيل أكل لجميع المستخدمين؟", confirmEn: "Send a log-your-food reminder to all users?" },
];

// "تذكيرات": بديل احتياطي يدوي عن التذكيرات المجدولة تلقائياً (أحياناً غير
// موثوقة فعلياً، راجع تعليق scheduled-prayer-reminders.js) - أزرار منفصلة
// ترسل Push فوري حقيقي لكل المستخدمين المؤهَّلين دفعة واحدة (عبر sendReminder
// في lib/adminReport.js -> mode=broadcast في admin-report.js -> نفس
// sendToSubscriptionRow/configureVapid المستخدَمة أصلاً لإشعارات الصلاة/
// الأذان، لا نظام موازٍ). تأكيد بسيط (window.confirm) قبل أي إرسال فعلي
// يتفادى ضغطة بالخطأ، والنتيجة (كم وصله فعلاً من أصل كم مؤهَّل) تُعرَض بوضوح
// بعد كل إرسال لكل زر على حدة.
const CUSTOM_KEY = "custom";

// صندوق نتيجة إرسال واحد - مشترك بين الأزرار الجاهزة والرسالة الحرة (نفس
// الشكل بالضبط، لا تمييز بصري بينهما - كلاهما نفس مسار الإرسال والتحقق).
function ReminderResultBox({ result, isEn }) {
  if (!result) return null;
  if (result.error) {
    return (
      <div style={{ ...AR.errorBox, marginTop: 10, marginBottom: 0 }}>
        <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{result.error}</span>
      </div>
    );
  }
  return (
    <div style={{ ...AR.noteBox, marginTop: 10, marginBottom: 0, display: "flex", alignItems: "flex-start", gap: 8 }}>
      <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>
        {isEn
          ? `Delivered to ${result.sentUsers} of ${result.totalUsers} eligible users.`
          : `وصل الإشعار فعلياً إلى ${result.sentUsers} من أصل ${result.totalUsers} مستخدم مؤهَّل.`}
      </span>
    </div>
  );
}

function errorMessage(e, isEn) {
  return e.status === 403 ? (isEn ? "Access denied." : "الوصول مرفوض.") : (isEn ? "Failed to send, please try again." : "تعذّر الإرسال، حاول مرة أخرى.");
}

// قسم "رسالة لمجموعة" (Phase 3) - اختيار مجموعة (بتاريخ/تواريخ دخول، أو كل
// من اكتملوا أسبوعين) مع إمكانية استبعاد أي طالب بإلغاء التحديد، ثم رسالة
// حرة يكتبها المالك بنفسه بالكامل (الحقل يبدأ فارغاً دائماً - لا نص جاهز
// ولا تعديل عليه هنا إطلاقاً). الإرسال يُنشئ admin_messages + صف استلام
// واحد لكل مستلم (راجع mode=sendMessage في admin-report.js) - المسار
// الموثوق هو الشاشة الحاجبة داخل التطبيق، لا الإشعار (قد لا يصل كما هو
// معروف، راجع تعليق MasarApp.jsx).
function GroupMessageSection() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [completedOnly, setCompletedOnly] = useState(false);
  const [excluded, setExcluded] = useState(new Set());
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;
    fetchStudentsOverview()
      .then((d) => { if (active) setStudents(d?.students || []); })
      .catch(() => { if (active) setError(isEn ? "Failed to load the students list, please try again." : "تعذّر جلب قائمة الطلاب الآن، حاول مرة أخرى."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isEn]);

  const dayOptions = useMemo(() => [...new Set(students.map((s) => s.signupLocalDate))].sort((a, b) => b.localeCompare(a)), [students]);

  const candidates = useMemo(() => {
    let rows = students;
    if (completedOnly) rows = rows.filter((s) => s.status === "completed");
    if (selectedDays.size > 0) rows = rows.filter((s) => selectedDays.has(s.signupLocalDate));
    if (completedOnly && selectedDays.size === 0) {
      // "اكتملوا أسبوعين" وحدها بلا تاريخ محدَّد - كل من اكتمل فقط.
    } else if (!completedOnly && selectedDays.size === 0) {
      rows = [];
    }
    return rows;
  }, [students, completedOnly, selectedDays]);

  const targetOwners = useMemo(() => candidates.filter((s) => !excluded.has(s.owner)).map((s) => s.owner), [candidates, excluded]);

  function toggleDay(date) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }

  function toggleExcluded(owner) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(owner)) next.delete(owner); else next.add(owner);
      return next;
    });
  }

  async function handleSend() {
    const text = body.trim();
    if (!text) { window.alert(isEn ? "Write a message first." : "اكتب رسالة أولاً."); return; }
    if (targetOwners.length === 0) { window.alert(isEn ? "No students selected." : "لم يتم اختيار أي طالب."); return; }
    const confirmed = window.confirm(
      isEn
        ? `Send this message to ${targetOwners.length} students?\n\n"${text}"`
        : `متأكدة ترسلين هذه الرسالة إلى ${targetOwners.length} طالب؟\n\n"${text}"`,
    );
    if (!confirmed) return;

    const targetDescription = completedOnly && selectedDays.size === 0
      ? (isEn ? "Completed two weeks" : "اكتملوا أسبوعين")
      : [...selectedDays].sort().join(", ");

    setSending(true);
    setResult(null);
    try {
      const data = await sendGroupMessage({ targetOwners, body: text, targetDescription });
      setResult({ totalTargets: data.totalTargets, pushSent: data.pushSent });
      setBody("");
      setExcluded(new Set());
    } catch (e) {
      setResult({ error: errorMessage(e, isEn) });
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}><Loader2 size={18} className="spin" /></div>;
  if (error) return <div style={AR.errorBox}><ShieldAlert size={16} /><span>{error}</span></div>;

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
        {isEn ? "Message to a group" : "رسالة لمجموعة"}
      </div>

      <div style={{ fontSize: 12.5, color: "var(--muted2)", marginBottom: 6 }}>{isEn ? "By signup date(s)" : "بتاريخ/تواريخ الدخول"}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {dayOptions.map((date) => (
          <button key={date} onClick={() => toggleDay(date)} style={{ ...AR.rangeBtn, ...(selectedDays.has(date) ? AR.rangeBtnActive : {}) }}>
            {date}
          </button>
        ))}
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12, cursor: "pointer" }}>
        <input type="checkbox" checked={completedOnly} onChange={(e) => setCompletedOnly(e.target.checked)} />
        {isEn ? "Everyone who completed two weeks (ignores dates above if none selected)" : "كل من اكتملوا أسبوعين (بصرف النظر عن التواريخ أعلاه لو لم تُحدَّد)"}
      </label>

      {candidates.length > 0 && (
        <>
          <div style={{ fontSize: 12.5, color: "var(--muted2)", marginBottom: 6 }}>
            {isEn ? `${targetOwners.length} of ${candidates.length} selected (uncheck to exclude)` : `${targetOwners.length} من أصل ${candidates.length} محدَّدون (أزل التحديد للاستبعاد)`}
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: 8, marginBottom: 12 }}>
            {candidates.map((s) => (
              <label key={s.owner} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "4px 2px", cursor: "pointer" }}>
                <input type="checkbox" checked={!excluded.has(s.owner)} onChange={() => toggleExcluded(s.owner)} />
                <span>{s.universityId || "—"}{s.name ? ` · ${s.name}` : ""}</span>
              </label>
            ))}
          </div>
        </>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={isEn ? "Write the message..." : "اكتب الرسالة..."}
        rows={3}
        style={{ ...S.input, width: "100%", resize: "vertical", fontFamily: "inherit", marginBottom: 10 }}
      />
      <button
        onClick={handleSend}
        disabled={sending || targetOwners.length === 0}
        style={{ ...S.exportBtn, width: "auto", padding: "9px 16px", marginBottom: 0, opacity: sending || targetOwners.length === 0 ? 0.6 : 1 }}
      >
        {sending ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
        {isEn ? `Send to ${targetOwners.length} students` : `إرسال إلى ${targetOwners.length} طالب`}
      </button>

      {result && (
        result.error ? (
          <div style={{ ...AR.errorBox, marginTop: 10, marginBottom: 0 }}><ShieldAlert size={15} /><span>{result.error}</span></div>
        ) : (
          <div style={{ ...AR.noteBox, marginTop: 10, marginBottom: 0, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {isEn
                ? `Message sent to ${result.totalTargets} students. Push notification delivered to ${result.pushSent}.`
                : `أُرسلت الرسالة إلى ${result.totalTargets} طالب. وصل الإشعار فعلياً إلى ${result.pushSent}.`}
            </span>
          </div>
        )
      )}
    </div>
  );
}

// قائمة الرسائل المرسَلة سابقاً + عدّاد الاستلام، وبالضغط على رسالة تظهر
// قائمة المستلمين (✓/✗ + وقت الضغط) مع فلتر "من لم يضغط".
function SentMessagesSection() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [receipts, setReceipts] = useState(null);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);

  useEffect(() => {
    fetchMessages().then((d) => setMessages(d?.messages || [])).catch(() => setMessages([])).finally(() => setLoading(false));
  }, []);

  async function openMessage(id) {
    if (openId === id) { setOpenId(null); setReceipts(null); return; }
    setOpenId(id);
    setReceipts(null);
    setReceiptsLoading(true);
    setOnlyPending(false);
    try {
      const data = await fetchMessageReceipts(id);
      setReceipts(data?.receipts || []);
    } catch {
      setReceipts([]);
    } finally {
      setReceiptsLoading(false);
    }
  }

  if (loading) return null;
  if (messages.length === 0) return null;

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 10 }}>
        {isEn ? "Sent messages" : "الرسائل المرسَلة"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m) => (
          <div key={m.id}>
            <button
              onClick={() => openMessage(m.id)}
              style={{ ...AR.rangeBtn, width: "100%", textAlign: "start", display: "block", background: openId === m.id ? "var(--surface-raised)" : AR.rangeBtn.background }}
            >
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{m.body.length > 80 ? `${m.body.slice(0, 80)}…` : m.body}</div>
              <div style={{ fontSize: 11, color: "var(--muted2)", fontWeight: 400 }}>
                {m.targetDescription ? `${m.targetDescription} · ` : ""}
                {isEn ? `${m.acknowledgedCount} of ${m.totalTargets} acknowledged` : `${m.acknowledgedCount} من أصل ${m.totalTargets} ضغطوا موافق`}
              </div>
            </button>
            {openId === m.id && (
              <div style={{ marginTop: 6, paddingInlineStart: 8 }}>
                {receiptsLoading ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 6, cursor: "pointer" }}>
                      <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
                      {isEn ? "Only show who hasn't acknowledged" : "فقط من لم يضغط"}
                    </label>
                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                      {(receipts || [])
                        .filter((r) => !onlyPending || !r.acknowledgedAt)
                        .map((r) => (
                          <div key={r.owner} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0" }}>
                            {r.acknowledgedAt ? <CheckCircle2 size={14} color="#5B8A72" /> : <XCircle size={14} color="#B5654F" />}
                            <span>{r.universityId || "—"}{r.name ? ` · ${r.name}` : ""}</span>
                            {r.acknowledgedAt && <span style={{ color: "var(--muted2)", fontSize: 11 }}>{new Date(r.acknowledgedAt).toLocaleString(isEn ? "en-GB" : "ar", { timeZone: "Asia/Kuwait" })}</span>}
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RemindersTab() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [sendingId, setSendingId] = useState(null);
  const [results, setResults] = useState({}); // { [mealId|CUSTOM_KEY]: { sentUsers, totalUsers } | { error } }
  const [customText, setCustomText] = useState("");

  async function handleSend(meal) {
    const confirmed = window.confirm(isEn ? meal.confirmEn : meal.confirmAr);
    if (!confirmed) return;
    setSendingId(meal.id);
    setResults((prev) => ({ ...prev, [meal.id]: null }));
    try {
      const data = await sendReminder(meal.id);
      setResults((prev) => ({ ...prev, [meal.id]: { sentUsers: data.sentUsers, totalUsers: data.totalUsers } }));
    } catch (e) {
      setResults((prev) => ({ ...prev, [meal.id]: { error: errorMessage(e, isEn) } }));
    } finally {
      setSendingId(null);
    }
  }

  // الرسالة الحرة: نفس مسار mode=broadcast بالضبط (راجع sendCustomReminder)،
  // فرق واحد فقط هو نص الرسالة نفسه بلا أي قالب جاهز. منع إرسال نص فارغ قبل
  // حتى محاولة الاتصال بالخادم (تنبيه فوري بسيط، لا رحلة شبكة بلا فائدة).
  async function handleSendCustom() {
    const text = customText.trim();
    if (!text) {
      window.alert(isEn ? "Write a message first." : "اكتب رسالة أولاً.");
      return;
    }
    const confirmed = window.confirm(
      isEn ? `Send this custom message to all users?\n\n"${text}"` : `متأكدة ترسلين هذه الرسالة لجميع المستخدمين؟\n\n"${text}"`,
    );
    if (!confirmed) return;
    setSendingId(CUSTOM_KEY);
    setResults((prev) => ({ ...prev, [CUSTOM_KEY]: null }));
    try {
      const data = await sendCustomReminder(text);
      setResults((prev) => ({ ...prev, [CUSTOM_KEY]: { sentUsers: data.sentUsers, totalUsers: data.totalUsers } }));
    } catch (e) {
      setResults((prev) => ({ ...prev, [CUSTOM_KEY]: { error: errorMessage(e, isEn) } }));
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div>
      <p style={S.profileHint}>
        {isEn
          ? "Send an immediate push reminder to every registered user right now, independent of the scheduled automatic reminders."
          : "إرسال تذكير فوري بإشعار Push لكل المستخدمين المسجّلين الآن، بشكل مستقل عن التذكيرات المجدولة تلقائياً."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {REMINDER_BUTTONS.map((meal) => {
          const result = results[meal.id];
          const sending = sendingId === meal.id;
          return (
            <div key={meal.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>{isEn ? meal.en : meal.ar}</div>
                <button
                  onClick={() => handleSend(meal)}
                  disabled={sendingId !== null}
                  style={{ ...S.exportBtn, width: "auto", padding: "9px 16px", marginBottom: 0, opacity: sendingId !== null ? 0.6 : 1 }}
                >
                  {sending ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                  {isEn ? meal.en : meal.ar}
                </button>
              </div>
              <ReminderResultBox result={result} isEn={isEn} />
            </div>
          );
        })}

        <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            {isEn ? "Or write a custom message" : "أو اكتب رسالة مخصصة"}
          </div>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={isEn ? "Write the message to send to all users..." : "اكتب الرسالة التي تريد إرسالها لجميع المستخدمين..."}
            rows={3}
            style={{ ...S.input, width: "100%", resize: "vertical", fontFamily: "inherit", marginBottom: 10 }}
          />
          <button
            onClick={handleSendCustom}
            disabled={sendingId !== null}
            style={{ ...S.exportBtn, width: "auto", padding: "9px 16px", marginBottom: 0, opacity: sendingId !== null ? 0.6 : 1 }}
          >
            {sendingId === CUSTOM_KEY ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
            {isEn ? "Send to everyone" : "إرسال للجميع"}
          </button>
          <ReminderResultBox result={results[CUSTOM_KEY]} isEn={isEn} />
        </div>

        <GroupMessageSection />
        <SentMessagesSection />
      </div>
    </div>
  );
}

export default function AdminReportView() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [tab, setTab] = useState("search");

  return (
    <div style={AR.wrap}>
      <h1 style={S.sectionTitle}>{isEn ? "Nutrition Log Lookup" : "استعلام السجل الغذائي"}</h1>
      <div style={AR.topTabs}>
        <button onClick={() => setTab("search")} style={{ ...AR.topTab, ...(tab === "search" ? AR.topTabActive : {}) }}>
          <Search size={14} /> {isEn ? "Search" : "البحث"}
        </button>
        <button onClick={() => setTab("overview")} style={{ ...AR.topTab, ...(tab === "overview" ? AR.topTabActive : {}) }}>
          <Users size={14} /> {isEn ? "Overview" : "نظرة عامة"}
        </button>
        <button onClick={() => setTab("students")} style={{ ...AR.topTab, ...(tab === "students" ? AR.topTabActive : {}) }}>
          <ClipboardList size={14} /> {isEn ? "Students" : "الطلاب"}
        </button>
        <button onClick={() => setTab("reminders")} style={{ ...AR.topTab, ...(tab === "reminders" ? AR.topTabActive : {}) }}>
          <Bell size={14} /> {isEn ? "Reminders" : "تذكيرات"}
        </button>
      </div>
      {tab === "search" ? <SearchTab /> : tab === "overview" ? <OverviewTab /> : tab === "students" ? <StudentsTab /> : <RemindersTab />}
    </div>
  );
}
