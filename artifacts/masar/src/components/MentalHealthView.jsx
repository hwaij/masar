import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Angry, Frown, Meh, Smile, Laugh, Wind, AlertTriangle, HeartHandshake,
} from "lucide-react";
import { store } from "../lib/store";
import { todayKey } from "../lib/helpers";
import { localDayKey } from "../lib/tips";
import {
  MOOD_LEVELS, STRESS_LEVELS, ENERGY_LEVELS, BREATHING_PHASES, BREATHING_DURATIONS,
  MENTAL_HEALTH_DISCLAIMER, CRISIS_SUPPORT_MESSAGE, detectRisk, computeSuggestions, computeMoodFitnessInsight,
} from "../lib/mentalHealth";
import { S } from "./styles";

const MOOD_ICONS = { Angry, Frown, Meh, Smile, Laugh };

// لوحة ألوان أهدأ خصيصاً لهذا القسم: تيل/أزرق ناعم بدل الذهبي المعتاد في
// باقي مسار، مع الاحتفاظ بنفس رموز/بطاقات/زوايا الهوية البصرية.
const MHS = {
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #7FAEEE, #5FA8A0)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },

  trackCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 16 },
  trackLabel: { fontSize: 12.5, fontWeight: 700, color: "var(--muted2)", marginTop: 14, marginBottom: 8 },
  moodRow: { display: "flex", justifyContent: "space-between", gap: 4 },
  moodBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "1px solid var(--border2)", borderRadius: 12, padding: "8px 2px", background: "transparent", color: "var(--muted2)", cursor: "pointer", fontFamily: "inherit" },
  moodBtnActive: { borderColor: "#5FA8A0", background: "rgba(95,168,160,0.14)", color: "#5FA8A0" },
  moodLabel: { fontSize: 9.5, textAlign: "center", lineHeight: 1.3 },
  scaleRow: { display: "flex", gap: 6 },
  scaleBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, border: "1px solid var(--border2)", borderRadius: 10, padding: "8px 2px", background: "transparent", color: "var(--ink-soft)", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  scaleBtnActive: { borderColor: "#7FAEEE", background: "rgba(94,150,224,0.12)", color: "#7FAEEE" },
  scaleLabel: { fontSize: 9, fontWeight: 600, color: "inherit", textAlign: "center", lineHeight: 1.3 },
  noteInput: { width: "100%", background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 12, padding: "10px 12px", color: "var(--ink)", fontSize: 13, fontFamily: "inherit", resize: "vertical", marginBottom: 4 },
  saveBtn: { width: "100%", background: "#5FA8A0", color: "#0E1613", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 14, fontFamily: "inherit" },

  suggestionCard: { display: "flex", flexDirection: "column", gap: 8, background: "rgba(127,174,238,0.08)", border: "1px solid rgba(127,174,238,0.3)", borderRadius: 14, padding: "12px 14px", marginBottom: 10 },
  suggestionText: { fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7 },
  suggestionBtn: { alignSelf: "flex-start", background: "rgba(127,174,238,0.16)", border: "1px solid rgba(127,174,238,0.4)", color: "#7FAEEE", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  breathCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 16 },
  breathTitle: { display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 700, color: "var(--ink)", marginBottom: 12 },
  breathDurationRow: { display: "flex", gap: 8 },
  breathDurationBtn: { flex: 1, border: "1px solid rgba(95,168,160,0.4)", background: "rgba(95,168,160,0.08)", color: "#5FA8A0", borderRadius: 12, padding: "10px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  breathStage: { display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0 4px" },
  breathCircleWrap: { width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  breathCircle: { width: 84, height: 84, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, rgba(127,174,238,0.55), rgba(95,168,160,0.35))", border: "1px solid rgba(127,174,238,0.5)", transitionProperty: "transform", transitionTimingFunction: "ease-in-out" },
  breathPhaseLabel: { fontSize: 15, fontWeight: 700, color: "#7FAEEE", marginBottom: 4 },
  breathTimeLeft: { fontSize: 12, color: "var(--muted2)", fontVariantNumeric: "tabular-nums" },
  breathStopBtn: { marginTop: 14, background: "transparent", border: "1px solid var(--border2)", color: "var(--muted2)", borderRadius: 10, padding: "8px 18px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  chartCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 16 },
  chartTitle: { fontSize: 13, fontWeight: 700, color: "var(--muted2)", marginBottom: 8 },
  chartLegendRow: { display: "flex", gap: 14, justifyContent: "center", marginTop: 6 },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted2)" },
  legendDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  insightBox: { display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(95,168,160,0.08)", border: "1px solid rgba(95,168,160,0.25)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.7, marginTop: 10 },

  disclaimerCard: { display: "flex", gap: 8, alignItems: "flex-start", background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", fontSize: 11.5, color: "var(--muted2)", lineHeight: 1.7 },

  crisisOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  crisisCard: { background: "var(--panel)", border: "1.5px solid rgba(209,123,95,0.5)", borderRadius: 18, padding: "22px 18px", maxWidth: 380, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 },
  crisisTitle: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" },
  crisisText: { fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.8 },
  crisisConfirmBtn: { width: "100%", background: "#D17B5F", color: "#fff", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 10, fontFamily: "inherit" },
};

function CrisisModal({ onConfirm }) {
  return (
    <div style={MHS.crisisOverlay} className="overlay-in">
      <div style={MHS.crisisCard} className="modal-card-in">
        <AlertTriangle size={30} color="#D17B5F" />
        <div style={MHS.crisisTitle}>نحن هنا من أجلك</div>
        <div style={MHS.crisisText}>{CRISIS_SUPPORT_MESSAGE}</div>
        <button onClick={onConfirm} style={MHS.crisisConfirmBtn}>فهمت، أؤكد أنني قرأت هذا</button>
      </div>
    </div>
  );
}

function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [totalLeft, setTotalLeft] = useState(0);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      setTotalLeft((prev) => {
        if (prev <= 1) { setRunning(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const phase = BREATHING_PHASES[phaseIdx];
    const t = setTimeout(() => setPhaseIdx((i) => (i + 1) % BREATHING_PHASES.length), phase.seconds * 1000);
    return () => clearTimeout(t);
  }, [running, phaseIdx]);

  function start(minutes) {
    setPhaseIdx(0);
    setTotalLeft(minutes * 60);
    setRunning(true);
  }
  function stop() {
    setRunning(false);
    setPhaseIdx(0);
  }

  const phase = BREATHING_PHASES[phaseIdx];
  const scale = phase.key === "exhale" ? 0.85 : 1.4;
  const transitionSeconds = phase.key === "hold" ? 0.4 : phase.seconds;

  return (
    <div style={MHS.breathCard}>
      <div style={MHS.breathTitle}><Wind size={16} color="#7FAEEE" /> تمرين تنفس هادئ (4-7-8)</div>
      {!running ? (
        <div style={MHS.breathDurationRow}>
          {BREATHING_DURATIONS.map((d) => (
            <button key={d.minutes} onClick={() => start(d.minutes)} style={MHS.breathDurationBtn}>{d.label}</button>
          ))}
        </div>
      ) : (
        <div style={MHS.breathStage}>
          <div style={MHS.breathCircleWrap}>
            <div style={{ ...MHS.breathCircle, transform: `scale(${scale})`, transitionDuration: `${transitionSeconds}s` }} />
          </div>
          <div style={MHS.breathPhaseLabel}>{phase.label}</div>
          <div style={MHS.breathTimeLeft}>{Math.floor(totalLeft / 60)}:{String(totalLeft % 60).padStart(2, "0")}</div>
          <button onClick={stop} style={MHS.breathStopBtn}>إيقاف</button>
        </div>
      )}
    </div>
  );
}

export default function MentalHealthView({ setView, showToast }) {
  const [loaded, setLoaded] = useState(false);
  const [log, setLog] = useState({});
  const [fitnessLog, setFitnessLog] = useState({});
  const [mood, setMood] = useState(null);
  const [stress, setStress] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState("");
  const [showCrisis, setShowCrisis] = useState(false);
  const [crisisAcknowledged, setCrisisAcknowledged] = useState(false);
  const today = todayKey();

  useEffect(() => {
    let active = true;
    Promise.all([store.loadMentalHealthLog(), store.loadFitnessLog()]).then(([mh, fl]) => {
      if (!active) return;
      setLog(mh);
      setFitnessLog(fl);
      const t = mh[today];
      if (t) { setMood(t.mood); setStress(t.stress); setEnergy(t.energy); setNote(t.note || ""); }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [today]);

  useEffect(() => {
    if (!note || crisisAcknowledged) return;
    const timer = setTimeout(() => {
      if (detectRisk(note)) setShowCrisis(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [note, crisisAcknowledged]);

  const existing = log[today];

  async function saveEntry() {
    if (!mood || !stress || !energy) { showToast("اختر المزاج والتوتر والطاقة"); return; }
    const flaggedRisk = detectRisk(note);
    if (flaggedRisk && !crisisAcknowledged) { setShowCrisis(true); return; }
    const entry = { mood, stress, energy, note, flaggedRisk };
    setLog((prev) => ({ ...prev, [today]: entry }));
    await store.saveMentalHealthEntry(today, entry);
    showToast("تم حفظ تسجيل اليوم");
  }

  function confirmCrisis() {
    setShowCrisis(false);
    setCrisisAcknowledged(true);
  }

  const recentDates = useMemo(() => {
    const days = [];
    const d = new Date();
    for (let i = 0; i < 14; i++) { days.push(localDayKey(d)); d.setDate(d.getDate() - 1); }
    return days;
  }, [today]);

  const recentEntries = useMemo(
    () => recentDates.map((date) => (log[date] ? { date, ...log[date] } : null)).filter(Boolean),
    [recentDates, log]
  );

  const chartData = useMemo(
    () => recentDates.slice(0, 7).slice().reverse().map((date) => ({
      label: date.slice(5),
      mood: log[date]?.mood ?? null,
      stress: log[date]?.stress ?? null,
      energy: log[date]?.energy ?? null,
    })),
    [recentDates, log]
  );

  const seed = useMemo(() => today.split("-").reduce((a, c) => a + parseInt(c, 10), 0), [today]);
  const suggestions = useMemo(() => {
    // القيم الحيّة المختارة الآن لها الأولوية على آخر تسجيل محفوظ، حتى تعكس
    // الاقتراحات أي تعديل يجريه المستخدم على الاختيارات قبل الحفظ.
    const todayEntry = (mood && stress && energy) ? { mood, stress, energy } : existing || null;
    return computeSuggestions({ todayEntry, recentEntries, seed });
  }, [existing, mood, stress, energy, recentEntries, seed]);

  const insight = useMemo(() => computeMoodFitnessInsight(recentEntries, fitnessLog), [recentEntries, fitnessLog]);

  if (!loaded) return null;

  return (
    <div style={S.view}>
      <div style={MHS.hero}>
        <div style={MHS.heroIcon}><HeartHandshake size={22} color="#0E1613" /></div>
        <div>
          <div style={MHS.heroTitle}>الصحة النفسية</div>
          <div style={MHS.heroSub}>لحظة يومية بسيطة للاطمئنان على نفسك</div>
        </div>
      </div>

      <div style={MHS.trackCard}>
        <div style={MHS.trackLabel}>كيف مزاجك اليوم؟</div>
        <div style={MHS.moodRow}>
          {MOOD_LEVELS.map((m) => {
            const Icon = MOOD_ICONS[m.icon];
            const active = mood === m.value;
            return (
              <button key={m.value} onClick={() => setMood(m.value)} style={{ ...MHS.moodBtn, ...(active ? MHS.moodBtnActive : {}) }}>
                <Icon size={20} />
                <span style={MHS.moodLabel}>{m.label}</span>
              </button>
            );
          })}
        </div>

        <div style={MHS.trackLabel}>مستوى التوتر؟</div>
        <div style={MHS.scaleRow}>
          {STRESS_LEVELS.map((s) => (
            <button key={s.value} onClick={() => setStress(s.value)} style={{ ...MHS.scaleBtn, ...(stress === s.value ? MHS.scaleBtnActive : {}) }}>
              {s.value}<span style={MHS.scaleLabel}>{s.label}</span>
            </button>
          ))}
        </div>

        <div style={MHS.trackLabel}>مستوى الطاقة؟</div>
        <div style={MHS.scaleRow}>
          {ENERGY_LEVELS.map((s) => (
            <button key={s.value} onClick={() => setEnergy(s.value)} style={{ ...MHS.scaleBtn, ...(energy === s.value ? MHS.scaleBtnActive : {}) }}>
              {s.value}<span style={MHS.scaleLabel}>{s.label}</span>
            </button>
          ))}
        </div>

        <div style={MHS.trackLabel}>إيش اللي أثّر عليك اليوم؟ (اختياري)</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="اكتب هنا إذا حاب..."
          rows={2}
          style={MHS.noteInput}
        />
        <button onClick={saveEntry} style={MHS.saveBtn}>{existing ? "تحديث تسجيل اليوم" : "حفظ تسجيل اليوم"}</button>
      </div>

      <div className="stagger-in">
        {suggestions.map((s, i) => (
          <div key={i} style={MHS.suggestionCard}>
            <div style={MHS.suggestionText}>{s.text}</div>
            <button onClick={() => setView(s.targetView)} style={MHS.suggestionBtn}>{s.actionLabel}</button>
          </div>
        ))}
      </div>

      <BreathingExercise />

      <div style={MHS.chartCard}>
        <div style={MHS.chartTitle}>نمطك خلال آخر 7 أيام</div>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--surface-raised)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} />
            <Line type="monotone" dataKey="mood" name="المزاج" stroke="#5FA8A0" strokeWidth={2} dot={{ fill: "#5FA8A0", r: 3 }} connectNulls />
            <Line type="monotone" dataKey="stress" name="التوتر" stroke="#D17B5F" strokeWidth={2} dot={{ fill: "#D17B5F", r: 3 }} connectNulls />
            <Line type="monotone" dataKey="energy" name="الطاقة" stroke="#7FAEEE" strokeWidth={2} dot={{ fill: "#7FAEEE", r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
        <div style={MHS.chartLegendRow}>
          <span style={MHS.legendItem}><span style={{ ...MHS.legendDot, background: "#5FA8A0" }} /> المزاج</span>
          <span style={MHS.legendItem}><span style={{ ...MHS.legendDot, background: "#D17B5F" }} /> التوتر</span>
          <span style={MHS.legendItem}><span style={{ ...MHS.legendDot, background: "#7FAEEE" }} /> الطاقة</span>
        </div>
        {insight ? (
          <div style={MHS.insightBox}>{insight}</div>
        ) : recentEntries.length < 4 ? (
          <div style={S.emptyHint}>سجّل بضعة أيام أخرى لتظهر لك ملاحظات حول نمطك</div>
        ) : null}
      </div>

      <div style={MHS.disclaimerCard}>
        <AlertTriangle size={14} color="var(--muted2)" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{MENTAL_HEALTH_DISCLAIMER}</span>
      </div>

      {showCrisis && <CrisisModal onConfirm={confirmCrisis} />}
    </div>
  );
}
