import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Dumbbell, PersonStanding, Footprints, HeartPulse, Bike, Wind, Flame, Settings2, StretchHorizontal,
  AlertTriangle, Edit3, Check, Repeat, TrendingUp, X, ChevronLeft, ChevronRight,
  Circle, Play, SkipForward, PartyPopper, Trophy, Clock, ListChecks, Share2, BarChart3, Youtube,
  FileText, Camera, Sparkles, LayoutGrid,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { store, getOwner } from "../lib/store";
import { todayKey, uid } from "../lib/helpers";
import { localDayKey } from "../lib/tips";
import {
  FITNESS_GOALS, EQUIPMENT_ENVIRONMENTS, EXPERIENCE_LEVELS, SESSION_DURATIONS,
  INJURY_AREAS, GEAR_TYPES, MOVEMENT_PATTERNS, EXERCISES_BY_ID,
} from "../lib/exercises-db";
import {
  buildProgram, pickAlternative, suggestProgression, seedFromOwner, estimateOneRepMax,
  getLastPerformance, computeSessionVolumeByMuscle, estimateSessionCalories, mostRecentLoggedDate,
  aggregateLogsByDate,
} from "../lib/fitness-engine";
import { NO_CONDITION } from "../lib/health";
import { playRestEndSound, primeAudioContext } from "../lib/sound";
import { shareAchievementCard } from "../lib/achievementShare";
import MuscleDiagram from "./MuscleDiagram";
import { S } from "./styles";

const ICONS = { Dumbbell, PersonStanding, Footprints, HeartPulse, Bike, Wind, Flame, Settings2, StretchHorizontal };
const DIFFICULTY_ORDER = ["beginner", "intermediate", "advanced"];


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
  exerciseRow: { padding: "10px 0", borderBottom: "1px solid var(--line)" },
  exerciseTop: { display: "flex", alignItems: "flex-start", gap: 10 },
  diagramWrap: { width: 40, borderRadius: 10, background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: "5px 0" },
  genericIconWrap: { width: 40, height: 40, borderRadius: 10, background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)", flexShrink: 0 },
  exerciseName: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  exerciseMeta: { fontSize: 11.5, color: "var(--muted2)", marginTop: 2 },
  badgeRow: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 },
  badge: { display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: "3px 8px", background: "var(--surface-sunken)", color: "var(--muted2)", border: "1px solid var(--border2)" },
  typeBadgeCompound: { background: "rgba(201,162,75,0.12)", color: "var(--gold)", border: "1px solid rgba(201,162,75,0.3)" },
  typeBadgeIsolation: { background: "rgba(111,168,220,0.12)", color: "#6FA8DC", border: "1px solid rgba(111,168,220,0.3)" },
  difficultyDots: { display: "flex", alignItems: "center", gap: 2 },
  detailsSectionTitle: { fontSize: 11.5, fontWeight: 700, color: "var(--gold)", marginBottom: 4, marginTop: 10 },
  detailsText: { fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.7, margin: 0 },
  stepsList: { margin: "0 0 0 0", paddingInlineStart: 18, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.9 },
  watchVideoBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(224,82,82,0.1)", border: "1px solid rgba(224,82,82,0.35)", borderRadius: 10, padding: "11px 10px", marginTop: 10, fontSize: 13, color: "#E05252", fontWeight: 700, textDecoration: "none", cursor: "pointer", fontFamily: "inherit" },
  videoPlayer: { width: "100%", borderRadius: 10, marginTop: 10, display: "block" },
  actionsRow: { display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" },
  smallBtn: { display: "flex", alignItems: "center", gap: 4, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "var(--gold)", borderRadius: 10, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", textDecoration: "none", flexShrink: 0 },
  progressionBadge: { display: "flex", alignItems: "center", gap: 4, background: "rgba(95,168,160,0.12)", color: "#5FA8A0", border: "1px solid rgba(95,168,160,0.35)", borderRadius: 10, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, marginTop: 8 },
  logForm: { marginTop: 8, background: "var(--surface-sunken)", borderRadius: 10, padding: "10px 10px" },
  logRow: { display: "flex", gap: 6, marginTop: 6 },
  logInput: { flex: 1, background: "var(--panel)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 10px", color: "var(--ink)", fontSize: 13, fontFamily: "inherit", minWidth: 0 },
  backRow: { display: "flex", alignItems: "center", gap: 6, color: "var(--gold)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14, background: "none", border: "none", fontFamily: "inherit", padding: 0 },
  detailHero: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 18 },
  detailName: { fontSize: 18, fontWeight: 700, color: "var(--ink)", textAlign: "center" },
  detailSectionCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 12 },
  startWorkoutBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", border: "none", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 10, background: "linear-gradient(135deg, #5FA8A0, #3E7E78)", color: "#fff" },
  focusWrap: { minHeight: "100%", display: "flex", flexDirection: "column" },
  focusProgress: { fontSize: 12, color: "var(--muted2)", fontWeight: 700, marginBottom: 10, textAlign: "center" },
  focusDiagramWrap: { display: "flex", justifyContent: "center", marginBottom: 12 },
  focusExerciseName: { fontSize: 19, fontWeight: 700, color: "var(--ink)", textAlign: "center", marginBottom: 4 },
  focusMeta: { fontSize: 12.5, color: "var(--muted2)", textAlign: "center", marginBottom: 16 },
  focusCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 14 },
  focusSetTitle: { fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 10, textAlign: "center" },
  oneRepMaxBadge: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "var(--gold)", borderRadius: 10, padding: "8px 0", fontSize: 12.5, fontWeight: 700, marginBottom: 12 },
  lastPerformanceRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 11.5, color: "var(--muted2)", fontWeight: 600, marginBottom: 10 },
  comparisonRow: { fontSize: 11.5, fontWeight: 700, marginTop: 4, textAlign: "center" },
  volumeCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 16 },
  volumeRow: { marginTop: 10 },
  volumeRowHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, fontSize: 12.5, color: "var(--ink-soft)" },
  volumeValue: { fontWeight: 700, color: "var(--ink)", direction: "ltr" },
  caloriesRow: { display: "flex", alignItems: "center", gap: 7, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600 },
  completeSetBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "var(--gold)", color: "var(--bg)" },
  restCard: { background: "rgba(95,168,160,0.1)", border: "1.5px solid rgba(95,168,160,0.35)", borderRadius: 16, padding: "18px 14px", marginBottom: 14, textAlign: "center" },
  restTitle: { fontSize: 12.5, fontWeight: 700, color: "#5FA8A0", marginBottom: 6 },
  restTime: { fontSize: 34, fontWeight: 700, color: "var(--ink)", direction: "ltr", marginBottom: 10 },
  skipRestBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border2)", color: "var(--muted2)", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  focusFooterRow: { display: "flex", gap: 8, marginTop: "auto", paddingTop: 12 },
  nextExerciseBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1px solid var(--border2)", background: "transparent", color: "var(--ink)", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  finishWorkoutBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", background: "linear-gradient(135deg, #5FA8A0, #3E7E78)", color: "#fff", borderRadius: 12, padding: "12px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  exitFocusBtn: { display: "flex", alignItems: "center", gap: 6, color: "var(--muted2)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: "none", border: "none", fontFamily: "inherit", padding: 0, marginBottom: 14 },
  setsCompletedRow: { display: "flex", justifyContent: "center", gap: 6, marginBottom: 14 },
  setDot: { width: 10, height: 10, borderRadius: "50%" },
  summaryHeroIcon: { width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #5FA8A0, #3E7E78)", display: "flex", alignItems: "center", justifyContent: "center", margin: "10px auto 14px" },
  summaryTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 18 },
  summaryStatCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "4px 14px", marginBottom: 18 },
  summaryStatRow: { display: "flex", alignItems: "center", gap: 10, padding: "13px 0", borderBottom: "1px solid var(--line)" },
  summaryStatLabel: { flex: 1, fontSize: 13, color: "var(--muted2)", fontWeight: 600 },
  summaryStatValue: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)", textAlign: "end", maxWidth: "55%" },
  shareBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "var(--gold)", color: "var(--bg)" },
  templatePickerCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px" },
  templatePickerTitle: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 10 },
  templateOptionRow: { display: "flex", alignItems: "center", gap: 10, width: "100%", border: "1px solid var(--border2)", background: "transparent", borderRadius: 12, padding: "10px 12px", marginBottom: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "start" },
  templateOptionIcon: { width: 38, height: 38, borderRadius: 10, background: "rgba(201,162,75,0.12)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  templateOptionLabel: { fontSize: 13, fontWeight: 700, color: "var(--ink)" },
  templateOptionDesc: { fontSize: 11, color: "var(--muted2)", marginTop: 2 },
  templateHint: { fontSize: 11, color: "var(--muted2)", textAlign: "center", marginTop: 4 },
  statsToolBar: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  exercisePickChip: { border: "1px solid var(--border2)", borderRadius: 20, padding: "8px 14px", fontSize: 12, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", background: "transparent", whiteSpace: "nowrap" },
  exercisePickChipActive: { borderColor: "var(--gold)", background: "rgba(201,162,75,0.12)", color: "var(--gold)", fontWeight: 700 },
};

const CARDIO_MOBILITY_ICON = { cardio: HeartPulse, mobility: Wind };

// رابط بحث يوتيوب ديناميكي (لا رابط فيديو ثابت واحد قد يُحذف أو يكون غير
// مناسب) - يعمل تلقائياً لكل تمرين بالاعتماد على اسمه الإنجليزي، بلا حاجة
// لربط فيديو محدَّد يدوياً لكل تمرين من الـ~90 تمرين.
function youtubeSearchUrl(exercise) {
  const query = `${exercise.nameEn || exercise.name} exercise proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function DifficultyDots({ difficulty }) {
  const idx = DIFFICULTY_ORDER.indexOf(difficulty);
  return (
    <span style={FS.difficultyDots}>
      {DIFFICULTY_ORDER.map((_, i) => (
        <Circle key={i} size={7} fill={i <= idx ? "#C9A24B" : "none"} color={i <= idx ? "#C9A24B" : "var(--border2)"} strokeWidth={1.5} />
      ))}
    </span>
  );
}

function ExerciseRow({ exercise, isEn, gender, isLogging, onToggleLog, logWeight, setLogWeight, logReps, setLogReps, logSets, setLogSets, onSubmitPerformance, onSwap, onOpenDetail, progression, t }) {
  const gear = GEAR_TYPES.find((g) => g.key === exercise.gear);
  const GearIcon = gear ? ICONS[gear.icon] || Dumbbell : Dumbbell;
  const CardioMobilityIcon = CARDIO_MOBILITY_ICON[exercise.muscle];
  const pattern = MOVEMENT_PATTERNS.find((p) => p.key === exercise.movementPattern);
  const ForwardChevron = isEn ? ChevronRight : ChevronLeft;
  return (
    <div style={FS.exerciseRow}>
      <div style={FS.exerciseTop}>
        {exercise.imageUrl ? (
          <div style={FS.diagramWrap}><img src={exercise.imageUrl} alt="" width={30} height={55} style={{ objectFit: "contain" }} /></div>
        ) : CardioMobilityIcon ? (
          <div style={FS.genericIconWrap}><CardioMobilityIcon size={18} /></div>
        ) : (
          <div style={FS.diagramWrap}><MuscleDiagram muscle={exercise.muscle} secondaryMuscles={exercise.secondaryMuscles} gender={gender} size={30} /></div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={FS.exerciseName}>{isEn ? (exercise.nameEn || exercise.name) : exercise.name}</div>
          <div style={FS.exerciseMeta}>{t("fitness.setsReps", { sets: exercise.sets, reps: exercise.reps })} · {t("fitness.restLabel", { sec: exercise.restSeconds })}</div>
          <div style={FS.exerciseMeta}>{t("fitness.targetMuscle")}: {t(`fitness.muscleGroups.${exercise.muscle}`)}</div>
          <div style={FS.badgeRow}>
            <span style={FS.badge}><GearIcon size={11} /> {isEn ? gear?.nameEn : gear?.name}</span>
            <span style={{ ...FS.badge, ...(exercise.type === "compound" ? FS.typeBadgeCompound : exercise.type === "isolation" ? FS.typeBadgeIsolation : {}) }}>
              {t(`fitness.exerciseTypes.${exercise.type}`)}
            </span>
            <span style={FS.badge}><DifficultyDots difficulty={exercise.difficulty} /> {t(`fitness.experienceLevels.${exercise.difficulty}`)}</span>
            {pattern && <span style={FS.badge}>{isEn ? pattern.nameEn : pattern.name}</span>}
          </div>
        </div>
      </div>

      <div style={FS.actionsRow}>
        <button onClick={onOpenDetail} style={FS.smallBtn}>
          <ForwardChevron size={12} /> {t("fitness.detailsBtn")}
        </button>
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

// صفحة تفاصيل تمرين كاملة (نمط "صفحة كاملة + زر رجوع" المستخدَم في
// DietPlansView.jsx) بدل اللوحة المطوية السابقة - مساحة أكبر لعرض المخطط
// التشريحي والخطوات بوضوح.
function ExerciseDetailView({ exercise, isEn, isRtl, gender, onBack, t }) {
  const BackChevron = isRtl ? ChevronRight : ChevronLeft;
  const gear = GEAR_TYPES.find((g) => g.key === exercise.gear);
  const GearIcon = gear ? ICONS[gear.icon] || Dumbbell : Dumbbell;
  const CardioMobilityIcon = CARDIO_MOBILITY_ICON[exercise.muscle];
  const pattern = MOVEMENT_PATTERNS.find((p) => p.key === exercise.movementPattern);
  return (
    <div style={S.view}>
      <button onClick={onBack} style={FS.backRow}>
        <BackChevron size={16} /> {t("fitness.backToProgram")}
      </button>
      <div style={FS.detailHero}>
        {exercise.imageUrl ? (
          <img src={exercise.imageUrl} alt="" width={70} height={128} style={{ objectFit: "contain" }} />
        ) : CardioMobilityIcon ? (
          <div style={{ ...FS.genericIconWrap, width: 70, height: 70 }}><CardioMobilityIcon size={32} /></div>
        ) : (
          <MuscleDiagram muscle={exercise.muscle} secondaryMuscles={exercise.secondaryMuscles} gender={gender} size={70} />
        )}
        <div style={FS.detailName}>{isEn ? (exercise.nameEn || exercise.name) : exercise.name}</div>
        <div style={FS.badgeRow}>
          <span style={FS.badge}><GearIcon size={11} /> {isEn ? gear?.nameEn : gear?.name}</span>
          <span style={{ ...FS.badge, ...(exercise.type === "compound" ? FS.typeBadgeCompound : exercise.type === "isolation" ? FS.typeBadgeIsolation : {}) }}>
            {t(`fitness.exerciseTypes.${exercise.type}`)}
          </span>
          <span style={FS.badge}><DifficultyDots difficulty={exercise.difficulty} /> {t(`fitness.experienceLevels.${exercise.difficulty}`)}</span>
          {pattern && <span style={FS.badge}>{isEn ? pattern.nameEn : pattern.name}</span>}
        </div>
      </div>

      <div style={FS.detailSectionCard}>
        <div style={FS.exerciseMeta}>{t("fitness.setsReps", { sets: exercise.sets, reps: exercise.reps })} · {t("fitness.restLabel", { sec: exercise.restSeconds })}</div>
        <div style={{ ...FS.exerciseMeta, marginTop: 4 }}>{t("fitness.targetMuscle")}: {t(`fitness.muscleGroups.${exercise.muscle}`)}</div>
      </div>

      <div style={FS.detailSectionCard}>
        <div style={FS.detailsSectionTitle}>{t("fitness.startingPositionTitle")}</div>
        <p style={FS.detailsText}>{isEn ? (exercise.startPositionEn || exercise.startPosition) : exercise.startPosition}</p>
        <div style={FS.detailsSectionTitle}>{t("fitness.stepsTitle")}</div>
        <ol style={FS.stepsList}>
          {(isEn ? (exercise.stepsEn || exercise.steps) : exercise.steps || []).map((step, i) => <li key={i}>{step}</li>)}
        </ol>
        <div style={FS.detailsSectionTitle}>{t("fitness.commonMistakeTitle")}</div>
        <p style={FS.detailsText}>{isEn ? (exercise.commonMistakeEn || exercise.commonMistake) : exercise.commonMistake}</p>
        {exercise.tips && (
          <>
            <div style={FS.detailsSectionTitle}>{t("fitness.tipTitle")}</div>
            <p style={FS.detailsText}>{isEn ? (exercise.tipsEn || exercise.tips) : exercise.tips}</p>
          </>
        )}
        {exercise.videoUrl ? (
          <video src={exercise.videoUrl} controls playsInline style={FS.videoPlayer} />
        ) : exercise.animationUrl ? (
          <img src={exercise.animationUrl} alt="" style={FS.videoPlayer} />
        ) : (
          <a href={youtubeSearchUrl(exercise)} target="_blank" rel="noopener noreferrer" style={FS.watchVideoBtn}>
            <Youtube size={16} /> {t("fitness.watchVideoBtn")}
          </a>
        )}
      </div>
    </div>
  );
}

// وضع التركيز (Focus Mode): جلسة تمرين نشطة تعرض تمريناً واحداً في كل مرة
// بملء الشاشة، مع تسجيل كل مجموعة كصف منفصل ومؤقّت راحة يعتمد على وقت
// مطلق (restEndsAt) لا عدّاد تنازلي بسيط - محسوب دائماً عبر Date.now() حتى
// لا ينحرف مع تعليق التبويب في الخلفية (نفس مبدأ FocusView في MasarApp.jsx،
// لكن بلا حفظ للحالة عبر تحديث الصفحة لأن فترات الراحة قصيرة جداً 45-90
// ثانية بخلاف مؤقّت الدراسة الطويل).
function FocusModeView({
  flatExercises, exIndex, isEn, isRtl, gender, t,
  weight, setWeight, reps, setReps, onCompleteSet, setsDoneForCurrent,
  restEndsAt, restRemainingMs, onSkipRest, lastOneRepMax, lastPerformance,
  onNextExercise, onFinishWorkout, onExit,
}) {
  const exercise = flatExercises[exIndex];
  const CardioMobilityIcon = CARDIO_MOBILITY_ICON[exercise.muscle];
  const isLast = exIndex >= flatExercises.length - 1;
  const resting = restEndsAt != null && restRemainingMs > 0;
  const restSecondsLeft = Math.ceil(restRemainingMs / 1000);
  const restTimeLabel = `${Math.floor(restSecondsLeft / 60)}:${String(restSecondsLeft % 60).padStart(2, "0")}`;

  // مقارنة الوزن المُدخَل حالياً بآخر أداء مسجَّل لنفس التمرين (جلسة سابقة
  // فعلية، لا مجموعات اليوم نفسه - انظر getLastPerformance في fitness-engine.js).
  const currentWeightNum = parseFloat(weight);
  let weightComparison = null;
  if (lastPerformance && lastPerformance.weight > 0 && weight.trim() !== "" && Number.isFinite(currentWeightNum)) {
    const diff = Math.round((currentWeightNum - lastPerformance.weight) * 100) / 100;
    if (diff > 0) weightComparison = { text: t("fitness.comparisonHeavier", { diff }), tone: "up" };
    else if (diff < 0) weightComparison = { text: t("fitness.comparisonLighter", { diff: Math.abs(diff) }), tone: "down" };
    else weightComparison = { text: t("fitness.comparisonSame"), tone: "same" };
  }

  return (
    <div style={{ ...S.view, ...FS.focusWrap }}>
      <button onClick={onExit} style={FS.exitFocusBtn}><X size={15} /> {t("fitness.exitWithoutFinishBtn")}</button>
      <div style={FS.focusProgress}>{t("fitness.exerciseProgress", { current: exIndex + 1, total: flatExercises.length })}</div>

      <div style={FS.focusDiagramWrap}>
        {exercise.imageUrl ? (
          <img src={exercise.imageUrl} alt="" width={70} height={128} style={{ objectFit: "contain" }} />
        ) : CardioMobilityIcon ? (
          <div style={{ ...FS.genericIconWrap, width: 70, height: 70 }}><CardioMobilityIcon size={32} /></div>
        ) : (
          <MuscleDiagram muscle={exercise.muscle} secondaryMuscles={exercise.secondaryMuscles} gender={gender} size={70} />
        )}
      </div>
      <div style={FS.focusExerciseName}>{isEn ? (exercise.nameEn || exercise.name) : exercise.name}</div>
      <div style={FS.focusMeta}>{t("fitness.setsReps", { sets: exercise.sets, reps: exercise.reps })} · {t("fitness.restLabel", { sec: exercise.restSeconds })}</div>

      {resting ? (
        <div style={FS.restCard}>
          <div style={FS.restTitle}>{t("fitness.restingTitle")}</div>
          <div style={FS.restTime}>{restTimeLabel}</div>
          <button onClick={onSkipRest} style={FS.skipRestBtn}><SkipForward size={13} /> {t("fitness.skipRestBtn")}</button>
        </div>
      ) : (
        <div style={FS.focusCard}>
          <div style={FS.focusSetTitle}>{t("fitness.setProgress", { current: Math.min(setsDoneForCurrent + 1, exercise.sets), total: exercise.sets })}</div>
          <div style={FS.setsCompletedRow}>
            {Array.from({ length: exercise.sets }).map((_, i) => (
              <span key={i} style={{ ...FS.setDot, background: i < setsDoneForCurrent ? "#5FA8A0" : "var(--border2)" }} />
            ))}
          </div>
          {lastPerformance && (
            <div style={FS.lastPerformanceRow}>
              <TrendingUp size={12} />
              {lastPerformance.weight > 0
                ? t("fitness.lastTimeWeightReps", { weight: lastPerformance.weight, reps: lastPerformance.reps })
                : t("fitness.lastTimeRepsOnly", { reps: lastPerformance.reps })}
            </div>
          )}
          <label style={{ ...S.label, marginTop: 0 }}>{t("fitness.weightKg")}</label>
          <input type="number" step="0.5" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0" style={{ ...S.input, marginTop: 4 }} />
          {weightComparison && (
            <div style={{ ...FS.comparisonRow, color: weightComparison.tone === "up" ? "#5FA8A0" : weightComparison.tone === "down" ? "#D17B5F" : "var(--muted2)" }}>
              {weightComparison.text}
            </div>
          )}
          <label style={{ ...S.label, marginTop: weightComparison ? 6 : 10 }}>{t("fitness.repsCompleted")}</label>
          <input type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} style={{ ...S.input, marginTop: 4 }} />
          {lastOneRepMax != null && (
            <div style={FS.oneRepMaxBadge}><TrendingUp size={13} /> {t("fitness.oneRepMaxEstimate", { value: lastOneRepMax })}</div>
          )}
          <button onClick={onCompleteSet} style={FS.completeSetBtn}><Check size={16} /> {t("fitness.completeSetBtn")}</button>
        </div>
      )}

      <div style={FS.focusFooterRow}>
        {!isLast && (
          <button onClick={onNextExercise} style={FS.nextExerciseBtn}>{t("fitness.nextExerciseBtn")} {isRtl ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}</button>
        )}
        <button onClick={onFinishWorkout} style={FS.finishWorkoutBtn}><PartyPopper size={15} /> {t("fitness.finishWorkoutBtn")}</button>
      </div>
    </div>
  );
}

// شاشة إنهاء التمرين: ملخّص الجلسة (مدة/حجم/أفضل رقم/تمارين مكتملة) +
// بطاقة مشاركة إنجاز عبر Share Sheet القياسي للمتصفح (انظر achievementShare.js).
const SHARE_TEMPLATES = [
  { key: "full", icon: FileText, labelKey: "shareTemplateFull", descKey: "shareTemplateFullDesc" },
  { key: "photo", icon: Camera, labelKey: "shareTemplatePhoto", descKey: "shareTemplatePhotoDesc" },
  { key: "minimal", icon: Sparkles, labelKey: "shareTemplateMinimal", descKey: "shareTemplateMinimalDesc" },
  { key: "stats", icon: LayoutGrid, labelKey: "shareTemplateStats", descKey: "shareTemplateStatsDesc" },
];

function FinishSummaryView({ summary, isEn, gender, t, showToast, onClose }) {
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const fileInputRef = useRef(null);
  const durationMinutes = Math.floor(summary.durationMs / 60000);
  const durationSeconds = Math.floor((summary.durationMs % 60000) / 1000);
  const durationText = t("fitness.summaryDurationValue", { minutes: durationMinutes, seconds: durationSeconds });
  const volumeText = `${Math.round(summary.totalVolume).toLocaleString()} ${t("fitness.volumeUnit")}`;
  const exercisesText = t("fitness.summaryExercisesValue", { done: summary.exercisesCompleted, total: summary.totalExercisesInDay });
  const totalSetsText = String(summary.totalSets);

  let bestText = t("fitness.summaryNoBest");
  if (summary.best) {
    const exName = summary.bestExercise ? (isEn ? (summary.bestExercise.nameEn || summary.bestExercise.name) : summary.bestExercise.name) : "";
    bestText = summary.best.type === "weight"
      ? t("fitness.summaryBestWeightValue", { exercise: exName, weight: summary.best.weight, reps: summary.best.reps })
      : t("fitness.summaryBestRepsValue", { exercise: exName, reps: summary.best.reps });
  }

  async function runShare(template, photoFile) {
    setPickingTemplate(false);
    const statLines = [
      { label: t("fitness.summaryDurationLabel"), value: durationText },
      { label: t("fitness.summaryVolumeLabel"), value: volumeText },
      { label: t("fitness.summaryBestLabel"), value: bestText },
      { label: t("fitness.summaryExercisesLabel"), value: exercisesText },
    ];
    const shareText = [t("fitness.shareIntroLine"), ...statLines.map((s) => `${s.label}: ${s.value}`)].join("\n");
    const result = await shareAchievementCard({
      template,
      photoFile,
      brandLabel: "مسار",
      title: t("fitness.shareCardTitle"),
      footer: isEn ? "via Masar" : "عبر تطبيق مسار",
      shareText,
      isRtl: !isEn,
      durationText,
      volumeText,
      exercisesText,
      totalSetsText,
      targetMuscles: summary.musclesWorked,
      gender,
      heroNumber: summary.exercisesCompleted,
      heroCaption: t("fitness.shareMinimalCaption"),
      summaryDurationLabel: t("fitness.summaryDurationLabel"),
      summaryVolumeLabel: t("fitness.summaryVolumeLabel"),
      summaryExercisesLabel: t("fitness.summaryExercisesLabel"),
      summarySetsLabel: t("fitness.summarySetsLabel"),
    });
    if (!result.ok) { showToast(t("fitness.shareFailed")); return; }
    if (result.method === "clipboard-image") showToast(t("fitness.shareCopiedImage"));
    else if (result.method === "clipboard-text") showToast(t("fitness.shareCopiedText"));
    else if (result.method === "download") showToast(t("fitness.shareDownloaded"));
  }

  function selectTemplate(key) {
    if (key === "photo") { fileInputRef.current?.click(); return; }
    runShare(key, null);
  }

  function onPhotoChosen(e) {
    const file = e.target.files?.[0] || null;
    e.target.value = "";
    if (file) runShare("photo", file);
  }

  return (
    <div style={S.view}>
      <div style={FS.summaryHeroIcon}><PartyPopper size={26} color="var(--on-accent)" /></div>
      <div style={FS.summaryTitle}>{t("fitness.summaryTitle")}</div>

      <div style={FS.summaryStatCard}>
        <div style={FS.summaryStatRow}>
          <Clock size={16} color="#5FA8A0" />
          <span style={FS.summaryStatLabel}>{t("fitness.summaryDurationLabel")}</span>
          <span style={FS.summaryStatValue}>{durationText}</span>
        </div>
        <div style={FS.summaryStatRow}>
          <BarChart3 size={16} color="#C9A24B" />
          <span style={FS.summaryStatLabel}>{t("fitness.summaryVolumeLabel")}</span>
          <span style={FS.summaryStatValue}>{volumeText}</span>
        </div>
        <div style={FS.summaryStatRow}>
          <Trophy size={16} color="#D9B33B" />
          <span style={FS.summaryStatLabel}>{t("fitness.summaryBestLabel")}</span>
          <span style={FS.summaryStatValue}>{bestText}</span>
        </div>
        <div style={{ ...FS.summaryStatRow, borderBottom: "none" }}>
          <ListChecks size={16} color="#6FA8DC" />
          <span style={FS.summaryStatLabel}>{t("fitness.summaryExercisesLabel")}</span>
          <span style={FS.summaryStatValue}>{exercisesText}</span>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={onPhotoChosen} />

      {pickingTemplate ? (
        <div style={FS.templatePickerCard}>
          <div style={FS.templatePickerTitle}>{t("fitness.chooseTemplateTitle")}</div>
          {SHARE_TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <button key={tpl.key} onClick={() => selectTemplate(tpl.key)} style={FS.templateOptionRow}>
                <div style={FS.templateOptionIcon}><Icon size={18} /></div>
                <div style={{ flex: 1, textAlign: "start" }}>
                  <div style={FS.templateOptionLabel}>{t(`fitness.${tpl.labelKey}`)}</div>
                  <div style={FS.templateOptionDesc}>{t(`fitness.${tpl.descKey}`)}</div>
                </div>
              </button>
            );
          })}
          <div style={FS.templateHint}>{t("fitness.photoOptionalHint")}</div>
          <button onClick={() => setPickingTemplate(false)} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>{t("common.buttons.cancel")}</button>
        </div>
      ) : (
        <button onClick={() => setPickingTemplate(true)} style={FS.shareBtn}><Share2 size={16} /> {t("fitness.shareAchievementBtn")}</button>
      )}
      <button onClick={onClose} style={{ ...S.exportBtn, marginTop: 10 }}>{t("common.buttons.close")}</button>
    </div>
  );
}

// صفحة الإحصائيات: تطوّر حجم التدريب الأسبوعي (نفس بيانات البطاقة الموجودة
// أصلاً في الشاشة الرئيسية، بلا حساب مكرَّر) + تطوّر الوزن المستخدَم عبر
// الجلسات لتمرين يختاره المستخدم من قائمة التمارين التي له سجل أداء فيها فعلاً.
function StatisticsView({ isEn, isRtl, t, progressChartData, exerciseOptions, selectedExerciseId, onSelectExercise, exerciseProgressionData, onBack }) {
  const BackChevron = isRtl ? ChevronRight : ChevronLeft;
  return (
    <div style={S.view}>
      <button onClick={onBack} style={FS.backRow}><BackChevron size={16} /> {t("fitness.backToProgram")}</button>
      <div style={{ ...FS.summaryTitle, textAlign: "start" }}>{t("fitness.statisticsTitle")}</div>

      {progressChartData.length > 0 ? (
        <div style={S.chartCard}>
          <div style={S.chartTitle}>{t("fitness.progressChartTitle")}</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={progressChartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} />
              <Bar dataKey="volume" fill="#5FA8A0" radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={S.emptyHint}>{t("fitness.noProgressYet")}</div>
      )}

      {exerciseOptions.length > 0 ? (
        <>
          <div style={{ ...S.chartTitle, marginTop: 4 }}>{t("fitness.statisticsWeightChartTitle")}</div>
          <div style={FS.statsToolBar}>
            {exerciseOptions.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelectExercise(ex.id)}
                style={{ ...FS.exercisePickChip, ...(ex.id === selectedExerciseId ? FS.exercisePickChipActive : {}) }}
              >
                {isEn ? (ex.nameEn || ex.name) : ex.name}
              </button>
            ))}
          </div>
          {exerciseProgressionData.length > 0 ? (
            <div style={S.chartCard}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={exerciseProgressionData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 9, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} />
                  <Line type="monotone" dataKey="weight" stroke="#C9A24B" strokeWidth={2.5} dot={{ r: 3, fill: "#C9A24B" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={S.emptyHint}>{t("fitness.statisticsNoExerciseData")}</div>
          )}
        </>
      ) : (
        <div style={S.emptyHint}>{t("fitness.statisticsNoDataAtAll")}</div>
      )}
    </div>
  );
}

export default function FitnessView({ healthProfile, showToast }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const isRtl = !isEn;
  // مصدر واحد للحقيقة لجنس المستخدم: من ملف "أنت" (health_profile) دون
  // تكرار السؤال في الرياضة - افتراضي "male" فقط إن لم يُحدَّد بعد هناك.
  const gender = healthProfile?.gender === "female" ? "female" : "male";
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
  const [selectedExercise, setSelectedExercise] = useState(null);

  // ===== وضع التركيز (Focus Mode) =====
  const [focusDay, setFocusDay] = useState(null); // اليوم النشط بأكمله (day.exercises)
  const [focusExIndex, setFocusExIndex] = useState(0);
  const [focusSetsDone, setFocusSetsDone] = useState(0);
  const [focusWeight, setFocusWeight] = useState("");
  const [focusReps, setFocusReps] = useState("");
  const [focusOneRepMax, setFocusOneRepMax] = useState(null);
  const [restEndsAt, setRestEndsAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [focusStartedAt, setFocusStartedAt] = useState(null);
  const [focusSessionLogs, setFocusSessionLogs] = useState([]); // إدخالات هذه الجلسة فقط (لملخّص الإنهاء)
  const [finishedSummary, setFinishedSummary] = useState(null);

  useEffect(() => {
    if (restEndsAt == null) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  useEffect(() => {
    if (restEndsAt == null) return;
    if (Date.now() >= restEndsAt) {
      setRestEndsAt(null);
      playRestEndSound();
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
    }
  }, [nowTick, restEndsAt]);

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
      const hasPerformanceHistory = wl.length > 0;
      let entry = wp;
      if (hasFullProfile && !entry) {
        const seed = seedFromOwner(getOwner());
        entry = { program: buildProgram({ ...fp, gender }, seed, hasPerformanceHistory), seed, weekRotationEnabled: false, rotationFrequency: null, lastRotatedAt: null };
        await store.saveWorkoutProgram(entry);
      } else if (hasFullProfile && entry && entry.weekRotationEnabled) {
        const msPerWeek = 7 * 24 * 3600 * 1000;
        const interval = entry.rotationFrequency === "biweekly" ? msPerWeek * 2 : msPerWeek;
        const last = entry.lastRotatedAt ? new Date(entry.lastRotatedAt).getTime() : 0;
        if (Date.now() - last >= interval) {
          const weekIndex = Math.floor(Date.now() / interval);
          const seed = (seedFromOwner(getOwner()) + weekIndex) >>> 0;
          entry = { ...entry, program: buildProgram({ ...fp, gender }, seed, hasPerformanceHistory), seed, lastRotatedAt: new Date().toISOString() };
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

  // ملخص آخر جلسة مسجَّلة: حجم التدريب لكل عضلة (وزن×تكرارات×مجموعات) +
  // سعرات حرارية تقديرية (معادلة MET عامة - انظر fitness-engine.js).
  const lastSessionSummary = useMemo(() => {
    const date = mostRecentLoggedDate(workoutLog);
    if (!date) return null;
    const volumeByMuscle = computeSessionVolumeByMuscle(workoutLog, date);
    const calories = estimateSessionCalories(workoutLog, date, healthProfile?.weightKg);
    return { date, volumeByMuscle, calories };
  }, [workoutLog, healthProfile]);

  const maxMuscleVolume = useMemo(() => {
    if (!lastSessionSummary) return 0;
    const vals = Object.values(lastSessionSummary.volumeByMuscle);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [lastSessionSummary]);

  // ===== صفحة الإحصائيات =====
  const [showStatistics, setShowStatistics] = useState(false);
  const [selectedStatsExerciseId, setSelectedStatsExerciseId] = useState(null);

  const exerciseOptions = useMemo(() => {
    const ids = Array.from(new Set(workoutLog.map((l) => l.exerciseId)));
    return ids.map((id) => EXERCISES_BY_ID[id]).filter(Boolean);
  }, [workoutLog]);

  const effectiveStatsExerciseId = selectedStatsExerciseId || (exerciseOptions[0]?.id ?? null);

  const exerciseProgressionData = useMemo(() => {
    if (!effectiveStatsExerciseId) return [];
    const logs = workoutLog.filter((l) => l.exerciseId === effectiveStatsExerciseId);
    return aggregateLogsByDate(logs)
      .filter((a) => a.weight && a.weight > 0)
      .map((a) => ({ date: a.date.slice(5), weight: a.weight }));
  }, [workoutLog, effectiveStatsExerciseId]);

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
      program: buildProgram({ ...draft, gender }, seed, workoutLog.length > 0), seed,
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
    const entry = { ...programEntry, program: buildProgram({ ...fitnessProfile, gender }, seed, workoutLog.length > 0), seed };
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

  function startFocusWorkout(day) {
    setFocusDay(day);
    setFocusExIndex(0);
    setFocusSetsDone(0);
    setFocusWeight(""); setFocusReps(""); setFocusOneRepMax(null);
    setRestEndsAt(null);
    setFocusStartedAt(Date.now());
    setFocusSessionLogs([]);
  }

  async function completeFocusSet() {
    const exercise = focusDay.exercises[focusExIndex];
    const reps = parseInt(focusReps, 10);
    const weight = focusWeight.trim() !== "" ? parseFloat(focusWeight) : null;
    if (!Number.isFinite(reps) || reps <= 0) { showToast(t("fitness.invalidPerformance")); return; }
    // تُستدعى من داخل ضغطة حقيقية - تهيّئ AudioContext مبكراً حتى يعمل صوت
    // انتهاء الراحة لاحقاً من المؤقّت (انظر primeAudioContext في sound.js).
    primeAudioContext();
    const entry = { id: uid(), date: localDayKey(), exerciseId: exercise.id, weight, reps, setsCompleted: 1 };
    setWorkoutLog((prev) => [...prev, entry]);
    const res = await store.addWorkoutLogEntry(entry);
    if (!res.ok) {
      setWorkoutLog((prev) => prev.filter((x) => x.id !== entry.id));
      showToast(t("fitness.performanceSaveFailed"));
      return;
    }
    setFocusOneRepMax(weight != null && weight > 0 ? estimateOneRepMax(weight, reps) : null);
    setFocusSetsDone((n) => n + 1);
    setFocusSessionLogs((prev) => [...prev, entry]);
    setRestEndsAt(Date.now() + (exercise.restSeconds || 60) * 1000);
  }

  function skipRest() { setRestEndsAt(null); }

  function nextFocusExercise() {
    setFocusExIndex((i) => i + 1);
    setFocusSetsDone(0);
    setFocusWeight(""); setFocusReps(""); setFocusOneRepMax(null);
    setRestEndsAt(null);
  }

  // يحسب ملخص الجلسة (مدة/حجم/أفضل رقم/عدد التمارين) من إدخالات هذه الجلسة
  // فقط (focusSessionLogs) لا من سجل اليوم كاملاً - حتى لا تختلط بجلسة سابقة
  // منفصلة سُجِّلت في نفس اليوم.
  function buildSessionSummary(day) {
    const durationMs = focusStartedAt ? Date.now() - focusStartedAt : 0;
    let totalVolume = 0;
    let best = null;
    for (const log of focusSessionLogs) {
      if (log.weight && log.weight > 0) {
        totalVolume += log.weight * (log.reps || 0) * (log.setsCompleted || 0);
        const orm = estimateOneRepMax(log.weight, log.reps);
        if (orm != null && (!best || best.type !== "weight" || orm > best.value)) {
          best = { type: "weight", exerciseId: log.exerciseId, value: orm, weight: log.weight, reps: log.reps };
        }
      } else if (!best) {
        best = { type: "reps", exerciseId: log.exerciseId, reps: log.reps };
      } else if (best.type === "reps" && (log.reps || 0) > best.reps) {
        best = { type: "reps", exerciseId: log.exerciseId, reps: log.reps };
      }
    }
    const loggedExerciseIds = new Set(focusSessionLogs.map((l) => l.exerciseId));
    const exercisesCompleted = loggedExerciseIds.size;
    const bestExercise = best ? day.exercises.find((e) => e.id === best.exerciseId) : null;
    const musclesWorked = Array.from(new Set(day.exercises.filter((e) => loggedExerciseIds.has(e.id)).map((e) => e.muscle)));
    return {
      durationMs, totalVolume, best, bestExercise, exercisesCompleted,
      totalExercisesInDay: day.exercises.length, dayType: day.dayType,
      totalSets: focusSessionLogs.length, musclesWorked,
    };
  }

  async function finishFocusWorkout() {
    const summary = buildSessionSummary(focusDay);
    if (!todayDone) {
      setFitnessLog((prev) => ({ ...prev, [today]: true }));
      const res = await store.saveFitnessDayCompleted(today, true);
      if (res.ok) showToast(t("fitness.workoutLogged"));
    }
    setFocusDay(null);
    setFinishedSummary(summary);
  }

  function exitFocusWithoutFinishing() { setFocusDay(null); }

  if (focusDay) {
    const currentFocusExercise = focusDay.exercises[focusExIndex];
    const lastPerformance = getLastPerformance(currentFocusExercise.id, workoutLog, today);
    return (
      <FocusModeView
        flatExercises={focusDay.exercises}
        exIndex={focusExIndex}
        isEn={isEn}
        isRtl={isRtl}
        gender={gender}
        t={t}
        weight={focusWeight} setWeight={setFocusWeight}
        reps={focusReps} setReps={setFocusReps}
        onCompleteSet={completeFocusSet}
        setsDoneForCurrent={focusSetsDone}
        restEndsAt={restEndsAt}
        restRemainingMs={restEndsAt != null ? Math.max(0, restEndsAt - nowTick) : 0}
        onSkipRest={skipRest}
        lastOneRepMax={focusOneRepMax}
        lastPerformance={lastPerformance}
        onNextExercise={nextFocusExercise}
        onFinishWorkout={finishFocusWorkout}
        onExit={exitFocusWithoutFinishing}
      />
    );
  }

  if (finishedSummary) {
    return (
      <FinishSummaryView
        summary={finishedSummary}
        isEn={isEn}
        gender={gender}
        t={t}
        showToast={showToast}
        onClose={() => setFinishedSummary(null)}
      />
    );
  }

  if (showStatistics) {
    return (
      <StatisticsView
        isEn={isEn}
        isRtl={isRtl}
        t={t}
        progressChartData={progressChartData}
        exerciseOptions={exerciseOptions}
        selectedExerciseId={effectiveStatsExerciseId}
        onSelectExercise={setSelectedStatsExerciseId}
        exerciseProgressionData={exerciseProgressionData}
        onBack={() => setShowStatistics(false)}
      />
    );
  }

  if (selectedExercise) {
    return <ExerciseDetailView exercise={selectedExercise} isEn={isEn} isRtl={isRtl} gender={gender} onBack={() => setSelectedExercise(null)} t={t} />;
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
          {programEntry?.program?.genderAdjusted && <p style={FS.noteText}>{t("fitness.genderAdjustedNote")}</p>}
        </div>
        <button onClick={() => setEditing(true)} style={{ ...S.exportBtn, width: "auto", padding: "9px 14px", marginBottom: 0 }}><Edit3 size={14} /> {t("fitness.editProgram")}</button>
      </div>

      <div style={FS.toolsRow}>
        <button onClick={varyProgram} style={FS.toolBtn}><Repeat size={14} /> {t("fitness.varyProgram")}</button>
        <button onClick={() => setShowStatistics(true)} style={FS.toolBtn}><BarChart3 size={14} /> {t("fitness.statisticsBtn")}</button>
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

      {lastSessionSummary && (
        <div style={FS.volumeCard}>
          <div style={S.chartTitle}>{t("fitness.trainingVolumeTitle")}</div>
          {Object.keys(lastSessionSummary.volumeByMuscle).length > 0 ? (
            Object.entries(lastSessionSummary.volumeByMuscle).sort((a, b) => b[1] - a[1]).map(([muscle, vol]) => (
              <div key={muscle} style={FS.volumeRow}>
                <div style={FS.volumeRowHead}>
                  <span>{t(`fitness.muscleGroups.${muscle}`)}</span>
                  <span style={FS.volumeValue}>{Math.round(vol).toLocaleString()} {t("fitness.volumeUnit")}</span>
                </div>
                <div style={FS.barTrack}><div style={{ ...FS.barFill, width: `${maxMuscleVolume > 0 ? Math.round((vol / maxMuscleVolume) * 100) : 0}%` }} /></div>
              </div>
            ))
          ) : (
            <p style={FS.noteText}>{t("fitness.noWeightedVolumeNote")}</p>
          )}
          {lastSessionSummary.calories != null ? (
            <div style={FS.caloriesRow}><Flame size={14} color="#D17B5F" /> {t("fitness.estimatedCaloriesValue", { value: lastSessionSummary.calories })}</div>
          ) : (
            <div style={FS.caloriesRow}><Flame size={14} color="var(--muted2)" /> {t("fitness.estimatedCaloriesNeedWeight")}</div>
          )}
        </div>
      )}

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
                  gender={gender}
                  isLogging={loggingKey === key}
                  onToggleLog={() => setLoggingKey(loggingKey === key ? null : key)}
                  onOpenDetail={() => setSelectedExercise(ex)}
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
            <button onClick={() => startFocusWorkout(day)} style={FS.startWorkoutBtn}><Play size={15} /> {t("fitness.startWorkoutBtn")}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
