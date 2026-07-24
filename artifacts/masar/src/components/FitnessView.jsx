import React, { useState, useEffect, useMemo } from "react";
import {
  Dumbbell, PersonStanding, Footprints, HeartPulse, Bike, Wind, Flame,
  AlertTriangle, Edit3, Check, ExternalLink,
} from "lucide-react";
import { store } from "../lib/store";
import { todayKey } from "../lib/helpers";
import { localDayKey } from "../lib/tips";
import { FITNESS_GOALS, EQUIPMENT_LEVELS, generateFitnessPlan, youtubeSearchUrl } from "../lib/exercises";
import { NO_CONDITION } from "../lib/health";
import { S } from "./styles";

const ICONS = { Dumbbell, PersonStanding, Footprints, HeartPulse, Bike, Wind, Flame };

const FS = {
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #5FA8A0, #3E7E78)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },
  formCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 16 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6, marginBottom: 4 },
  chip: { border: "1px solid var(--border2)", borderRadius: 20, padding: "8px 14px", fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", background: "transparent" },
  chipActive: { borderColor: "var(--gold)", background: "rgba(201,162,75,0.12)", color: "var(--gold)", fontWeight: 700 },
  daysRow: { display: "flex", gap: 6, marginTop: 6, marginBottom: 4 },
  dayChip: { flex: 1, border: "1px solid var(--border2)", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", background: "transparent", textAlign: "center" },
  dayChipActive: { borderColor: "var(--gold)", background: "rgba(201,162,75,0.12)", color: "var(--gold)" },
  warningCard: { display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(209,123,95,0.1)", border: "1.5px solid rgba(209,123,95,0.4)", borderRadius: 14, padding: "14px 12px", marginBottom: 16 },
  warningText: { fontSize: 13, color: "var(--ink)", lineHeight: 1.8, fontWeight: 600, margin: 0 },
  summaryCard: { background: "linear-gradient(160deg, var(--warm-tint), var(--panel))", border: "1px solid var(--warm-border)", borderRadius: 14, padding: "14px 12px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  summaryLabel: { fontSize: 12.5, color: "var(--muted2)" },
  summaryValue: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  weekProgressCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 16 },
  weekProgressHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  weekProgressTitle: { fontSize: 13, fontWeight: 700, color: "var(--muted2)" },
  weekProgressValue: { fontSize: 13, fontWeight: 700, color: "var(--gold)", direction: "ltr" },
  barTrack: { height: 8, borderRadius: 4, background: "var(--surface-sunken)", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #5FA8A0, #C9A24B)", transition: "width 0.4s ease" },
  todayDoneBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 12 },
  todayDoneBtnOff: { background: "var(--gold)", color: "var(--bg)" },
  todayDoneBtnOn: { background: "rgba(95,168,160,0.14)", color: "#5FA8A0", border: "1px solid rgba(95,168,160,0.4)" },
  dayCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 12px", marginBottom: 10 },
  dayCardHead: { fontSize: 14, fontWeight: 700, color: "var(--gold)", marginBottom: 8 },
  exerciseRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--line)" },
  exerciseIcon: { width: 32, height: 32, borderRadius: 10, background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)", flexShrink: 0 },
  exerciseName: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  exerciseMeta: { fontSize: 11.5, color: "var(--muted2)", marginTop: 2 },
  exerciseDesc: { fontSize: 11.5, color: "var(--muted2)", marginTop: 3, lineHeight: 1.6 },
  watchBtn: { display: "flex", alignItems: "center", gap: 4, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "var(--gold)", borderRadius: 10, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", textDecoration: "none", flexShrink: 0 },
};

function ExerciseRow({ exercise }) {
  const Icon = ICONS[exercise.icon] || Dumbbell;
  return (
    <div style={FS.exerciseRow}>
      <div style={FS.exerciseIcon}><Icon size={16} /></div>
      <div style={{ flex: 1 }}>
        <div style={FS.exerciseName}>{exercise.name}</div>
        <div style={FS.exerciseMeta}>{exercise.sets} مجموعات × {exercise.reps}</div>
        <div style={FS.exerciseDesc}>{exercise.description}</div>
      </div>
      <a href={youtubeSearchUrl(exercise)} target="_blank" rel="noopener noreferrer" style={FS.watchBtn}>
        <ExternalLink size={12} /> شاهد الشرح
      </a>
    </div>
  );
}

export default function FitnessView({ healthProfile, showToast }) {
  const [loaded, setLoaded] = useState(false);
  const [fitnessProfile, setFitnessProfile] = useState({ goal: null, equipment: null, daysPerWeek: null });
  const [fitnessLog, setFitnessLog] = useState({});
  const [draft, setDraft] = useState({ goal: null, equipment: null, daysPerWeek: 3 });

  const today = todayKey();

  useEffect(() => {
    let active = true;
    Promise.all([store.loadFitnessProfile(), store.loadFitnessLog()]).then(([fp, fl]) => {
      if (!active) return;
      setFitnessProfile(fp);
      setFitnessLog(fl);
      setDraft({ goal: fp.goal || null, equipment: fp.equipment || null, daysPerWeek: fp.daysPerWeek || 3 });
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const hasProfile = !!(fitnessProfile.goal && fitnessProfile.equipment && fitnessProfile.daysPerWeek);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (loaded && !hasProfile) setEditing(true); }, [loaded, hasProfile]);

  const plan = useMemo(() => {
    if (!hasProfile) return [];
    return generateFitnessPlan(fitnessProfile);
  }, [hasProfile, fitnessProfile]);

  // نافذة آخر 7 أيام (بالتاريخ المحلي) — نفس نمط "إنجازك هذا الأسبوع" في
  // قسم الصلاة، بلا حاجة لمفهوم "بداية أسبوع" جديد في التطبيق.
  const weekCompletedCount = useMemo(() => {
    const days = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) { days.push(localDayKey(d)); d.setDate(d.getDate() - 1); }
    return days.filter((day) => fitnessLog[day]).length;
  }, [fitnessLog]);

  const todayDone = !!fitnessLog[today];
  const showDisclaimer = (healthProfile?.conditions || []).some((c) => c !== NO_CONDITION);

  async function saveProfile() {
    if (!draft.goal || !draft.equipment || !draft.daysPerWeek) {
      showToast("أكمل الهدف والمعدات وعدد الأيام");
      return;
    }
    const prevProfile = fitnessProfile;
    setFitnessProfile(draft);
    const res = await store.saveFitnessProfile(draft);
    if (!res.ok) { setFitnessProfile(prevProfile); showToast("تعذّر حفظ برنامجك، حاول مرة أخرى"); return; }
    setEditing(false);
    showToast("تم حفظ برنامجك");
  }

  async function toggleTodayDone() {
    const next = !todayDone;
    setFitnessLog((prev) => ({ ...prev, [today]: next }));
    const res = await store.saveFitnessDayCompleted(today, next);
    if (!res.ok) { setFitnessLog((prev) => ({ ...prev, [today]: !next })); showToast("تعذّر حفظ التمرين، حاول مرة أخرى"); return; }
    if (next) showToast("أحسنت! تم تسجيل تمرين اليوم");
  }

  if (editing || !hasProfile) {
    return (
      <div style={S.view}>
        <div style={FS.hero}>
          <div style={FS.heroIcon}><Dumbbell size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={FS.heroTitle}>الرياضة</div>
            <div style={FS.heroSub}>برنامج أسبوعي عام حسب هدفك ومعداتك — ليس برنامجاً طبياً مخصصاً.</div>
          </div>
        </div>
        <div style={FS.formCard}>
          <label style={S.label}>الهدف</label>
          <div style={FS.chipRow}>
            {FITNESS_GOALS.map((g) => (
              <button key={g.key} onClick={() => setDraft((d) => ({ ...d, goal: g.key }))} style={{ ...FS.chip, ...(draft.goal === g.key ? FS.chipActive : {}) }}>{g.label}</button>
            ))}
          </div>
          <label style={S.label}>المعدات المتاحة</label>
          <div style={FS.chipRow}>
            {EQUIPMENT_LEVELS.map((eq) => (
              <button key={eq.key} onClick={() => setDraft((d) => ({ ...d, equipment: eq.key }))} style={{ ...FS.chip, ...(draft.equipment === eq.key ? FS.chipActive : {}) }}>{eq.label}</button>
            ))}
          </div>
          <label style={S.label}>أيام التمرين بالأسبوع</label>
          <div style={FS.daysRow}>
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} onClick={() => setDraft((d) => ({ ...d, daysPerWeek: n }))} style={{ ...FS.dayChip, ...(draft.daysPerWeek === n ? FS.dayChipActive : {}) }}>{n}</button>
            ))}
          </div>
          <button onClick={saveProfile} style={S.saveBtn}>احفظ وأنشئ برنامجي</button>
          {hasProfile && (
            <button onClick={() => setEditing(false)} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>رجوع</button>
          )}
        </div>
      </div>
    );
  }

  const goalLabel = FITNESS_GOALS.find((g) => g.key === fitnessProfile.goal)?.label || "—";
  const equipmentLabel = EQUIPMENT_LEVELS.find((e) => e.key === fitnessProfile.equipment)?.label || "—";

  return (
    <div style={S.view}>
      <div style={FS.hero}>
        <div style={FS.heroIcon}><Dumbbell size={22} color="var(--on-accent)" /></div>
        <div>
          <div style={FS.heroTitle}>الرياضة</div>
          <div style={FS.heroSub}>برنامجك الأسبوعي.</div>
        </div>
      </div>

      {showDisclaimer && (
        <div style={FS.warningCard}>
          <AlertTriangle size={20} color="#D17B5F" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={FS.warningText}>لديك حالة صحية مسجّلة. يُرجى استشارة طبيبك قبل البدء ببرنامج رياضي، خاصة إذا كانت الحالة تتعلق بالقلب أو المفاصل أو الضغط.</p>
        </div>
      )}

      <div style={FS.summaryCard}>
        <div>
          <div style={FS.summaryLabel}>برنامجك</div>
          <div style={FS.summaryValue}>{goalLabel} · {equipmentLabel} · {fitnessProfile.daysPerWeek} أيام/أسبوع</div>
        </div>
        <button onClick={() => setEditing(true)} style={{ ...S.exportBtn, width: "auto", padding: "9px 14px", marginBottom: 0 }}><Edit3 size={14} /> تعديل برنامجي</button>
      </div>

      <div style={FS.weekProgressCard}>
        <div style={FS.weekProgressHead}>
          <span style={FS.weekProgressTitle}>أيام مكتملة هذا الأسبوع</span>
          <span style={FS.weekProgressValue}>{`${weekCompletedCount} / ${fitnessProfile.daysPerWeek}`}</span>
        </div>
        <div style={FS.barTrack}><div style={{ ...FS.barFill, width: `${Math.min(100, Math.round((weekCompletedCount / fitnessProfile.daysPerWeek) * 100))}%` }} /></div>
        <button onClick={toggleTodayDone} style={{ ...FS.todayDoneBtn, ...(todayDone ? FS.todayDoneBtnOn : FS.todayDoneBtnOff) }}>
          {todayDone ? <><Check size={16} /> أكملت تمريناً اليوم</> : "✓ تم تمرين اليوم"}
        </button>
      </div>

      <div className="stagger-in responsive-card-list">
        {plan.map((day) => (
          <div key={day.dayIndex} style={FS.dayCard}>
            <div style={FS.dayCardHead}>اليوم {day.dayIndex + 1} · {day.dayLabel}</div>
            {day.exercises.map((ex) => <ExerciseRow key={ex.id} exercise={ex} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
