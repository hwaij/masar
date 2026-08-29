import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Footprints, Plus } from "lucide-react";
import { store } from "../lib/store";
import { todayKey } from "../lib/helpers";
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
};

export default function StepsView({ stepsLog, setStepsLog, showToast }) {
  const { t, i18n } = useTranslation();
  const log = stepsLog;
  const [inputValue, setInputValue] = useState(() => String(stepsLog[todayKey()]?.steps ?? ""));
  const [saving, setSaving] = useState(false);
  const today = todayKey();

  const todaySteps = log[today]?.steps ?? 0;

  async function saveSteps(value) {
    const steps = Math.max(0, Math.round(Number(value)));
    if (!Number.isFinite(steps)) { showToast(t("steps.invalidValue")); return; }
    setSaving(true);
    const prev = log[today];
    setStepsLog((p) => ({ ...p, [today]: { steps, source: "manual" } }));
    const res = await store.saveStepsEntry(today, steps, "manual");
    setSaving(false);
    if (!res.ok) {
      setStepsLog((p) => { const next = { ...p }; if (prev) next[today] = prev; else delete next[today]; return next; });
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

      <div style={SS.trackCard} data-tour="steps-today-card">
        <div style={SS.todayLabel}>{t("steps.todayLabel")}</div>
        <div style={SS.todayValue}>{todaySteps.toLocaleString(i18n.language === "en" ? "en-US" : "ar-EG")}</div>

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
