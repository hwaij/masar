import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "framer-motion";
import {
  Dumbbell, PersonStanding, Footprints, HeartPulse, Bike, Wind, Flame, Settings2, StretchHorizontal,
  AlertTriangle, Edit3, Check, Repeat, TrendingUp, X, ChevronLeft, ChevronRight,
  Circle, Play, Pause, SkipForward, PartyPopper, Trophy, Clock, ListChecks, Share2, BarChart3, Youtube,
  FileText, Camera, Sparkles, LayoutGrid, Target, Trash2, Plus, Heart,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { store, getOwner } from "../lib/store";
import { useModuleTour } from "../lib/useModuleTour";
import SpotlightTour from "./SpotlightTour";
import { uid, formatNumberLatin } from "../lib/helpers";
import { isolateNumbers } from "../lib/bidi";
import { localDayKey } from "../lib/tips";
import {
  FITNESS_GOALS, EQUIPMENT_ENVIRONMENTS, EXPERIENCE_LEVELS, SESSION_DURATIONS,
  INJURY_AREAS, GEAR_TYPES, MOVEMENT_PATTERNS, EXERCISES_BY_ID,
} from "../lib/exercises-db";
import {
  buildProgram, pickAlternatives, suggestProgression, seedFromOwner, estimateOneRepMax,
  getLastPerformance, computeSessionVolumeByMuscle, estimateSessionCalories, mostRecentLoggedDate,
  aggregateLogsByDate, setVolume, restSecondsForGoalAndType, exercisesForMuscle, youtubeSearchUrl, formatRestLabel,
} from "../lib/fitness-engine";
import { NO_CONDITION } from "../lib/health";
import { playRestEndSound, primeAudioContext } from "../lib/sound";
import { shareAchievementCard } from "../lib/achievementShare";
import MuscleDiagram from "./MuscleDiagram";
import InteractiveMuscleDiagram from "./InteractiveMuscleDiagram";
import ManualProgramBuilder from "./ManualProgramBuilder";
import { S } from "./styles";
import { FS, ICONS, CARDIO_MOBILITY_ICON, DIFFICULTY_ORDER } from "./fitnessStyles";

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

function ExerciseRow({ exercise, isEn, gender, isLogging, onToggleLog, logWeight, setLogWeight, logReps, setLogReps, logSets, setLogSets, onSubmitPerformance, isSwapping, onToggleSwap, alternatives, onSelectAlternative, onAdjustRest, onOpenDetail, progression, t, dataTour }) {
  const gear = GEAR_TYPES.find((g) => g.key === exercise.gear);
  const GearIcon = gear ? ICONS[gear.icon] || Dumbbell : Dumbbell;
  const CardioMobilityIcon = CARDIO_MOBILITY_ICON[exercise.muscle];
  const pattern = MOVEMENT_PATTERNS.find((p) => p.key === exercise.movementPattern);
  const ForwardChevron = isEn ? ChevronRight : ChevronLeft;
  return (
    <div style={FS.exerciseRow} data-tour={dataTour}>
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
          <div style={FS.exerciseMeta}>
            {isolateNumbers(t("fitness.setsReps", { sets: exercise.sets, reps: isEn ? (exercise.repsEn || exercise.reps) : exercise.reps }))} · {isolateNumbers(formatRestLabel(t, exercise.restSeconds))}
            {onAdjustRest && (
              <span style={FS.restEditGroup}>
                <button type="button" onClick={() => onAdjustRest(-5)} style={FS.restAdjustBtn} aria-label={t("fitness.decreaseRestBtn")}>−</button>
                <button type="button" onClick={() => onAdjustRest(5)} style={FS.restAdjustBtn} aria-label={t("fitness.increaseRestBtn")}>+</button>
              </span>
            )}
          </div>
          <div style={FS.exerciseMeta}>{t("fitness.targetMuscle")}: {t(`fitness.muscleGroups.${exercise.muscle}`)}</div>
          <div style={FS.badgeRow}>
            <span style={FS.badge}><GearIcon size={11} /> {isEn ? gear?.nameEn : gear?.name}</span>
            <span style={{ ...FS.badge, ...(exercise.type === "compound" ? FS.typeBadgeCompound : exercise.type === "isolation" ? FS.typeBadgeIsolation : {}) }}>
              {t(`fitness.exerciseTypes.${exercise.type}`)}
            </span>
            <span style={FS.badge}><DifficultyDots difficulty={exercise.difficulty} /> {t(`fitness.experienceLevels.${exercise.difficulty}`)}</span>
            {pattern && <span style={FS.badge}>{isEn ? pattern.nameEn : pattern.name}</span>}
            {exercise.womenFriendly && (
              <span style={{ ...FS.badge, color: "#D17B9E", borderColor: "rgba(209,123,158,0.35)", background: "rgba(209,123,158,0.1)" }}>
                <Heart size={10} /> {t("fitness.manualBuilder.womenFriendlyBadge")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={FS.actionsRow}>
        <button onClick={onOpenDetail} style={FS.smallBtn}>
          <ForwardChevron size={12} /> {t("fitness.detailsBtn")}
        </button>
        {onToggleSwap && (
          <button onClick={onToggleSwap} style={{ ...FS.smallBtn, border: "1px solid var(--border2)", background: "transparent", color: "var(--muted2)" }}>
            <Repeat size={12} /> {t("fitness.alternativeBtn")}
          </button>
        )}
        <button onClick={onToggleLog} style={FS.smallBtn}>
          <TrendingUp size={12} /> {t("fitness.logPerformance")}
        </button>
      </div>
      {onToggleSwap && isSwapping && (
        <div style={FS.alternativesPanel}>
          <div style={FS.alternativesTitle}>{t("fitness.chooseAlternativeTitle")}</div>
          {alternatives.length === 0 ? (
            <p style={FS.noteText}>{t("fitness.alternativeNotFound")}</p>
          ) : (
            alternatives.map((alt) => {
              const altGear = GEAR_TYPES.find((g) => g.key === alt.gear);
              const AltGearIcon = altGear ? ICONS[altGear.icon] || Dumbbell : Dumbbell;
              return (
                <button key={alt.id} onClick={() => onSelectAlternative(alt)} style={FS.alternativeOptionRow}>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
                    <div style={FS.alternativeOptionName}>{isEn ? (alt.nameEn || alt.name) : alt.name}</div>
                    <div style={FS.badgeRow}>
                      <span style={FS.badge}><AltGearIcon size={10} /> {isEn ? altGear?.nameEn : altGear?.name}</span>
                      <span style={{ ...FS.badge, ...(alt.type === "compound" ? FS.typeBadgeCompound : alt.type === "isolation" ? FS.typeBadgeIsolation : {}) }}>
                        {t(`fitness.exerciseTypes.${alt.type}`)}
                      </span>
                    </div>
                  </div>
                  <ForwardChevron size={14} color="var(--muted2)" />
                </button>
              );
            })
          )}
          <button onClick={onToggleSwap} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>{t("common.buttons.cancel")}</button>
        </div>
      )}
      {progression && (
        <div style={FS.progressionBadge}>
          <TrendingUp size={13} />
          {isolateNumbers(progression.type === "weight"
            ? t("fitness.progressionWeight", { weight: progression.suggestedWeight })
            : t("fitness.progressionReps", { reps: progression.suggestedReps }))}
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
          {exercise.womenFriendly && (
            <span style={{ ...FS.badge, color: "#D17B9E", borderColor: "rgba(209,123,158,0.35)", background: "rgba(209,123,158,0.1)" }}>
              <Heart size={10} /> {t("fitness.manualBuilder.womenFriendlyBadge")}
            </span>
          )}
        </div>
      </div>

      <div style={FS.detailSectionCard}>
        <div style={FS.exerciseMeta}>{isolateNumbers(t("fitness.setsReps", { sets: exercise.sets, reps: isEn ? (exercise.repsEn || exercise.reps) : exercise.reps }))} · {isolateNumbers(formatRestLabel(t, exercise.restSeconds))}</div>
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

// شاشة اختيار عضلة بالضغط المباشر على مخطط الجسم التشريحي التفاعلي (بدل
// قائمة نصية) لبناء "جلسة تمرين مخصَّصة" لعضلة واحدة - قائمة التمارين
// المعروضة أسفل المخطط هي فعلياً exercisesForMuscle() (نفس فلترة معدات/
// إصابات/خبرة المستخدَمة في محرِّك بناء البرنامج التلقائي، بلا أي تكرار
// لتلك الفلترة هنا).
function MusclePickerScreen({ gender, isEn, isRtl, t, pickedMuscle, onSelectMuscle, candidates, pickedIds, onToggleId, onSave, onBack }) {
  const BackChevron = isRtl ? ChevronRight : ChevronLeft;
  return (
    <div style={S.view}>
      <button onClick={onBack} style={FS.backRow}><BackChevron size={16} /> {t("fitness.backToProgram")}</button>
      <div style={FS.hero}>
        <div style={FS.heroIcon}><Target size={22} color="var(--on-accent)" /></div>
        <div>
          <div style={FS.heroTitle}>{t("fitness.customSessionPickerTitle")}</div>
          <div style={FS.heroSub}>{t("fitness.customSessionPickerSub")}</div>
        </div>
      </div>
      <div style={FS.formCard}>
        <InteractiveMuscleDiagram
          selected={pickedMuscle}
          onSelect={onSelectMuscle}
          gender={gender}
          muscleLabel={(k) => t(`fitness.muscleGroups.${k}`)}
          frontLabel={t("fitness.bodyViewFront")}
          backLabel={t("fitness.bodyViewBack")}
          width={230}
        />
      </div>
      {pickedMuscle && (
        <div style={FS.formCard}>
          <div style={{ ...FS.summaryLabel, marginBottom: 8 }}>{t(`fitness.muscleGroups.${pickedMuscle}`)}</div>
          {candidates.length === 0 ? (
            <p style={FS.noteText}>{t("fitness.customSessionNoExercises")}</p>
          ) : (
            candidates.map((ex) => {
              const checked = pickedIds.has(ex.id);
              return (
                <label key={ex.id} style={{ ...FS.exerciseRow, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleId(ex.id)}
                    style={{ width: 20, height: 20, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={FS.exerciseName}>{isEn ? (ex.nameEn || ex.name) : ex.name}</div>
                    <div style={FS.exerciseMeta}>
                      {isolateNumbers(t("fitness.setsReps", { sets: ex.sets, reps: isEn ? (ex.repsEn || ex.reps) : ex.reps }))} · {isolateNumbers(formatRestLabel(t, ex.restSeconds))}
                    </div>
                    {ex.womenFriendly && (
                      <div style={FS.badgeRow}>
                        <span style={{ ...FS.badge, color: "#D17B9E", borderColor: "rgba(209,123,158,0.35)", background: "rgba(209,123,158,0.1)" }}>
                          <Heart size={10} /> {t("fitness.manualBuilder.womenFriendlyBadge")}
                        </span>
                      </div>
                    )}
                  </div>
                </label>
              );
            })
          )}
          {candidates.length > 0 && (
            <button onClick={onSave} disabled={pickedIds.size === 0} style={{ ...S.saveBtn, marginTop: 10, opacity: pickedIds.size === 0 ? 0.5 : 1 }}>
              {t("fitness.saveCustomSessionBtn", { count: pickedIds.size })}
            </button>
          )}
        </div>
      )}
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
  restEndsAt, restRemainingMs, restTotalMs, restPaused, onSkipRest, onPauseRest, onResumeRest, onAdjustRest,
  lastOneRepMax, lastPerformance,
  onNextExercise, onFinishWorkout, onExit,
}) {
  const exercise = flatExercises[exIndex];
  const nextExercise = flatExercises[exIndex + 1] || null;
  const CardioMobilityIcon = CARDIO_MOBILITY_ICON[exercise.muscle];
  const isLast = exIndex >= flatExercises.length - 1;
  const resting = (restEndsAt != null && restRemainingMs > 0) || restPaused;
  const restSecondsLeft = Math.ceil(restRemainingMs / 1000);
  const restTimeLabel = `${Math.floor(restSecondsLeft / 60)}:${String(restSecondsLeft % 60).padStart(2, "0")}`;
  const restProgressPct = restTotalMs > 0 ? Math.max(0, Math.min(100, (restRemainingMs / restTotalMs) * 100)) : 0;

  // مقارنة الوزن المُدخَل حالياً بآخر أداء مسجَّل لنفس التمرين (جلسة سابقة
  // فعلية، لا مجموعات اليوم نفسه - انظر getLastPerformance في fitness-engine.js).
  const currentWeightNum = parseFloat(weight);
  let weightComparison = null;
  if (lastPerformance && lastPerformance.weight > 0 && weight.trim() !== "" && Number.isFinite(currentWeightNum)) {
    const diff = Math.round((currentWeightNum - lastPerformance.weight) * 100) / 100;
    if (diff > 0) weightComparison = { text: isolateNumbers(t("fitness.comparisonHeavier", { diff })), tone: "up" };
    else if (diff < 0) weightComparison = { text: isolateNumbers(t("fitness.comparisonLighter", { diff: Math.abs(diff) })), tone: "down" };
    else weightComparison = { text: t("fitness.comparisonSame"), tone: "same" };
  }

  return (
    <div style={{ ...S.view, ...FS.focusWrap }}>
      <button onClick={onExit} style={FS.exitFocusBtn}><X size={15} /> {t("fitness.exitWithoutFinishBtn")}</button>
      <div style={FS.focusProgress}>{isolateNumbers(t("fitness.exerciseProgress", { current: exIndex + 1, total: flatExercises.length }))}</div>

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
      <div style={FS.focusMeta}>{isolateNumbers(t("fitness.setsReps", { sets: exercise.sets, reps: isEn ? (exercise.repsEn || exercise.reps) : exercise.reps }))} · {isolateNumbers(formatRestLabel(t, exercise.restSeconds))}</div>

      {resting ? (
        <div style={FS.restCard}>
          <div style={FS.restTitle}>{restPaused ? t("fitness.restPausedTitle") : t("fitness.restingTitle")}</div>
          <div style={FS.restSetProgress}>{isolateNumbers(t("fitness.setProgress", { current: Math.min(setsDoneForCurrent + 1, exercise.sets), total: exercise.sets }))}</div>
          <div style={FS.restTime}>{isolateNumbers(restTimeLabel)}</div>
          <div style={FS.restProgressTrack}><div style={{ ...FS.restProgressFill, width: `${restProgressPct}%` }} /></div>
          <div style={FS.restControlsRow}>
            <button onClick={() => onAdjustRest(-10)} style={FS.restAdjustSecBtn}><bdi dir="ltr" style={{ unicodeBidi: "isolate" }}>−10s</bdi></button>
            <button onClick={restPaused ? onResumeRest : onPauseRest} style={FS.restPauseBtn}>
              {restPaused ? <Play size={14} /> : <Pause size={14} />} {restPaused ? t("fitness.resumeBtn") : t("fitness.pauseBtn")}
            </button>
            <button onClick={() => onAdjustRest(10)} style={FS.restAdjustSecBtn}><bdi dir="ltr" style={{ unicodeBidi: "isolate" }}>+10s</bdi></button>
          </div>
          {nextExercise && (
            <div style={FS.restNextUp}>{t("fitness.nextUpLabel")}: {isEn ? (nextExercise.nameEn || nextExercise.name) : nextExercise.name}</div>
          )}
          <button onClick={onSkipRest} style={FS.skipRestBtn}><SkipForward size={13} /> {t("fitness.skipRestBtn")}</button>
        </div>
      ) : (
        <div style={FS.focusCard}>
          <div style={FS.focusSetTitle}>{isolateNumbers(t("fitness.setProgress", { current: Math.min(setsDoneForCurrent + 1, exercise.sets), total: exercise.sets }))}</div>
          <div style={FS.setsCompletedRow}>
            {Array.from({ length: exercise.sets }).map((_, i) => (
              <span key={i} style={{ ...FS.setDot, background: i < setsDoneForCurrent ? "#5FA8A0" : "var(--border2)" }} />
            ))}
          </div>
          {lastPerformance && (
            <div style={FS.lastPerformanceRow}>
              <TrendingUp size={12} />
              {isolateNumbers(lastPerformance.weight > 0
                ? t("fitness.lastTimeWeightReps", { weight: lastPerformance.weight, reps: lastPerformance.reps })
                : t("fitness.lastTimeRepsOnly", { reps: lastPerformance.reps }))}
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
            <div style={FS.oneRepMaxBadge}><TrendingUp size={13} /> {isolateNumbers(t("fitness.oneRepMaxEstimate", { value: lastOneRepMax }))}</div>
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
  // خلل حقيقي وُجد وأُصلح: toLocaleString() بلا معامل لغة صريح يعتمد على
  // لغة المتصفح/النظام الفعلية - لو كانت عربية قد يُنتج أرقاماً هندية
  // (١٬٢٣٤) بدل إنجليزية، نفس خطورة عدّاد الاستغفار المُصلَح أدناه.
  const volumeText = `${formatNumberLatin(Math.round(summary.totalVolume), isEn ? "en" : "ar")} ${t("fitness.volumeUnit")}`;
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
      bestText,
      summaryBestLabel: t("fitness.summaryBestLabel"),
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
    <div style={S.view} className="sheet-in">
      <div style={FS.summaryHeroIcon}><PartyPopper size={26} color="var(--on-accent)" /></div>
      <div style={FS.summaryTitle}>{t("fitness.summaryTitle")}</div>

      <div style={FS.summaryStatCard}>
        <div style={FS.summaryStatRow}>
          <Clock size={16} color="#5FA8A0" />
          <span style={FS.summaryStatLabel}>{t("fitness.summaryDurationLabel")}</span>
          <span style={FS.summaryStatValue}>{isolateNumbers(durationText)}</span>
        </div>
        <div style={FS.summaryStatRow}>
          <BarChart3 size={16} color="#C9A24B" />
          <span style={FS.summaryStatLabel}>{t("fitness.summaryVolumeLabel")}</span>
          <span style={FS.summaryStatValue}>{isolateNumbers(volumeText)}</span>
        </div>
        <div style={FS.summaryStatRow}>
          <Trophy size={16} color="#D9B33B" />
          <span style={FS.summaryStatLabel}>{t("fitness.summaryBestLabel")}</span>
          <span style={FS.summaryStatValue}>{isolateNumbers(bestText)}</span>
        </div>
        <div style={{ ...FS.summaryStatRow, borderBottom: "none" }}>
          <ListChecks size={16} color="#6FA8DC" />
          <span style={FS.summaryStatLabel}>{t("fitness.summaryExercisesLabel")}</span>
          <span style={FS.summaryStatValue}>{isolateNumbers(exercisesText)}</span>
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
  const reduceMotion = useReducedMotion();
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
              <Bar dataKey="volume" fill="#5FA8A0" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={!reduceMotion} animationDuration={450} />
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
                  <Line type="monotone" dataKey="weight" stroke="#C9A24B" strokeWidth={2.5} dot={{ r: 3, fill: "#C9A24B" }} isAnimationActive={!reduceMotion} animationDuration={450} />
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

export default function FitnessView({ healthProfile, showToast, profile, setProfile, journeyActive }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const isRtl = !isEn;
  const reduceMotion = useReducedMotion();
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
  const [swappingKey, setSwappingKey] = useState(null);
  // اختيار عضلة بالضغط المباشر على المخطط التشريحي (بدل قوائم نصية) لبناء
  // "جلسة تمرين مخصَّصة" لعضلة واحدة - شاشة منفصلة عن محرِّر الملف الرياضي
  // (draft) وعن البرنامج التلقائي كلياً؛ pickedExerciseIds تُصفَّر عند كل
  // تغيير عضلة (معرِّفات تمرين عضلة سابقة لا معنى لها لعضلة جديدة).
  const [showMusclePicker, setShowMusclePicker] = useState(false);
  const [pickedMuscle, setPickedMuscle] = useState(null);
  const [pickedExerciseIds, setPickedExerciseIds] = useState(() => new Set());
  // بناء برنامج أسبوعي يدوي كامل (بديل حقيقي للتوليد التلقائي، لا استبدال
  // دائم له - المحرّك التلقائي يبقى خياراً متاحاً بجانبه دائماً). يستبدل
  // البرنامج الحالي بالكامل عند الحفظ، لذا يمر أولاً بتأكيد صريح إن وُجد
  // برنامج حالي فعلاً (انظر confirmManualBuilder أدناه).
  const [showManualBuilder, setShowManualBuilder] = useState(false);
  const [confirmManualBuilder, setConfirmManualBuilder] = useState(false);
  // "append": المستخدم يملك برنامجاً يدوياً محفوظاً بالفعل ويضيف يوماً جديداً
  // فقط - بلا تأكيد استبدال (لا شيء يُستبدَل)، وقائمة الأيام تُحمَّل مسبقاً
  // بأيامه الحالية (manualBuilderMode==="build" الافتراضي يبدأ بقائمة فارغة).
  const [manualBuilderMode, setManualBuilderMode] = useState("build");
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
  const [restTotalMs, setRestTotalMs] = useState(0);
  const [restPausedRemainingMs, setRestPausedRemainingMs] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [focusStartedAt, setFocusStartedAt] = useState(null);
  const [focusSessionLogs, setFocusSessionLogs] = useState([]); // إدخالات هذه الجلسة فقط (لملخّص الإنهاء)
  const [finishedSummary, setFinishedSummary] = useState(null);

  useEffect(() => {
    if (restEndsAt == null) return undefined;
    const id = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  // انتهاء الراحة الطبيعي (وصول العدّ التنازلي للصفر) فقط - التخطي اليدوي
  // (skipRest) يمرّ عبر نفس completeRest أدناه بلا صوت/اهتزاز، حتى يتصرّف
  // كلاهما بنفس منطق "تدفّق التمرين التلقائي" (الانتقال للتمرين التالي إن
  // كانت هذه آخر مجموعة في التمرين الحالي - انظر completeRest).
  useEffect(() => {
    if (restEndsAt == null) return;
    if (Date.now() >= restEndsAt) {
      completeRest(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTick, restEndsAt]);

  // localDayKey (تقويم محلي) لا todayKey (يعتمد UTC) - كل تسجيلات الأداء
  // (workoutLog) والقائمة الأسبوعية أدناه (weekCompletedCount) تُخزَّن أصلاً
  // بتاريخ محلي عبر localDayKey؛ استخدام todayKey هنا كان يُنتج مفتاحاً
  // مختلفاً لعدة ساعات بعد كل منتصف ليل محلي لأي منطقة زمنية +UTC (تحديداً
  // الكويت/الخليج +3 - جمهور مسار الأساسي) - فتفوّت مقارنة "آخر أداء" في
  // وضع التركيز أداء اليوم نفسه بالخطأ، ويُسجَّل "إنجاز اليوم" تحت مفتاح
  // تاريخ مختلف عن باقي بيانات نفس اليوم فعلياً.
  const today = localDayKey();

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
          entry = { ...entry, program: buildProgram({ ...fp, gender }, seed, hasPerformanceHistory, entry.program), seed, lastRotatedAt: new Date().toISOString() };
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

  // جولة الرياضة السياقية (Onboarding - Phase D، وُسِّعت في Phase G من
  // خطوتين إلى 6): 1) بطاقة معلوماتية بلا هدف محدَّد (لا Spotlight حي) عن
  // نموذج الإعداد (أو تُتخطّى مباشرة لمن لديه خطة من قبل) → 2) شرح صف
  // التمرين (تسجيل/تبديل/تفاصيل) → 3) شرح زر الإحصائيات → 4) تفاعلية على
  // "ابدأ التمرين" لأول يوم → "waiting" بانتظار إنهاء التمرين فعلياً (زر
  // "إنهاء التمرين" متاح في أي وقت داخل وضع التركيز، لا يتطلب إكمال كل
  // المجموعات) → 6) تلميح على شاشة ملخّص الإنجاز.
  //
  // ملاحظة مهمة (خلل حقيقي وُجد وأُصلح في Phase G): الخطوة 1 كانت أصلاً
  // Spotlight تفاعلياً حياً على زر "حفظ وإنشاء الخطة" - لكن هذا الزر يقع
  // في أسفل نموذج طويل (هدف/خبرة/أيام/مدة/معدات/إصابات)، فتقنية "القص"
  // المستخدمة في SpotlightTour (تعتيم كل ما هو خارج حدود العنصر المستهدَف)
  // تُغطّي وتمنع الضغط على كل حقول النموذج الواقعة أعلى الزر بمجرد ظهور
  // هذه الخطوة - يمنع المستخدم فعلياً من تعبئة النموذج! التصحيح: خطوة 1
  // أصبحت بطاقة معلوماتية مركزية بلا هدف (تُغلَق بضغطة واحدة قبل أن يبدأ
  // المستخدم التعبئة فعلياً)، بدل بقاء Spotlight معلَّقاً فوق نموذج طويل.
  //
  // شرح المؤقّت التلقائي وأزرار +10/-10 يبقى نصياً في تلميح الخطوة 4 نفسها
  // بدل Spotlight حي داخل وضع التركيز - لنفس سبب الهشاشة الموثَّق سابقاً.
  const fitnessTour = useModuleTour("fitness", profile, setProfile, { active: loaded && !journeyActive });
  useEffect(() => {
    if (fitnessTour.step === 1 && hasProfile) fitnessTour.setStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitnessTour.step, hasProfile]);
  useEffect(() => {
    if (fitnessTour.step === 4 && focusDay !== null) fitnessTour.setStep("waiting");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitnessTour.step, focusDay]);
  useEffect(() => {
    if (fitnessTour.step === "waiting" && finishedSummary) fitnessTour.setStep(6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitnessTour.step, finishedSummary]);

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
      const vol = setVolume(log);
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

  // كارديو/المرونة تُسجَّل دائماً بلا وزن (مدتها بالثواني لا حمل رقمي) -
  // ظهورها في قائمة اختيار "تطوّر الوزن عبر الجلسات" كان يعطي المستخدم
  // خياراً يؤدي دائماً لرسم بياني فارغ بلا أي تفسير - استبعادها هنا حتى لا
  // نعرض خياراً لا يمكنه إظهار شيء أصلاً.
  const exerciseOptions = useMemo(() => {
    const ids = Array.from(new Set(workoutLog.map((l) => l.exerciseId)));
    return ids.map((id) => EXERCISES_BY_ID[id]).filter((e) => e && e.type !== "cardio" && e.type !== "mobility");
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

  // "رجوع" بلا حفظ كان يترك draft كما هو (تعديلات لم تُحفَظ) - إعادة فتح
  // "تعديل تقييمي" لاحقاً كانت تعرض تلك التعديلات المهجورة بدل الملف
  // الفعلي المحفوظ، موحية بأن الملف الشخصي تغيّر رغم أنه لم يتغيّر إطلاقاً.
  function cancelEditing() {
    setDraft({
      goal: fitnessProfile.goal || null, equipment: fitnessProfile.equipment || null, daysPerWeek: fitnessProfile.daysPerWeek || 3,
      experience: fitnessProfile.experience || null, sessionMinutes: fitnessProfile.sessionMinutes || 45, injuries: fitnessProfile.injuries || [],
    });
    setEditing(false);
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
    const entry = { ...programEntry, program: buildProgram({ ...fitnessProfile, gender }, seed, workoutLog.length > 0, programEntry.program), seed };
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

  // Priority 3: بدائل ذكية وكافية - بدل استبدال فوري ببديل عشوائي واحد،
  // "بديل" يفتح لائحة مرتّبة (pickAlternatives في fitness-engine.js تطبّق
  // نفس فلاتر المعدات/الإصابات/الخبرة المستخدَمة في بناء البرنامج نفسه)
  // ويختار المستخدم منها صراحة.
  async function applySwap(dayIndex, exIndex, alt) {
    if (!programEntry) return;
    const exercise = programEntry.program.days[dayIndex].exercises[exIndex];
    const prevEntry = programEntry;
    // البديل قد يكون من نوع مختلف لنفس العضلة (مركّب↔عزل) - راحة التمرين
    // القديم (سواء الافتراضية أو مُعدَّلة يدوياً) كانت محسوبة لنوعه هو، لا
    // للبديل الجديد. لا نُعيد الحساب إلا عند تغيّر النوع فعلياً حتى لا نُلغي
    // تعديل راحة يدوي سابق للمستخدم بلا داعٍ حين يبقى النوع نفسه.
    const newRestSeconds = alt.type !== exercise.type
      ? restSecondsForGoalAndType(programEntry.program.goal, alt.type)
      : exercise.restSeconds;
    const newExercise = { ...alt, sets: exercise.sets, reps: exercise.reps, restSeconds: newRestSeconds };
    const newDays = programEntry.program.days.map((d, di) => (di !== dayIndex ? d : { ...d, exercises: d.exercises.map((e, ei) => (ei !== exIndex ? e : newExercise)) }));
    const entry = { ...programEntry, program: { ...programEntry.program, days: newDays } };
    setProgramEntry(entry);
    setSwappingKey(null);
    const res = await store.saveWorkoutProgram(entry);
    if (!res.ok) { setProgramEntry(prevEntry); showToast(t("common.errors.saveFailed")); return; }
    showToast(t("fitness.alternativeApplied"));
  }

  // تعديل يدوي لمدة راحة تمرين واحد من شاشة البرنامج (Priority 2: مؤقّت
  // ذكي) - القيمة المقترحة تلقائياً حسب نوع التمرين (مركّب/عزل/كارديو/
  // مرونة، انظر restSecondsForType في fitness-engine.js) هي مجرّد بداية،
  // وهذا التعديل يُستخدَم فوراً في وضع التركيز بعد الحفظ.
  async function adjustExerciseRest(dayIndex, exIndex, deltaSeconds) {
    if (!programEntry) return;
    const exercise = programEntry.program.days[dayIndex].exercises[exIndex];
    const nextRest = Math.max(10, Math.min(300, (exercise.restSeconds || 60) + deltaSeconds));
    if (nextRest === exercise.restSeconds) return;
    const prevEntry = programEntry;
    const newDays = programEntry.program.days.map((d, di) => (di !== dayIndex ? d : { ...d, exercises: d.exercises.map((e, ei) => (ei !== exIndex ? e : { ...e, restSeconds: nextRest })) }));
    const entry = { ...programEntry, program: { ...programEntry.program, days: newDays } };
    setProgramEntry(entry);
    const res = await store.saveWorkoutProgram(entry);
    if (!res.ok) setProgramEntry(prevEntry);
  }

  function selectPickedMuscle(muscle) {
    setPickedMuscle(muscle);
    setPickedExerciseIds(new Set());
  }

  function toggleExercisePick(exerciseId) {
    setPickedExerciseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) next.delete(exerciseId); else next.add(exerciseId);
      return next;
    });
  }

  // يبني "جلسة تمرين مخصَّصة" (تمارين عضلة واحدة، مختارة يدوياً من مخطط
  // الجسم التفاعلي، بنفس فلترة المعدات/الإصابات/الخبرة وأرقام حجم التدريب
  // المستخدَمة في البرنامج التلقائي تماماً - انظر exercisesForMuscle في
  // fitness-engine.js) ويحفظها ضمن program.customSessions - حقل جديد داخل
  // نفس عمود program (JSONB واحد بالكامل في قاعدة البيانات، انظر
  // store.saveWorkoutProgram) لا نظام تخزين مواز، فلا حاجة لأي تعديل مخطط
  // قاعدة بيانات (SQL) لهذه الميزة.
  async function saveCustomSession() {
    if (!programEntry || !pickedMuscle || pickedExerciseIds.size === 0) return;
    const candidates = exercisesForMuscle(pickedMuscle, fitnessProfile);
    const chosen = candidates.filter((e) => pickedExerciseIds.has(e.id));
    if (chosen.length === 0) return;
    const session = { id: uid(), muscle: pickedMuscle, createdAt: new Date().toISOString(), exercises: chosen };
    const prevEntry = programEntry;
    const entry = { ...programEntry, program: { ...programEntry.program, customSessions: [...(programEntry.program.customSessions || []), session] } };
    setProgramEntry(entry);
    const res = await store.saveWorkoutProgram(entry);
    if (!res.ok) { setProgramEntry(prevEntry); showToast(t("common.errors.saveFailed")); return; }
    setShowMusclePicker(false); setPickedMuscle(null); setPickedExerciseIds(new Set());
    showToast(t("fitness.customSessionSaved"));
  }

  async function deleteCustomSession(sessionId) {
    if (!programEntry) return;
    const prevEntry = programEntry;
    const nextSessions = (programEntry.program.customSessions || []).filter((s) => s.id !== sessionId);
    const entry = { ...programEntry, program: { ...programEntry.program, customSessions: nextSessions } };
    setProgramEntry(entry);
    const res = await store.saveWorkoutProgram(entry);
    if (!res.ok) { setProgramEntry(prevEntry); showToast(t("common.errors.saveFailed")); }
  }

  // يحوّل أيام برنامج يدوي محفوظ فعلاً (program.days ببنيته الكاملة) إلى
  // الشكل الداخلي البسيط الذي يتوقّعه ManualProgramBuilder.jsx ({id, name,
  // exercises}) - عكس التحويل الذي تنفّذه saveManualProgram أدناه بالضبط.
  // يُستخدَم فقط عند "أضف يوماً جديداً" (append) لتحميل الأيام المحفوظة
  // كما هي في قائمة الباني، فتظهر جاهزة دون أي حاجة لإعادة بنائها.
  function convertProgramDaysToBuilderDays(programDays) {
    return (programDays || []).map((d) => ({ id: uid(), name: d.customName || t(`fitness.dayTypes.${d.dayType}`), exercises: d.exercises }));
  }

  function openManualBuilderFresh() {
    setManualBuilderMode("build");
    setShowManualBuilder(true);
  }

  function openManualBuilderAppend() {
    setManualBuilderMode("append");
    setShowManualBuilder(true);
  }

  // يستقبل days ({id, name, exercises}[]) من ManualProgramBuilder.jsx ويحوّلها
  // لبنية program.days الفعلية - نفس بنية البرنامج التلقائي تماماً
  // ({dayIndex, dayType, exercises} - customName إضافي هنا لعرض اسم اليوم
  // اليدوي الحر بدل ترجمة dayType، انظر عرضه أدناه في شاشة البرنامج) - فتعمل
  // تلقائياً مع وضع التركيز/تسجيل الأداء/التطوّر التلقائي بلا أي تعديل
  // إضافي، ومع "بديل"/"تعديل راحة" أيضاً (فهرسة programEntry.program.days
  // صحيحة هنا لأنها أيام حقيقية بخلاف "جلسة مخصَّصة" المنفصلة).
  //
  // weekRotationEnabled يُصفَّر دائماً هنا عمداً - التدوير الأسبوعي التلقائي
  // (انظر مؤثّر تحميل البرنامج أعلاه) يستدعي buildProgram من جديد على فترات
  // ويستبدل days كاملة؛ لو بقي مفعَّلاً من برنامج تلقائي سابق، كان سيمحو هذا
  // البرنامج اليدوي بصمت عند أول موعد تدوير قادم.
  async function saveManualProgram(builtDays) {
    const program = {
      days: builtDays.map((d, dayIndex) => ({ dayIndex, dayType: "custom", customName: d.name, exercises: d.exercises })),
      goal: fitnessProfile.goal, experience: fitnessProfile.experience, daysPerWeek: builtDays.length,
      sessionMinutes: fitnessProfile.sessionMinutes, equipment: fitnessProfile.equipment, injuries: fitnessProfile.injuries,
      hasInjurySubstitutions: false, genderAdjusted: false, isManual: true,
      customSessions: programEntry?.program?.customSessions || [],
      seed: programEntry?.seed ?? seedFromOwner(getOwner()),
      generatedAt: new Date().toISOString(),
    };
    const prevEntry = programEntry;
    const entry = { ...programEntry, program, weekRotationEnabled: false, rotationFrequency: null, lastRotatedAt: null };
    setProgramEntry(entry);
    const res = await store.saveWorkoutProgram(entry);
    if (!res.ok) { setProgramEntry(prevEntry); showToast(t("common.errors.saveFailed")); return; }

    if (fitnessProfile.daysPerWeek !== builtDays.length) {
      const prevProfile = fitnessProfile;
      const updatedProfile = { ...fitnessProfile, daysPerWeek: builtDays.length };
      setFitnessProfile(updatedProfile);
      const profileRes = await store.saveFitnessProfile(updatedProfile);
      if (!profileRes.ok) setFitnessProfile(prevProfile);
    }
    setShowManualBuilder(false);
    showToast(t("fitness.manualBuilder.programSaved"));
  }

  // حذف يوم واحد من برنامج يدوي محفوظ فعلاً (بلا إعادة بناء كامل) - إعادة
  // ترقيم dayIndex للأيام المتبقية إلزامية هنا (لا مجرّد تصفية) لأن
  // applySwap/adjustExerciseRest/startFocusWorkout كلها تعتمد على dayIndex
  // كفهرس حقيقي داخل المصفوفة - فهرس متقطّع (0،2،3 بعد حذف اليوم رقم 1)
  // كان سيكسر تلك الفهرسة لأي يوم بعد الفجوة.
  async function deleteManualDay(dayIndex) {
    if (!programEntry?.program?.isManual) return;
    if (!window.confirm(t("fitness.manualBuilder.removeDayConfirm"))) return;
    const prevEntry = programEntry;
    const newDays = programEntry.program.days.filter((d) => d.dayIndex !== dayIndex).map((d, i) => ({ ...d, dayIndex: i }));
    const entry = { ...programEntry, program: { ...programEntry.program, days: newDays } };
    setProgramEntry(entry);
    const res = await store.saveWorkoutProgram(entry);
    if (!res.ok) { setProgramEntry(prevEntry); showToast(t("common.errors.saveFailed")); return; }
    if (fitnessProfile.daysPerWeek !== newDays.length) {
      const prevProfile = fitnessProfile;
      const updatedProfile = { ...fitnessProfile, daysPerWeek: newDays.length };
      setFitnessProfile(updatedProfile);
      const profileRes = await store.saveFitnessProfile(updatedProfile);
      if (!profileRes.ok) setFitnessProfile(prevProfile);
    }
  }

  function switchToAutoBuilder() {
    setDraft({
      goal: fitnessProfile.goal || null, equipment: fitnessProfile.equipment || null, daysPerWeek: fitnessProfile.daysPerWeek || 3,
      experience: fitnessProfile.experience || null, sessionMinutes: fitnessProfile.sessionMinutes || 45, injuries: fitnessProfile.injuries || [],
    });
    setEditing(true);
  }

  // الوزن (خلافاً للتكرارات/المجموعات) لم يكن يُتحقَّق منه إطلاقاً - قيمة
  // غير رقمية (مثال: كتابة نص بالخطأ) تتحوّل لـ NaN، تُخزَّن كأنها وزن
  // حقيقي، وتنكشف لاحقاً كـ"بلا وزن مسجَّل" في كل حساب حجم/رقم قياسي (لأن
  // NaN falsy) - تمثيل صامت وخاطئ لأداء المستخدم الفعلي بدل رفض واضح.
  async function submitPerformance(exercise) {
    const reps = parseInt(logReps, 10);
    const sets = parseInt(logSets, 10);
    const weight = logWeight.trim() !== "" ? parseFloat(logWeight) : null;
    if (!Number.isFinite(reps) || reps <= 0 || !Number.isFinite(sets) || sets <= 0 || (weight != null && (!Number.isFinite(weight) || weight < 0))) {
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
    setRestEndsAt(null); setRestPausedRemainingMs(null); setRestTotalMs(0);
    setFocusStartedAt(Date.now());
    setFocusSessionLogs([]);
  }

  async function completeFocusSet() {
    const exercise = focusDay.exercises[focusExIndex];
    const reps = parseInt(focusReps, 10);
    const weight = focusWeight.trim() !== "" ? parseFloat(focusWeight) : null;
    if (!Number.isFinite(reps) || reps <= 0 || (weight != null && (!Number.isFinite(weight) || weight < 0))) { showToast(t("fitness.invalidPerformance")); return; }
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
    // مؤقّت الراحة يبدأ تلقائياً بلا أي تدخل من المستخدم فور تسجيل المجموعة
    // (Priority 2: مؤقّت التمرين الذكي) - يعتمد على وقت مطلق (restEndsAt)
    // لا عدّاد بسيط، حتى لا ينحرف مع تعليق الشاشة.
    const totalMs = (exercise.restSeconds || 60) * 1000;
    setRestTotalMs(totalMs);
    setRestPausedRemainingMs(null);
    setRestEndsAt(Date.now() + totalMs);
  }

  // انتهاء الراحة (طبيعياً بعد وصول العدّ للصفر، أو يدوياً عبر تخطّيها) -
  // مسار مركزي واحد لكليهما حتى يتصرّف التخطي اليدوي بنفس منطق "الانتقال
  // التلقائي للتمرين التالي" أدناه تماماً كالانتهاء الطبيعي (Priority 2،
  // البند 6: تدفّق كامل تلقائي لا يديره المستخدم يدوياً).
  function completeRest(playFeedback) {
    setRestEndsAt(null);
    setRestPausedRemainingMs(null);
    setRestTotalMs(0);
    if (!focusDay) return; // خرج المستخدم من وضع التركيز أو أنهى الجلسة أثناء الراحة
    if (playFeedback) {
      playRestEndSound();
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
    }
    const exercise = focusDay.exercises[focusExIndex];
    const wasLastSet = focusSetsDone >= exercise.sets;
    const hasNextExercise = focusExIndex < focusDay.exercises.length - 1;
    if (wasLastSet && hasNextExercise) nextFocusExercise();
  }

  function skipRest() { completeRest(false); }

  function pauseRest() {
    if (restEndsAt == null) return;
    setRestPausedRemainingMs(Math.max(0, restEndsAt - Date.now()));
    setRestEndsAt(null);
  }

  function resumeRest() {
    if (restPausedRemainingMs == null) return;
    setRestEndsAt(Date.now() + restPausedRemainingMs);
    setRestPausedRemainingMs(null);
  }

  // تعديل حي لمدة الراحة المتبقية (±10 ثانية) بلا إعادة ضبط المؤقّت بالكامل
  // - يُعدَّل الإجمالي (restTotalMs) بنفس المقدار حتى يبقى شريط التقدّم
  // البصري متّسقاً بدل أن يتجاوز 100% أو يصبح سالباً.
  function adjustRest(deltaSeconds) {
    const deltaMs = deltaSeconds * 1000;
    setRestTotalMs((ms) => Math.max(5000, ms + deltaMs));
    if (restPausedRemainingMs != null) {
      setRestPausedRemainingMs((ms) => Math.max(0, ms + deltaMs));
      return;
    }
    if (restEndsAt == null) return;
    setRestEndsAt((prev) => Math.max(Date.now(), prev + deltaMs));
  }

  function nextFocusExercise() {
    setFocusExIndex((i) => i + 1);
    setFocusSetsDone(0);
    setFocusWeight(""); setFocusReps(""); setFocusOneRepMax(null);
    setRestEndsAt(null); setRestPausedRemainingMs(null); setRestTotalMs(0);
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
    setRestEndsAt(null); setRestPausedRemainingMs(null); setRestTotalMs(0);
    setFocusDay(null);
    setFinishedSummary(summary);
  }

  // إيقاف أي مؤقّت راحة نشط عند الخروج - وإلا يستمر يعمل في الخلفية ويصدر
  // صوتاً/اهتزازاً لجلسة غادرها المستخدم بالفعل.
  function exitFocusWithoutFinishing() {
    setRestEndsAt(null); setRestPausedRemainingMs(null); setRestTotalMs(0);
    setFocusDay(null);
  }

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
        restRemainingMs={restPausedRemainingMs != null ? restPausedRemainingMs : (restEndsAt != null ? Math.max(0, restEndsAt - nowTick) : 0)}
        restTotalMs={restTotalMs}
        restPaused={restPausedRemainingMs != null}
        onSkipRest={skipRest}
        onPauseRest={pauseRest}
        onResumeRest={resumeRest}
        onAdjustRest={adjustRest}
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
      <>
        <FinishSummaryView
          summary={finishedSummary}
          isEn={isEn}
          gender={gender}
          t={t}
          showToast={showToast}
          onClose={() => setFinishedSummary(null)}
        />
        {fitnessTour.step === 6 && (
          <SpotlightTour
            steps={[{ title: t("onboarding.fitnessTour.step6Title"), body: t("onboarding.fitnessTour.step6Body") }]}
            stepIndex={0}
            onNext={fitnessTour.finish}
            onSkip={fitnessTour.finish}
            onFinish={fitnessTour.finish}
            labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), tapHere: t("onboarding.tapHere") }}
          />
        )}
      </>
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

  if (showMusclePicker) {
    return (
      <MusclePickerScreen
        gender={gender}
        isEn={isEn}
        isRtl={isRtl}
        t={t}
        pickedMuscle={pickedMuscle}
        onSelectMuscle={selectPickedMuscle}
        candidates={pickedMuscle ? exercisesForMuscle(pickedMuscle, fitnessProfile) : []}
        pickedIds={pickedExerciseIds}
        onToggleId={toggleExercisePick}
        onSave={saveCustomSession}
        onBack={() => { setShowMusclePicker(false); setPickedMuscle(null); setPickedExerciseIds(new Set()); }}
      />
    );
  }

  if (showManualBuilder) {
    return (
      <ManualProgramBuilder
        gender={gender}
        fitnessProfile={fitnessProfile}
        isEn={isEn}
        isRtl={isRtl}
        t={t}
        showToast={showToast}
        onCancel={() => setShowManualBuilder(false)}
        onSave={saveManualProgram}
        mode={manualBuilderMode}
        initialDays={manualBuilderMode === "append" ? convertProgramDaysToBuilderDays(programEntry?.program?.days) : []}
      />
    );
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
          <div style={FS.chipRow} data-tour="fitness-goal-row">
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
              <button key={m} onClick={() => setDraft((d) => ({ ...d, sessionMinutes: m }))} style={{ ...FS.dayChip, ...(draft.sessionMinutes === m ? FS.dayChipActive : {}) }}>{isolateNumbers(t("fitness.minutesShort", { n: m }))}</button>
            ))}
          </div>
          <label style={S.label}>{t("fitness.availableEquipment")}</label>
          <div style={FS.chipRow} data-tour="fitness-equipment-row">
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
          <button onClick={saveProfile} style={S.saveBtn} data-tour="fitness-save-profile">{t("fitness.saveAndCreate")}</button>
          {hasProfile && (
            <button onClick={cancelEditing} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>{t("common.buttons.back")}</button>
          )}
        </div>
        {fitnessTour.step === 1 && (
          <SpotlightTour
            steps={[{ title: t("onboarding.fitnessTour.step1Title"), body: t("onboarding.fitnessTour.step1Body") }]}
            stepIndex={0}
            onNext={() => fitnessTour.setStep(2)}
            onSkip={fitnessTour.finish}
            onFinish={() => fitnessTour.setStep(2)}
            labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), tapHere: t("onboarding.tapHere") }}
          />
        )}
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
          <div style={FS.summaryValue}>{isolateNumbers(t("fitness.programSummary", { goal: goalLabel, equipment: equipmentLabel, days: fitnessProfile.daysPerWeek }))}</div>
          {programEntry?.program?.isManual && <p style={FS.noteText}>{t("fitness.manualBuilder.manualProgramNote")}</p>}
          {programEntry?.program?.womenFriendlyIncluded && <p style={FS.noteText}>{t("fitness.womenFriendlyIncludedNote")}</p>}
          {programEntry?.program?.genderAdjusted && <p style={FS.noteText}>{t("fitness.genderAdjustedNote")}</p>}
          {programEntry?.program?.hasInjurySubstitutions && <p style={FS.noteText}>{t("fitness.injurySubstitutionNote")}</p>}
        </div>
        {/* برنامج يدوي: "تعديل البرنامج" (نموذج الهدف/المعدات/الأيام العام)
            لا معنى حقيقياً له هنا - استبدلناه بمسار صريح "تلقائي بدلاً منه"
            (switchToAutoBuilder يفتح نفس نموذج الإعداد الأصلي بلا أي تغيير
            فيه؛ حفظه يستدعي buildProgram كالمعتاد تماماً = رجوع كامل
            للمسار التلقائي). */}
        {programEntry?.program?.isManual ? (
          <button onClick={switchToAutoBuilder} style={{ ...S.exportBtn, width: "auto", padding: "9px 14px", marginBottom: 0 }}><Repeat size={14} /> {t("fitness.manualBuilder.switchToAutoBtn")}</button>
        ) : (
          <button onClick={() => setEditing(true)} style={{ ...S.exportBtn, width: "auto", padding: "9px 14px", marginBottom: 0 }}><Edit3 size={14} /> {t("fitness.editProgram")}</button>
        )}
      </div>

      <div style={FS.toolsRow}>
        {/* "نوّع البرنامج" وتدوير الأسبوع كلاهما يستدعيان buildProgram من
            جديد - يستبدلان days بالكامل بمولَّد تلقائي، فلا معنى لهما
            (وخطر حقيقي على عمل المستخدم) لبرنامج بُني يدوياً؛ نُخفيهما هنا
            بدل تعطيلهما فقط لتفادي أي التباس. */}
        {!programEntry?.program?.isManual && (
          <button onClick={varyProgram} style={FS.toolBtn}><Repeat size={14} /> {t("fitness.varyProgram")}</button>
        )}
        <button onClick={() => setShowStatistics(true)} style={FS.toolBtn} data-tour="fitness-statistics-btn"><BarChart3 size={14} /> {t("fitness.statisticsBtn")}</button>
        <button onClick={() => setShowMusclePicker(true)} style={FS.toolBtn}><Target size={14} /> {t("fitness.buildCustomSessionBtn")}</button>
        <button onClick={() => setConfirmManualBuilder(true)} style={FS.toolBtn}><ListChecks size={14} /> {t("fitness.manualBuilder.entryPointBtn")}</button>
        {!programEntry?.program?.isManual && (
          <select
            value={programEntry?.weekRotationEnabled ? (programEntry.rotationFrequency || "weekly") : ""}
            onChange={(e) => setRotation(e.target.value || null)}
            style={FS.rotationSelect}
          >
            <option value="">{t("fitness.rotationOff")}</option>
            <option value="weekly">{t("fitness.rotationFrequency")} {t("fitness.rotationWeekly")}</option>
            <option value="biweekly">{t("fitness.rotationFrequency")} {t("fitness.rotationBiweekly")}</option>
          </select>
        )}
      </div>

      {confirmManualBuilder && (
        <div style={S.modalOverlay} className="overlay-in" onClick={() => setConfirmManualBuilder(false)}>
          <div style={S.modal} className="sheet-in" onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span>{t("fitness.manualBuilder.replaceConfirmTitle")}</span>
              <button onClick={() => setConfirmManualBuilder(false)} style={S.iconBtn}><X size={18} /></button>
            </div>
            <p style={FS.noteText}>{t("fitness.manualBuilder.replaceConfirmBody")}</p>
            <button onClick={() => { setConfirmManualBuilder(false); openManualBuilderFresh(); }} style={S.saveBtn}>{t("fitness.manualBuilder.replaceConfirmProceedBtn")}</button>
            <button onClick={() => setConfirmManualBuilder(false)} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>{t("common.buttons.cancel")}</button>
          </div>
        </div>
      )}

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
              <Bar dataKey="volume" fill="#5FA8A0" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={!reduceMotion} animationDuration={450} />
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
                  <span style={FS.volumeValue}>{isolateNumbers(`${formatNumberLatin(Math.round(vol), isEn ? "en" : "ar")} ${t("fitness.volumeUnit")}`)}</span>
                </div>
                <div style={FS.barTrack}><div style={{ ...FS.barFill, width: `${maxMuscleVolume > 0 ? Math.round((vol / maxMuscleVolume) * 100) : 0}%` }} /></div>
              </div>
            ))
          ) : (
            <p style={FS.noteText}>{t("fitness.noWeightedVolumeNote")}</p>
          )}
          {lastSessionSummary.calories != null ? (
            <div style={FS.caloriesRow}><Flame size={14} color="#D17B5F" /> {isolateNumbers(t("fitness.estimatedCaloriesValue", { value: lastSessionSummary.calories }))}</div>
          ) : (
            <div style={FS.caloriesRow}><Flame size={14} color="var(--muted2)" /> {t("fitness.estimatedCaloriesNeedWeight")}</div>
          )}
        </div>
      )}

      <div className="stagger-in responsive-card-list">
        {programEntry?.program.days.map((day) => (
          <div key={day.dayIndex} style={FS.dayCard}>
            <div style={{ ...FS.dayCardHead, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span>{isolateNumbers(t("fitness.dayLabel", { n: day.dayIndex + 1, dayLabel: day.customName || t(`fitness.dayTypes.${day.dayType}`) }))}</span>
              {programEntry?.program?.isManual && (
                <button onClick={() => deleteManualDay(day.dayIndex)} style={{ ...FS.smallBtn, border: "1px solid var(--border2)", background: "transparent", color: "var(--muted2)" }} aria-label={t("common.buttons.delete")}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {day.exercises.map((ex, exIndex) => {
              const key = `${day.dayIndex}-${exIndex}`;
              const progression = suggestProgression(ex, workoutLog.filter((l) => l.exerciseId === ex.id));
              const isSwapping = swappingKey === key;
              const alternatives = isSwapping
                ? pickAlternatives(ex, fitnessProfile, programEntry.program.days.flatMap((d) => d.exercises.map((e) => e.id)), 10)
                : [];
              return (
                <ExerciseRow
                  key={`${key}-${ex.id}`}
                  dataTour={day.dayIndex === 0 && exIndex === 0 ? "fitness-exercise-row" : undefined}
                  exercise={ex}
                  isEn={isEn}
                  gender={gender}
                  isLogging={loggingKey === key}
                  onToggleLog={() => {
                    // إغلاق النموذج بلا حفظ (أو فتحه لتمرين آخر) كان يترك
                    // الوزن/التكرار/المجموعات المكتوبة كما هي - تظهر لاحقاً
                    // معبَّأة مسبقاً في نموذج تمرين مختلف تماماً، وقد تُحفَظ
                    // بالخطأ كأداء التمرين الجديد دون أن ينتبه المستخدم.
                    setLoggingKey((k) => (k === key ? null : key));
                    setLogWeight(""); setLogReps(""); setLogSets("");
                  }}
                  onOpenDetail={() => setSelectedExercise(ex)}
                  logWeight={logWeight} setLogWeight={setLogWeight}
                  logReps={logReps} setLogReps={setLogReps}
                  logSets={logSets} setLogSets={setLogSets}
                  onSubmitPerformance={() => submitPerformance(ex)}
                  isSwapping={isSwapping}
                  onToggleSwap={() => setSwappingKey(isSwapping ? null : key)}
                  alternatives={alternatives}
                  onSelectAlternative={(alt) => applySwap(day.dayIndex, exIndex, alt)}
                  onAdjustRest={(delta) => adjustExerciseRest(day.dayIndex, exIndex, delta)}
                  progression={progression}
                  t={t}
                />
              );
            })}
            <button onClick={() => startFocusWorkout(day)} style={FS.startWorkoutBtn} data-tour={day.dayIndex === 0 ? "fitness-start-workout" : undefined}><Play size={15} /> {t("fitness.startWorkoutBtn")}</button>
          </div>
        ))}
      </div>

      {/* "أضف يوماً جديداً" لبرنامج يدوي محفوظ فعلاً - يفتح نفس تدفّق
          البناء اليدوي (عضلة → معدات → تمرين → تفاصيل → مجموعات/راحة) محمَّلاً
          مسبقاً بالأيام الحالية (openManualBuilderAppend)، فيُضاف اليوم
          الجديد لنفس program.days دون أي تأثير على الأيام السابقة - بلا
          حاجة لتأكيد استبدال (لا شيء يُستبدَل هنا). */}
      {programEntry?.program?.isManual && (
        <button onClick={openManualBuilderAppend} style={{ ...FS.toolBtn, width: "100%", justifyContent: "center", marginBottom: 16 }}>
          <Plus size={14} /> {t("fitness.manualBuilder.addDayToProgramBtn")}
        </button>
      )}

      {/* جلسات مخصَّصة (عضلة واحدة، مُختارة من مخطط الجسم التفاعلي) - جزء من
          نفس نظام "البرنامج" (program.customSessions) لا نظام موازٍ منفصل؛
          لذا تظهر هنا كامتداد لقائمة أيام البرنامج، لا كصفحة/تبويب آخر. كل
          صف تمرين هنا للعرض/التسجيل فقط (بلا استبدال أو تعديل راحة يدوي -
          applySwap/adjustExerciseRest تفهرسان بمكان التمرين داخل
          program.days، وهذا غير منطبق على جلسة مخصَّصة ليست جزءاً من تلك
          الأيام)؛ "ابدأ التمرين" يستخدم بالضبط نفس startFocusWorkout/وضع
          التركيز العام المستخدَم لأيام البرنامج التلقائي دون أي تعديل. */}
      {programEntry?.program?.customSessions?.length > 0 && (
        <div className="stagger-in responsive-card-list" style={{ marginTop: 14 }}>
          {programEntry.program.customSessions.map((session) => (
            <div key={session.id} style={FS.dayCard}>
              <div style={{ ...FS.dayCardHead, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span>{t("fitness.customSessionLabel")} · {t(`fitness.muscleGroups.${session.muscle}`)}</span>
                <button onClick={() => deleteCustomSession(session.id)} style={{ ...FS.smallBtn, border: "1px solid var(--border2)", background: "transparent", color: "var(--muted2)" }} aria-label={t("common.buttons.delete")}>
                  <Trash2 size={12} />
                </button>
              </div>
              {session.exercises.map((ex, exIndex) => {
                const key = `custom-${session.id}-${exIndex}`;
                const progression = suggestProgression(ex, workoutLog.filter((l) => l.exerciseId === ex.id));
                return (
                  <ExerciseRow
                    key={`${key}-${ex.id}`}
                    exercise={ex}
                    isEn={isEn}
                    gender={gender}
                    isLogging={loggingKey === key}
                    onToggleLog={() => {
                      setLoggingKey((k) => (k === key ? null : key));
                      setLogWeight(""); setLogReps(""); setLogSets("");
                    }}
                    onOpenDetail={() => setSelectedExercise(ex)}
                    logWeight={logWeight} setLogWeight={setLogWeight}
                    logReps={logReps} setLogReps={setLogReps}
                    logSets={logSets} setLogSets={setLogSets}
                    onSubmitPerformance={() => submitPerformance(ex)}
                    progression={progression}
                    t={t}
                  />
                );
              })}
              <button onClick={() => startFocusWorkout({ exercises: session.exercises })} style={FS.startWorkoutBtn}><Play size={15} /> {t("fitness.startWorkoutBtn")}</button>
            </div>
          ))}
        </div>
      )}

      {(fitnessTour.step === 2 || fitnessTour.step === 3 || fitnessTour.step === 4) && (
        <SpotlightTour
          steps={[
            { target: '[data-tour="fitness-exercise-row"]', title: t("onboarding.fitnessTour.step2Title"), body: t("onboarding.fitnessTour.step2Body") },
            { target: '[data-tour="fitness-statistics-btn"]', title: t("onboarding.fitnessTour.step3Title"), body: t("onboarding.fitnessTour.step3Body") },
            { target: '[data-tour="fitness-start-workout"]', interactive: true, title: t("onboarding.fitnessTour.step4Title"), body: t("onboarding.fitnessTour.step4Body") },
          ]}
          stepIndex={fitnessTour.step - 2}
          onNext={() => {
            if (fitnessTour.step === 4) { fitnessTour.setStep("waiting"); return; }
            fitnessTour.setStep((s) => s + 1);
          }}
          onBack={fitnessTour.step > 2 ? () => fitnessTour.setStep((s) => s - 1) : undefined}
          onSkip={fitnessTour.finish}
          onFinish={fitnessTour.finish}
          labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), back: t("common.buttons.back"), tapHere: t("onboarding.tapHere") }}
        />
      )}
    </div>
  );
}
