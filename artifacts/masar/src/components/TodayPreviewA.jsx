// معاينة تجريبية (نسخة أ) لشاشة "اليوم": نفس عجلة اليوم الحقيقية (DayWheel)
// ونفس منطق حساب الفترة/الفئات الموجود بالضبط في TodayView داخل MasarApp.jsx
// (منسوخ للقراءة فقط، بلا أي استدعاء حفظ/تعديل بيانات)، مع تحسين بصري بحت
// حول العجلة: حاوية مبطّنة بظل وحواف --m-radius-2xl، ألوان أكثر انسجاماً مع
// توكنز --m-tint-* الجديدة، وشرائح فئات موحّدة الشكل مع بقية التطبيق.
// هذه صفحة معاينة منفصلة تماماً - لا تُستبدَل بها شاشة "اليوم" الفعلية ولا
// تُلمَس آلية عمل DayWheel نفسها.
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import PreviewBanner from "./TodayPreviewShared";
import DayWheel from "./DayWheel";
import { todayKey, fmtHM, diffMinutes, arabicDate, MANDATORY_TASKS } from "../lib/helpers";

const RELIGIOUS_MANDATORY_TASK_KEYS = ["quran_daily", "alkahf"];
function mandatoryTaskLabel(task, t) {
  if (RELIGIOUS_MANDATORY_TASK_KEYS.includes(task.key)) return task.label;
  return t(`todayView.mandatoryTasks.${task.key}`, task.label);
}

export default function TodayPreviewA({ entries, categories, tasks, mandatoryLog, focus, setView }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [date] = useState(todayKey());
  const [manualPeriod, setManualPeriod] = useState(null);

  const catMap = useMemo(() => Object.fromEntries((categories || []).map((c) => [c.id, c])), [categories]);
  const dayEntries = useMemo(
    () => (entries || []).filter((e) => e.date === date).sort((a, b) => a.start.localeCompare(b.start)),
    [entries, date]
  );
  const dayFocusSessions = useMemo(
    () => (focus || []).filter((f) => f.date === date && f.start && f.end).sort((a, b) => a.start.localeCompare(b.start)),
    [focus, date]
  );

  const now = new Date();
  const autoPeriod = now.getHours() < 12 ? "morning" : "evening";
  const period = manualPeriod || autoPeriod;
  const periodLabel = period === "morning" ? t("todayView.morning") : t("todayView.evening");
  const periodGlow = period === "morning" ? "rgba(224,184,104,0.4)" : "rgba(94,150,224,0.4)";
  const isAmTime = (hhmm) => parseInt(hhmm.split(":")[0], 10) < 12;
  const halfEntries = useMemo(() => dayEntries.filter((e) => isAmTime(e.start) === (period === "morning")), [dayEntries, period]);
  const halfFocusSessions = useMemo(
    () => dayFocusSessions.filter((f) => isAmTime(f.start) === (period === "morning")),
    [dayFocusSessions, period]
  );
  const halfTrackedMinutes =
    halfEntries.reduce((s, e) => s + diffMinutes(e.start, e.end), 0) +
    halfFocusSessions.reduce((s, f) => s + diffMinutes(f.start, f.end), 0);

  const byCategory = useMemo(() => {
    const m = {};
    dayEntries.forEach((e) => {
      m[e.catId] = (m[e.catId] || 0) + diffMinutes(e.start, e.end);
    });
    return Object.entries(m)
      .map(([catId, mins]) => ({ catId, mins, ...catMap[catId] }))
      .sort((a, b) => b.mins - a.mins);
  }, [dayEntries, catMap]);

  const isFriday = new Date().getDay() === 5;
  const todayMandatory = (mandatoryLog || {})[todayKey()] || {};
  const mandatoryVisible = MANDATORY_TASKS.filter((tk) => !tk.fridayOnly || isFriday);
  const mandatoryDoneCount = mandatoryVisible.filter((tk) => !!todayMandatory[tk.key]).length;

  return (
    <div style={{ padding: "0 2px 24px" }}>
      <PreviewBanner
        language={language}
        setView={setView}
        otherView="previewTodayB"
        otherLabel={language === "en" ? "See Version B" : "شاهد نسخة ب"}
        titleAr="نسخة أ — تحسين بصري لعجلة اليوم الحالية (نفس آلية العمل تماماً)"
        titleEn="Version A — visual polish of the current Day Wheel (mechanics unchanged)"
      />

      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--muted2)", fontWeight: 700 }}>
          {arabicDate(date, { weekday: "long", day: "numeric", month: "long" }, language === "en" ? "en-US" : undefined)}
        </div>
      </div>

      {mandatoryVisible.length > 0 && (
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: "var(--m-radius-2xl)",
            boxShadow: "var(--m-shadow-sm)",
            padding: "14px 16px",
            marginBottom: "var(--space-3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
            <span style={{ fontSize: "var(--m-text-sm)", fontWeight: "var(--font-bold)", color: "var(--m-tint-goals)" }}>
              {t("todayView.dailyMandatoryTitle")}
            </span>
            <span
              style={{
                fontSize: "var(--m-text-xs)",
                color: mandatoryDoneCount === mandatoryVisible.length ? "var(--success)" : "var(--muted2)",
                direction: "ltr",
              }}
            >
              {mandatoryDoneCount}/{mandatoryVisible.length}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {mandatoryVisible.map((tk) => {
              const done = !!todayMandatory[tk.key];
              return (
                <span
                  key={tk.key}
                  className="ui-icon-badge"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "5px 10px",
                    border: done ? "1px solid var(--success-border)" : "1px solid var(--line)",
                    background: done ? "var(--success-soft)" : "transparent",
                    color: done ? "var(--success)" : "var(--muted2)",
                    fontSize: "var(--m-text-sm)",
                  }}
                >
                  <span>{tk.icon}</span>
                  <span>{mandatoryTaskLabel(tk, t)}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          position: "relative",
          background:
            period === "morning"
              ? "linear-gradient(160deg, rgba(224,184,104,0.10), var(--panel))"
              : "linear-gradient(160deg, rgba(94,150,224,0.10), var(--panel))",
          border: "1px solid var(--line)",
          borderRadius: "var(--m-radius-2xl)",
          boxShadow: "var(--m-shadow-sm)",
          padding: "28px 16px 22px",
          marginBottom: "var(--space-3)",
          transition: "background 0.6s ease",
        }}
      >
        <DayWheel
          entries={halfEntries}
          focusSessions={halfFocusSessions}
          catMap={catMap}
          size={224}
          glow={periodGlow}
          period={period}
          centerLabel={halfEntries.length === 0 && halfFocusSessions.length === 0 ? t("todayView.startYourDay") : periodLabel}
          centerValue={fmtHM(halfTrackedMinutes, language)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <button
          onClick={() => setManualPeriod(period === "morning" ? "evening" : "morning")}
          className="ui-icon-badge"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: period === "morning" ? "1px solid rgba(224,184,104,0.4)" : "1px solid rgba(94,150,224,0.4)",
            padding: "8px 18px",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            background: period === "morning" ? "rgba(224,184,104,0.10)" : "rgba(94,150,224,0.10)",
            boxShadow: "var(--m-shadow-sm)",
            color: period === "morning" ? "#C9A24B" : "#7FAEEE",
          }}
        >
          {period === "morning" ? "☀️" : "🌙"} {periodLabel}
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {byCategory.map((c) => (
          <div
            key={c.catId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--ink)",
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "var(--m-radius-pill)",
              padding: "6px 12px",
              boxShadow: "var(--m-shadow-sm)",
            }}
          >
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
            <span>{c.name}</span>
            <span style={{ color: "var(--muted)", fontSize: 11 }}>{fmtHM(c.mins, language)}</span>
          </div>
        ))}
        {byCategory.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
            {t("todayView.noActivitiesToday")}
          </div>
        )}
      </div>
    </div>
  );
}
