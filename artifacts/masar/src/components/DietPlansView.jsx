import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Salad, ChevronLeft, ChevronRight, AlertTriangle, Sparkles, Loader2, Trash2, RefreshCw, Send, Crown, Check,
} from "lucide-react";
import { store } from "../lib/store";
import { analyze } from "../lib/helpers";
import { localDayKey } from "../lib/tips";
import { DIET_SYSTEMS, getDietSystem, isDietUnsuitable } from "../lib/diet-systems";
import { DAILY_GUIDELINES, sumNutritionEntries } from "../lib/nutrition";
import { isActiveSubscriber } from "../lib/subscription";
import { S } from "./styles";

const SUBSCRIBE_INSTAGRAM_URL = "https://www.instagram.com/hjmasar";

const DS = {
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #7FB069, #4E7A3B)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },
  disclaimerCard: { display: "flex", gap: 10, alignItems: "flex-start", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 12px", marginBottom: 16 },
  disclaimerText: { fontSize: 12, color: "var(--muted2)", lineHeight: 1.7, margin: 0 },
  warningCard: { display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(209,123,95,0.1)", border: "1.5px solid rgba(209,123,95,0.4)", borderRadius: 14, padding: "14px 12px", marginBottom: 16 },
  warningTitle: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" },
  warningText: { fontSize: 12.5, color: "var(--ink)", lineHeight: 1.7, margin: 0 },
  systemCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 10, cursor: "pointer" },
  systemCardDisabled: { opacity: 0.55, cursor: "default" },
  systemName: { fontSize: 15, fontWeight: 700, color: "var(--ink)" },
  systemOverview: { fontSize: 12.5, color: "var(--muted2)", marginTop: 4, lineHeight: 1.6 },
  badge: { display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "var(--muted2)", background: "var(--surface-sunken)", borderRadius: 20, padding: "3px 10px", marginTop: 8 },
  backRow: { display: "flex", alignItems: "center", gap: 6, color: "var(--gold)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 14, background: "none", border: "none", fontFamily: "inherit", padding: 0 },
  sectionCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 6 },
  sectionText: { fontSize: 13, color: "var(--ink)", lineHeight: 1.8, margin: 0 },
  bulletList: { margin: 0, paddingInlineStart: 18, fontSize: 13, color: "var(--ink)", lineHeight: 1.9 },
  sampleDayRow: { display: "flex", gap: 8, marginBottom: 6, fontSize: 12.5 },
  sampleDayLabel: { fontWeight: 700, color: "var(--muted2)", flexShrink: 0, minWidth: 70 },
  planBox: { background: "var(--surface-sunken)", borderRadius: 12, padding: "14px 12px", fontSize: 13.5, lineHeight: 1.9, whiteSpace: "pre-wrap", color: "var(--ink)" },
  adherenceRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  adherenceValue: { fontSize: 20, fontWeight: 700, color: "var(--gold)", direction: "ltr" },
  bannerCard: { display: "flex", gap: 10, alignItems: "center", background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.35)", borderRadius: 14, padding: "12px 12px", marginBottom: 16 },
  upsellCard: { background: "linear-gradient(160deg, var(--warm-tint), var(--panel))", border: "1px solid var(--warm-border)", borderRadius: 16, padding: "20px 16px", textAlign: "center", marginBottom: 16 },
  upsellIcon: { width: 48, height: 48, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" },
  upsellTitle: { fontSize: 15, fontWeight: 700, marginBottom: 6 },
  upsellMessage: { fontSize: 12.5, color: "var(--muted2)", lineHeight: 1.7, marginBottom: 14 },
  upsellBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gold)", color: "var(--bg)", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none" },
};

function PremiumRequired({ t }) {
  return (
    <div style={DS.upsellCard}>
      <div style={DS.upsellIcon}><Crown size={22} color="var(--on-accent)" /></div>
      <div style={DS.upsellTitle}>{t("dietPlans.premiumRequiredTitle")}</div>
      <p style={DS.upsellMessage}>{t("dietPlans.premiumRequiredMessage")}</p>
      <a href={SUBSCRIBE_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={DS.upsellBtn}>
        <Send size={14} /> {t("common.buttons.subscribeInstagram")}
      </a>
    </div>
  );
}

export default function DietPlansView({ healthProfile, showToast, subscription }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const isRtl = !isEn;
  const isSub = isActiveSubscriber(subscription);

  const [loaded, setLoaded] = useState(false);
  const [plan, setPlan] = useState(null);
  const [nutritionLog, setNutritionLog] = useState([]);
  const [selectedSystemId, setSelectedSystemId] = useState(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessmentDraft, setAssessmentDraft] = useState({ country: "", budget: "", foodPreferences: "", allergies: "" });
  const [buildingPlan, setBuildingPlan] = useState(false);
  const [altInput, setAltInput] = useState("");
  const [altResult, setAltResult] = useState(null);
  const [altLoading, setAltLoading] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([store.loadDietPlan(), store.loadNutritionLog()]).then(([p, log]) => {
      if (!active) return;
      setPlan(p);
      setNutritionLog(log);
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const conditions = healthProfile?.conditions || [];
  const currentSystem = plan ? getDietSystem(plan.systemId) : null;
  const detailSystem = selectedSystemId ? getDietSystem(selectedSystemId) : null;
  const detailUnsuitable = detailSystem ? isDietUnsuitable(detailSystem, conditions) : false;

  const dataChanged = useMemo(() => {
    if (!plan) return false;
    const a = plan.assessment || {};
    const weightChanged = a.weightKgSnapshot != null && healthProfile?.weightKg != null && Math.abs(a.weightKgSnapshot - healthProfile.weightKg) >= 3;
    const activityChanged = a.activityLevelSnapshot && healthProfile?.activityLevel && a.activityLevelSnapshot !== healthProfile.activityLevel;
    return weightChanged || activityChanged;
  }, [plan, healthProfile]);

  const last7Entries = useMemo(() => {
    const days = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) { days.push(localDayKey(d)); d.setDate(d.getDate() - 1); }
    return nutritionLog.filter((e) => days.includes(e.date));
  }, [nutritionLog]);

  const adherence = useMemo(() => {
    if (!currentSystem || last7Entries.length === 0) return null;
    const daysWithData = new Set(last7Entries.map((e) => e.date)).size || 1;
    const totals = sumNutritionEntries(last7Entries);
    if (currentSystem.id === "dash") {
      return { type: "sodium", value: Math.round(totals.sodium / daysWithData), target: DAILY_GUIDELINES.sodiumMaxMg };
    }
    return { type: "fiber", value: Math.round(totals.fiber / daysWithData), target: [DAILY_GUIDELINES.fiberMinG, DAILY_GUIDELINES.fiberMaxG] };
  }, [currentSystem, last7Entries]);

  function buildDietPlanPrompt(system) {
    const sys = {
      name: isEn ? system.nameEn : system.name,
      overview: isEn ? system.overviewEn : system.overview,
      allowed: (isEn ? system.allowedFoodsEn : system.allowedFoods).join(isEn ? ", " : "، "),
      limit: (isEn ? system.limitFoodsEn : system.limitFoods).join(isEn ? ", " : "، "),
    };
    const a = assessmentDraft;
    const userLines = [
      healthProfile?.age ? `${isEn ? "Age" : "العمر"}: ${healthProfile.age}` : "",
      healthProfile?.gender ? `${isEn ? "Gender" : "الجنس"}: ${healthProfile.gender}` : "",
      healthProfile?.heightCm ? `${isEn ? "Height" : "الطول"}: ${healthProfile.heightCm}cm` : "",
      healthProfile?.weightKg ? `${isEn ? "Weight" : "الوزن"}: ${healthProfile.weightKg}kg` : "",
      healthProfile?.activityLevel ? `${isEn ? "Activity level" : "مستوى النشاط"}: ${healthProfile.activityLevel}` : "",
      healthProfile?.tee ? `${isEn ? "Estimated daily energy needs (TEE)" : "احتياج الطاقة اليومي التقديري"}: ${Math.round(healthProfile.tee)} kcal` : "",
      a.country ? `${isEn ? "Country" : "البلد"}: ${a.country}` : "",
      a.budget ? `${isEn ? "Food budget" : "ميزانية الطعام"}: ${a.budget}` : "",
      a.foodPreferences ? `${isEn ? "Food preferences" : "تفضيلات الطعام"}: ${a.foodPreferences}` : "",
      a.allergies ? `${isEn ? "Allergies" : "حساسية غذائية"}: ${a.allergies}` : "",
    ].filter(Boolean).join("\n");

    if (isEn) {
      return `You are a nutrition-plan assistant. Build a short, practical personalized eating plan STRICTLY within the following diet system's principles - do not invent food rules outside them.\n\nDiet system: ${sys.name}\nWhat it is: ${sys.overview}\nFoods to emphasize: ${sys.allowed}\nFoods to limit: ${sys.limit}\n\nUser data:\n${userLines || "No additional data provided."}\n\nBuild a concise, organized, personalized plan (meal ideas across a day or few days) that fits the user's country/budget/preferences/allergies when given, staying within the diet system's principles above only. End with one sentence stating this is general guidance, not professional medical or nutrition advice.`;
    }
    return `أنت مساعد لبناء خطط غذائية. ابنِ خطة أكل قصيرة وعملية ومخصّصة **ضمن مبادئ النظام الغذائي التالي فقط** - لا تخترع أي قاعدة غذائية خارج هذا السياق.\n\nالنظام الغذائي: ${sys.name}\nما هو: ${sys.overview}\nأطعمة يُركَّز عليها: ${sys.allowed}\nأطعمة تُقلَّل: ${sys.limit}\n\nبيانات المستخدم:\n${userLines || "لا بيانات إضافية متوفرة."}\n\nابنِ خطة مختصرة ومنظّمة ومخصّصة (أفكار وجبات ليوم أو بضعة أيام) تناسب بلد/ميزانية/تفضيلات/حساسية المستخدم إن توفّرت، ضمن مبادئ النظام أعلاه فقط. اختم بجملة واحدة توضّح أن هذا إرشاد عام لا نصيحة طبية أو غذائية احترافية.`;
  }

  async function buildPlan(system) {
    if (!isSub) { showToast(t("dietPlans.premiumRequiredTitle")); return; }
    setBuildingPlan(true);
    try {
      const prompt = buildDietPlanPrompt(system);
      const text = await analyze(prompt, 700);
      const newPlan = {
        systemId: system.id,
        planText: text.trim(),
        assessment: {
          ...assessmentDraft,
          weightKgSnapshot: healthProfile?.weightKg ?? null,
          activityLevelSnapshot: healthProfile?.activityLevel ?? null,
        },
        generatedAt: new Date().toISOString(),
      };
      const res = await store.saveDietPlan(newPlan);
      if (!res.ok) { showToast(t("dietPlans.planSaveFailed")); return; }
      setPlan(newPlan);
      setSelectedSystemId(null);
      setShowAssessmentForm(false);
      setAltResult(null);
      showToast(t("dietPlans.planBuilt"));
    } catch (err) {
      console.error("[DietPlansView] buildPlan failed:", err);
      showToast(t("dietPlans.planBuildFailed"));
    } finally {
      setBuildingPlan(false);
    }
  }

  async function deletePlan() {
    if (!window.confirm(t("dietPlans.deletePlanConfirm"))) return;
    const prev = plan;
    setPlan(null);
    const res = await store.deleteDietPlan();
    if (!res.ok) { setPlan(prev); showToast(t("dietPlans.deleteFailedGeneric")); return; }
    showToast(t("dietPlans.planDeleted"));
  }

  async function suggestAlternative() {
    if (!isSub) { showToast(t("dietPlans.premiumRequiredTitle")); return; }
    const food = altInput.trim();
    if (!food || !currentSystem) return;
    setAltLoading(true);
    setAltResult(null);
    try {
      const sysName = isEn ? currentSystem.nameEn : currentSystem.name;
      const sysAllowed = (isEn ? currentSystem.allowedFoodsEn : currentSystem.allowedFoods).join(", ");
      const prompt = isEn
        ? `Within the "${sysName}" diet system (emphasizing: ${sysAllowed}), suggest 2-3 short practical alternatives for someone who doesn't have "${food}" available. Keep it to 2-3 lines. End with one sentence noting this is general guidance, not professional nutrition advice.`
        : `ضمن نظام "${sysName}" الغذائي (يركّز على: ${sysAllowed})، اقترح بديلين أو ثلاثة عملية وقصيرة لمن لا يتوفر لديه "${food}". اجعلها سطرين أو ثلاثة. اختم بجملة توضّح أن هذا إرشاد عام لا نصيحة غذائية احترافية.`;
      const text = await analyze(prompt, 300);
      setAltResult(text.trim());
    } catch (err) {
      console.error("[DietPlansView] suggestAlternative failed:", err);
      showToast(t("dietPlans.alternativeFailed"));
    } finally {
      setAltLoading(false);
    }
  }

  const BackChevron = isRtl ? ChevronRight : ChevronLeft;

  // ===== عرض التفاصيل =====
  if (detailSystem) {
    return (
      <div style={S.view}>
        <button onClick={() => { setSelectedSystemId(null); setShowAssessmentForm(false); }} style={DS.backRow}>
          <BackChevron size={16} /> {t("dietPlans.backToList")}
        </button>
        {!detailSystem.completed ? (
          <div style={DS.sectionCard}><p style={DS.sectionText}>{t("dietPlans.structureOnlyNotice")}</p></div>
        ) : (
          <>
            <div style={DS.hero}>
              <div style={DS.heroIcon}><Salad size={22} color="var(--on-accent)" /></div>
              <div>
                <div style={DS.heroTitle}>{isEn ? detailSystem.nameEn : detailSystem.name}</div>
              </div>
            </div>

            {detailUnsuitable && (
              <div style={DS.warningCard}>
                <AlertTriangle size={20} color="#D17B5F" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={DS.warningTitle}>{t("dietPlans.unsuitableWarningTitle")}</p>
                  <p style={DS.warningText}>{t("dietPlans.unsuitableWarningMessage")}</p>
                </div>
              </div>
            )}

            <div style={DS.sectionCard}>
              <div style={DS.sectionTitle}>{t("dietPlans.overview")}</div>
              <p style={DS.sectionText}>{isEn ? detailSystem.overviewEn : detailSystem.overview}</p>
            </div>
            <div style={DS.sectionCard}>
              <div style={DS.sectionTitle}>{t("dietPlans.suitableFor")}</div>
              <p style={DS.sectionText}>{isEn ? detailSystem.suitableForEn : detailSystem.suitableFor}</p>
            </div>
            <div style={DS.sectionCard}>
              <div style={DS.sectionTitle}>{t("dietPlans.notRecommendedFor")}</div>
              <p style={DS.sectionText}>{isEn ? detailSystem.notRecommendedForEn : detailSystem.notRecommendedFor}</p>
            </div>
            <div style={DS.sectionCard}>
              <div style={DS.sectionTitle}>{t("dietPlans.benefits")}</div>
              <ul style={DS.bulletList}>{(isEn ? detailSystem.benefitsEn : detailSystem.benefits).map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
            <div style={DS.sectionCard}>
              <div style={DS.sectionTitle}>{t("dietPlans.drawbacks")}</div>
              <ul style={DS.bulletList}>{(isEn ? detailSystem.drawbacksEn : detailSystem.drawbacks).map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
            <div style={DS.sectionCard}>
              <div style={DS.sectionTitle}>{t("dietPlans.allowedFoods")}</div>
              <ul style={DS.bulletList}>{(isEn ? detailSystem.allowedFoodsEn : detailSystem.allowedFoods).map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
            <div style={DS.sectionCard}>
              <div style={DS.sectionTitle}>{t("dietPlans.limitFoods")}</div>
              <ul style={DS.bulletList}>{(isEn ? detailSystem.limitFoodsEn : detailSystem.limitFoods).map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
            <div style={DS.sectionCard}>
              <div style={DS.sectionTitle}>{t("dietPlans.sampleDay")}</div>
              {["breakfast", "lunch", "dinner", "snacks"].map((k) => (
                <div key={k} style={DS.sampleDayRow}>
                  <span style={DS.sampleDayLabel}>{t(`dietPlans.${k}`)}:</span>
                  <span>{(isEn ? detailSystem.sampleDayEn : detailSystem.sampleDay)[k]}</span>
                </div>
              ))}
            </div>
            <div style={DS.sectionCard}>
              <div style={DS.sectionTitle}>{t("dietPlans.scientificReference")}</div>
              <p style={DS.sectionText}>{isEn ? detailSystem.scientificReferenceEn : detailSystem.scientificReference}</p>
            </div>

            {detailUnsuitable ? (
              <div style={DS.warningCard}>
                <AlertTriangle size={18} color="#D17B5F" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={DS.warningText}>{t("dietPlans.buildPlanBlockedNotice")}</p>
              </div>
            ) : !isSub ? (
              <PremiumRequired t={t} />
            ) : !showAssessmentForm ? (
              <button onClick={() => setShowAssessmentForm(true)} style={S.saveBtn}>{t("dietPlans.buildPlanBtn")}</button>
            ) : (
              <div style={DS.sectionCard}>
                <div style={DS.sectionTitle}>{t("dietPlans.assessmentTitle")}</div>
                <p style={{ ...DS.sectionText, color: "var(--muted2)", fontSize: 11.5 }}>{t("dietPlans.assessmentNote")}</p>
                <label style={S.label}>{t("dietPlans.countryLabel")}</label>
                <input value={assessmentDraft.country} onChange={(e) => setAssessmentDraft((a) => ({ ...a, country: e.target.value }))} placeholder={t("dietPlans.countryPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
                <label style={S.label}>{t("dietPlans.budgetLabel")}</label>
                <input value={assessmentDraft.budget} onChange={(e) => setAssessmentDraft((a) => ({ ...a, budget: e.target.value }))} placeholder={t("dietPlans.budgetPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
                <label style={S.label}>{t("dietPlans.foodPreferencesLabel")}</label>
                <input value={assessmentDraft.foodPreferences} onChange={(e) => setAssessmentDraft((a) => ({ ...a, foodPreferences: e.target.value }))} placeholder={t("dietPlans.foodPreferencesPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
                <label style={S.label}>{t("dietPlans.allergiesLabel")}</label>
                <input value={assessmentDraft.allergies} onChange={(e) => setAssessmentDraft((a) => ({ ...a, allergies: e.target.value }))} placeholder={t("dietPlans.allergiesPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
                <button onClick={() => buildPlan(detailSystem)} disabled={buildingPlan} style={S.saveBtn}>
                  {buildingPlan ? <><Loader2 size={15} className="spin" style={{ marginInlineEnd: 6 }} /> {t("dietPlans.buildingPlan")}</> : t("dietPlans.buildBtn")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ===== عرض الخطة الحالية =====
  if (plan && currentSystem) {
    const dateLabel = plan.generatedAt ? new Date(plan.generatedAt).toLocaleDateString(isEn ? "en-US" : "ar", { year: "numeric", month: "short", day: "numeric" }) : "";
    return (
      <div style={S.view}>
        <div style={DS.hero}>
          <div style={DS.heroIcon}><Salad size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={DS.heroTitle}>{t("dietPlans.myPlanTitle")}</div>
            <div style={DS.heroSub}>{isEn ? currentSystem.nameEn : currentSystem.name}{dateLabel ? ` · ${t("dietPlans.generatedOn", { date: dateLabel })}` : ""}</div>
          </div>
        </div>

        {dataChanged && (
          <div style={DS.bannerCard}>
            <RefreshCw size={16} color="var(--gold)" style={{ flexShrink: 0 }} />
            <p style={{ ...DS.sectionText, fontSize: 12.5 }}>{t("dietPlans.dataChangedBanner")}</p>
          </div>
        )}

        <div style={DS.sectionCard}>
          <div style={DS.planBox}>{plan.planText}</div>
        </div>
        <div style={DS.disclaimerCard}>
          <Sparkles size={14} color="#C9A24B" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={DS.disclaimerText}>{t("dietPlans.aiPlanDisclaimer")}</p>
        </div>

        <div style={DS.sectionCard}>
          <div style={DS.sectionTitle}>{t("dietPlans.adherenceTitle")}</div>
          {adherence ? (
            <>
              <div style={DS.adherenceRow}>
                <span style={DS.sectionText}>{adherence.type === "sodium" ? t("dietPlans.avgSodium") : t("dietPlans.avgFiber")}</span>
                <span style={DS.adherenceValue}>{adherence.value}{adherence.type === "sodium" ? "mg" : "g"}</span>
              </div>
              <p style={{ ...DS.sectionText, fontSize: 11.5, color: "var(--muted2)" }}>
                {adherence.type === "sodium" ? t("dietPlans.targetUnder", { value: `${adherence.target}mg` }) : t("dietPlans.targetBetween", { min: `${adherence.target[0]}g`, max: `${adherence.target[1]}g` })}
              </p>
            </>
          ) : (
            <p style={{ ...DS.sectionText, color: "var(--muted2)" }}>{t("dietPlans.adherenceNoData")}</p>
          )}
          <p style={{ ...DS.sectionText, fontSize: 11, color: "var(--muted2)", marginTop: 6 }}>{t("dietPlans.adherenceNote")}</p>
        </div>

        {isSub && (
          <div style={DS.sectionCard}>
            <div style={DS.sectionTitle}>{t("dietPlans.alternativesTitle")}</div>
            <input value={altInput} onChange={(e) => setAltInput(e.target.value)} placeholder={t("dietPlans.alternativesInputPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
            <button onClick={suggestAlternative} disabled={altLoading || !altInput.trim()} style={{ ...S.saveBtn, marginTop: 10 }}>
              {altLoading ? <Loader2 size={15} className="spin" /> : t("dietPlans.suggestAlternativeBtn")}
            </button>
            {altResult && (
              <>
                <div style={{ ...DS.planBox, marginTop: 10 }}>{altResult}</div>
                <p style={{ ...DS.sectionText, fontSize: 11, color: "var(--muted2)", marginTop: 6 }}>{t("dietPlans.alternativeDisclaimer")}</p>
              </>
            )}
          </div>
        )}

        <button onClick={() => buildPlan(currentSystem)} disabled={buildingPlan || !isSub} style={{ ...S.saveBtn }}>
          {buildingPlan ? <Loader2 size={15} className="spin" /> : <><RefreshCw size={14} style={{ marginInlineEnd: 6 }} /> {t("dietPlans.rebuildBtn")}</>}
        </button>
        <button onClick={() => setPlan(null)} style={{ ...S.exportBtn, marginTop: 8 }}>{t("dietPlans.chooseAnotherSystemBtn")}</button>
        <button onClick={deletePlan} style={{ ...S.exportBtn, marginBottom: 0, color: "#E05252", borderColor: "rgba(224,82,82,0.35)" }}><Trash2 size={14} /> {t("dietPlans.deletePlanBtn")}</button>
      </div>
    );
  }

  // ===== عرض القائمة =====
  return (
    <div style={S.view}>
      <div style={DS.hero}>
        <div style={DS.heroIcon}><Salad size={22} color="var(--on-accent)" /></div>
        <div>
          <div style={DS.heroTitle}>{t("dietPlans.heroTitle")}</div>
          <div style={DS.heroSub}>{t("dietPlans.heroSub")}</div>
        </div>
      </div>
      <div style={DS.disclaimerCard}>
        <AlertTriangle size={16} color="var(--muted2)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={DS.disclaimerText}>{t("dietPlans.generalDisclaimer")}</p>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted2)", marginBottom: 10 }}>{t("dietPlans.listTitle")}</div>
      <div className="stagger-in responsive-card-list">
        {DIET_SYSTEMS.map((sys) => {
          const unsuitable = isDietUnsuitable(sys, conditions);
          return (
            <div key={sys.id} onClick={() => setSelectedSystemId(sys.id)} style={DS.systemCard}>
              <div style={DS.systemName}>{isEn ? sys.nameEn : sys.name}</div>
              {sys.completed ? (
                <div style={DS.systemOverview}>{isEn ? sys.overviewEn : sys.overview}</div>
              ) : (
                <span style={DS.badge}>{t("dietPlans.comingSoonBadge")}</span>
              )}
              {sys.completed && unsuitable && (
                <span style={{ ...DS.badge, color: "#D17B5F", background: "rgba(209,123,95,0.12)" }}>
                  <AlertTriangle size={10} style={{ verticalAlign: "middle", marginInlineEnd: 3 }} />{t("dietPlans.unsuitableWarningTitle")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
