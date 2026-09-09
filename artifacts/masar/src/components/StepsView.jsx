import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Footprints, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { store } from "../lib/store";
import { arabicDate } from "../lib/helpers";
import { localDayKey } from "../lib/tips";
import { S } from "./styles";

// أزرار إضافة سريعة أثناء اليوم (المستخدم يحدّث خطواته عدة مرات، لا يُدخلها
// دفعة واحدة فقط في نهاية اليوم) - تُضيف للقيمة الحالية في حقل الإدخال قبل
// الحفظ، لا تحفظ مباشرة، حتى يبقى مسار حفظ واحد بسيط (زر واحد يحفظ القيمة
// النهائية المعروضة في الحقل، سواء وصلت إليها بالكتابة المباشرة أو بالإضافة).
const QUICK_ADD_VALUES = [500, 1000, 2000];

const SS = {
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #6FA8DC, #5FA8A0)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },

  trackCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 16px", marginBottom: 16, textAlign: "center" },
  todayLabel: { fontSize: 12.5, fontWeight: 700, color: "var(--muted2)", marginBottom: 6 },
  todayValue: { fontFamily: "'Amiri', serif", fontSize: 40, fontWeight: 700, color: "#6FA8DC", fontVariantNumeric: "tabular-nums" },

  inputRow: { display: "flex", gap: 8, marginTop: 16 },
  input: { flex: 1, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 12, padding: "12px 14px", color: "var(--ink)", fontSize: 16, fontFamily: "inherit", textAlign: "center", fontVariantNumeric: "tabular-nums" },
  saveBtn: { background: "#6FA8DC", color: "#0E1613", border: "none", borderRadius: 12, padding: "0 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  quickAddRow: { display: "flex", gap: 8, marginTop: 10, justifyContent: "center" },
  quickAddBtn: { display: "flex", alignItems: "center", gap: 4, background: "rgba(111,168,220,0.12)", border: "1px solid rgba(111,168,220,0.35)", color: "#6FA8DC", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  chartCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 16 },
  chartTitle: { fontSize: 13, fontWeight: 700, color: "var(--muted2)", marginBottom: 8 },

  goalCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 16px", marginBottom: 16 },
  goalRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  goalText: { fontSize: 13, fontWeight: 700, color: "var(--ink)" },
  goalEditLink: { background: "none", border: "none", color: "#6FA8DC", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", padding: 0 },
  progressTrack: { height: 10, borderRadius: 6, background: "var(--surface-sunken)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 6, background: "#6FA8DC", transition: "width 0.3s ease" },
  setGoalBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", background: "transparent", border: "1.5px dashed var(--border2)", color: "var(--muted2)", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  goalInputRow: { display: "flex", gap: 8 },
};

export default function StepsView({ stepsLog, setStepsLog, showToast, healthProfile, setHealthProfile }) {
  const { t, i18n } = useTranslation();
  const log = stepsLog;
  const today = localDayKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const isViewingToday = selectedDate === today;
  const [inputValue, setInputValue] = useState(() => String(stepsLog[today]?.steps ?? ""));
  const [saving, setSaving] = useState(false);

  // هدف الخطوات اليومي (Batch 2 - Item 2): رقم شخصي يحدده المستخدم بنفسه فقط
  // (health_profile.daily_steps_goal) - لا قيمة افتراضية مفروضة (لا 10000 كـ
  // "معيار عالمي")؛ يبقى null (زر "حدّد هدفك" بدل شريط تقدّم) حتى يضبطه
  // المستخدم بنفسه، وقابل للتعديل دائماً بعدها.
  const dailyGoal = healthProfile?.dailyStepsGoal || null;
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(() => (dailyGoal ? String(dailyGoal) : ""));
  const [savingGoal, setSavingGoal] = useState(false);

  async function saveGoal() {
    const goal = Math.round(Number(goalInput));
    if (!Number.isFinite(goal) || goal <= 0) { showToast(t("steps.invalidGoal")); return; }
    setSavingGoal(true);
    const prev = healthProfile;
    const next = { ...healthProfile, dailyStepsGoal: goal };
    setHealthProfile(next);
    const res = await store.saveHealthProfile(next);
    setSavingGoal(false);
    if (!res.ok) { setHealthProfile(prev); showToast(t("common.errors.saveFailed")); return; }
    setEditingGoal(false);
    showToast(t("steps.goalSaved"));
  }

  useEffect(() => {
    setInputValue(String(log[selectedDate]?.steps ?? ""));
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSteps = log[selectedDate]?.steps ?? 0;

  function shiftDay(delta) {
    const [y, m, dd] = selectedDate.split("-").map(Number);
    const d = new Date(y, m - 1, dd);
    d.setDate(d.getDate() + delta);
    const next = localDayKey(d);
    if (next > today) return;
    setSelectedDate(next);
  }

  async function saveSteps(value) {
    const steps = Math.max(0, Math.round(Number(value)));
    if (!Number.isFinite(steps)) { showToast(t("steps.invalidValue")); return; }
    setSaving(true);
    const prev = log[selectedDate];
    setStepsLog((p) => ({ ...p, [selectedDate]: { steps, source: "manual" } }));
    const res = await store.saveStepsEntry(selectedDate, steps, "manual");
    setSaving(false);
    if (!res.ok) {
      setStepsLog((p) => { const next = { ...p }; if (prev) next[selectedDate] = prev; else delete next[selectedDate]; return next; });
      showToast(t("common.errors.saveFailed"));
      return;
    }
    setInputValue(String(steps));
    showToast(t("steps.saved"));
  }

  function quickAdd(amount) {
    const current = Number(inputValue) || 0;
    setInputValue(String(current + amount));
  }

  const recentDates = useMemo(() => {
    const days = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) { days.push(localDayKey(d)); d.setDate(d.getDate() - 1); }
    return days.reverse();
  }, [today]);

  const chartData = useMemo(
    () => recentDates.map((date) => ({ label: date.slice(5), steps: log[date]?.steps ?? 0 })),
    [recentDates, log]
  );

  const hasAnyHistory = recentDates.some((date) => log[date]);

  return (
    <div style={S.view}>
      <div style={SS.hero}>
        <div style={SS.heroIcon}><Footprints size={22} color="#0E1613" /></div>
        <div>
          <div style={SS.heroTitle}>{t("steps.heroTitle")}</div>
          <div style={SS.heroSub}>{t("steps.heroSub")}</div>
        </div>
      </div>

      <div style={S.dateRow}>
        <button onClick={() => shiftDay(-1)} style={S.iconBtn} aria-label={t("nutrition.previousDay")}>
          {i18n.language === "en" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
        <div style={S.dateLabel}>
          {arabicDate(selectedDate, { weekday: "long", day: "numeric", month: "long" }, i18n.language === "en" ? "en-US" : undefined)}
          {isViewingToday && <span style={S.todayPill}>{t("nav.today")}</span>}
        </div>
        <button
          onClick={() => shiftDay(1)}
          disabled={isViewingToday}
          style={{ ...S.iconBtn, ...(isViewingToday ? { opacity: 0.4, cursor: "not-allowed" } : {}) }}
          aria-label={t("nutrition.nextDay")}
        >
          {i18n.language === "en" ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div style={SS.trackCard} data-tour="steps-today-card">
        <div style={SS.todayLabel}>{isViewingToday ? t("steps.todayLabel") : ""}</div>
        <div style={SS.todayValue}>{selectedSteps.toLocaleString(i18n.language === "en" ? "en-US" : "ar-EG")}</div>

        <div style={SS.inputRow}>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t("steps.inputPlaceholder")}
            style={SS.input}
            aria-label={t("steps.inputPlaceholder")}
          />
          <button onClick={() => saveSteps(inputValue)} disabled={saving || inputValue === ""} style={SS.saveBtn}>
            {t("steps.saveBtn")}
          </button>
        </div>

        <div style={SS.quickAddRow}>
          {QUICK_ADD_VALUES.map((v) => (
            <button key={v} onClick={() => quickAdd(v)} style={SS.quickAddBtn} aria-label={t("steps.quickAddLabel", { count: v })}>
              <Plus size={13} /> {v.toLocaleString(i18n.language === "en" ? "en-US" : "ar-EG")}
            </button>
          ))}
        </div>
      </div>

      <div style={SS.goalCard} data-tour="steps-goal-card">
        {editingGoal ? (
          <div style={SS.goalInputRow}>
            <input
              type="number" inputMode="numeric" min="1"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder={t("steps.dailyGoalPlaceholder")}
              style={{ ...SS.input, flex: 1 }}
              aria-label={t("steps.dailyGoalLabel")}
            />
            <button onClick={saveGoal} disabled={savingGoal || !goalInput} style={SS.saveBtn}>{t("common.buttons.save")}</button>
          </div>
        ) : dailyGoal ? (
          <>
            <div style={SS.goalRow}>
              <span style={SS.goalText}>
                {selectedSteps >= dailyGoal
                  ? t("steps.goalReached")
                  : t("steps.goalProgress", { steps: selectedSteps.toLocaleString(i18n.language === "en" ? "en-US" : "ar-EG"), goal: dailyGoal.toLocaleString(i18n.language === "en" ? "en-US" : "ar-EG") })}
              </span>
              <button onClick={() => { setGoalInput(String(dailyGoal)); setEditingGoal(true); }} style={SS.goalEditLink}>{t("steps.editGoalBtn")}</button>
            </div>
            <div style={SS.progressTrack}>
              <div style={{ ...SS.progressFill, width: `${Math.min(100, Math.round((selectedSteps / dailyGoal) * 100))}%` }} />
            </div>
          </>
        ) : (
          <button onClick={() => { setGoalInput(""); setEditingGoal(true); }} style={SS.setGoalBtn}>{t("steps.setGoalBtn")}</button>
        )}
      </div>

      <div style={SS.chartCard}>
        <div style={SS.chartTitle}>{t("steps.historyTitle")}</div>
        {hasAnyHistory ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--surface-raised)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [v.toLocaleString(i18n.language === "en" ? "en-US" : "ar-EG"), t("steps.heroTitle")]} />
              <Bar dataKey="steps" radius={[3, 3, 3, 3]} fill="#6FA8DC" maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={S.emptyHint}>{t("steps.noHistoryYet")}</div>
        )}
      </div>
    </div>
  );
}
