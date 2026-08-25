import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ClipboardList, AlertTriangle, Sparkles, Loader2, Trash2, RefreshCw, Crown, Send, Droplet, Plus,
} from "lucide-react";
import { store } from "../lib/store";
import { analyze } from "../lib/helpers";
import { localDayKey } from "../lib/tips";
import { sumNutritionEntries, waterGoalCups } from "../lib/nutrition";
import { computeDailyTargets, distributeMeals, getDailyNutritionSummary } from "../lib/nutrition-plan";
import { FITNESS_GOALS } from "../lib/exercises-db";
import { isActiveSubscriber } from "../lib/subscription";
import { S } from "./styles";
import NumericValue from "./NumericValue";
import { isolateNumbers } from "../lib/bidi";

const SUBSCRIBE_INSTAGRAM_URL = "https://www.instagram.com/hjmasar";

const NS = {
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #5FA8A0, #3D7972)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },
  disclaimerCard: { display: "flex", gap: 10, alignItems: "flex-start", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 12px", marginBottom: 16 },
  disclaimerText: { fontSize: 12, color: "var(--muted2)", lineHeight: 1.7, margin: 0 },
  warningCard: { display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(209,123,95,0.1)", border: "1.5px solid rgba(209,123,95,0.4)", borderRadius: 14, padding: "14px 12px", marginBottom: 16 },
  warningText: { fontSize: 12.5, color: "var(--ink)", lineHeight: 1.7, margin: 0 },
  sectionCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 8 },
  sectionText: { fontSize: 13, color: "var(--ink)", lineHeight: 1.8, margin: 0 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  statBox: { background: "var(--surface-sunken)", borderRadius: 12, padding: "10px 12px" },
  statLabel: { fontSize: 11, color: "var(--muted2)", fontWeight: 600 },
  statValue: { fontSize: 17, fontWeight: 700, color: "var(--ink)", marginTop: 3, direction: "ltr" },
  statValueOver: { color: "#D17B5F" },
  bannerCard: { display: "flex", gap: 10, alignItems: "center", background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.35)", borderRadius: 14, padding: "12px 12px", marginBottom: 16 },
  mealRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" },
  mealName: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  mealMacros: { fontSize: 11.5, color: "var(--muted2)", marginTop: 2 },
  mealCalories: { fontSize: 14, fontWeight: 700, color: "var(--gold)", direction: "ltr" },
  planBox: { background: "var(--surface-sunken)", borderRadius: 12, padding: "14px 12px", fontSize: 13.5, lineHeight: 1.9, whiteSpace: "pre-wrap", color: "var(--ink)" },
  adherenceRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  adherenceValue: { fontSize: 22, fontWeight: 700, color: "var(--gold)", direction: "ltr" },
  adherenceBarTrack: { width: "100%", height: 8, borderRadius: 20, background: "var(--surface-sunken)", marginTop: 10, overflow: "hidden" },
  adherenceBarFill: { height: "100%", borderRadius: 20, background: "var(--gold)" },
  waterRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  waterCupsLabel: { fontSize: 15, fontWeight: 700, color: "var(--ink)" },
  addCupBtn: { display: "flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  upsellCard: { background: "linear-gradient(160deg, var(--warm-tint), var(--panel))", border: "1px solid var(--warm-border)", borderRadius: 16, padding: "20px 16px", textAlign: "center", marginBottom: 16 },
  upsellIcon: { width: 48, height: 48, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" },
  upsellTitle: { fontSize: 15, fontWeight: 700, marginBottom: 6 },
  upsellMessage: { fontSize: 12.5, color: "var(--muted2)", lineHeight: 1.7, marginBottom: 14 },
  upsellBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--bg)", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none" },
};

function PremiumRequired({ t }) {
  return (
    <div style={NS.upsellCard}>
      <div style={NS.upsellIcon}><Crown size={22} color="var(--on-accent)" /></div>
      <div style={NS.upsellTitle}>{t("nutritionPlan.premiumRequiredTitle")}</div>
      <p style={NS.upsellMessage}>{t("nutritionPlan.premiumRequiredMessage")}</p>
      <a href={SUBSCRIBE_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={NS.upsellBtn}>
        <Send size={14} /> {t("common.buttons.subscribeInstagram")}
      </a>
    </div>
  );
}

function dayKeysAgo(n) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(localDayKey(d));
  }
  return days;
}

export default function NutritionPlanView({ healthProfile, showToast, subscription, setView }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const isSub = isActiveSubscriber(subscription);

  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState(null);
  const [nutritionLog, setNutritionLog] = useState([]);
  const [waterLog, setWaterLog] = useState({});
  const [fitnessLog, setFitnessLog] = useState({});
  const [fitnessProfile, setFitnessProfile] = useState(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessmentDraft, setAssessmentDraft] = useState({ mealCount: 3, country: "", budget: "", preferredFoods: "", dislikedFoods: "" });
  const [buildingPlan, setBuildingPlan] = useState(false);
  const [fillingMeals, setFillingMeals] = useState(false);
  const [gettingAdvice, setGettingAdvice] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      store.loadNutritionPlan(),
      store.loadNutritionLog(),
      store.loadWaterLog(),
      store.loadFitnessLog(),
      store.loadFitnessProfile(),
    ]).then(([p, log, water, fitLog, fitProfile]) => {
      if (!active) return;
      setPlan(p);
      setNutritionLog(log);
      setWaterLog(water);
      setFitnessLog(fitLog);
      setFitnessProfile(fitProfile);
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  // خلل حقيقي وُجد وأُصلح: todayKey() (UTC) بدل localDayKey (محلي) - نفس
  // خلل NutritionView.jsx (انظر تعليقه هناك)، يؤثر هنا على مطابقة todayEntries
  // وlastAdviceDate ونافذة "تدرّب اليوم" (fitnessLog[today]) بنفس الطريقة.
  const today = localDayKey();
  const hasHealthData = !!(healthProfile?.tee && healthProfile?.weightKg);
  const goal = fitnessProfile?.goal || "general_fitness";
  const goalLabel = useMemo(() => {
    const g = FITNESS_GOALS.find((x) => x.key === goal);
    return g ? (isEn ? g.nameEn : g.name) : "";
  }, [goal, isEn]);

  const todayEntries = useMemo(() => nutritionLog.filter((e) => e.date === today), [nutritionLog, today]);
  const todayTotals = useMemo(() => sumNutritionEntries(todayEntries), [todayEntries]);

  const targets = useMemo(() => {
    if (!plan) return null;
    return { dailyCalories: plan.dailyCalories, proteinG: plan.proteinG, carbsG: plan.carbsG, fatG: plan.fatG, fiberG: plan.fiberG };
  }, [plan]);

  // ملخّص يومي موحَّد (getDailyNutritionSummary, nutrition-plan.js) - يعيد
  // إنتاج نفس ما كانت computeLiveStatus(targets, todayTotals) تُرجعه بالحرف
  // (مُضمَّنة كاملة عبر spread داخل الدالة الموحَّدة) بلا أي تغيير في القيم
  // المعروضة، بالإضافة لحقول موحَّدة إضافية (calorieGoal إلخ) لا تُستخدَم هنا حالياً.
  const liveStatus = useMemo(() => {
    if (!targets) return null;
    return getDailyNutritionSummary({ totals: todayTotals, healthProfile, nutritionPlan: plan });
  }, [targets, todayTotals, healthProfile, plan]);

  const waterGoal = waterGoalCups(healthProfile?.weightKg);
  const todayCups = waterLog[today] || 0;

  const dataChanged = useMemo(() => {
    if (!plan) return false;
    const a = plan.assessment || {};
    const weightChanged = a.weightKgSnapshot != null && healthProfile?.weightKg != null && Math.abs(a.weightKgSnapshot - healthProfile.weightKg) >= 3;
    const activityChanged = a.activityLevelSnapshot && healthProfile?.activityLevel && a.activityLevelSnapshot !== healthProfile.activityLevel;
    const goalChanged = a.goalSnapshot && goal && a.goalSnapshot !== goal;
    return weightChanged || activityChanged || goalChanged;
  }, [plan, healthProfile, goal]);

  // نصيحة اليوم تُجلَب تلقائياً مرة واحدة فقط لكل يوم تقويمي عند فتح
  // القسم (لا عند كل تسجيل وجبة) - توفيراً لتكلفة استدعاء Gemini، تماماً
  // كما طُلب صراحة.
  useEffect(() => {
    if (!loaded || !plan || !isSub) return;
    if (plan.lastAdviceDate === today) return;
    if (todayEntries.length === 0 && Object.keys(fitnessLog).length === 0) return;
    getAdvice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, plan?.dailyCalories, isSub]);

  function buildMealsPrompt(meals, a) {
    const mealLines = meals.map((m) => {
      const name = t(`nutritionPlan.mealNames.${m.key}`);
      return `${name}: ${m.calories} kcal, ${m.proteinG}g protein, ${m.carbsG}g carbs, ${m.fatG}g fat`;
    }).join("\n");
    const prefLines = [
      a.country ? `${isEn ? "Country" : "الدولة"}: ${a.country}` : "",
      a.budget ? `${isEn ? "Budget" : "الميزانية"}: ${a.budget}` : "",
      a.preferredFoods ? `${isEn ? "Preferred foods" : "أطعمة مفضّلة"}: ${a.preferredFoods}` : "",
      a.dislikedFoods ? `${isEn ? "Disliked / allergic foods" : "أطعمة غير مرغوبة أو حساسية"}: ${a.dislikedFoods}` : "",
    ].filter(Boolean).join("\n");

    if (isEn) {
      return `You are a nutrition-plan assistant. The exact calorie/macro targets below were already calculated mathematically and are FIXED - do not change them, just suggest realistic food items that fit each meal's numbers as closely as possible.\n\nMeals:\n${mealLines}\n\nUser preferences:\n${prefLines || "No additional preferences given."}\n\nFor each meal, suggest 1-2 concrete, practical food combinations available in the user's country/budget that roughly fit its calorie/macro numbers. Keep it concise (a few lines per meal), and avoid stacking more than two numbers back to back in one sentence when it could instead be a short list. End with one sentence stating this is general guidance, not professional medical or nutrition advice.`;
    }
    return `أنت مساعد لبناء خطط غذائية. الأرقام (السعرات/الماكروز) أدناه محسوبة حسابياً مسبقاً وثابتة - لا تغيّرها، فقط اقترح أصنافاً واقعية تناسب أرقام كل وجبة قدر الإمكان.\n\nالوجبات:\n${mealLines}\n\nتفضيلات المستخدم:\n${prefLines || "لا تفضيلات إضافية."}\n\nلكل وجبة، اقترح صنفاً أو صنفين عمليين متوفرين في دولة المستخدم وميزانيته يناسبان أرقام السعرات/الماكروز تقريباً. اجعلها مختصرة (بضعة أسطر لكل وجبة)، ولا تحشر أكثر من رقمين متتاليين في نفس الجملة إن أمكن جعلها نقاطاً قصيرة بدلاً من ذلك. اختم بجملة واحدة توضّح أن هذا إرشاد عام لا نصيحة طبية أو غذائية احترافية.`;
  }

  async function buildPlan() {
    if (!hasHealthData) return;
    setBuildingPlan(true);
    try {
      const computed = computeDailyTargets({ tee: healthProfile.tee, weightKg: healthProfile.weightKg, goal }, 0);
      if (!computed) { showToast(t("nutritionPlan.planSaveFailed")); return; }
      const meals = distributeMeals(computed, assessmentDraft.mealCount);
      const newPlan = {
        ...computed,
        meals,
        assessment: {
          ...assessmentDraft,
          weightKgSnapshot: healthProfile.weightKg,
          activityLevelSnapshot: healthProfile.activityLevel,
          goalSnapshot: goal,
        },
        activitySource: "manual",
        mealSuggestionsText: null,
        mealSuggestionsDate: null,
        lastAdviceText: null,
        lastAdviceDate: null,
        generatedAt: new Date().toISOString(),
      };
      const res = await store.saveNutritionPlan(newPlan);
      if (!res.ok) { showToast(t("nutritionPlan.planSaveFailed")); return; }
      setPlan(newPlan);
      setShowAssessmentForm(false);
      showToast(t("nutritionPlan.planBuilt"));
    } catch (err) {
      console.error("[NutritionPlanView] buildPlan failed:", err);
      showToast(t("nutritionPlan.planSaveFailed"));
    } finally {
      setBuildingPlan(false);
    }
  }

  async function fillMealSuggestions() {
    if (!isSub || !plan) { showToast(t("nutritionPlan.premiumRequiredTitle")); return; }
    setFillingMeals(true);
    try {
      const prompt = buildMealsPrompt(plan.meals, plan.assessment || {});
      const text = await analyze(prompt, 700);
      const updated = { ...plan, mealSuggestionsText: text.trim(), mealSuggestionsDate: today };
      const res = await store.saveNutritionPlan(updated);
      if (!res.ok) { showToast(t("nutritionPlan.mealSuggestionsFailed")); return; }
      setPlan(updated);
    } catch (err) {
      console.error("[NutritionPlanView] fillMealSuggestions failed:", err);
      showToast(t("nutritionPlan.mealSuggestionsFailed"));
    } finally {
      setFillingMeals(false);
    }
  }

  // نصيحة اليوم: تُبنى حصرياً من أرقام حقيقية محسوبة من nutrition_log/
  // fitness_log الفعليين - لا نمط أو رقم غير موجود فعلياً في البيانات
  // (مثل معدل نزول الوزن أو تخطي وجبة محدَّدة) يُذكر للـAI لأن مسار لا
  // يملك سجل وزن تاريخي أو وسم وقت الوجبة فعلياً.
  async function getAdvice() {
    if (!isSub || !plan || !targets) return;
    setGettingAdvice(true);
    try {
      const days3 = dayKeysAgo(3);
      const last3 = nutritionLog.filter((e) => days3.includes(e.date));
      const totals3 = sumNutritionEntries(last3);
      const daysWithData3 = new Set(last3.map((e) => e.date)).size || 1;
      const avgProtein3 = Math.round(totals3.protein / daysWithData3);
      const avgCalories3 = Math.round(totals3.calories / daysWithData3);

      const days7 = dayKeysAgo(7);
      const last7 = nutritionLog.filter((e) => days7.includes(e.date));
      const totals7 = sumNutritionEntries(last7);
      const daysWithData7 = new Set(last7.map((e) => e.date)).size || 1;
      const avgFiber7 = Math.round(totals7.fiber / daysWithData7);

      const trainedToday = !!fitnessLog[today];
      const loggedToday = todayEntries.length > 0;

      const dataLines = [
        `${isEn ? "Daily calorie target" : "هدف السعرات اليومي"}: ${targets.dailyCalories} kcal`,
        `${isEn ? "Daily protein target" : "هدف البروتين اليومي"}: ${targets.proteinG}g`,
        `${isEn ? "Daily fiber target" : "هدف الألياف اليومي"}: ${targets.fiberG}g`,
        `${isEn ? "Today consumed so far" : "المستهلك اليوم حتى الآن"}: ${todayTotals.calories} kcal, ${todayTotals.protein}g protein, ${todayTotals.carbs}g carbs, ${todayTotals.fat}g fat, ${todayTotals.fiber}g fiber`,
        `${isEn ? "Any meal logged today" : "هل سُجّلت أي وجبة اليوم"}: ${loggedToday ? (isEn ? "yes" : "نعم") : (isEn ? "no" : "لا")}`,
        `${isEn ? "Average protein over last 3 days with data" : "متوسط البروتين آخر 3 أيام فيها بيانات"}: ${avgProtein3}g`,
        `${isEn ? "Average calories over last 3 days with data" : "متوسط السعرات آخر 3 أيام فيها بيانات"}: ${avgCalories3} kcal`,
        `${isEn ? "Average fiber over last 7 days with data" : "متوسط الألياف آخر 7 أيام فيها بيانات"}: ${avgFiber7}g`,
        `${isEn ? "Completed a workout today" : "أنجز تمريناً اليوم"}: ${trainedToday ? (isEn ? "yes" : "نعم") : (isEn ? "no" : "لا")}`,
      ].join("\n");

      const prompt = isEn
        ? `You are a nutrition coach. Using ONLY the real calculated data below, give 2-4 short, specific, practical observations/tips in a specialist's tone (like "your protein has been low the last 3 days" or "you're close to your fiber goal"). Do NOT invent any pattern, number, or event not stated below. If data is too sparse for a pattern, just comment on today's numbers instead. Keep numbers clearly separated (don't stack more than two back to back in one clause).\n\n${dataLines}\n\nEnd with one sentence stating this is general guidance, not a substitute for a licensed nutrition specialist.`
        : `أنت مستشار تغذية. باستخدام الأرقام الحقيقية المحسوبة أدناه فقط، أعطِ 2-4 ملاحظات/نصائح قصيرة وعملية ومحدَّدة بأسلوب أخصائي (مثل "بروتينك منخفض آخر 3 أيام" أو "أنت قريب من هدف الألياف"). لا تخترع أي نمط أو رقم أو حدث غير مذكور أدناه. إن كانت البيانات قليلة جداً لاستنتاج نمط، علّق على أرقام اليوم فقط. حافظ على وضوح فصل الأرقام (لا تحشر أكثر من رقمين متتاليين في نفس الجملة).\n\n${dataLines}\n\nاختم بجملة واحدة توضّح أن هذا إرشاد عام ولا يغني عن استشارة أخصائي تغذية مرخّص.`;

      const text = await analyze(prompt, 500);
      const updated = { ...plan, lastAdviceText: text.trim(), lastAdviceDate: today };
      const res = await store.saveNutritionPlan(updated);
      if (!res.ok) { showToast(t("nutritionPlan.adviceFailed")); return; }
      setPlan(updated);
    } catch (err) {
      console.error("[NutritionPlanView] getAdvice failed:", err);
      showToast(t("nutritionPlan.adviceFailed"));
    } finally {
      setGettingAdvice(false);
    }
  }

  async function addCup() {
    const next = todayCups + 1;
    const prev = todayCups;
    setWaterLog((w) => ({ ...w, [today]: next }));
    const res = await store.saveWaterCups(today, next);
    if (!res.ok) { setWaterLog((w) => ({ ...w, [today]: prev })); showToast(t("common.errors.saveFailed")); }
  }

  async function deletePlan() {
    if (!window.confirm(t("nutritionPlan.deletePlanConfirm"))) return;
    const prevPlan = plan;
    setPlan(null);
    const res = await store.deleteNutritionPlan();
    if (!res.ok) { setPlan(prevPlan); showToast(t("nutritionPlan.deleteFailedGeneric")); return; }
    showToast(t("nutritionPlan.planDeleted"));
  }

  function remainingLine(labelKey, remaining, unit) {
    const over = remaining < 0;
    return (
      <div style={NS.statBox}>
        <div style={NS.statLabel}>{t(`nutritionPlan.${labelKey}`)}</div>
        <div style={{ ...NS.statValue, ...(over ? { direction: "inherit", ...NS.statValueOver } : {}) }}>
          {over
            ? isolateNumbers(t("nutritionPlan.exceededBy", { amount: `${Math.abs(remaining)}${unit}` }))
            : <NumericValue value={remaining} unit={unit} />}
        </div>
      </div>
    );
  }

  if (!loaded) {
    return <div style={S.view}><Loader2 size={22} className="spin" color="#C9A24B" /></div>;
  }

  if (!hasHealthData) {
    return (
      <div style={S.view}>
        <div style={NS.hero}>
          <div style={NS.heroIcon}><ClipboardList size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={NS.heroTitle}>{t("nutritionPlan.heroTitle")}</div>
            <div style={NS.heroSub}>{t("nutritionPlan.heroSub")}</div>
          </div>
        </div>
        <div style={NS.warningCard}>
          <AlertTriangle size={20} color="#D17B5F" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ ...NS.warningText, fontWeight: 700, marginBottom: 4 }}>{t("nutritionPlan.needsHealthProfileTitle")}</p>
            <p style={NS.warningText}>{t("nutritionPlan.needsHealthProfileMessage")}</p>
          </div>
        </div>
        <button onClick={() => setView && setView("you")} style={S.saveBtn}>{t("nutritionPlan.goToYouBtn")}</button>
      </div>
    );
  }

  // ===== لا خطة بعد أو "ابدأ من جديد" =====
  if (!plan || showAssessmentForm) {
    return (
      <div style={S.view}>
        <div style={NS.hero}>
          <div style={NS.heroIcon}><ClipboardList size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={NS.heroTitle}>{t("nutritionPlan.heroTitle")}</div>
            <div style={NS.heroSub}>{t("nutritionPlan.heroSub")}</div>
          </div>
        </div>
        <div style={NS.disclaimerCard}>
          <AlertTriangle size={16} color="var(--muted2)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={NS.disclaimerText}>{t("nutritionPlan.generalDisclaimer")}</p>
        </div>
        <div style={NS.sectionCard}>
          <div style={NS.sectionTitle}>{t("nutritionPlan.assessmentTitle")}</div>
          <p style={{ ...NS.sectionText, color: "var(--muted2)", fontSize: 11.5 }}>{t("nutritionPlan.assessmentNote")}</p>

          <label style={S.label}>{t("nutritionPlan.mealCountLabel")}</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {[3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setAssessmentDraft((a) => ({ ...a, mealCount: n }))}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  border: assessmentDraft.mealCount === n ? "1.5px solid var(--gold)" : "1px solid var(--border2)",
                  background: assessmentDraft.mealCount === n ? "rgba(201,162,75,0.12)" : "var(--surface-sunken)",
                  color: assessmentDraft.mealCount === n ? "var(--gold)" : "var(--ink)",
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <label style={S.label}>{t("nutritionPlan.countryLabel")}</label>
          <input value={assessmentDraft.country} onChange={(e) => setAssessmentDraft((a) => ({ ...a, country: e.target.value }))} placeholder={t("nutritionPlan.countryPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
          <label style={S.label}>{t("nutritionPlan.budgetLabel")}</label>
          <input value={assessmentDraft.budget} onChange={(e) => setAssessmentDraft((a) => ({ ...a, budget: e.target.value }))} placeholder={t("nutritionPlan.budgetPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
          <label style={S.label}>{t("nutritionPlan.preferredFoodsLabel")}</label>
          <input value={assessmentDraft.preferredFoods} onChange={(e) => setAssessmentDraft((a) => ({ ...a, preferredFoods: e.target.value }))} placeholder={t("nutritionPlan.preferredFoodsPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
          <label style={S.label}>{t("nutritionPlan.dislikedFoodsLabel")}</label>
          <input value={assessmentDraft.dislikedFoods} onChange={(e) => setAssessmentDraft((a) => ({ ...a, dislikedFoods: e.target.value }))} placeholder={t("nutritionPlan.dislikedFoodsPlaceholder")} style={{ ...S.input, marginTop: 6 }} />

          <button onClick={buildPlan} disabled={buildingPlan} style={S.saveBtn}>
            {buildingPlan ? <><Loader2 size={15} className="spin" style={{ marginInlineEnd: 6 }} /> {t("nutritionPlan.buildingPlan")}</> : t("nutritionPlan.buildBtn")}
          </button>
          {plan && (
            <button onClick={() => setShowAssessmentForm(false)} style={{ ...S.exportBtn, marginTop: 8 }}>{t("common.buttons.cancel")}</button>
          )}
        </div>
      </div>
    );
  }

  // ===== عرض الخطة =====
  const adherencePct = Math.min(100, liveStatus.adherencePct);
  return (
    <div style={S.view}>
      <div style={NS.hero}>
        <div style={NS.heroIcon}><ClipboardList size={22} color="var(--on-accent)" /></div>
        <div>
          <div style={NS.heroTitle}>{t("nutritionPlan.heroTitle")}</div>
          <div style={NS.heroSub}>{goalLabel}</div>
        </div>
      </div>

      {dataChanged && (
        <div style={NS.bannerCard}>
          <RefreshCw size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ ...NS.sectionText, fontSize: 12.5, marginBottom: 8 }}>{t("nutritionPlan.dataChangedBanner")}</p>
            <button onClick={() => setShowAssessmentForm(true)} style={{ ...S.saveBtn, marginTop: 0 }}>{t("nutritionPlan.rebuildBtn")}</button>
          </div>
        </div>
      )}

      <div style={NS.sectionCard}>
        <div style={NS.sectionTitle}>{t("nutritionPlan.targetsTitle")}</div>
        <div style={NS.grid2}>
          <div style={NS.statBox}><div style={NS.statLabel}>{t("nutritionPlan.dailyCalories")}</div><div style={NS.statValue}><NumericValue value={targets.dailyCalories} /></div></div>
          <div style={NS.statBox}><div style={NS.statLabel}>{t("nutritionPlan.protein")}</div><div style={NS.statValue}><NumericValue value={targets.proteinG} unit="g" /></div></div>
          <div style={NS.statBox}><div style={NS.statLabel}>{t("nutritionPlan.carbs")}</div><div style={NS.statValue}><NumericValue value={targets.carbsG} unit="g" /></div></div>
          <div style={NS.statBox}><div style={NS.statLabel}>{t("nutritionPlan.fat")}</div><div style={NS.statValue}><NumericValue value={targets.fatG} unit="g" /></div></div>
        </div>
      </div>

      <div style={NS.sectionCard}>
        <div style={NS.sectionTitle}>{t("nutritionPlan.liveStatusTitle")}</div>
        <div style={NS.adherenceRow}>
          <span style={NS.sectionText}>{t("nutritionPlan.adherenceLabel")}</span>
          <span style={NS.adherenceValue}><NumericValue value={liveStatus.adherencePct} unit="%" /></span>
        </div>
        <div style={NS.adherenceBarTrack}><div style={{ ...NS.adherenceBarFill, width: `${adherencePct}%` }} /></div>

        {!liveStatus.consumed.calories && todayEntries.length === 0 && (
          <p style={{ ...NS.sectionText, color: "var(--muted2)", fontSize: 12, marginTop: 10 }}>{t("nutritionPlan.noEntriesToday")}</p>
        )}

        <div style={{ ...NS.grid2, marginTop: 10 }}>
          {remainingLine("caloriesRemaining", liveStatus.caloriesRemaining, "")}
          {remainingLine("proteinRemaining", liveStatus.proteinRemaining, "g")}
          {remainingLine("carbsRemaining", liveStatus.carbsRemaining, "g")}
          {remainingLine("fatRemaining", liveStatus.fatRemaining, "g")}
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={NS.statBox}>
            <div style={NS.statLabel}>{t("nutritionPlan.fiberConsumed")}</div>
            <div style={NS.statValue}><NumericValue value={liveStatus.consumed.fiber} unit="g" /> / <NumericValue value={targets.fiberG} unit="g" /></div>
          </div>
        </div>
      </div>

      <div style={NS.sectionCard}>
        <div style={NS.sectionTitle}>{t("nutritionPlan.mealsTitle")}</div>
        {plan.meals.map((m) => (
          <div key={m.key} style={NS.mealRow}>
            <div>
              <div style={NS.mealName}>{t(`nutritionPlan.mealNames.${m.key}`)}</div>
              <div style={NS.mealMacros}><NumericValue value={m.proteinG} unit="g P" /> · <NumericValue value={m.carbsG} unit="g C" /> · <NumericValue value={m.fatG} unit="g F" /></div>
            </div>
            <div style={NS.mealCalories}><NumericValue value={m.calories} unit="kcal" /></div>
          </div>
        ))}

        {!isSub ? (
          <div style={{ marginTop: 12 }}><PremiumRequired t={t} /></div>
        ) : (
          <>
            <button onClick={fillMealSuggestions} disabled={fillingMeals} style={{ ...S.saveBtn, marginTop: 12 }}>
              {fillingMeals ? <><Loader2 size={15} className="spin" style={{ marginInlineEnd: 6 }} /> {t("nutritionPlan.fillingMealSuggestions")}</> : (plan.mealSuggestionsText ? t("nutritionPlan.refreshMealSuggestionsBtn") : t("nutritionPlan.fillMealSuggestionsBtn"))}
            </button>
            {plan.mealSuggestionsText && (
              <>
                <div style={{ ...NS.planBox, marginTop: 10 }}>{isolateNumbers(plan.mealSuggestionsText)}</div>
                <p style={{ ...NS.sectionText, fontSize: 11, color: "var(--muted2)", marginTop: 6 }}>{t("nutritionPlan.mealSuggestionsDisclaimer")}</p>
              </>
            )}
          </>
        )}
      </div>

      {isSub && (
        <div style={NS.sectionCard}>
          <div style={NS.sectionTitle}>{t("nutritionPlan.adviceTitle")}</div>
          {gettingAdvice ? (
            <p style={{ ...NS.sectionText, color: "var(--muted2)" }}><Loader2 size={14} className="spin" style={{ marginInlineEnd: 6 }} />{t("nutritionPlan.gettingAdvice")}</p>
          ) : plan.lastAdviceText ? (
            <>
              <div style={NS.planBox}>{isolateNumbers(plan.lastAdviceText)}</div>
              <p style={{ ...NS.sectionText, fontSize: 11, color: "var(--muted2)", marginTop: 6 }}>{t("nutritionPlan.adviceDisclaimer")}</p>
            </>
          ) : (
            <p style={{ ...NS.sectionText, color: "var(--muted2)" }}>{t("nutritionPlan.noAdviceYet")}</p>
          )}
          <button onClick={getAdvice} disabled={gettingAdvice} style={{ ...S.exportBtn, marginTop: 10, marginBottom: 0 }}>
            <Sparkles size={14} /> {t("nutritionPlan.refreshAdviceBtn")}
          </button>
        </div>
      )}

      {waterGoal != null && (
        <div style={NS.sectionCard}>
          <div style={NS.sectionTitle}>{t("nutritionPlan.waterTitle")}</div>
          <div style={NS.waterRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Droplet size={18} color="#6FA8DC" />
              <span style={NS.waterCupsLabel}>{isolateNumbers(t("nutritionPlan.waterCups", { count: todayCups, goal: waterGoal }))}</span>
            </div>
            <button onClick={addCup} style={NS.addCupBtn}><Plus size={14} /> {t("nutritionPlan.addCupBtn")}</button>
          </div>
        </div>
      )}

      <button onClick={() => setShowAssessmentForm(true)} style={{ ...S.exportBtn, marginTop: 4 }}>{t("nutritionPlan.resetBtn")}</button>
      <button onClick={deletePlan} style={{ ...S.exportBtn, marginBottom: 0, color: "#E05252", borderColor: "rgba(224,82,82,0.35)" }}><Trash2 size={14} /> {t("nutritionPlan.deletePlanBtn")}</button>
    </div>
  );
}
