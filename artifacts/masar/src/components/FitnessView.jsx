import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Dumbbell, PersonStanding, Footprints, HeartPulse, Bike, Wind, Flame,
  AlertTriangle, Edit3, Check, ExternalLink, Repeat, TrendingUp, X,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { store, getOwner } from "../lib/store";
import { todayKey, uid } from "../lib/helpers";
import { localDayKey } from "../lib/tips";
import {
  FITNESS_GOALS, EQUIPMENT_ENVIRONMENTS, EXPERIENCE_LEVELS, SESSION_DURATIONS,
  INJURY_AREAS, youtubeSearchUrl,
} from "../lib/exercises-db";
import { buildProgram, pickAlternative, suggestProgression, seedFromOwner } from "../lib/fitness-engine";
import { NO_CONDITION } from "../lib/health";
import { S } from "./styles";

const ICONS = { Dumbbell, PersonStanding, Footprints, HeartPulse, Bike, Wind, Flame };

const FS = {
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #5FA8A0, #3E7E78)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },
  formCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 16 },
  noteText: { fontSize: 11.5, color: "var(--muted2)", lineHeight: 1.6, marginBottom: 8 },
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
  toolsRow: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  toolBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "var(--gold)", borderRadius: 12, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  rotationSelect: { background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: "var(--ink)", fontFamily: "inherit" },
  dayCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 12px", marginBottom: 10 },
  dayCardHead: { fontSize: 14, fontWeight: 700, color: "var(--gold)", marginBottom: 8 },
  exerciseRow: { padding: "9px 0", borderBottom: "1px solid var(--line)" },
  exerciseTop: { display: "flex", alignItems: "center", gap: 10 },
  exerciseIcon: { width: 32, height: 32, borderRadius: 10, background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)", flexShrink: 0 },
  exerciseName: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  exerciseMeta: { fontSize: 11.5, color: "var(--muted2)", marginTop: 2 },
  exerciseDesc: { fontSize: 11.5, color: "var(--muted2)", marginTop: 3, lineHeight: 1.6 },
  actionsRow: { display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" },
  smallBtn: { display: "flex", alignItems: "center", gap: 4, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "var(--gold)", borderRadius: 10, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", textDecoration: "none", flexShrink: 0 },
  progressionBadge: { display: "flex", alignItems: "center", gap: 4, background: "rgba(95,168,160,0.12)", color: "#5FA8A0", border: "1px solid rgba(95,168,160,0.35)", borderRadius: 10, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, marginTop: 8 },
  logForm: { marginTop: 8, background: "var(--surface-sunken)", borderRadius: 10, padding: "10px 10px" },
  logRow: { display: "flex", gap: 6, marginTop: 6 },
  logInput: { flex: 1, background: "var(--panel)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 10px", color: "var(--ink)", fontSize: 13, fontFamily: "inherit", minWidth: 0 },
};

function ExerciseRow({ exercise, isEn, isLogging, onToggleLog, logWeight, setLogWeight, logReps, setLogReps, logSets, setLogSets, onSubmitPerformance, onSwap, progression, t }) {
  const Icon = ICONS[exercise.icon] || Dumbbell;
  return (
    <div style={FS.exerciseRow}>
      <div style={FS.exerciseTop}>
        <div style={FS.exerciseIcon}><Icon size={16} /></div>
        <div style={{ flex: 1 }}>
          <div style={FS.exerciseName}>{isEn ? (exercise.nameEn || exercise.name) : exercise.name}</div>
          <div style={FS.exerciseMeta}>{t("fitness.setsReps", { sets: exercise.sets, reps: exercise.reps })} · {t("fitness.restLabel", { sec: exercise.restSeconds })}</div>
          <div style={FS.exerciseMeta}>{t("fitness.targetMuscle")}: {t(`fitness.muscleGroups.${exercise.muscle}`)}</div>
          <div style={FS.exerciseDesc}>{isEn ? (exercise.descriptionEn || exercise.description) : exercise.description}</div>
        </div>
      </div>
      <div style={FS.actionsRow}>
        <a href={youtubeSearchUrl(exercise, isEn ? "en" : "ar")} target="_blank" rel="noopener noreferrer" style={FS.smallBtn}>
          <ExternalLink size={12} /> {t("fitness.watchTutorial")}
        </a>
        <button onClick={onSwap} style={{ ...FS.smallBtn, border: "1px solid var(--border2)", background: "transparent", color: "var(--muted2)" }}>
          <Repeat size={12} /> {t("fitness.alternativeBtn")}
        </button>
        <button onClick={onToggleLog} style={FS.smallBtn}>
          <TrendingUp size={12} /> {t("fitness.logPerformance")}
        </button>
      </div>
      {progression && (
        <div style={FS.progressionBadge}>
          <TrendingUp size={13} />
          {progression.type === "weight"
            ? t("fitness.progressionWeight", { weight: progression.suggestedWeight })
            : t("fitness.progressionReps", { reps: progression.suggestedReps })}
        </div>
      )}
      {isLogging && (
        <div style={FS.logForm}>
          <label style={{ ...S.label, marginTop: 0 }}>{t("fitness.weightKg")}</label>
          <input type="number" step="0.5" inputMode="decimal" value={logWeight} onChange={(e) => setLogWeight(e.target.value)} placeholder="0" style={{ ...S.input, marginTop: 4 }} />
          <div style={FS.logRow}>
            <div style={{ flex: 1 }}>
              <label style={{ ...S.label, marginTop: 6 }}>{t("fitness.repsCompleted")}</label>
              <input type="number" inputMode="numeric" value={logReps} onChange={(e) => setLogReps(e.target.value)} style={{ ...S.input, marginTop: 4 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ ...S.label, marginTop: 6 }}>{t("fitness.setsCompleted")}</label>
              <input type="number" inputMode="numeric" value={logSets} onChange={(e) => setLogSets(e.target.value)} style={{ ...S.input, marginTop: 4 }} />
            </div>
          </div>
          <button onClick={onSubmitPerformance} style={{ ...S.saveBtn, marginTop: 10 }}>{t("fitness.savePerformance")}</button>
        </div>
      )}
    </div>
  );
}

export default function FitnessView({ healthProfile, showToast }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [loaded, setLoaded] = useState(false);
  const [fitnessProfile, setFitnessProfile] = useState({ goal: null, equipment: null, daysPerWeek: null, experience: null, sessionMinutes: null, injuries: [] });
  const [fitnessLog, setFitnessLog] = useState({});
  const [programEntry, setProgramEntry] = useState(null);
  const [workoutLog, setWorkoutLog] = useState([]);
  const [draft, setDraft] = useState({ goal: null, equipment: null, daysPerWeek: 3, experience: null, sessionMinutes: 45, injuries: [] });
  const [loggingKey, setLoggingKey] = useState(null);
  const [logWeight, setLogWeight] = useState("");
  const [logReps, setLogReps] = useState("");
  const [logSets, setLogSets] = useState("");

  const today = todayKey();

  useEffect(() => {
    let active = true;
    (async () => {
      const [fp, fl, wp, wl] = await Promise.all([
        store.loadFitnessProfile(), store.loadFitnessLog(), store.loadWorkoutProgram(), store.loadWorkoutLog(),
      ]);
      if (!active) return;
      setFitnessProfile(fp);
      setFitnessLog(fl);
      setWorkoutLog(wl);
      setDraft({
        goal: fp.goal || null, equipment: fp.equipment || null, daysPerWeek: fp.daysPerWeek || 3,
        experience: fp.experience || null, sessionMinutes: fp.sessionMinutes || 45, injuries: fp.injuries || [],
      });

      const hasFullProfile = !!(fp.goal && fp.equipment && fp.daysPerWeek && fp.experience && fp.sessionMinutes);
      let entry = wp;
      if (hasFullProfile && !entry) {
        const seed = seedFromOwner(getOwner());
        entry = { program: buildProgram(fp, seed), seed, weekRotationEnabled: false, rotationFrequency: null, lastRotatedAt: null };
        await store.saveWorkoutProgram(entry);
      } else if (hasFullProfile && entry && entry.weekRotationEnabled) {
        const msPerWeek = 7 * 24 * 3600 * 1000;
        const interval = entry.rotationFrequency === "biweekly" ? msPerWeek * 2 : msPerWeek;
        const last = entry.lastRotatedAt ? new Date(entry.lastRotatedAt).getTime() : 0;
        if (Date.now() - last >= interval) {
          const weekIndex = Math.floor(Date.now() / interval);
          const seed = (seedFromOwner(getOwner()) + weekIndex) >>> 0;
          entry = { ...entry, program: buildProgram(fp, seed), seed, lastRotatedAt: new Date().toISOString() };
          await store.saveWorkoutProgram(entry);
        }
      }
      setProgramEntry(entry);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, []);

  const hasProfile = !!(fitnessProfile.goal && fitnessProfile.equipment && fitnessProfile.daysPerWeek && fitnessProfile.experience && fitnessProfile.sessionMinutes);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (loaded && !hasProfile) setEditing(true); }, [loaded, hasProfile]);

  const weekCompletedCount = useMemo(() => {
    const days = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) { days.push(localDayKey(d)); d.setDate(d.getDate() - 1); }
    return days.filter((day) => fitnessLog[day]).length;
  }, [fitnessLog]);

  const todayDone = !!fitnessLog[today];
  const showConditionDisclaimer = (healthProfile?.conditions || []).some((c) => c !== NO_CONDITION);
  const showInjuryDisclaimer = (fitnessProfile.injuries || []).length > 0;

  const progressChartData = useMemo(() => {
    if (workoutLog.length === 0) return [];
    const weeks = {};
    for (const log of workoutLog) {
      const d = new Date(`${log.date}T00:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      const weekIndex = Math.floor(d.getTime() / (7 * 24 * 3600 * 1000));
      const vol = (log.weight || 1) * (log.reps || 0) * (log.setsCompleted || 0);
      weeks[weekIndex] = (weeks[weekIndex] || 0) + vol;
    }
    return Object.entries(weeks).sort((a, b) => Number(a[0]) - Number(b[0])).slice(-8)
      .map(([, vol], i) => ({ label: String(i + 1), volume: Math.round(vol) }));
  }, [workoutLog]);

  function toggleInjury(key) {
    setDraft((d) => ({ ...d, injuries: d.injuries.includes(key) ? d.injuries.filter((x) => x !== key) : [...d.injuries, key] }));
  }

  async function saveProfile() {
    if (!draft.goal || !draft.equipment || !draft.daysPerWeek || !draft.experience || !draft.sessionMinutes) {
      showToast(t("fitness.completeGoalFirst"));
      return;
    }
    const prevProfile = fitnessProfile;
    setFitnessProfile(draft);
    const res = await store.saveFitnessProfile(draft);
    if (!res.ok) { setFitnessProfile(prevProfile); showToast(t("fitness.planSaveFailed")); return; }

    const seed = Math.floor(Math.random() * 2 ** 31);
    const entry = {
      program: buildProgram(draft, seed), seed,
      weekRotationEnabled: programEntry?.weekRotationEnabled || false,
      rotationFrequency: programEntry?.rotationFrequency || null,
      lastRotatedAt: new Date().toISOString(),
    };
    const progRes = await store.saveWorkoutProgram(entry);
    if (!progRes.ok) { showToast(t("fitness.programSaveFailed")); return; }
    setProgramEntry(entry);
    setEditing(false);
    showToast(t("fitness.planSaved"));
  }

  async function varyProgram() {
    if (!programEntry) return;
    const prevEntry = programEntry;
    const seed = Math.floor(Math.random() * 2 ** 31);
    const entry = { ...programEntry, program: buildProgram(fitnessProfile, seed), seed };
    setProgramEntry(entry);
    const res = await store.saveWorkoutProgram(entry);
    if (!res.ok) { setProgramEntry(prevEntry); showToast(t("common.errors.saveFailed")); return; }
    showToast(t("fitness.varyProgramApplied"));
  }

  async function setRotation(frequency) {
    if (!programEntry) return;
    const prevEntry = programEntry;
    const entry = {
      ...programEntry, weekRotationEnabled: !!frequency, rotationFrequency: frequency || null,
      lastRotatedAt: frequency ? (programEntry.lastRotatedAt || new Date().toISOString()) : null,
    };
    setProgramEntry(entry);
    const res = await store.saveWorkoutProgram(entry);
    if (!res.ok) { setProgramEntry(prevEntry); showToast(t("common.errors.saveFailed")); }
  }

  async function swapExercise(dayIndex, exIndex) {
    if (!programEntry) return;
    const exercise = programEntry.program.days[dayIndex].exercises[exIndex];
    const usedIds = programEntry.program.days.flatMap((d) => d.exercises.map((e) => e.id));
    const alt = pickAlternative(exercise, fitnessProfile, usedIds);
    if (!alt) { showToast(t("fitness.alternativeNotFound")); return; }
    const prevEntry = programEntry;
    const newExercise = { ...alt, sets: exercise.sets, reps: exercise.reps, restSeconds: exercise.restSeconds };
    const newDays = programEntry.program.days.map((d, di) => (di !== dayIndex ? d : { ...d, exercises: d.exercises.map((e, ei) => (ei !== exIndex ? e : newExercise)) }));
    const entry = { ...programEntry, program: { ...programEntry.program, days: newDays } };
    setProgramEntry(entry);
    const res = await store.saveWorkoutProgram(entry);
    if (!res.ok) { setProgramEntry(prevEntry); showToast(t("common.errors.saveFailed")); return; }
    showToast(t("fitness.alternativeApplied"));
  }

  async function submitPerformance(exercise) {
    const reps = parseInt(logReps, 10);
    const sets = parseInt(logSets, 10);
    const weight = logWeight.trim() !== "" ? parseFloat(logWeight) : null;
    if (!Number.isFinite(reps) || reps <= 0 || !Number.isFinite(sets) || sets <= 0) {
      showToast(t("fitness.invalidPerformance"));
      return;
    }
    const entry = { id: uid(), date: localDayKey(), exerciseId: exercise.id, weight, reps, setsCompleted: sets };
    setWorkoutLog((prev) => [...prev, entry]);
    const res = await store.addWorkoutLogEntry(entry);
    if (!res.ok) {
      setWorkoutLog((prev) => prev.filter((x) => x.id !== entry.id));
      showToast(t("fitness.performanceSaveFailed"));
      return;
    }
    setLoggingKey(null); setLogWeight(""); setLogReps(""); setLogSets("");
    showToast(t("fitness.performanceSaved"));
  }

  async function toggleTodayDone() {
    const next = !todayDone;
    setFitnessLog((prev) => ({ ...prev, [today]: next }));
    const res = await store.saveFitnessDayCompleted(today, next);
    if (!res.ok) { setFitnessLog((prev) => ({ ...prev, [today]: !next })); showToast(t("fitness.logSaveFailed")); return; }
    if (next) showToast(t("fitness.workoutLogged"));
  }

  if (editing || !hasProfile) {
    return (
      <div style={S.view}>
        <div style={FS.hero}>
          <div style={FS.heroIcon}><Dumbbell size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={FS.heroTitle}>{t("fitness.heroTitleSetup")}</div>
            <div style={FS.heroSub}>{t("fitness.heroSubSetup")}</div>
          </div>
        </div>
        <div style={FS.formCard}>
          <p style={FS.noteText}>{t("fitness.yourAssessmentNote")}</p>
          <label style={S.label}>{t("fitness.goal")}</label>
          <div style={FS.chipRow}>
            {FITNESS_GOALS.map((g) => (
              <button key={g.key} onClick={() => setDraft((d) => ({ ...d, goal: g.key }))} style={{ ...FS.chip, ...(draft.goal === g.key ? FS.chipActive : {}) }}>{t(`fitness.goals.${g.key}`)}</button>
            ))}
          </div>
          <label style={S.label}>{t("fitness.experienceLabel")}</label>
          <div style={FS.chipRow}>
            {EXPERIENCE_LEVELS.map((lvl) => (
              <button key={lvl.key} onClick={() => setDraft((d) => ({ ...d, experience: lvl.key }))} style={{ ...FS.chip, ...(draft.experience === lvl.key ? FS.chipActive : {}) }}>{t(`fitness.experienceLevels.${lvl.key}`)}</button>
            ))}
          </div>
          <label style={S.label}>{t("fitness.daysPerWeek")}</label>
          <div style={FS.daysRow}>
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} onClick={() => setDraft((d) => ({ ...d, daysPerWeek: n }))} style={{ ...FS.dayChip, ...(draft.daysPerWeek === n ? FS.dayChipActive : {}) }}>{n}</button>
            ))}
          </div>
          <label style={S.label}>{t("fitness.sessionMinutesLabel")}</label>
          <div style={FS.daysRow}>
            {SESSION_DURATIONS.map((m) => (
              <button key={m} onClick={() => setDraft((d) => ({ ...d, sessionMinutes: m }))} style={{ ...FS.dayChip, ...(draft.sessionMinutes === m ? FS.dayChipActive : {}) }}>{t("fitness.minutesShort", { n: m })}</button>
            ))}
          </div>
          <label style={S.label}>{t("fitness.availableEquipment")}</label>
          <div style={FS.chipRow}>
            {EQUIPMENT_ENVIRONMENTS.map((eq) => (
              <button key={eq.key} onClick={() => setDraft((d) => ({ ...d, equipment: eq.key }))} style={{ ...FS.chip, ...(draft.equipment === eq.key ? FS.chipActive : {}) }}>{t(`fitness.equipmentLevels.${eq.key}`)}</button>
            ))}
          </div>
          <label style={S.label}>{t("fitness.injuriesLabel")}</label>
          <div style={FS.chipRow}>
            {INJURY_AREAS.map((inj) => (
              <button key={inj.key} onClick={() => toggleInjury(inj.key)} style={{ ...FS.chip, ...(draft.injuries.includes(inj.key) ? FS.chipActive : {}) }}>{t(`fitness.injuryAreas.${inj.key}`)}</button>
            ))}
          </div>
          <button onClick={saveProfile} style={S.saveBtn}>{t("fitness.saveAndCreate")}</button>
          {hasProfile && (
            <button onClick={() => setEditing(false)} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>{t("common.buttons.back")}</button>
          )}
        </div>
      </div>
    );
  }

  const goalLabel = fitnessProfile.goal ? t(`fitness.goals.${fitnessProfile.goal}`) : "—";
  const equipmentLabel = fitnessProfile.equipment ? t(`fitness.equipmentLevels.${fitnessProfile.equipment}`) : "—";

  return (
    <div style={S.view}>
      <div style={FS.hero}>
        <div style={FS.heroIcon}><Dumbbell size={22} color="var(--on-accent)" /></div>
        <div>
          <div style={FS.heroTitle}>{t("fitness.heroTitle")}</div>
          <div style={FS.heroSub}>{t("fitness.heroSub")}</div>
        </div>
      </div>

      {showConditionDisclaimer && (
        <div style={FS.warningCard}>
          <AlertTriangle size={20} color="#D17B5F" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={FS.warningText}>{t("fitness.conditionWarning")}</p>
        </div>
      )}
      {showInjuryDisclaimer && (
        <div style={FS.warningCard}>
          <AlertTriangle size={20} color="#D17B5F" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={FS.warningText}>{t("fitness.injuryDisclaimer")}</p>
        </div>
      )}

      <div style={FS.summaryCard}>
        <div>
          <div style={FS.summaryLabel}>{t("fitness.yourProgram")}</div>
          <div style={FS.summaryValue}>{t("fitness.programSummary", { goal: goalLabel, equipment: equipmentLabel, days: fitnessProfile.daysPerWeek })}</div>
        </div>
        <button onClick={() => setEditing(true)} style={{ ...S.exportBtn, width: "auto", padding: "9px 14px", marginBottom: 0 }}><Edit3 size={14} /> {t("fitness.editProgram")}</button>
      </div>

      <div style={FS.toolsRow}>
        <button onClick={varyProgram} style={FS.toolBtn}><Repeat size={14} /> {t("fitness.varyProgram")}</button>
        <select
          value={programEntry?.weekRotationEnabled ? (programEntry.rotationFrequency || "weekly") : ""}
          onChange={(e) => setRotation(e.target.value || null)}
          style={FS.rotationSelect}
        >
          <option value="">{t("fitness.rotationOff")}</option>
          <option value="weekly">{t("fitness.rotationFrequency")} {t("fitness.rotationWeekly")}</option>
          <option value="biweekly">{t("fitness.rotationFrequency")} {t("fitness.rotationBiweekly")}</option>
        </select>
      </div>

      <div style={FS.weekProgressCard}>
        <div style={FS.weekProgressHead}>
          <span style={FS.weekProgressTitle}>{t("fitness.daysCompletedThisWeek")}</span>
          <span style={FS.weekProgressValue}>{`${weekCompletedCount} / ${fitnessProfile.daysPerWeek}`}</span>
        </div>
        <div style={FS.barTrack}><div style={{ ...FS.barFill, width: `${Math.min(100, Math.round((weekCompletedCount / fitnessProfile.daysPerWeek) * 100))}%` }} /></div>
        <button onClick={toggleTodayDone} style={{ ...FS.todayDoneBtn, ...(todayDone ? FS.todayDoneBtnOn : FS.todayDoneBtnOff) }}>
          {todayDone ? <><Check size={16} /> {t("fitness.completedTodayCheck")}</> : t("fitness.markDoneToday")}
        </button>
      </div>

      {progressChartData.length > 0 && (
        <div style={S.chartCard}>
          <div style={S.chartTitle}>{t("fitness.progressChartTitle")}</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={progressChartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} />
              <Bar dataKey="volume" fill="#5FA8A0" radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {progressChartData.length === 0 && <div style={S.emptyHint}>{t("fitness.noProgressYet")}</div>}

      <div className="stagger-in responsive-card-list">
        {programEntry?.program.days.map((day) => (
          <div key={day.dayIndex} style={FS.dayCard}>
            <div style={FS.dayCardHead}>{t("fitness.dayLabel", { n: day.dayIndex + 1, dayLabel: t(`fitness.dayTypes.${day.dayType}`) })}</div>
            {day.exercises.map((ex, exIndex) => {
              const key = `${day.dayIndex}-${exIndex}`;
              const progression = suggestProgression(ex, workoutLog.filter((l) => l.exerciseId === ex.id));
              return (
                <ExerciseRow
                  key={`${key}-${ex.id}`}
                  exercise={ex}
                  isEn={isEn}
                  isLogging={loggingKey === key}
                  onToggleLog={() => setLoggingKey(loggingKey === key ? null : key)}
                  logWeight={logWeight} setLogWeight={setLogWeight}
                  logReps={logReps} setLogReps={setLogReps}
                  logSets={logSets} setLogSets={setLogSets}
                  onSubmitPerformance={() => submitPerformance(ex)}
                  onSwap={() => swapExercise(day.dayIndex, exIndex)}
                  progression={progression}
                  t={t}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
