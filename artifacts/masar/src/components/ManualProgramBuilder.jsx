import React, { useState } from "react";
import { ChevronLeft, ChevronRight, X, Plus, Trash2, Youtube, Dumbbell, Sparkles, Heart } from "lucide-react";
import { S } from "./styles";
import { FS, ICONS, CARDIO_MOBILITY_ICON, DIFFICULTY_ORDER } from "./fitnessStyles";
import InteractiveMuscleDiagram from "./InteractiveMuscleDiagram";
import MuscleDiagram from "./MuscleDiagram";
import { GEAR_TYPES, MOVEMENT_PATTERNS } from "../lib/exercises-db";
import { candidatesFor, suggestedVolumeFor, youtubeSearchUrl, formatRestLabel } from "../lib/fitness-engine";
import { isolateNumbers } from "../lib/bidi";
import { uid } from "../lib/helpers";
import { analyze } from "../lib/helpers";

// 3 بيئات معدات فقط لهذا الاختيار السريع لكل تمرين (بالضبط كما طُلب) -
// "منزل بمعدات كاملة" تبقى متاحة فقط من إعداد الملف الرياضي العام
// للمحرّك التلقائي، لا كخيار سريع هنا.
const QUICK_EQUIPMENT = [
  { key: "home_no_equipment", emoji: "🏠" },
  { key: "home_light_weights", emoji: "🏋️" },
  { key: "gym", emoji: "🏢" },
];

function ExerciseListRow({ exercise, isEn, onOpen, t }) {
  const gear = GEAR_TYPES.find((g) => g.key === exercise.gear);
  const GearIcon = gear ? ICONS[gear.icon] || Dumbbell : Dumbbell;
  return (
    <button onClick={() => onOpen(exercise)} style={{ ...FS.alternativeOptionRow, textAlign: "start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={FS.exerciseName}>{isEn ? (exercise.nameEn || exercise.name) : exercise.name}</div>
        <div style={FS.badgeRow}>
          <span style={FS.badge}><GearIcon size={11} /> {isEn ? gear?.nameEn : gear?.name}</span>
          <span style={{ ...FS.badge, ...(exercise.type === "compound" ? FS.typeBadgeCompound : exercise.type === "isolation" ? FS.typeBadgeIsolation : {}) }}>
            {exercise.type}
          </span>
          {exercise.womenFriendly && (
            <span style={{ ...FS.badge, color: "#D17B9E", borderColor: "rgba(209,123,158,0.35)", background: "rgba(209,123,158,0.1)" }}>
              <Heart size={10} /> {t("fitness.manualBuilder.womenFriendlyBadge")}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ExerciseDetailModal({ exercise, gender, isEn, isRtl, t, equipmentLabel, customizing, sets, reps, restSeconds, setSets, setReps, setRestSeconds, onBeginCustomize, onConfirmAdd, onClose }) {
  const gear = GEAR_TYPES.find((g) => g.key === exercise.gear);
  const GearIcon = gear ? ICONS[gear.icon] || Dumbbell : Dumbbell;
  const pattern = MOVEMENT_PATTERNS.find((p) => p.key === exercise.movementPattern);
  const CardioMobilityIcon = CARDIO_MOBILITY_ICON[exercise.muscle];
  return (
    <div style={S.modalOverlay} className="overlay-in" onClick={onClose}>
      <div style={{ ...S.modal, maxHeight: "85vh", overflowY: "auto" }} className="sheet-in" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span>{isEn ? (exercise.nameEn || exercise.name) : exercise.name}</span>
          <button onClick={onClose} style={S.iconBtn}><X size={18} /></button>
        </div>

        <div style={FS.detailHero}>
          {CardioMobilityIcon ? (
            <div style={{ ...FS.genericIconWrap, width: 60, height: 60 }}><CardioMobilityIcon size={28} /></div>
          ) : (
            <MuscleDiagram muscle={exercise.muscle} secondaryMuscles={exercise.secondaryMuscles} gender={gender} size={60} />
          )}
          <div style={FS.badgeRow}>
            <span style={FS.badge}><GearIcon size={11} /> {isEn ? gear?.nameEn : gear?.name}</span>
            <span style={{ ...FS.badge, ...(exercise.type === "compound" ? FS.typeBadgeCompound : exercise.type === "isolation" ? FS.typeBadgeIsolation : {}) }}>
              {t(`fitness.exerciseTypes.${exercise.type}`)}
            </span>
            <span style={FS.badge}>{t(`fitness.experienceLevels.${exercise.difficulty}`)}</span>
            {pattern && <span style={FS.badge}>{isEn ? pattern.nameEn : pattern.name}</span>}
            {equipmentLabel && <span style={FS.badge}>{equipmentLabel}</span>}
          </div>
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
          <a href={youtubeSearchUrl(exercise, gender)} target="_blank" rel="noopener noreferrer" style={FS.watchVideoBtn}>
            <Youtube size={16} /> {t("fitness.watchVideoBtn")}
          </a>
        </div>

        {!customizing ? (
          <button onClick={onBeginCustomize} style={S.saveBtn}>{t("fitness.manualBuilder.addToProgramBtn")}</button>
        ) : (
          <div style={FS.detailSectionCard}>
            <div style={FS.detailsSectionTitle}>{t("fitness.manualBuilder.customizeTitle")}</div>
            <label style={S.label}>{t("fitness.manualBuilder.setsLabel")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={() => setSets((s) => Math.max(1, s - 1))} style={FS.restAdjustSecBtn}>−</button>
              <span style={{ ...FS.exerciseName, minWidth: 24, textAlign: "center" }}>{isolateNumbers(String(sets))}</span>
              <button type="button" onClick={() => setSets((s) => Math.min(8, s + 1))} style={FS.restAdjustSecBtn}>+</button>
            </div>
            <label style={S.label}>{t("fitness.manualBuilder.repsLabel")}</label>
            <input value={reps} onChange={(e) => setReps(e.target.value)} style={S.input} placeholder="8-12" />
            <label style={S.label}>{t("fitness.manualBuilder.restLabel")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={() => setRestSeconds((r) => Math.max(10, r - 5))} style={FS.restAdjustSecBtn}>−5s</button>
              <span style={{ ...FS.exerciseName, minWidth: 44, textAlign: "center" }}>{isolateNumbers(formatRestLabel(t, restSeconds))}</span>
              <button type="button" onClick={() => setRestSeconds((r) => Math.min(300, r + 5))} style={FS.restAdjustSecBtn}>+5s</button>
            </div>
            <button onClick={onConfirmAdd} style={{ ...S.saveBtn, marginTop: 14 }}>{t("fitness.manualBuilder.confirmAddBtn")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// بناء برنامج أسبوعي يدوي كامل - بديل حقيقي للتوليد التلقائي/AI (يبقى
// المحرّك التلقائي بلا أي تغيير، هذا مسار موازٍ اختياري بالكامل). عضلة
// بعضلة، تمرين بتمرين: المستخدم يختار العضلة من نفس المخطط التفاعلي
// المستخدَم في "جلسة مخصَّصة" (InteractiveMuscleDiagram.jsx، بلا أي تكرار
// له)، ثم بيئة معدات لهذا التمرين تحديداً، ثم يتصفّح كل مستويات الصعوبة
// بحرية (candidatesFor بمستوى خبرة null - انظر تعليقها في fitness-engine.js)
// ويخصّص مجموعات/تكرارات/راحة كل تمرين بنفسه بأزرار +/-، بدءاً من نفس
// الأرقام العلمية المقترحة في المحرّك التلقائي (suggestedVolumeFor) كنقطة
// انطلاق قابلة للتعديل الكامل.
//
// الناتج (days) الذي يُمرَّر لـ onSave هو مصفوفة {id, name, exercises} بسيطة
// - المستدعي (FitnessView.jsx) هو من يحوّلها لبنية program.days الفعلية
// (نفس بنية البرنامج التلقائي تماماً: {dayIndex, dayType, customName,
// exercises}) ويحفظها - فتعمل تلقائياً مع وضع التركيز وتسجيل الأداء
// والتطوّر التلقائي الموجودين، ومع "بديل"/"تعديل راحة" أيضاً (فهرسة
// programEntry.program.days صحيحة هنا لأنها أيام حقيقية في المصفوفة، بخلاف
// حالة "جلسة مخصَّصة" المنفصلة).
// mode="build" (افتراضي): بناء برنامج جديد كامل من الصفر (يستبدل أي
// برنامج حالي بالكامل عند الحفظ - انظر التأكيد الصريح قبل فتح هذا المكوّن
// في FitnessView.jsx). mode="append": المستخدم يملك برنامجاً يدوياً محفوظاً
// بالفعل ويريد إضافة يوم جديد فقط - initialDays تُمرَّر عندها محمَّلة
// بأيامه الحالية (محوَّلة لنفس الشكل الداخلي البسيط هنا)، فتظهر جاهزة في
// قائمة الأيام دون أي حاجة لإعادة بنائها أو "الموافقة" عليها من جديد، وأي
// حفظ (حتى لو اختار "أنا بنفسي" فوراً) يُعيد كل الأيام (القديمة والجديدة
// معاً) لنفس مسار onSave الموجود أصلاً - لا حاجة لمسار حفظ منفصل.
export default function ManualProgramBuilder({ gender, fitnessProfile, isEn, isRtl, t, showToast, onCancel, onSave, initialDays = [], mode = "build" }) {
  const BackChevron = isRtl ? ChevronRight : ChevronLeft;
  const [days, setDays] = useState(initialDays);
  const [activeDayId, setActiveDayId] = useState(null);
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDayName, setNewDayName] = useState("");

  // مسار الإضافة: null | {step:"muscle"} | {step:"equipment", muscle} | {step:"list", muscle, equipment, tab}
  const [picker, setPicker] = useState(null);
  // فلتر اختياري ("مناسب خصوصاً للنساء" - انظر تعليق womenFriendly في
  // exercises-db.js) - طبقة عرض فوق نفس القائمة الكاملة، لا قائمة بديلة.
  const [womenFriendlyOnly, setWomenFriendlyOnly] = useState(false);
  const [detailExercise, setDetailExercise] = useState(null);
  const [customizing, setCustomizing] = useState(false);
  const [custSets, setCustSets] = useState(3);
  const [custReps, setCustReps] = useState("10-12");
  const [custRest, setCustRest] = useState(60);

  const [showFinishChoice, setShowFinishChoice] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState(null);

  const activeDay = days.find((d) => d.id === activeDayId) || null;
  const canFinish = days.some((d) => d.exercises.length > 0);

  function addDay() {
    const name = newDayName.trim() || t("fitness.manualBuilder.defaultDayName", { n: days.length + 1 });
    const day = { id: uid(), name, exercises: [] };
    setDays((d) => [...d, day]);
    setNewDayName("");
    setShowAddDay(false);
    setActiveDayId(day.id);
  }

  function renameDay(name) {
    setDays((d) => d.map((day) => (day.id !== activeDayId ? day : { ...day, name })));
  }

  function removeDay(id) {
    if (!window.confirm(t("fitness.manualBuilder.removeDayConfirm"))) return;
    setDays((d) => d.filter((x) => x.id !== id));
  }

  function removeExercise(instanceId) {
    setDays((d) => d.map((day) => (day.id !== activeDayId ? day : { ...day, exercises: day.exercises.filter((e) => e._instanceId !== instanceId) })));
  }

  function selectMuscle(muscle) {
    setPicker({ step: "equipment", muscle });
  }
  function selectEquipment(equipment) {
    setPicker({ step: "list", muscle: picker.muscle, equipment, tab: "beginner" });
  }
  function setTab(tab) {
    setPicker((p) => ({ ...p, tab }));
  }
  function openDetail(exercise) {
    setDetailExercise(exercise);
    setCustomizing(false);
  }
  function beginCustomize() {
    const withVol = suggestedVolumeFor(detailExercise, fitnessProfile.goal, fitnessProfile.experience);
    setCustSets(withVol.sets);
    setCustReps(isEn ? (withVol.repsEn || withVol.reps) : withVol.reps);
    setCustRest(withVol.restSeconds);
    setCustomizing(true);
  }
  function confirmAddExercise() {
    const finalExercise = {
      ...detailExercise, chosenEquipment: picker.equipment,
      sets: custSets, reps: custReps, restSeconds: custRest, _instanceId: uid(),
    };
    setDays((d) => d.map((day) => (day.id !== activeDayId ? day : { ...day, exercises: [...day.exercises, finalExercise] })));
    setDetailExercise(null);
    setCustomizing(false);
    setPicker(null);
  }

  async function runAiSuggestions() {
    setAiLoading(true);
    try {
      const summary = days
        .filter((d) => d.exercises.length > 0)
        .map((d, i) => `${isEn ? "Day" : "اليوم"} ${i + 1} (${d.name}): ` + d.exercises.map((e) => `${isEn ? (e.nameEn || e.name) : e.name} [${e.muscle}] ${e.sets}x${e.reps}`).join(isEn ? ", " : "، "))
        .join("\n");
      const prompt = isEn
        ? `A user manually built this weekly workout program themselves, exercise by exercise:\n${summary}\n\nAs a fitness coach, give 3-5 short, specific, optional suggestions to improve muscle balance or training volume only if you notice a real gap. Plain text, no markdown headers or numbering symbols. If the program already looks reasonably balanced, say so briefly instead of inventing issues. These are guidance notes only - the program will not be changed automatically.`
        : `بنى مستخدم برنامجه الرياضي الأسبوعي بنفسه يدوياً، تمريناً بتمرين:\n${summary}\n\nبصفتك مدرباً رياضياً، أعطِ 3-5 ملاحظات استرشادية مختصرة ومحدَّدة لتحسين توازن العضلات أو حجم التدريب فقط إن لاحظت فجوة حقيقية. نص عادي بلا عناوين ماركداون أو ترقيم. إن كان البرنامج متوازناً بشكل معقول، قل ذلك بإيجاز بدل اختلاق ملاحظات. هذه ملاحظات استرشادية فقط - لن يتغيّر البرنامج تلقائياً.`;
      const text = await analyze(prompt, 500);
      setAiText(text);
    } catch (err) {
      showToast(t(`common.errors.${err.code || "UNKNOWN"}`));
    } finally {
      setAiLoading(false);
    }
  }

  // ===== شاشة اختيار تمرين (عضلة → معدات → قائمة مفلترة حسب الصعوبة) =====
  if (picker) {
    return (
      <div style={S.view}>
        <button onClick={() => setPicker(null)} style={FS.backRow}><BackChevron size={16} /> {t("common.buttons.cancel")}</button>

        {/* ثلاث خطوات حصرية (عضلة / معدات / قائمة) - كل خطوة تُعرَض هي
            فقط، لا تراكم بينها. كان شرط ternary سابق (step==="equipment"
            ? ... : ...) يُظهر خطوة اختيار العضلة أيضاً أثناء خطوة "list"
            (لأن "list" ليست "equipment" فتقع في else) - خلل حقيقي وُجد
            بالاختبار المباشر (مخطط الجسم والرقائق يبقيان ظاهرين فوق قائمة
            التمارين، ويتلقيان ضغطات كان يُفترض أن تصل لعنصر القائمة تحتهما). */}
        {picker.step === "muscle" && (
          <>
            <div style={FS.hero}>
              <div style={FS.heroIcon}><Dumbbell size={22} color="var(--on-accent)" /></div>
              <div>
                <div style={FS.heroTitle}>{t("fitness.manualBuilder.pickMuscleTitle")}</div>
                <div style={FS.heroSub}>{t("fitness.manualBuilder.pickMuscleSub")}</div>
              </div>
            </div>
            <div style={FS.formCard}>
              <InteractiveMuscleDiagram
                selected={null}
                onSelect={selectMuscle}
                gender={gender}
                muscleLabel={(k) => t(`fitness.muscleGroups.${k}`)}
                frontLabel={t("fitness.bodyViewFront")}
                backLabel={t("fitness.bodyViewBack")}
                width={230}
              />
            </div>
          </>
        )}

        {picker.step === "equipment" && (
          <>
            <div style={FS.hero}>
              <div style={FS.heroIcon}><Dumbbell size={22} color="var(--on-accent)" /></div>
              <div>
                <div style={FS.heroTitle}>{t(`fitness.muscleGroups.${picker.muscle}`)}</div>
                <div style={FS.heroSub}>{t("fitness.manualBuilder.pickEquipmentSub")}</div>
              </div>
            </div>
            <div style={FS.formCard}>
              <div style={FS.chipRow}>
                {QUICK_EQUIPMENT.map((eq) => (
                  <button key={eq.key} onClick={() => selectEquipment(eq.key)} style={FS.chip}>
                    {eq.emoji} {t(`fitness.equipmentLevels.${eq.key}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {picker.step === "list" && (() => {
          const candidates = candidatesFor(picker.muscle, picker.equipment, fitnessProfile.injuries || [], null);
          const byTab = candidates.filter((e) => e.difficulty === picker.tab && (!womenFriendlyOnly || e.womenFriendly));
          return (
            <>
              <div style={FS.hero}>
                <div style={FS.heroIcon}><Dumbbell size={22} color="var(--on-accent)" /></div>
                <div>
                  <div style={FS.heroTitle}>{t(`fitness.muscleGroups.${picker.muscle}`)}</div>
                  <div style={FS.heroSub}>{t(`fitness.equipmentLevels.${picker.equipment}`)}</div>
                </div>
              </div>
              <div style={FS.formCard}>
                <div style={FS.chipRow}>
                  {DIFFICULTY_ORDER.map((lvl) => (
                    <button key={lvl} onClick={() => setTab(lvl)} style={{ ...FS.chip, ...(picker.tab === lvl ? FS.chipActive : {}) }}>
                      {t(`fitness.experienceLevels.${lvl}`)}
                    </button>
                  ))}
                </div>
                {/* فلتر اختياري فوق القاعدة الكاملة - لا يقيّد أي تمرين آخر
                    عن أي مستخدمة، فقط يبرز التمارين ذات الفائدة الموثَّقة
                    الخاصة (انظر تعليق womenFriendly في exercises-db.js). */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={womenFriendlyOnly} onChange={(e) => setWomenFriendlyOnly(e.target.checked)} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{t("fitness.manualBuilder.womenFriendlyFilter")}</span>
                </label>
                {byTab.length === 0 ? (
                  <p style={FS.noteText}>{t("fitness.customSessionNoExercises")}</p>
                ) : (
                  byTab.map((ex) => <ExerciseListRow key={ex.id} exercise={ex} isEn={isEn} onOpen={openDetail} t={t} />)
                )}
              </div>
            </>
          );
        })()}

        {detailExercise && (
          <ExerciseDetailModal
            exercise={detailExercise}
            gender={gender}
            isEn={isEn}
            isRtl={isRtl}
            t={t}
            equipmentLabel={picker.equipment ? t(`fitness.equipmentLevels.${picker.equipment}`) : null}
            customizing={customizing}
            sets={custSets} reps={custReps} restSeconds={custRest}
            setSets={setCustSets} setReps={setCustReps} setRestSeconds={setCustRest}
            onBeginCustomize={beginCustomize}
            onConfirmAdd={confirmAddExercise}
            onClose={() => { setDetailExercise(null); setCustomizing(false); }}
          />
        )}
      </div>
    );
  }

  // ===== شاشة تحرير يوم واحد =====
  if (activeDay) {
    return (
      <div style={S.view}>
        <button onClick={() => setActiveDayId(null)} style={FS.backRow}><BackChevron size={16} /> {t("fitness.manualBuilder.backToDaysList")}</button>
        <div style={FS.formCard}>
          <label style={S.label}>{t("fitness.manualBuilder.dayNameLabel")}</label>
          <input value={activeDay.name} onChange={(e) => renameDay(e.target.value)} style={S.input} />
        </div>

        <div className="stagger-in responsive-card-list">
          {activeDay.exercises.length === 0 && <p style={FS.noteText}>{t("fitness.manualBuilder.noExercisesYet")}</p>}
          {activeDay.exercises.map((ex) => {
            const gear = GEAR_TYPES.find((g) => g.key === ex.gear);
            const GearIcon = gear ? ICONS[gear.icon] || Dumbbell : Dumbbell;
            return (
              <div key={ex._instanceId} style={FS.exerciseRow}>
                <div style={FS.exerciseTop}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={FS.exerciseName}>{isEn ? (ex.nameEn || ex.name) : ex.name}</div>
                    <div style={FS.exerciseMeta}>
                      {isolateNumbers(t("fitness.setsReps", { sets: ex.sets, reps: ex.reps }))} · {isolateNumbers(formatRestLabel(t, ex.restSeconds))}
                    </div>
                    <div style={FS.badgeRow}>
                      <span style={FS.badge}><GearIcon size={11} /> {isEn ? gear?.nameEn : gear?.name}</span>
                      <span style={FS.badge}>{t(`fitness.equipmentLevels.${ex.chosenEquipment}`)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeExercise(ex._instanceId)} style={{ ...FS.smallBtn, border: "1px solid var(--border2)", background: "transparent", color: "var(--muted2)" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => setPicker({ step: "muscle" })} style={{ ...FS.toolBtn, width: "100%", justifyContent: "center", marginTop: 12 }}>
          <Plus size={14} /> {t("fitness.manualBuilder.addExerciseBtn")}
        </button>
        <button onClick={() => setActiveDayId(null)} style={{ ...S.saveBtn, marginTop: 10 }}>{t("fitness.manualBuilder.doneWithDayBtn")}</button>
      </div>
    );
  }

  // ===== شاشة قائمة الأيام (الرئيسية) =====
  return (
    <div style={S.view}>
      <button onClick={onCancel} style={FS.backRow}><BackChevron size={16} /> {t("fitness.backToProgram")}</button>
      <div style={FS.hero}>
        <div style={FS.heroIcon}><Dumbbell size={22} color="var(--on-accent)" /></div>
        <div>
          <div style={FS.heroTitle}>{t(mode === "append" ? "fitness.manualBuilder.appendTitle" : "fitness.manualBuilder.title")}</div>
          <div style={FS.heroSub}>{t(mode === "append" ? "fitness.manualBuilder.appendSubtitle" : "fitness.manualBuilder.subtitle")}</div>
        </div>
      </div>

      <div className="stagger-in responsive-card-list">
        {days.map((day, i) => (
          <div key={day.id} style={FS.dayCard}>
            <div style={{ ...FS.dayCardHead, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span>{isolateNumbers(t("fitness.dayLabel", { n: i + 1, dayLabel: day.name }))}</span>
              <button onClick={() => removeDay(day.id)} style={{ ...FS.smallBtn, border: "1px solid var(--border2)", background: "transparent", color: "var(--muted2)" }}>
                <Trash2 size={12} />
              </button>
            </div>
            <p style={FS.noteText}>{t("fitness.manualBuilder.exerciseCount", { count: day.exercises.length })}</p>
            <button onClick={() => setActiveDayId(day.id)} style={{ ...S.exportBtn, marginBottom: 0 }}>{t("fitness.manualBuilder.editDayBtn")}</button>
          </div>
        ))}
      </div>

      {showAddDay ? (
        <div style={FS.formCard}>
          <label style={S.label}>{t("fitness.manualBuilder.dayNameLabel")}</label>
          <input
            value={newDayName}
            onChange={(e) => setNewDayName(e.target.value)}
            placeholder={t("fitness.manualBuilder.defaultDayName", { n: days.length + 1 })}
            style={S.input}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={addDay} style={{ ...S.saveBtn, marginTop: 0, flex: 1 }}>{t("common.buttons.ok")}</button>
            <button onClick={() => { setShowAddDay(false); setNewDayName(""); }} style={{ ...S.exportBtn, marginTop: 0, marginBottom: 0, flex: 1 }}>{t("common.buttons.cancel")}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddDay(true)} style={{ ...FS.toolBtn, width: "100%", justifyContent: "center" }}>
          <Plus size={14} /> {t("fitness.manualBuilder.addDayBtn")}
        </button>
      )}

      <button
        onClick={() => setShowFinishChoice(true)}
        disabled={!canFinish}
        style={{ ...S.saveBtn, marginTop: 16, opacity: canFinish ? 1 : 0.5 }}
      >
        {t("fitness.manualBuilder.finishAndSaveBtn")}
      </button>

      {showFinishChoice && (
        <div style={S.modalOverlay} className="overlay-in" onClick={() => { if (!aiLoading) { setShowFinishChoice(false); setAiText(null); } }}>
          <div style={S.modal} className="sheet-in" onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span>{t("fitness.manualBuilder.finishChoiceTitle")}</span>
              {!aiLoading && <button onClick={() => { setShowFinishChoice(false); setAiText(null); }} style={S.iconBtn}><X size={18} /></button>}
            </div>
            {aiText == null ? (
              <>
                <p style={FS.noteText}>{t("fitness.manualBuilder.finishChoiceBody")}</p>
                <button onClick={() => onSave(days)} style={{ ...S.saveBtn, marginTop: 4 }}>{t("fitness.manualBuilder.saveMyselfBtn")}</button>
                <button onClick={runAiSuggestions} disabled={aiLoading} style={{ ...S.exportBtn, marginTop: 10, opacity: aiLoading ? 0.6 : 1 }}>
                  <Sparkles size={14} /> {aiLoading ? t("fitness.manualBuilder.aiLoading") : t("fitness.manualBuilder.aiSuggestBtn")}
                </button>
              </>
            ) : (
              <>
                <p style={{ ...FS.detailsText, whiteSpace: "pre-wrap" }}>{aiText}</p>
                <p style={FS.noteText}>{t("fitness.manualBuilder.aiDisclaimer")}</p>
                <button onClick={() => onSave(days)} style={{ ...S.saveBtn, marginTop: 4 }}>{t("fitness.manualBuilder.saveMyselfBtn")}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
