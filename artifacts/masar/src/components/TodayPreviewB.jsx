// معاينة تجريبية (نسخة ب) لشاشة "اليوم": نمط بديل بحلقة تقدّم دائرية واحدة
// تعرض نسبة إنجاز اليوم الكلية، وتحتها قائمة نصية بأقسام اليوم الحقيقية
// (المهام الإلزامية اليومية، مهامك اليوم، الأنشطة المسجَّلة) كل بند بعلامة
// ✓/○. كل الأرقام هنا مأخوذة من نفس البيانات الحقيقية المستخدمة بشاشة
// "اليوم" الفعلية (mandatoryLog/tasks/entries) - بلا أي اختلاق أو حساب
// جديد، وبلا أي استدعاء حفظ (عرض فقط، القوائم غير قابلة للنقر). صفحة معاينة
// منفصلة تماماً عن شاشة "اليوم" الحقيقية ولا تستبدلها.
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, Circle } from "lucide-react";
import PreviewBanner from "./TodayPreviewShared";
import { ProgressRing } from "./ui";
import { todayKey, arabicDate, MANDATORY_TASKS } from "../lib/helpers";

const RELIGIOUS_MANDATORY_TASK_KEYS = ["quran_daily", "alkahf"];
function mandatoryTaskLabel(task, t) {
  if (RELIGIOUS_MANDATORY_TASK_KEYS.includes(task.key)) return task.label;
  return t(`todayView.mandatoryTasks.${task.key}`, task.label);
}

function ChecklistRow({ done, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
      {done ? <Check size={17} color="var(--success)" /> : <Circle size={17} color="var(--muted2)" />}
      <span style={{ flex: 1, fontSize: 13.5, color: done ? "var(--muted2)" : "var(--ink)", textDecoration: done ? "line-through" : "none" }}>
        {label}
      </span>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: "var(--m-radius-2xl)",
        boxShadow: "var(--m-shadow-sm)",
        padding: "4px 14px 2px",
        marginBottom: "var(--space-3)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color, padding: "10px 4px 2px" }}>{title}</div>
      {children}
    </div>
  );
}

export default function TodayPreviewB({ entries, categories, tasks, mandatoryLog, setView }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isEn = language === "en";
  const date = todayKey();

  const isFriday = new Date().getDay() === 5;
  const todayMandatory = (mandatoryLog || {})[date] || {};
  const mandatoryVisible = MANDATORY_TASKS.filter((tk) => !tk.fridayOnly || isFriday);
  const mandatoryDoneCount = mandatoryVisible.filter((tk) => !!todayMandatory[tk.key]).length;

  const dayTasks = (tasks || []).filter((tk) => tk.due === date);
  const dayTasksDone = dayTasks.filter((tk) => tk.done).length;

  const dayEntries = useMemo(() => (entries || []).filter((e) => e.date === date), [entries, date]);
  const trackedCatIds = useMemo(() => new Set(dayEntries.map((e) => e.catId)), [dayEntries]);

  const combinedTotal = mandatoryVisible.length + dayTasks.length;
  const combinedDone = mandatoryDoneCount + dayTasksDone;
  const ringPercent = combinedTotal > 0 ? Math.round((combinedDone / combinedTotal) * 100) : 0;

  return (
    <div style={{ padding: "0 2px 24px" }}>
      <PreviewBanner
        language={language}
        setView={setView}
        otherView="previewTodayA"
        otherLabel={isEn ? "See Version A" : "شاهد نسخة أ"}
        titleAr="نسخة ب — حلقة تقدّم + قائمة مهام نصية (نمط تجريبي بديل)"
        titleEn="Version B — progress ring + text checklist (alternative experimental layout)"
      />

      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 13, color: "var(--muted2)", fontWeight: 700 }}>
          {arabicDate(date, { weekday: "long", day: "numeric", month: "long" }, isEn ? "en-US" : undefined)}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "18px 0 6px" }}>
        <ProgressRing
          percent={ringPercent}
          color="var(--m-tint-activity)"
          size={176}
          strokeWidth={13}
          label={isEn ? "Today's completion" : "إنجاز اليوم"}
        />
      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted2)", marginBottom: 18, direction: "ltr" }}>
        {combinedTotal === 0
          ? isEn
            ? "No mandatory tasks or to-dos scheduled for today yet."
            : "لا توجد مهام إلزامية أو عادية مضافة لليوم بعد."
          : `${combinedDone}/${combinedTotal}`}
      </div>

      {mandatoryVisible.length > 0 && (
        <Section title={t("todayView.dailyMandatoryTitle")} color="var(--m-tint-goals)">
          {mandatoryVisible.map((tk) => (
            <ChecklistRow key={tk.key} done={!!todayMandatory[tk.key]} label={`${tk.icon} ${mandatoryTaskLabel(tk, t)}`} />
          ))}
        </Section>
      )}

      {dayTasks.length > 0 && (
        <Section title={isEn ? "Your tasks today" : "مهامك اليوم"} color="var(--m-tint-health)">
          {dayTasks.map((tk) => (
            <ChecklistRow key={tk.id} done={!!tk.done} label={tk.title} />
          ))}
        </Section>
      )}

      {(categories || []).length > 0 && (
        <Section title={isEn ? "Tracked today" : "أنشطة اليوم"} color="var(--m-tint-nutrition)">
          {categories.map((c) => (
            <ChecklistRow key={c.id} done={trackedCatIds.has(c.id)} label={c.name} />
          ))}
        </Section>
      )}
    </div>
  );
}
