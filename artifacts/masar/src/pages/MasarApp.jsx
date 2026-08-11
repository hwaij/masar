"use strict";
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import {
  Sparkles, Clock, TrendingUp, TrendingDown, Minus, ListChecks, Settings, ChevronLeft, ChevronRight,
  Loader2, Plus, X, Trash2, Check, Flame, Star, Edit3,
  Sun, Target, Palette, Cloud, CloudOff,
  Rocket, BookOpen, User, Trophy, ChevronDown, ExternalLink,
  Timer, Play, Pause, RotateCcw, Zap, Download, Save,
  Moon, Bell, BookMarked, CheckCircle2,
  MessageCircle, Send,
  LogIn, LogOut,
  Heart, GraduationCap, Eye, AlertTriangle, RefreshCw,
  Wallet, ArrowDownCircle, ArrowUpCircle, Crown,
  Utensils, Dumbbell, Menu, Users,
  Accessibility, ALargeSmall, Contrast, StretchHorizontal, Volume2,
  Smartphone, Copy,
} from "lucide-react";
import { fivePrayers, nextPrayer, to12h } from "../lib/prayer";
import { ADHKAR_CATEGORIES, ADHKAR } from "../lib/adhkar";
import { store, setOwner, getOwner, DEFAULT_CATEGORIES } from "../lib/store";
import { pickDailyTip, TIP_CATEGORY_LABELS, localDayKey, TIPS, FALLBACK_TIP } from "../lib/tips";
import { pickDailyMoneyTip, MONEY_TIP_CATEGORY_LABELS } from "../lib/money-tips";
import { isActiveSubscriber } from "../lib/subscription";
import { requestNotificationPermission, disablePush, getNotificationStatus } from "../lib/push";
import { ACTIVITY_LEVELS, HEALTH_CONDITIONS, NO_CONDITION, computeHealthMetrics } from "../lib/health";
import { createGoal, isReviewDue, GOAL_PERIODS, GOAL_POINTS_SUCCESS, GOAL_POINTS_FAILURE } from "../lib/goals";
import { FITNESS_GOALS } from "../lib/exercises-db";
import { sumNutritionEntries, waterGoalCups, MEAL_TYPES, analyzeMealPatterns, MICRONUTRIENT_META } from "../lib/nutrition";
import { playSaveSound, playAchievementSound } from "../lib/sound";
import { getSession, onAuthChange, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, userFromSession, hasAuth } from "../lib/auth";
import {
  todayKey, fmtHM, uid, diffMinutes, arabicDate, computeStreak, longestStreak, escapeHtml,
  COLOR_CHOICES, BADGES, analyze, parseJsonLoose,
  localAchieveSuggestions, localCoachReply,
  getLevel, addMinutesToTime, nowHHMM, autoClassify, withTimeout,
  MANDATORY_TASKS, AZKAR_MORNING, AZKAR_EVENING, coachChat,
  formatNumberLatin,
} from "../lib/helpers";
import { isolateNumbers } from "../lib/bidi";
import { S } from "../components/styles";
import NumericValue from "../components/NumericValue";
import DayWheel from "../components/DayWheel";
// محمَّلة عند الطلب فقط (React.lazy) لا مع الحزمة الرئيسية: هذه أقسام
// أقل زيارة من "اليوم"/"المهام"، وNutritionView وMentalHealthView تسحبان
// مكتبات ثقيلة (html5-qrcode، recharts) لا حاجة لتحميلها إلا عند فتح
// القسم فعلاً.
const NutritionView = lazy(() => import("../components/NutritionView"));
const FitnessView = lazy(() => import("../components/FitnessView"));
const MentalHealthView = lazy(() => import("../components/MentalHealthView"));
const GroupsView = lazy(() => import("../components/GroupsView"));
const VaultView = lazy(() => import("../components/VaultView"));
const DietPlansView = lazy(() => import("../components/DietPlansView"));
const NutritionPlanView = lazy(() => import("../components/NutritionPlanView"));

// recharts (~114kB gzip) كانت تُستورَد ثابتاً هنا رغم أن استخدامها الوحيد في
// هذا الملف محصور بثلاث دوال (التقارير/النوم/تقرير التركيز) - ما يعني
// تحميلها ضمن الحزمة الرئيسية لكل مستخدم حتى لو لم يفتح تلك الأقسام
// إطلاقاً. dynamic import() هنا (مرة واحدة، مُخزَّنة بالذاكرة) يؤجّل ذلك
// لحظة فتح أحد تلك الأقسام فعلاً بدل لحظة إقلاع التطبيق.
let rechartsModulePromise = null;
function useRecharts() {
  const [mod, setMod] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!rechartsModulePromise) rechartsModulePromise = import("recharts");
    rechartsModulePromise.then((m) => { if (alive) setMod(m); });
    return () => { alive = false; };
  }, []);
  return mod;
}
function ChartLoading() {
  return <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} className="spin" color="#C9A24B" /></div>;
}

// حاجز أخطاء محلي حول كل قسم مُقسَّم بالكسل (React.lazy): إن فشل تحميل
// جزء (chunk) هذا القسم تحديداً - مثلاً بعد نشر جديد يجعل اسم الملف القديم
// غير موجود - يظهر هنا خطأ صغير محصور بهذا القسم فقط مع زر إعادة تحميل،
// بدل أن ينهار التطبيق كاملاً إلى شاشة الخطأ العامة في App.tsx.
class LazySectionErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) { console.error("[LazySectionErrorBoundary]", error); }
  render() {
    if (this.state.hasError) {
      const isEn = this.props.isEn;
      return (
        <div style={{ ...S.view, textAlign: "center", padding: "40px 20px" }}>
          <p style={{ color: "var(--muted2)", marginBottom: 14 }}>
            {isEn ? "Couldn't load this section. Please reload the page." : "تعذّر تحميل هذا القسم. يرجى إعادة تحميل الصفحة."}
          </p>
          <button onClick={() => window.location.reload()} style={S.saveBtn}>
            {isEn ? "Reload" : "إعادة التحميل"}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import SideMenu, { MENU_SECTIONS, SECTION_COLOR_PALETTE } from "../components/SideMenu";
import SpotlightTour, { ST as TourStyles } from "../components/SpotlightTour";
import { useModuleTour } from "../lib/useModuleTour";
import Sidebar from "../components/Sidebar";
import TasbihIcon from "../components/TasbihIcon";

// active session storage
const SESSION_KEY = "masar_active_session";
const activeSessionStore = {
  load: () => { try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } },
  save: (s) => { try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch {} },
};
// Patch store to support loadActiveSession / saveActiveSession
store.loadActiveSession = async () => activeSessionStore.load();
store.saveActiveSession = async (s) => activeSessionStore.save(s);

// يُطبَّق فوراً عند تحميل الوحدة (قبل أول رسم لـ React) حتى لا تظهر ومضة
// بالمظهر الافتراضي الداكن قبل قراءة تفضيل المستخدم الفعلي من التخزين
// المحلي.
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-theme", store.getLocalTheme());
  // نفس فكرة data-theme أعلاه لثلاثة إعدادات إتاحة الوصول - تُطبَّق فوراً
  // قبل أول رسم حتى لا تظهر ومضة بلا تباعد/تباين/حجم خط قبل اكتمال
  // loadProfile().
  document.documentElement.setAttribute("data-font-size", store.getLocalFontSize());
  if (store.getLocalHighContrast()) document.documentElement.setAttribute("data-contrast", "high");
  if (store.getLocalSpacious()) document.documentElement.setAttribute("data-spacing", "relaxed");
}

// Extra prayer-view styles not in styles.js
const PS = {
  prayerHero: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  prayerHeroTitle: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700 },
  prayerHeroSub: { fontSize: 12, color: "var(--muted2)" },
  nextPrayerCard: { background: "linear-gradient(160deg, var(--warm-tint), var(--panel))", border: "1px solid rgba(201,162,75,0.35)", borderRadius: 16, padding: "18px 16px", textAlign: "center", marginBottom: 14 },
  nextLabel: { fontSize: 11, fontWeight: 700, color: "var(--muted2)", letterSpacing: 0.5, marginBottom: 6 },
  nextName: { fontFamily: "'Amiri', serif", fontSize: 26, fontWeight: 700, color: "var(--ink)" },
  nextTime: { fontSize: 16, color: "#C9A24B", fontVariantNumeric: "tabular-nums", margin: "4px 0" },
  nextCountdown: { fontSize: 13, color: "var(--muted2)", fontVariantNumeric: "tabular-nums" },
  weeklyCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 14 },
  weeklyPercentText: { fontSize: 13.5, color: "var(--ink)", fontWeight: 700, lineHeight: 1.7 },
  weeklyBarTrack: { height: 8, borderRadius: 4, background: "var(--surface-raised)", overflow: "hidden", marginTop: 10 },
  weeklyBarFill: { height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #5FA8A0, #C9A24B)" },
  weeklyMotivation: { fontSize: 12, color: "var(--muted2)", lineHeight: 1.7, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" },
  prayerTimingNote: { fontSize: 11.5, color: "#5FA8A0", marginTop: 4, fontWeight: 600 },
  notifBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", border: "1px solid rgba(201,162,75,0.3)", background: "rgba(201,162,75,0.07)", color: "var(--gold)", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 14 },
  prayerList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  prayerRow: { display: "flex", alignItems: "center", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px" },
  prayerRowNext: { borderColor: "rgba(201,162,75,0.4)", background: "linear-gradient(160deg, var(--warm-tint), var(--panel))" },
  prayerRowDone: { opacity: 0.55 },
  prayerInfo: { flex: 1 },
  prayerName: { fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  prayerTime: { fontSize: 12.5, color: "var(--muted2)", marginTop: 2, fontVariantNumeric: "tabular-nums" },
  prayerBtn: { border: "1.5px solid rgba(201,162,75,0.4)", background: "transparent", color: "#C9A24B", borderRadius: 10, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 },
  prayerBtnDone: { background: "rgba(95,168,160,0.1)", borderColor: "rgba(95,168,160,0.4)", color: "#5FA8A0" },
  religiousCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 14 },
  religiousPresets: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 },
  presetAddBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(201,162,75,0.07)", border: "1px dashed rgba(201,162,75,0.3)", color: "#C9A24B", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  religiousList: { display: "flex", flexDirection: "column", gap: 8 },
  religiousItem: { background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px" },
  religiousItemDone: { opacity: 0.6 },
  religiousTop: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  religiousTitle: { fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  religiousMeta: { fontSize: 11.5, color: "var(--muted2)", marginTop: 3, fontVariantNumeric: "tabular-nums" },
  timerControlsRow: { display: "flex", gap: 8 },
  miniTimerBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "#C9A24B", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  miniDoneBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(107,104,99,0.1)", border: "1px solid var(--border2)", color: "var(--muted2)", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  miniDoneBtnReady: { background: "rgba(95,168,160,0.12)", borderColor: "rgba(95,168,160,0.4)", color: "#5FA8A0" },
  religiousDoneRow: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#5FA8A0", fontWeight: 600 },
  modeToggleRow: { display: "flex", gap: 6, marginBottom: 14, background: "var(--surface-sunken)", borderRadius: 12, padding: 4 },
  modeToggleBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", borderRadius: 9, background: "transparent", color: "var(--muted2)", padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  modeToggleBtnActive: { background: "var(--surface-raised)", color: "var(--gold)" },
  manualEntryRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 },
  manualInput: { background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 16px", color: "var(--ink)", fontSize: 28, fontFamily: "'Amiri', serif", fontWeight: 700, width: 100, textAlign: "center" },
  manualUnit: { fontFamily: "'Amiri', serif", fontSize: 18, color: "var(--muted2)" },
  // بطاقات الأذكار وتقدّم القرآن وعداد الاستغفار — مُعادة من قسم
  // "الأساسيات" السابق، بلا صفوف المهام الأساسية/الصلوات (موجودة أصلاً
  // في اليوم وأعلى هذه الصفحة، فلا داعي لتكرارها).
  essSection: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 14 },
  essSectionHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  essSectionTitle: { fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  essProgressBadge: { marginInlineStart: "auto", fontSize: 12, color: "var(--muted2)" },
  essTabRow: { display: "flex", gap: 6, marginBottom: 12, background: "var(--surface-sunken)", borderRadius: 10, padding: 3 },
  essTab: { flex: 1, border: "none", borderRadius: 8, background: "transparent", color: "var(--muted2)", padding: "8px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  essTabActive: { background: "var(--surface-raised)", color: "var(--gold)" },
  essAzkarItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" },
  essAzkarText: { flex: 1, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 },
  essAzkarCount: { fontSize: 11, color: "var(--muted2)", whiteSpace: "nowrap" },
  essCompleteBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", marginTop: 12, background: "rgba(95,168,160,0.1)", border: "1px solid rgba(95,168,160,0.3)", color: "#5FA8A0", borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  essCompleteBtnDone: { background: "rgba(95,168,160,0.07)", color: "#5FA8A0", opacity: 0.6 },
  essJuzGrid: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginTop: 8 },
  essJuzBtn: { border: "1px solid var(--line)", borderRadius: 8, padding: "6px 2px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", background: "transparent", color: "var(--muted2)", textAlign: "center" },
  essJuzBtnDone: { background: "rgba(95,168,160,0.12)", borderColor: "rgba(95,168,160,0.4)", color: "#5FA8A0" },
  essJuzCount: { fontSize: 12, color: "var(--muted2)", marginTop: 8, textAlign: "center" },
  istighfarBtn: { flex: 1, border: "1px solid var(--gold)", borderRadius: 10, background: "rgba(201,162,75,0.08)", color: "var(--gold)", padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
};

// Assistant styles
const HS = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: { display: "flex", alignItems: "center", gap: 12 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #5FA8A0, #3E7E78)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },
  chatCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px", display: "flex", flexDirection: "column" },
  chatHead: { display: "flex", alignItems: "center", gap: 7, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--line)" },
  chatTitle: { fontSize: 13, fontWeight: 700, color: "var(--muted2)" },
  chatScroll: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto", marginBottom: 12 },
  msgUser: { alignSelf: "flex-start", maxWidth: "85%", background: "rgba(201,162,75,0.12)", border: "1px solid rgba(201,162,75,0.25)", borderRadius: "14px 4px 14px 14px", padding: "10px 12px", fontSize: 13.5, color: "var(--ink)", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  msgBot: { alignSelf: "flex-end", maxWidth: "92%", background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: "4px 14px 14px 14px", padding: "10px 12px", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.8, whiteSpace: "pre-wrap" },
  suggestionRow: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  suggestionChip: { background: "rgba(201,162,75,0.07)", border: "1px solid rgba(201,162,75,0.25)", color: "#C9A24B", borderRadius: 20, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "start" },
  chatInputRow: { display: "flex", gap: 8, alignItems: "center" },
  chatInput: { flex: 1, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 12, padding: "11px 14px", color: "var(--ink)", fontSize: 14, fontFamily: "inherit", outline: "none" },
  chatSend: { background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 12, width: 46, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
};

// شارة الاشتراك في الشريط العلوي، ونمط بطاقة الاشتراك في "التخصيص".
const SUB = {
  subBadge: { display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "var(--gold)", color: "var(--on-accent)", flexShrink: 0 },
  vipBadge: { display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(140deg, #E7C378, #C9A24B 55%, #8B6914)", color: "var(--on-accent)", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,162,75,0.4)" },
  card: { background: "linear-gradient(160deg, var(--warm-tint), var(--panel))", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 16, padding: "16px 14px", marginBottom: 16 },
  head: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  iconBadge: { width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "linear-gradient(140deg, #E7C378, #C9A24B 60%, #A9822F)", boxShadow: "0 0 0 1px rgba(201,162,75,0.25)" },
  title: { fontFamily: "'Amiri', serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" },
  subtitle: { fontSize: 12, color: "var(--muted2)", marginTop: 3, lineHeight: 1.6 },
  statusRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(201,162,75,0.08)", border: "1px solid rgba(201,162,75,0.25)", borderRadius: 10, padding: "10px 12px" },
  statusLabel: { fontSize: 12.5, color: "var(--muted2)" },
  statusValue: { fontSize: 13, fontWeight: 700, color: "#C9A24B" },
  plansRow: { display: "flex", gap: 10, marginBottom: 14 },
  planCard: { flex: 1, background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 8px", textAlign: "center" },
  planLabel: { fontSize: 12, color: "var(--muted2)", fontWeight: 600 },
  planPrice: { fontFamily: "'Amiri', serif", fontSize: 19, fontWeight: 700, color: "#C9A24B", marginTop: 4 },
  subscribeBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", boxSizing: "border-box" },
  // بطاقة "التشجيع للاشتراك" التي تحلّ محل أي قسم/ميزة مدفوعة لغير
  // المشتركين — تدرّج كحلي داكن ثابت (بدل التدرّج الدافئ المعتاد للبطاقات
  // الأخرى) بحدود وأيقونة ذهبية، لتُقرأ كدعوة مميّزة لا كخطأ أو رسالة منع.
  // ثابت عمداً في الوضعين (لا يتبع الثيم) - خلل حقيقي وُجد وأُصلح هنا: كان
  // نص العنوان/الرسالة يستخدم var(--ink)/var(--muted2) (يتبعان الثيم)
  // بينما تبقى خلفية البطاقة داكنة دائماً، فينتج نص داكن على خلفية داكنة
  // بالضبط في الوضع الفاتح (يتحول --ink/--muted2 لدرجات داكنة هناك) - غير
  // مقروء عملياً. الحل: تثبيت لوني النص أيضاً (بنفس قيمهما في الوضع
  // الداكن) بما أن الخلفية نفسها ثابتة، فيبقى التباين نفسه مضمونًا دائماً.
  upsellCard: { background: "linear-gradient(160deg, #10131F, #0A0A0B)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 18, padding: "30px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  upsellCardCompact: { padding: "20px 16px", borderRadius: 14, gap: 8 },
  upsellIconBadge: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "linear-gradient(140deg, #E7C378, #C9A24B 60%, #A9822F)", boxShadow: "0 0 0 1px rgba(201,162,75,0.25), 0 4px 18px rgba(201,162,75,0.2)" },
  upsellTitle: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700, color: "#E8E6E1" },
  upsellMessage: { fontSize: 13, color: "#8A8782", lineHeight: 1.8, maxWidth: 320, margin: 0 },
  upsellBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", marginTop: 6 },
};

// أنماط قسم "أنت"
const YS = {
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #5FA8A0, #3E7E78)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },
  formCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 16 },
  row2: { display: "flex", gap: 10 },
  col: { flex: 1 },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { border: "1px solid var(--border2)", borderRadius: 20, padding: "7px 13px", fontSize: 12.5, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", background: "transparent" },
  chipActive: { borderColor: "var(--gold)", background: "rgba(201,162,75,0.12)", color: "var(--gold)", fontWeight: 700 },
  warningCard: { display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(209,123,95,0.1)", border: "1.5px solid rgba(209,123,95,0.4)", borderRadius: 14, padding: "14px 12px", marginBottom: 16 },
  warningText: { fontSize: 13, color: "var(--ink)", lineHeight: 1.8, fontWeight: 600, margin: 0 },
  resultsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  resultCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px" },
  resultLabel: { fontSize: 12, fontWeight: 700, color: "var(--muted2)" },
  resultValue: { fontFamily: "'Amiri', serif", fontSize: 24, fontWeight: 700, color: "var(--gold)", marginTop: 6 },
  resultUnit: { fontSize: 11, color: "var(--muted2)", marginInlineStart: 4 },
  resultCategory: { fontSize: 12, fontWeight: 700, color: "#5FA8A0", marginTop: 4 },
  resultHint: { fontSize: 11.5, color: "var(--muted2)", lineHeight: 1.6, marginTop: 8 },
  summaryCard: { background: "linear-gradient(160deg, var(--warm-tint), var(--panel))", border: "1px solid var(--warm-border)", borderRadius: 14, padding: "14px 12px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 12.5, color: "var(--muted2)" },
  summaryValue: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
};

export default function MasarApp() {
  const { t, i18n } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("masar_splash_done"));
  // يدعم اختصارات الشاشة الرئيسية (manifest.json → shortcuts) التي تفتح
  // التطبيق برابط "/?view=X" - لا علاقة له بأي منطق بيانات، مجرد قراءة
  // لمرة واحدة عند التحميل الأول لتحديد الشاشة الافتتاحية، مع قائمة بيضاء
  // صريحة حتى لا يقود رابط خارجي المستخدم لشاشة غير موجودة.
  const VALID_SHORTCUT_VIEWS = ["today", "prayer", "adhkar", "tips", "you", "nutrition", "nutritionPlan", "dietPlans", "fitness", "mental", "focus", "tasks", "goals", "vault", "reports", "groups", "assistant", "achieve", "settings"];
  const [view, setView] = useState(() => {
    try {
      const requested = new URLSearchParams(window.location.search).get("view");
      return VALID_SHORTCUT_VIEWS.includes(requested) ? requested : "today";
    } catch { return "today"; }
  });
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [gamify, setGamify] = useState({ points: 0, badges: [] });
  const [profile, setProfile] = useState({ name: "", about: "", hobbies: "", field: "", tourSeen: false, tourProgress: {}, theme: "dark", language: "ar" });
  const [tourOpen, setTourOpen] = useState(false);
  const [theme, setTheme] = useState(() => store.getLocalTheme());
  const [fontSize, setFontSize] = useState(() => store.getLocalFontSize());
  const [highContrast, setHighContrast] = useState(() => store.getLocalHighContrast());
  const [spacious, setSpacious] = useState(() => store.getLocalSpacious());
  const [achieve, setAchieve] = useState([]);
  const [focus, setFocus] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [prayerLog, setPrayerLog] = useState([]);
  const [religious, setReligious] = useState([]);
  const [azkarLog, setAzkarLog] = useState({});
  const [azkarItems, setAzkarItems] = useState({});
  const [quranProgress, setQuranProgress] = useState({});
  const [istighfar, setIstighfar] = useState({ daily: {}, total: 0 });
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [toast, setToast] = useState(null);
  const [mandatoryLog, setMandatoryLog] = useState({});
  const [pointsLog, setPointsLog] = useState([]);
  const [tipsLog, setTipsLog] = useState({});
  const [goals, setGoals] = useState([]);
  const [sleepLog, setSleepLog] = useState([]);
  const [healthProfile, setHealthProfile] = useState({
    heightCm: null, weightKg: null, age: null, gender: null, activityLevel: null, conditions: [],
    bmi: null, bmiCategory: null, ibw: null, ree: null, tee: null,
  });
  const [subscription, setSubscription] = useState({ isSubscriber: false, subscriptionEnd: null, isVip: false, subscriptionType: null });
  const isSub = isActiveSubscriber(subscription);
  const [user, setUser] = useState(null);
  const userIdRef = useRef(undefined);
  const loadVersionRef = useRef(0);

  const loadAll = useCallback(async () => {
      const myVersion = ++loadVersionRef.current;
      // سبب البطء الحقيقي بعد إصلاح التعليق السابق: Promise.all واحد لكل
      // الـ24 استعلاماً معاً كان يعني أن الواجهة تنتظر أبطأ واحد منها دائماً
      // حتى في الإقلاع الطبيعي السليم (المهلة كانت تمنع التعليق الأبدي، لكنها
      // لم تمنع الانتظار الفعلي لكل الاستعلامات). الإصلاح: قسمان متوازيان -
      // "أساسي" (فقط ما تحتاجه شاشة "اليوم" والشريط العلوي أول ظهور) يُنتظر
      // فقط، فتُفتح الواجهة بمجرده مباشرة؛ و"خلفية" (بقية الأقسام) يبدأ
      // بالتوازي تماماً معه لكن دون انتظاره - يكمل ذاتياً بعد ظهور الواجهة
      // ويحدّث حالته عندها. كل استعلام لا يزال محمياً بنفس مهلة الـ8 ثوانٍ
      // ضد التعليق الحقيقي، لكن هذا لم يعد يؤخّر فتح التطبيق نفسه أبداً.
      const T = 8000;

      const essential = Promise.all([
        withTimeout(store.loadCategories(), T, DEFAULT_CATEGORIES),
        withTimeout(store.loadEntries(), T, []),
        withTimeout(store.loadTasks(), T, []),
        withTimeout(store.loadReports(), T, []),
        withTimeout(store.loadGamify(), T, { points: 0, badges: [] }),
        withTimeout(store.loadProfile(), T, { name: "", about: "", hobbies: "", field: "", tourSeen: false, tourProgress: {}, theme: "dark", language: "ar" }),
        withTimeout(store.loadMandatoryLog(), T, {}),
        withTimeout(store.loadFocus(), T, []),
        withTimeout(store.loadSubscription(), T, { isSubscriber: false, subscriptionEnd: null, isVip: false, subscriptionType: null }),
      ]);

      const background = Promise.all([
        withTimeout(store.loadAchieve(), T, []),
        withTimeout(store.loadCommitments(), T, []),
        withTimeout(store.loadPrayerLog(), T, []),
        withTimeout(store.loadReligious(), T, []),
        withTimeout(store.loadPointsLog(), T, []),
        withTimeout(store.loadTipsLog(), T, {}),
        withTimeout(store.loadGoals(), T, []),
        withTimeout(store.loadSleepLog(), T, []),
        withTimeout(store.loadAzkarLog(), T, {}),
        withTimeout(store.loadAzkarItems(), T, {}),
        withTimeout(store.loadQuranProgress(), T, {}),
        withTimeout(store.loadIstighfar(), T, { daily: {}, total: 0 }),
        withTimeout(store.loadHealthProfile(), T, {
          heightCm: null, weightKg: null, age: null, gender: null, activityLevel: null, conditions: [],
          bmi: null, bmiCategory: null, ibw: null, ree: null, tee: null,
        }),
      ]);

      const [c, e, t, r, g, p, ml, f, sub] = await essential;
      if (loadVersionRef.current !== myVersion) return;
      setCategories(c); setEntries(e); setTasks(t); setReports(r); setGamify(g);
      setProfile(p); setMandatoryLog(ml); setFocus(f); setSubscription(sub);
      setLoaded(true);
      // نظّف "?view=" من شريط العنوان بعد استعمالها لمرة واحدة، حتى لا يبقى
      // رابط اختصار قديم في السجل/الإشارات المرجعية يفتح نفس الشاشة دائماً.
      if (window.location.search.includes("view=")) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      const [a, cm, pl, rel, plog, tl, gl, sl, azl, azi, qp, ist, hp] = await background;
      if (loadVersionRef.current !== myVersion) return;
      setAchieve(a); setCommitments(cm); setPrayerLog(pl); setReligious(rel);
      setPointsLog(plog); setTipsLog(tl); setGoals(gl);
      setSleepLog(sl); setAzkarLog(azl); setAzkarItems(azi); setQuranProgress(qp);
      setIstighfar(ist); setHealthProfile(hp);

      // منطق خصم نقاط الفائتات يعتمد على prayerLog (يُحمَّل في دفعة الخلفية)
      // - يعمل هنا بعد اكتمالها بلا تأخير لفتح الواجهة؛ فحص لمرة واحدة يومياً
      // فقط، فتأخره ببضع ثوانٍ خلف ظهور التطبيق لا يُلاحَظ ولا يغيّر نتيجته.
      const today = todayKey();
      const lastOpen = localStorage.getItem("masar_last_open");
      if (lastOpen && lastOpen !== today) {
        const yesterday = lastOpen;
        const yLog = ml[yesterday] || {};
        const yIsFriday = new Date(yesterday).getDay() === 5;
        let deduction = 0;
        const reasons = [];
        for (const task of MANDATORY_TASKS) {
          if (task.fridayOnly && !yIsFriday) continue;
          if (!yLog[task.key]) { deduction += task.penalty; reasons.push(mandatoryTaskLabel(task, t)); }
        }
        const PRAYER_IDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
        const yPrayers = (pl || []).filter((p) => p.date === yesterday);
        const missedPrayers = PRAYER_IDS.filter((pid) => !yPrayers.some((p) => p.prayerId === pid)).length;
        // "missing locale key" لهذا السطر: prayer.missedPrayersReason
        // ({{count}} missed prayers / {{count}} صلوات فائتة) - استُخدم بديل حرفي مؤقتاً.
        if (missedPrayers > 0) { deduction += missedPrayers * 5; reasons.push(i18n.language === "en" ? `${missedPrayers} missed prayers` : `${missedPrayers} صلوات فائتة`); }
        if (deduction > 0) {
          const prevGamify = g;
          const next = { ...g, points: Math.max(0, g.points - deduction) };
          setGamify(next);
          const gRes = await store.saveGamify(next);
          if (!gRes.ok) { setGamify(prevGamify); showToast(t("common.errors.saveFailed")); }
          // "missing locale key" لهذا السطر: prayer.missedTasksLogReason
          // ("Missed items ({{date}}): {{list}}" / "خصم فائتات ({{date}}): {{list}}") - بديل حرفي مؤقتاً.
          const logEntry = { id: uid(), date: today, amount: -deduction, reason: i18n.language === "en" ? `Missed items (${yesterday}): ${[...new Set(reasons)].join(", ")}` : `خصم فائتات (${yesterday}): ${[...new Set(reasons)].join("، ")}` };
          setPointsLog((prev) => [logEntry, ...prev]);
          const pRes = await store.addPointsLog(logEntry);
          if (!pRes.ok) setPointsLog((prev) => prev.filter((p) => p.id !== logEntry.id));
        }
      }
      localStorage.setItem("masar_last_open", today);
  }, []);

  // شبكة أمان أخيرة (defense-in-depth) فوق مهلتَي getSession()/loadAll():
  // إن بقيت شاشة التحميل معلّقة لأي سبب لم نتوقّعه (أياً كان)، تُفتح
  // الواجهة قسرياً خلال 10 ثوانٍ كحد أقصى مطلق بدل تعليقها للأبد - مع
  // تنبيه لطيف يوضّح أن بعض البيانات قد لا تكون محمّلة بعد.
  useEffect(() => {
    const watchdog = setTimeout(() => {
      setLoaded((already) => {
        if (!already) showToast(t("common.errors.NETWORK"));
        return true;
      });
    }, 10000);
    return () => clearTimeout(watchdog);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getSession();
      const u = userFromSession(session);
      userIdRef.current = u?.id || null;
      setOwner(u?.id);
      setUser(u);
      if (active) await loadAll();
    })();
    const unsub = onAuthChange(async (session) => {
      const u = userFromSession(session);
      const newId = u?.id || null;
      if (newId === userIdRef.current) return;
      userIdRef.current = newId;
      setOwner(u?.id);
      setUser(u);
      setLoaded(false);
      await loadAll();
    });
    return () => { active = false; unsub(); };
  }, [loadAll]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // Show the onboarding tour once per first-time profile (guest-local or
  // per Supabase account) — re-evaluated only when a fresh load completes,
  // so it never reopens just from navigating between views.
  useEffect(() => {
    if (loaded && !profile.tourSeen) setTourOpen(true);
  }, [loaded]);

  // "تخطّي" في أي مكان بالرحلة، أو "أكمل الآن" عند نهاية آخر مرحلة مبنية
  // حالياً بلا مرحلة تالية - ينهي الرحلة كلها نهائياً: tourSeen=true (لا
  // تظهر تلقائياً مرة أخرى أبداً)، وتُصفَّر core لتبدأ أي إعادة تشغيل
  // يدوية لاحقة من أول المرحلة الأولى دائماً.
  const closeTour = useCallback(() => {
    setTourOpen(false);
    setProfile((p) => ({ ...p, tourSeen: true, tourProgress: { ...p.tourProgress, core: { stage: 1, step: 0 } } }));
    store.saveTourSeen(true);
    store.saveTourProgress({ core: { stage: 1, step: 0 } });
  }, []);

  // "لاحقاً" عند شاشة "نهاية المرحلة": يحفظ الموضع (المرحلة اكتملت،
  // بانتظار القرار) ويُغلق الرحلة بلا لمس tourSeen إطلاقاً - فتُعاد فتحها
  // تلقائياً في الجلسة القادمة (طالما لم تُخطَّ أو تكتمل الرحلة كلها بعد)
  // وتُستأنف بنفس شاشة "نهاية المرحلة" هذه بالضبط عبر بطاقة "نكمل من حيث
  // توقفنا؟" في MasarJourney.
  const pauseJourney = useCallback((stage, step) => {
    setTourOpen(false);
    setProfile((p) => ({ ...p, tourProgress: { ...p.tourProgress, core: { stage, step } } }));
    store.saveTourProgress({ core: { stage, step } });
  }, []);

  // "إعادة الجولة" من الإعدادات/المساعدة تبدأ دائماً من أول المرحلة
  // الأولى، لا من آخر نقطة توقّف قديمة محفوظة صدفة.
  const startTour = useCallback(() => {
    setProfile((p) => ({ ...p, tourProgress: { ...p.tourProgress, core: { stage: 1, step: 0 } } }));
    store.saveTourProgress({ core: { stage: 1, step: 0 } });
    setTourOpen(true);
  }, []);

  // يُستدعى من MasarJourney عند كل انتقال بين خطوات الرحلة (تقدّماً أو
  // رجوعاً) - يحفظ المرحلة والخطوة الحاليتين معاً حتى يستأنف المستخدم من
  // نفس النقطة تماماً إن أغلق التطبيق في المنتصف (بدون انتظار الحفظ، لا
  // يوقف الواجهة).
  const advanceJourneyStep = useCallback((stage, step) => {
    setProfile((p) => ({ ...p, tourProgress: { ...p.tourProgress, core: { stage, step } } }));
    store.saveTourProgress({ core: { stage, step } });
  }, []);

  // مزامنة المظهر مع الحساب بعد اكتمال كل تحميل — يغطي حالة تسجيل الدخول
  // من متصفح/جهاز آخر كان قد اختار مظهراً مختلفاً سابقاً على هذا الحساب.
  useEffect(() => {
    if (loaded) setTheme(profile.theme === "light" ? "light" : "dark");
  }, [loaded]);

  // نفس فكرة مزامنة المظهر أعلاه لكن للغة الواجهة — تغيير اللغة يطبَّق فوراً
  // على جذر المستند (dir/lang) عبر مستمع i18n نفسه (راجع src/i18n.js)، لذا
  // يكفي هنا فقط استدعاء changeLanguage دون أي منطق إضافي.
  useEffect(() => {
    if (loaded) i18n.changeLanguage(profile.language === "en" ? "en" : "ar");
  }, [loaded]);

  // يُطبَّق فوراً على الجذر عند أي تغيّر (تبديل يدوي أو مزامنة من الحساب) —
  // لا يحفظ هنا؛ الحفظ الفعلي (محلياً وسحابياً) يتم فقط عند تبديل صريح من
  // المستخدم في toggleTheme، حتى لا تتكرر كتابة سحابية عند كل تحميل صفحة.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      store.saveTheme(next);
      return next;
    });
  }, []);

  // مزامنة إعدادات إتاحة الوصول الثلاثة مع الحساب بعد اكتمال كل تحميل - نفس
  // فكرة مزامنة المظهر أعلاه تماماً (تغطي تسجيل الدخول من جهاز آخر كان قد
  // فعّل إعداداً مختلفاً سابقاً على هذا الحساب).
  useEffect(() => {
    if (loaded) {
      setFontSize(["normal", "large", "xlarge"].includes(profile.fontSize) ? profile.fontSize : "normal");
      setHighContrast(!!profile.highContrast);
      setSpacious(!!profile.spacious);
    }
  }, [loaded]);

  // تُطبَّق فوراً على الجذر عند أي تغيّر - نفس نمط تطبيق data-theme أعلاه
  // تماماً، ولا تحفظ هنا (الحفظ فقط عند تبديل صريح في الدوال أدناه).
  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);
  useEffect(() => {
    if (highContrast) document.documentElement.setAttribute("data-contrast", "high");
    else document.documentElement.removeAttribute("data-contrast");
  }, [highContrast]);
  useEffect(() => {
    if (spacious) document.documentElement.setAttribute("data-spacing", "relaxed");
    else document.documentElement.removeAttribute("data-spacing");
  }, [spacious]);

  const changeFontSize = useCallback(async (next) => {
    setFontSize((prev) => {
      store.saveFontSize(next).then((res) => {
        if (!res.ok) { setFontSize(prev); showToast(t("common.errors.saveFailed")); }
      });
      return next;
    });
  }, [showToast]);
  const toggleHighContrast = useCallback(() => {
    setHighContrast((v) => {
      const next = !v;
      store.saveHighContrast(next).then((res) => {
        if (!res.ok) { setHighContrast(v); showToast(t("common.errors.saveFailed")); }
      });
      return next;
    });
  }, [showToast]);
  const toggleSpacious = useCallback(() => {
    setSpacious((v) => {
      const next = !v;
      store.saveSpacious(next).then((res) => {
        if (!res.ok) { setSpacious(v); showToast(t("common.errors.saveFailed")); }
      });
      return next;
    });
  }, [showToast]);

  const [dailyTip, setDailyTip] = useState(null);
  // Shows today's "بصيرة" tip once, automatically, the first time the app
  // is opened on a new local day — gated behind the splash AND the
  // onboarding tour (profile.tourSeen/tourOpen) so it never stacks on top
  // of either; for a first-time user this effect simply waits (bails while
  // !profile.tourSeen) and naturally re-fires once closeTour() flips both
  // tourSeen and tourOpen. The gate is a dedicated synchronous localStorage
  // flag (store.getDailyTipShownDate), not the async cloud-loaded tipsLog —
  // that avoids a race where the modal re-shows while tipsLog is still
  // loading from Supabase. tipsLog[today] is kept as a secondary check for
  // cross-device awareness once it has loaded.
  useEffect(() => {
    if (showSplash || !loaded || tourOpen || !profile.tourSeen) return;
    const today = localDayKey();
    if (store.getDailyTipShownDate() === today || tipsLog[today]) return;
    // مستخدم غير مشترك يرى نصيحة يومه الأول فقط (أول يوم استُخدم فيه
    // الموقع) — أول مفتاح تاريخ في tipsLog، أو اليوم نفسه إن كان السجل
    // فارغاً بعد (يعني هذا فعلاً أول يوم). الأيام التالية لا تُسجَّل هنا
    // إطلاقاً حتى لا "يتقدّم" أول يوم محسوب خطأً لغير المشترك.
    if (!isSub) {
      const tipsLogKeys = Object.keys(tipsLog);
      const firstDayKey = tipsLogKeys.length ? tipsLogKeys.sort()[0] : today;
      if (today !== firstDayKey) return;
    }
    const tip = pickDailyTip(today, getOwner());
    setDailyTip(tip);
    store.setDailyTipShownDate(today);
    setTipsLog((prev) => ({ ...prev, [today]: tip.id }));
    store.saveTipsLog(today, tip.id).then((res) => {
      if (!res.ok) { setTipsLog((prev) => { const next = { ...prev }; delete next[today]; return next; }); showToast(t("tips.saveFailed")); }
    });
  }, [showSplash, loaded, tourOpen, profile.tourSeen, isSub]);

  const aiHistory = useMemo(() => reports.filter((r) => r.gist).map((r) => ({ date: r.date, gist: r.gist })), [reports]);

  const stats = useMemo(() => {
    const dayHours = {};
    entries.forEach((e) => { dayHours[e.date] = (dayHours[e.date] || 0) + diffMinutes(e.start, e.end); });
    const focusMinutes = focus.reduce((s, f) => s + f.minutes, 0);
    return {
      totalEntries: entries.length,
      streak: computeStreak([
        ...entries.map((e) => e.date),
        ...focus.map((f) => f.date),
        ...prayerLog.map((p) => p.date),
        ...tasks.map((t) => t.due || (t.created ? t.created.slice(0, 10) : null)).filter(Boolean),
      ]),
      tasksDone: tasks.filter((t) => t.done).length,
      maxDayHours: Math.max(0, ...Object.values(dayHours)) / 60,
      focusSessions: focus.length,
      focusHours: focusMinutes / 60,
    };
  }, [entries, tasks, focus, prayerLog]);

  useEffect(() => {
    if (!loaded) return;
    const earned = BADGES.filter((b) => b.threshold(stats)).map((b) => b.id);
    const newOnes = earned.filter((id) => !gamify.badges.includes(id));
    if (newOnes.length) {
      const prevGamify = gamify;
      const next = { ...gamify, badges: [...gamify.badges, ...newOnes] };
      setGamify(next);
      store.saveGamify(next).then((res) => {
        if (!res.ok) { setGamify(prevGamify); showToast(t("common.errors.saveFailed")); }
      });
      const earnedBadge = BADGES.find((b) => b.id === newOnes[0]);
      showToast((i18n.language === "en" ? "New badge: " : "شارة جديدة: ") + (i18n.language === "en" ? (earnedBadge.nameEn || earnedBadge.name) : earnedBadge.name));
    }
  }, [stats, loaded]);

  const addPoints = useCallback((n, reason = "") => {
    let prevGamify;
    setGamify((g) => { prevGamify = g; return { ...g, points: Math.max(0, g.points + n) }; });
    // "missing locale key" لهذا السطر: common.pointsEarnedReason / common.pointsDeductedReason
    const logReason = reason || (n >= 0 ? (i18n.language === "en" ? "Points earned" : "نقاط مكتسبة") : (i18n.language === "en" ? "Points deducted" : "خصم نقاط"));
    const logEntry = { id: uid(), date: todayKey(), amount: n, reason: logReason };
    setPointsLog((prev) => [logEntry, ...prev].slice(0, 200));
    (async () => {
      const gRes = await store.saveGamify({ ...prevGamify, points: Math.max(0, prevGamify.points + n) });
      if (!gRes.ok) { setGamify(prevGamify); showToast(t("common.errors.saveFailed")); }
      const pRes = await store.addPointsLog(logEntry);
      if (!pRes.ok) setPointsLog((prev) => prev.filter((p) => p.id !== logEntry.id));
    })();
  }, [showToast]);

  const handleSignIn = useCallback(async () => {
    try { await signInWithGoogle(); } catch { showToast(t("auth.errors.generic")); }
  }, [showToast]);
  const handleEmailSignIn = useCallback(async (email, password) => {
    await signInWithEmail(email, password);
  }, []);
  const handleEmailSignUp = useCallback(async (email, password) => {
    return signUpWithEmail(email, password);
  }, []);
  const handleSignOut = useCallback(async () => {
    await signOut();
    userIdRef.current = null;
    setOwner(null);
    setUser(null);
    setLoaded(false);
    await loadAll();
    // "missing locale key" لهذا السطر: header.signedOutToast ("Signed out" / "تم تسجيل الخروج")
    showToast(i18n.language === "en" ? "Signed out" : "تم تسجيل الخروج");
  }, [loadAll, showToast]);

  const dismissSplash = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem("masar_splash_done", "1");
  }, []);

  if (showSplash) return <SplashScreen onDone={dismissSplash} />;
  if (!loaded) return <div style={{ ...S.app, ...S.loaderWrap }}><Loader2 size={28} color="#C9A24B" className="spin" /></div>;
  if (hasAuth && !user) return <LandingPage onSignIn={handleSignIn} onEmailSignIn={handleEmailSignIn} onEmailSignUp={handleEmailSignUp} />;

  return (
    <div style={S.app} className="masar-app">
      <Header view={view} setView={setView} gamify={gamify} stats={stats} hasCloud={store.hasCloud} user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} subscription={subscription} theme={theme} toggleTheme={toggleTheme} customColorsEnabled={profile.customColorsEnabled} sectionColors={profile.sectionColors} onStartTour={startTour} />
      <div className="masar-shell">
      {/* الشريط الجانبي الثابت (masar-sidebar) لا يُعرَض فعلياً إلا على
          الشاشات العريضة (>=1024px) عبر CSS في masar.css - على الجوال/التابلت
          الأضيق يبقى display:none فيستبدله زر ☰ + SideMenu المنبثقة كما هو،
          فلا تكرار ولا تعارض بين الاثنين. */}
      <Sidebar view={view} setView={setView} customColorsEnabled={profile.customColorsEnabled} sectionColors={profile.sectionColors} />
      <div style={S.body} key={view} className="view-fade masar-body">
        {view === "today" && (
          <TodayView
            date={selectedDate} setDate={setSelectedDate}
            entries={entries} setEntries={setEntries}
            categories={categories} setCategories={setCategories} tasks={tasks} setTasks={setTasks}
            reports={reports} setReports={setReports}
            aiHistory={aiHistory}
            mandatoryLog={mandatoryLog} setMandatoryLog={setMandatoryLog}
            focus={focus}
            addPoints={addPoints} showToast={showToast}
            subscription={subscription}
          />
        )}
        {view === "prayer" && (
          <PrayerView
            prayerLog={prayerLog} setPrayerLog={setPrayerLog} religious={religious} setReligious={setReligious}
            azkarLog={azkarLog} setAzkarLog={setAzkarLog} azkarItems={azkarItems} setAzkarItems={setAzkarItems}
            quranProgress={quranProgress} setQuranProgress={setQuranProgress} istighfar={istighfar} setIstighfar={setIstighfar}
            addPoints={addPoints} showToast={showToast} profile={profile} setProfile={setProfile}
          />
        )}
        {view === "adhkar" && <AdhkarView showToast={showToast} />}
        {view === "tips" && <TipsView tipsLog={tipsLog} setTipsLog={setTipsLog} showToast={showToast} subscription={subscription} />}
        {/* "missing locale key" لكل بطاقات الترقية أدناه (goals/vault/achieve/reportsView/assistant.upsellTitle
            و upsellMessage) - لا مفتاح مخصص لها بعد في ملفات الترجمة، استُخدم نص إنجليزي/عربي حرفي بديل مؤقتاً. */}
        {view === "goals" && (isSub ? <GoalsView goals={goals} setGoals={setGoals} addPoints={addPoints} showToast={showToast} profile={profile} setProfile={setProfile} journeyActive={tourOpen} /> : (
          <div style={S.view}><UpsellCard icon={Target} title={i18n.language === "en" ? "Plan your goals with Masar Premium" : "خطّط لأهدافك مع مسار الكامل"} message={i18n.language === "en" ? "Set your weekly, monthly, and yearly goals, and track your progress on a visual calendar with periodic reviews and points accountability." : "حدّد أهدافك الأسبوعية والشهرية والسنوية، وتابع إنجازك على تقويم بصري مع مراجعات دورية ومحاسبة بالنقاط."} /></div>
        ))}
        {view === "vault" && !isSub && (
          <div style={S.view}><UpsellCard icon={Wallet} title={i18n.language === "en" ? "Track your money with Masar Premium" : "تتبّع أموالك مع مسار الكامل"} message={i18n.language === "en" ? "Log your balance and expenses in your currency, and know exactly where your money goes, with a new financial tip every day." : "سجّل رصيدك ومصروفاتك بعملتك، واعرف أين تذهب أموالك بالضبط، مع نصيحة مالية جديدة كل يوم."} /></div>
        )}
        {view === "tasks" && <TasksView tasks={tasks} setTasks={setTasks} categories={categories} addPoints={addPoints} showToast={showToast} subscription={subscription} profile={profile} setProfile={setProfile} journeyActive={tourOpen} />}
        {view === "focus" && <FocusView focus={focus} setFocus={setFocus} commitments={commitments} setCommitments={setCommitments} categories={categories} entries={entries} addPoints={addPoints} showToast={showToast} subscription={subscription} />}
        {view === "achieve" && (isSub ? <AchieveView achieve={achieve} setAchieve={setAchieve} profile={profile} focus={focus} tasks={tasks} prayerLog={prayerLog} religious={religious} addPoints={addPoints} showToast={showToast} setView={setView} /> : (
          <div style={S.view}><UpsellCard icon={Rocket} title={i18n.language === "en" ? "Achieve is waiting for you in Masar Premium" : "أنجز ينتظرك في مسار الكامل"} message={i18n.language === "en" ? "Achieve knows your hobbies and suggests challenges, projects, and learning paths made specifically for you." : "أنجز يعرف هواياتك ويقترح لك تحديات ومشاريع ومسارات تعلّم تناسبك أنت تحديداً."} /></div>
        ))}
        {view === "reports" && (isSub ? <ReportsView entries={entries} categories={categories} focus={focus} profile={profile} setProfile={setProfile} healthProfile={healthProfile} sleepLog={sleepLog} setSleepLog={setSleepLog} showToast={showToast} tasks={tasks} goals={goals} journeyActive={tourOpen} /> : (
          <div style={S.view}><UpsellCard icon={TrendingUp} title={i18n.language === "en" ? "Your detailed reports in Masar Premium" : "تقاريرك التفصيلية في مسار الكامل"} message={i18n.language === "en" ? "See your progress with clear numbers and analysis, and track your sleep and rest pattern across days." : "شاهد تقدّمك بأرقام وتحليلات واضحة، وتتبّع نومك ونمط راحتك عبر الأيام."} /></div>
        ))}
        {view === "assistant" && (isSub ? <AssistantView entries={entries} tasks={tasks} categories={categories} focus={focus} prayerLog={prayerLog} religious={religious} profile={profile} setProfile={setProfile} stats={stats} setView={setView} healthProfile={healthProfile} goals={goals} showToast={showToast} journeyActive={tourOpen} /> : (
          <div style={S.view}><UpsellCard icon={MessageCircle} title={i18n.language === "en" ? "Your AI assistant in Masar Premium" : "مساعدك الذكي في مسار الكامل"} message={i18n.language === "en" ? "A personal coach who analyzes your day and habits and suggests practical steps based on your actual data." : "مدرّب شخصي يحلّل يومك وعاداتك ويقترح خطوات عملية بناءً على بياناتك الفعلية."} /></div>
        ))}
        {view === "you" && <YouView healthProfile={healthProfile} setHealthProfile={setHealthProfile} showToast={showToast} />}
        {(view === "nutrition" || view === "nutritionPlan" || view === "dietPlans" || view === "fitness" || view === "mental" || (view === "groups" && isSub) || (view === "vault" && isSub)) && (
          <LazySectionErrorBoundary key={view} isEn={i18n.language === "en"}>
            <Suspense fallback={<div style={{ ...S.view, display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} color="#C9A24B" className="spin" /></div>}>
              {view === "nutrition" && <NutritionView healthProfile={healthProfile} showToast={showToast} profile={profile} setProfile={setProfile} subscription={subscription} journeyActive={tourOpen} />}
              {view === "nutritionPlan" && <NutritionPlanView healthProfile={healthProfile} showToast={showToast} subscription={subscription} setView={setView} />}
              {view === "dietPlans" && <DietPlansView healthProfile={healthProfile} showToast={showToast} subscription={subscription} />}
              {view === "fitness" && <FitnessView healthProfile={healthProfile} showToast={showToast} profile={profile} setProfile={setProfile} journeyActive={tourOpen} />}
              {view === "mental" && <MentalHealthView setView={setView} showToast={showToast} />}
              {view === "groups" && isSub && <GroupsView showToast={showToast} />}
              {view === "vault" && isSub && <VaultView showToast={showToast} />}
            </Suspense>
          </LazySectionErrorBoundary>
        )}
        {view === "groups" && !isSub && (
          <div style={S.view}><UpsellCard icon={Users} title={i18n.language === "en" ? "Friend Challenges in Masar Premium" : "تحديات الأصدقاء في مسار الكامل"} message={i18n.language === "en" ? "Create a study group with your friends and compete on study hours and workout completion, with live updates between you." : "أنشئ جروب دراسة مع أصدقائك وتنافسوا بساعات الدراسة وإنجاز الرياضة، بتحديث لحظي بينكم."} /></div>
        )}
        {view === "settings" && <SettingsView categories={categories} setCategories={setCategories} gamify={gamify} hasCloud={store.hasCloud} showToast={showToast} profile={profile} setProfile={setProfile} pointsLog={pointsLog} onStartTour={startTour} subscription={subscription} theme={theme} toggleTheme={toggleTheme} fontSize={fontSize} changeFontSize={changeFontSize} highContrast={highContrast} toggleHighContrast={toggleHighContrast} spacious={spacious} toggleSpacious={toggleSpacious} />}
      </div>
      </div>
      {toast && <div style={S.toast} className="toast-in">{toast}</div>}
      {tourOpen && (
        <MasarJourney
          view={view} setView={setView} profile={profile} healthProfile={healthProfile} isSub={isSub}
          resumeStage={typeof profile.tourProgress?.core?.stage === "number" ? profile.tourProgress.core.stage : 1}
          resumeStep={typeof profile.tourProgress?.core?.stage === "number" ? profile.tourProgress.core.step : 0}
          onStepChange={advanceJourneyStep}
          onPause={pauseJourney}
          onFinishAll={closeTour}
        />
      )}
      {dailyTip && <DailyTipModal tip={dailyTip} onClose={() => setDailyTip(null)} />}
    </div>
  );
}

// MASAR JOURNEY - رحلة واحدة مترابطة عبر التطبيق كله، مقسّمة لأربع مراحل
// طبيعية بنقاط توقّف. تحلّ محل الجولة الأساسية القديمة (Core Tour، 6
// خطوات، جولة في القائمة فقط) بإعادة تصميم كامل لتجربة الـUX، مع الحفاظ
// الكامل على محرك SpotlightTour والبنية التقنية (tour_seen/tour_progress)
// كما هي.
//
// مبدأ "Explain, Don't Execute" (تعديل لاحق على التصميم الأول): كل خطوة
// هنا الآن Observe فقط - Highlight على عنصر حقيقي + شرح قصير + التالي -
// بلا انتظار أي فعل حقيقي (حفظ وجبة/برنامج رياضي/هدف/بيانات صحية) وبلا
// تسليم الشاشة لأي جولة سياقية محلية تنتظر أفعالاً حقيقية. الاستثناء
// الضيق الوحيد المتبقي: خطوتا "افتح القائمة" + "اضغط قسم العبادة"
// (أدناه) - ضغطتان حقيقيتان آمنتان تماماً (تنقّل بلا أي بيانات) ضروريتان
// لشرح آلية التنقّل نفسها ولتفادي مشكلة هندسية حقيقية (القائمة الجانبية
// تُغلَق فقط بضغطة SideMenu الحقيقية على عنصرها، لا بأمر برمجي من
// المنسّق - محاولة تجاوز هذا كانت ستُظهر شاشة الصلاة خلف قائمة لا تزال
// مفتوحة). كل الخطوات الأخرى في الرحلة كلها الآن Observe بلا أي استثناء.
//
// الجولات السياقية المحلية الأصلية (useModuleTour في التغذية/الرياضة/
// المهام/الأهداف/التقارير/المساعد) لم تُحذف ولم تُعدَّل في منطقها -
// تبقى موجودة وقابلة لإعادة التشغيل المستقل من الإعدادات لاحقاً كتجربة
// تفاعلية اختيارية. فقط أُضيف شرط "journeyActive" (يقرأ نفس tourOpen
// الموجود أصلاً) لمنعها من الانطلاق تلقائياً بالتوازي أثناء زيارة
// الرحلة الأساسية المتصلة لتلك الصفحات (Observe فقط) - كي لا يظهر
// SpotlightTour مزدوج فوق بعضه.
//
// كل خطوة تحمل view خاصاً بها؛ المكوّن ينقل المستخدم تلقائياً (setView)
// عند الانتقال بين خطوات بشاشات مختلفة.
const JOURNEY_STAGES = [
  {
    id: "stage1",
    titleKey: "onboarding.stage1.title",
    steps: [
      { view: "today", Icon: Sparkles }, // 0: ترحيب
      { view: "today", target: '[data-tour="today-daywheel"]' }, // 1: عجلة اليوم
      { view: "today", target: '[data-tour="today-categories"]' }, // 2: فئاتك
      { view: "today", target: '[data-tour="today-add-activity"]' }, // 3: سجل نشاطك
      { view: "today" }, // 4: مهام اليوم السريعة
      { view: "today", target: '[data-tour="menu-btn"]', interactive: true }, // 5: افتح القائمة (استثناء تنقّل آمن)
      { view: "today", target: '[data-tour="nav-prayer"]', interactive: true }, // 6: اضغط "الصلاة" (استثناء تنقّل آمن - يغلق القائمة فعلياً)
      { view: "prayer", target: '[data-tour="prayer-next-card"]' }, // 7: أوقات الصلاة
      { view: "prayer", target: '[data-tour="prayer-mark-btn"]' }, // 8: Observe - كيف تُسجَّل الصلاة (بلا تسجيل فعلي)
      { view: "prayer", target: '[data-tour="prayer-extras"]' }, // 9: استغفار/أذكار مصغّرة/قرآن
      { view: "adhkar", target: '[data-tour="adhkar-cat-first"]' }, // 10: Observe - فئات الأذكار وعدّاداتها (بلا دخول فئة فعلياً)
      { view: "tips", target: '[data-tour="tips-hero"]', neverLast: true }, // 11: آخر خطوة بالمرحلة
    ],
  },
  {
    id: "stage2",
    titleKey: "onboarding.stage2.title",
    steps: [
      { view: "you", target: '[data-tour="you-form-card"]' }, // 0: Observe - حقول البيانات الأساسية بلا حفظ فعلي
      { view: "nutrition", target: '[data-tour="add-breakfast"]' }, // 1: تسجيل الفطور (ونفس الطريقة لباقي الوجبات)
      { view: "nutrition" }, // 2: طرق الإضافة (بحث/باركود/تصوير) - بلا هدف، النموذج الفرعي لا يظهر بلا ضغطة حقيقية لم نعد نطلبها
      { view: "nutrition", target: '[data-tour="nutrition-summary"]' }, // 3: مجاميعك اليومية
      { view: "nutrition", target: '[data-tour="water-add-btn"]' }, // 4: متابعة الماء
      { view: "fitness", target: '[data-tour="fitness-goal-row"]' }, // 5: اختيار الهدف الرياضي
      { view: "fitness", target: '[data-tour="fitness-equipment-row"]' }, // 6: اختيار المعدات المتاحة
      { view: "fitness" }, // 7: البرنامج الناتج + وضع التركيز والمؤقّت - شرحاً بلا إنشاء برنامج فعلي
      { view: "nutritionPlan" }, // 8
      { view: "dietPlans" }, // 9
      { view: "mental", target: '[data-tour="mental-mood-card"]' }, // 10
      { view: "mental", target: '[data-tour="mental-breathing-start"]', neverLast: true }, // 11: آخر خطوة بالمرحلة
    ],
  },
  {
    id: "stage3",
    titleKey: "onboarding.stage3.title",
    steps: [
      { view: "focus", target: '[data-tour="focus-timer-start"]' }, // 0: Observe - بدء مؤقّت التركيز بلا تشغيل فعلي
      { view: "tasks", target: '[data-tour="add-task-btn"]' }, // 1: إضافة/إنجاز مهمة
      { view: "goals", target: '[data-tour="add-goal-btn"]', requiresSub: true }, // 2: تحديد هدف ومراجعته الدورية
      { view: "vault", target: '[data-tour="vault-record-expense-btn"]', requiresSub: true }, // 3
      { view: "reports", target: '[data-tour="reports-tab-comprehensive"]', requiresSub: true, neverLast: true }, // 4: آخر خطوة بالمرحلة
    ],
  },
  {
    id: "stage4",
    // "والأخيرة" عمداً: هذه فعلياً آخر مرحلة تغطّي كل قسم أساسي حقيقي في
    // مسار حسب الـAudit المعتمد.
    titleKey: "onboarding.stage4.title",
    steps: [
      { view: "groups", target: '[data-tour="groups-create-card"]', requiresSub: true }, // 0
      { view: "assistant", target: '[data-tour="assistant-suggestion-0"]', requiresSub: true, requiresIdentity: true }, // 1
      { view: "achieve", target: '[data-tour="achieve-coach-card"]', requiresSub: true, requiresIdentity: true }, // 2
      { view: "settings", target: '[data-tour="settings-identity-card"]', neverLast: true }, // 3: آخر خطوة بالرحلة كلها
    ],
  },
];

// فهرس كل خطوة يُعطَّل "السابق" عندها. بما أن كل خطوات الرحلة الآن Observe
// (بلا فعل حقيقي أو تسليم لجولة محلية)، القاعدة نادرة التطبيق عملياً -
// الاستثناء الوحيد المتبقّي: الخطوة التالية لـ"اضغط الصلاة" في المرحلة 1
// (فهرس 7)، لأن الرجوع إليها يتطلب إعادة فتح القائمة الجانبية فعلياً، وهو
// ما لا يملك المنسّق طريقة موثوقة لإعادة بنائه برمجياً (راجع التعليق أعلى
// JOURNEY_STAGES). كل خطوات المراحل 2-4 أصبحت آمنة تماماً للرجوع إليها -
// لا حالة داخلية أو تنقّل حقيقي يمكن أن يُكسَر بالضغط على "السابق".
const STAGE_BACK_BLOCKED = [
  { 7: true }, // stage1
  {}, // stage2
  {}, // stage3
  {}, // stage4
];

// كانت تُستخدم سابقاً لحظر "السابق" ديناميكياً فقط إن نُفِّذ فعل حقيقي
// فعلاً (لا "لاحقاً") في الخطوة السابقة - لا وجود لأي فعل حقيقي كهذا في
// الرحلة الآن، فبقيت المصفوفة فارغة عمداً (الآلية نفسها لا تزال متاحة في
// MasarJourney لأي استخدام مستقبلي، لا حاجة لحذفها).
const DYNAMIC_BACK_BLOCK = [];

function MasarJourney({ view, setView, profile, healthProfile, isSub, resumeStage, resumeStep, onStepChange, onPause, onFinishAll }) {
  const { t } = useTranslation();
  const initialStageIdx = Math.min(Math.max((Number(resumeStage) || 1) - 1, 0), JOURNEY_STAGES.length - 1);
  const stageForInit = JOURNEY_STAGES[initialStageIdx];
  const initialStepRaw = Math.min(Math.max(Number(resumeStep) || 0, 0), stageForInit.steps.length);
  const [stageIndex, setStageIndex] = useState(initialStageIdx);
  const [stepIndex, setStepIndex] = useState(initialStepRaw);
  const [realActionTaken, setRealActionTaken] = useState({});
  // بطاقة ترحيب-بالعودة تظهر مرة واحدة فقط عند إعادة فتح الرحلة بعد إغلاق
  // التطبيق في المنتصف (سواء وسط مرحلة أو بعد اختيار "لاحقاً" عند نهايتها) -
  // تُحسب مرة واحدة عند التركيب فقط، لا تُعاد حسابها لاحقاً.
  const [resuming] = useState(() => initialStageIdx > 0 || initialStepRaw > 0);
  const [showResumeBanner, setShowResumeBanner] = useState(resuming);
  // waitFor: يشبه moduleHandoff لكن للحالات التي ليس لها جولة سياقية
  // مستقلة قائمة (مثل "أنت") - بطاقة تعريفية أولاً بخيارين [املأها الآن]
  // (يُخفي كل Spotlight تماماً كي يتفاعل المستخدم مع النموذج الحقيقي
  // بحرية كاملة) و[لاحقاً]، ثم مراقبة اكتمال الفعل الحقيقي فعلياً لإكمال
  // الرحلة تلقائياً - بلا تسليط ضوء مباشر على أي عنصر واحد فيه، لأن ذلك
  // كان سيُعتّم بقية الحقول (نفس خلل Phase G في خطوة الرياضة الأولى).
  const [activeWait, setActiveWait] = useState(null);
  useEffect(() => { setActiveWait(null); }, [stepIndex, stageIndex]);

  const stage = JOURNEY_STAGES[stageIndex];
  const stepsKey = stage.titleKey.replace(".title", ".steps");
  const stageTexts = t(stepsKey, { returnObjects: true });
  const steps = stage.steps.map((meta, i) => ({ ...meta, ...((Array.isArray(stageTexts) && stageTexts[i]) || {}) }));
  const atStageComplete = stepIndex >= steps.length;
  const backBlocked = STAGE_BACK_BLOCKED[stageIndex] || {};

  // requiresSub: خطوة مبنية أصلاً حول جولة/فعل حقيقي داخل قسم مقفل
  // بالاشتراك (الأهداف/الخزنة/التقارير/المجموعات/المساعد/أنجز). للمشترك
  // تعمل كما هي بالضبط (moduleHandoff أو target حقيقي). لغير المشترك،
  // الشاشة الحقيقية هي بطاقة الترقية (UpsellCard) فقط - فتتحوّل هذه
  // الخطوة تلقائياً لبطاقة تعريفية صادقة تُسلّط الضوء على تلك البطاقة
  // الحقيقية نفسها (لا بطاقة منفصلة مختلقة)، بلا أي تفاعل مطلوب أو
  // مُتاح، ثم تكمل عادياً بـ"التالي" - بلا محاولة إجبار اشتراك أو محاكاة
  // وظيفة غير موجودة فعلياً للمستخدم.
  //
  // requiresIdentity: المساعد وأنجز يحتاجان أيضاً بيانات هوية (هوايات/نبذة
  // من الإعدادات) قبل أن تُتاح وظيفتهما الحقيقية فعلياً - يُفحص هذا فقط
  // بعد اجتياز شرط الاشتراك (إن وُجد)، وإلا فبطاقة الترقية أولى بالعرض
  // أصلاً بما أن الصفحة الحقيقية لن تُحمَّل إطلاقاً لغير المشترك.
  const hasIdentity = !!(profile?.hobbies?.trim() || profile?.about?.trim());
  const rawCurrentStep = steps[stepIndex];
  const failsSub = !!(rawCurrentStep?.requiresSub && !isSub);
  const failsIdentity = !!(rawCurrentStep?.requiresIdentity && !hasIdentity && !failsSub);
  const isLockedForFree = failsSub || failsIdentity;
  const lockedTarget = failsSub ? '[data-tour="upsell-card"]' : '[data-tour="identity-setup-card"]';
  const currentStep = isLockedForFree
    ? { view: rawCurrentStep.view, title: rawCurrentStep.title, body: rawCurrentStep.body, neverLast: rawCurrentStep.neverLast, target: lockedTarget }
    : rawCurrentStep;
  const displaySteps = steps.map((s, i) => (i === stepIndex ? currentStep : s));

  // كل خطوة تعرف الشاشة التي تنتمي إليها - إن لم يكن التطبيق عليها فعلاً
  // (تقدّماً أو رجوعاً)، ننقل المستخدم إليها تلقائياً؛ فقط خطوة "افتح
  // القائمة" التمهيدية تعتمد على ضغطة المستخدم الحقيقية لتغيير الشاشة.
  useEffect(() => {
    if (showResumeBanner || atStageComplete) return;
    const wantedView = steps[stepIndex]?.view;
    if (wantedView && wantedView !== view) setView(wantedView);
  }, [stepIndex, stageIndex, atStageComplete, showResumeBanner, view]); // eslint-disable-line react-hooks/exhaustive-deps

  // moduleHandoff: خطوة "تسليم كامل" لجولة سياقية موجودة ومُختبرة مسبقاً
  // (التغذية/الرياضة) - المنسّق هنا لا يرسم أي Spotlight خاص به (راجع
  // return null أدناه)، فقط ينقل المستخدم للقسم (بالأثر أعلاه) ويراقب
  // اكتمال تلك الجولة المحلية (tourProgress.modules.<name>.done) ليكمل
  // الرحلة تلقائياً بعدها - سواء اكتملت بالفعل الحقيقي أو بضغطة "تخطّي"
  // المحلية الخاصة بتلك الصفحة (وكلتاهما تُعلّمان done=true فعلاً في
  // الكود الحالي لتينك الجولتين). إن كانت الجولة المحلية مكتملة أصلاً قبل
  // الوصول لهذه الخطوة (مستخدم أنهاها سابقاً بشكل مستقل)، نكمل فوراً بلا
  // انتظار - لا شيء يتغيّر لتنتظره.
  useEffect(() => {
    if (showResumeBanner || atStageComplete) return;
    if (!currentStep?.moduleHandoff) return;
    const done = !!profile?.tourProgress?.modules?.[currentStep.moduleHandoff]?.done;
    if (done) goNext();
  }, [stepIndex, stageIndex, atStageComplete, showResumeBanner, profile?.tourProgress, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // مراقبة اكتمال الفعل الحقيقي أثناء "الانتظار" (بعد اختيار "املأها
  // الآن") - معرَّفة لـ"you-save" (بيانات "أنت" الأساسية) و"settings-
  // identity" (هوايات/نبذة الإعدادات)؛ أي waitFor مستقبلي جديد يضيف
  // شرطه هنا فقط.
  useEffect(() => {
    if (activeWait !== "you-save") return;
    const hasHealthData = !!(healthProfile?.heightCm && healthProfile?.weightKg && healthProfile?.age && healthProfile?.gender && healthProfile?.activityLevel);
    if (hasHealthData) { setActiveWait(null); goNext(); }
  }, [activeWait, healthProfile]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeWait !== "settings-identity") return;
    if (hasIdentity) { setActiveWait(null); goNext(); }
  }, [activeWait, hasIdentity]); // eslint-disable-line react-hooks/exhaustive-deps

  function goNext() {
    setStepIndex((cur) => {
      if (steps[cur]?.allowLater) setRealActionTaken((s) => ({ ...s, [cur]: true }));
      const next = Math.min(cur + 1, steps.length);
      onStepChange(stageIndex + 1, next);
      return next;
    });
  }
  function goLater() {
    setStepIndex((cur) => {
      const next = Math.min(cur + 1, steps.length);
      onStepChange(stageIndex + 1, next);
      return next;
    });
  }
  function goBack() {
    setStepIndex((cur) => {
      const prev = Math.max(cur - 1, 0);
      onStepChange(stageIndex + 1, prev);
      return prev;
    });
  }
  function canGoBack() {
    if (stepIndex <= 0) return false;
    if (backBlocked[stepIndex]) return false;
    const dynamicRule = DYNAMIC_BACK_BLOCK[stageIndex];
    const requiredStep = dynamicRule?.[stepIndex];
    if (requiredStep !== undefined && realActionTaken[requiredStep]) return false;
    return true;
  }
  function handleContinueNow() {
    const nextStageIdx = stageIndex + 1;
    if (JOURNEY_STAGES[nextStageIdx]) {
      setStageIndex(nextStageIdx);
      setStepIndex(0);
      onStepChange(nextStageIdx + 1, 0);
    } else {
      // لا مراحل أخرى مبنية بعد - كل ما هو متاح حالياً من الرحلة الجديدة
      // ينتهي هنا فعلياً. بمجرد بناء كود المرحلة التالية مستقبلاً سيتحوّل
      // هذا الفرع تلقائياً لانتقال حقيقي للأمام بلا أي تعديل هنا.
      onFinishAll();
    }
  }

  if (showResumeBanner) {
    return (
      <div style={TourStyles.root}>
        <div style={TourStyles.fullDim} />
        <div style={TourStyles.centerWrap}>
          <div style={TourStyles.centeredCard}>
            <div style={TourStyles.title}>{t("onboarding.welcomeBack.title")}</div>
            <p style={TourStyles.body}>{t("onboarding.welcomeBack.body")}</p>
            <div style={TourStyles.actions}>
              <button onClick={() => setShowResumeBanner(false)} style={{ ...TourStyles.nextBtn, ...TourStyles.nextBtnLast }}>{t("onboarding.welcomeBack.continue")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!atStageComplete && currentStep?.waitFor) {
    const s = currentStep;
    if (activeWait === s.waitFor) return null; // بانتظار الفعل الحقيقي - الصفحة الحقيقية وحدها تُعرض
    return (
      <div style={TourStyles.root}>
        <div style={TourStyles.fullDim} />
        <div style={TourStyles.centerWrap}>
          <div style={TourStyles.centeredCard}>
            <div style={TourStyles.title}>{s.title}</div>
            <p style={TourStyles.body}>{s.body}</p>
            <div style={TourStyles.actions}>
              <button onClick={goLater} style={TourStyles.skipBtn}>{t("onboarding.later")}</button>
              <button onClick={() => setActiveWait(s.waitFor)} style={{ ...TourStyles.nextBtn, ...TourStyles.nextBtnLast }}>{t("onboarding.fillNow")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (atStageComplete) {
    return (
      <div style={TourStyles.root}>
        <div style={TourStyles.fullDim} />
        <div style={TourStyles.centerWrap}>
          <div style={TourStyles.centeredCard}>
            <div style={TourStyles.title}>{t("onboarding.stageComplete.title", { stage: t(stage.titleKey) })}</div>
            <p style={TourStyles.body}>{t("onboarding.stageComplete.body")}</p>
            <div style={TourStyles.actions}>
              <button onClick={() => onPause(stageIndex + 1, stepIndex)} style={TourStyles.skipBtn}>{t("onboarding.stageComplete.later")}</button>
              <button onClick={handleContinueNow} style={{ ...TourStyles.nextBtn, ...TourStyles.nextBtnLast }}>{t("onboarding.stageComplete.continueNow")}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // خطوة تسليم: لا Spotlight من المنسّق هنا إطلاقاً - الصفحة الحقيقية
  // (وجولتها السياقية المحلية إن لم تكتمل بعد) هي كل ما يُعرض، حتى تتطابق
  // تجربتها تماماً مع فتحها المستقل خارج هذه الرحلة.
  if (currentStep?.moduleHandoff) return null;

  return (
    <SpotlightTour
      steps={displaySteps}
      stepIndex={stepIndex}
      onNext={goNext}
      onBack={canGoBack() ? goBack : undefined}
      onLater={goLater}
      onSkip={onFinishAll}
      onFinish={goNext}
      labels={{
        skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("onboarding.start"),
        back: t("common.buttons.back"), tapHere: t("onboarding.tapHere"), later: t("onboarding.later"),
      }}
    />
  );
}

function SplashScreen({ onDone }) {
  const { t, i18n } = useTranslation();
  const splashMessages = t("splash.messages", { returnObjects: true });
  const [hiding, setHiding] = useState(false);
  const [message] = useState(() => splashMessages[Math.floor(Math.random() * splashMessages.length)]);
  // من يفعّل "تقليل الحركة" في جهازه يرى المحتوى النهائي مباشرة بلا أي
  // حركة (initial === animate بكل عنصر)، مع الإبقاء على نفس مدة الظهور
  // الإجمالية - فقط الحركة نفسها تُزال، لا الشاشة كاملة.
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setHiding(true), 1850);
    return () => clearTimeout(t);
  }, []);

  const logoAnim = reduceMotion
    ? { initial: { scale: 1, opacity: 1 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0 } }
    : { initial: { scale: 0.5, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] } };
  const wordmarkAnim = reduceMotion
    ? { initial: { clipPath: "inset(0 0 0 0%)" }, animate: { clipPath: "inset(0 0 0 0%)" }, transition: { duration: 0 } }
    : { initial: { clipPath: "inset(0 0 0 100%)" }, animate: { clipPath: "inset(0 0 0 0%)" }, transition: { delay: 0.35, duration: 0.5, ease: [0.65, 0, 0.35, 1] } };
  const messageAnim = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.85, duration: 0.4 } };
  const lineAnim = reduceMotion
    ? { initial: { scaleX: 1, opacity: 1 }, animate: { scaleX: 1, opacity: 1 }, transition: { duration: 0 } }
    : { initial: { scaleX: 0, opacity: 0 }, animate: { scaleX: 1, opacity: 1 }, transition: { delay: 1.15, duration: 0.5, ease: "easeInOut" } };

  return (
    <motion.div
      animate={{ opacity: hiding ? 0 : 1 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: "easeInOut" }}
      onAnimationComplete={() => { if (hiding) onDone?.(); }}
      style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0, overflow: "hidden", direction: i18n.language === "en" ? "ltr" : "rtl" }}
    >
      <motion.img
        src="/logo-mark.png"
        alt=""
        {...logoAnim}
        style={{ width: 110, height: 110, marginBottom: 20, filter: "drop-shadow(0 0 28px rgba(201,162,75,0.4))" }}
      />
      {/* الحروف العربية متصلة الشكل (تتغيّر هيئتها حسب موضعها بالكلمة)،
          فتقسيم "مسار" لحروف منفصلة يكسر شكلها - بدلاً من ذلك، نص واحد
          يُكشَف تدريجياً بقناع (clipPath) يتحرّك من اليمين لليسار (اتجاه
          القراءة العربي)، فيبدو وكأنه "يُكتب" دون كسر اتصال الحروف. */}
      <div style={{ overflow: "hidden" }}>
        <motion.div
          {...wordmarkAnim}
          style={{ fontFamily: "'Amiri', serif", fontSize: 42, fontWeight: 700, color: "var(--ink)", letterSpacing: 2 }}
        >{t("splash.wordmark")}</motion.div>
      </div>
      <motion.div
        {...messageAnim}
        style={{ fontSize: 14, color: "var(--muted)", marginTop: 10, letterSpacing: 0.3, textAlign: "center", maxWidth: 260, lineHeight: 1.7 }}
      >{message}</motion.div>
      <motion.div
        {...lineAnim}
        style={{ marginTop: 28, width: 100, height: 2, background: "linear-gradient(90deg, transparent, #C9A24B, transparent)", borderRadius: 2, transformOrigin: "center" }}
      />
    </motion.div>
  );
}

// الأيقونات فقط - النصوص (title/desc) تُقرأ من landing.features في ملفات
// الترجمة عبر returnObjects.
const FEATURE_ICONS = ["🕌", "⏱️", "📿", "✅", "📊", "🤖"];

function translateAuthError(err, t) {
  const msg = String(err?.message || err || "");
  if (msg.includes("Invalid login credentials")) return t("auth.errors.invalidCredentials");
  if (msg.includes("User already registered")) return t("auth.errors.alreadyRegistered");
  if (msg.includes("Password should be at least")) return t("auth.errors.passwordTooShort");
  if (msg.includes("Unable to validate email address") || msg.includes("invalid")) return t("auth.errors.invalidEmail");
  if (msg.includes("Email not confirmed")) return t("auth.errors.emailNotConfirmed");
  if (msg.includes("no-supabase")) return t("auth.errors.notConfigured");
  return t("auth.errors.generic");
}

function EmailAuthForm({ onEmailSignIn, onEmailSignUp }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signin") {
        await onEmailSignIn(email.trim(), password);
      } else {
        const { needsEmailConfirmation } = await onEmailSignUp(email.trim(), password);
        if (needsEmailConfirmation) {
          setNotice(t("auth.signupNotice"));
        }
      }
    } catch (err) {
      setError(translateAuthError(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
      <input
        type="email" required autoComplete="email" dir="ltr"
        value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder={t("auth.emailPlaceholder")}
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#E8E6E1", fontSize: 14, fontFamily: "inherit", outline: "none", textAlign: "end" }}
      />
      <input
        type="password" required autoComplete={mode === "signin" ? "current-password" : "new-password"} dir="ltr"
        value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder={t("auth.passwordPlaceholder")}
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#E8E6E1", fontSize: 14, fontFamily: "inherit", outline: "none", textAlign: "end" }}
      />
      {error && <div style={{ color: "#E07A6B", fontSize: 12.5, textAlign: "center" }}>{error}</div>}
      {notice && <div style={{ color: "#5FA8A0", fontSize: 12.5, textAlign: "center", lineHeight: 1.6 }}>{notice}</div>}
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        type="submit" disabled={submitting}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(201,162,75,0.14)", border: "1px solid rgba(201,162,75,0.4)", color: "#C9A24B", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit" }}
      >
        {submitting ? <Loader2 size={16} className="spin" /> : null}
        {mode === "signin" ? t("auth.signInWithEmail") : t("auth.createAccount")}
      </motion.button>
      <button
        type="button"
        onClick={() => { setMode((m) => (m === "signin" ? "signup" : "signin")); setError(""); setNotice(""); }}
        style={{ background: "none", border: "none", color: "var(--muted2)", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}
      >
        {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
      </button>
    </form>
  );
}

function LandingPage({ onSignIn, onEmailSignIn, onEmailSignUp }) {
  const { t, i18n } = useTranslation();
  const features = t("landing.features", { returnObjects: true });
  const [signing, setSigning] = useState(false);
  async function handleClick() {
    setSigning(true);
    try { await onSignIn(); } finally { setSigning(false); }
  }
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0B", color: "#E8E6E1", direction: i18n.language === "en" ? "ltr" : "rtl", fontFamily: "inherit", overflowX: "hidden" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px 60px" }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 64, paddingBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: 64, color: "#C9A24B", marginBottom: 16, filter: "drop-shadow(0 0 24px rgba(201,162,75,0.4))" }}>◐</div>
          <h1 style={{ fontFamily: "'Amiri', serif", fontSize: 42, fontWeight: 700, margin: 0, letterSpacing: 2 }}>{t("landing.wordmark")}</h1>
          <p style={{ fontSize: 16, color: "var(--muted2)", marginTop: 12, lineHeight: 1.8, maxWidth: 300 }}>
            {t("landing.tagline")}
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleClick} disabled={signing}
            style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 12, background: "#fff", color: "#1a1a1a", border: "none", borderRadius: 14, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: signing ? "wait" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", minWidth: 220, justifyContent: "center" }}
          >
            {signing ? <Loader2 size={18} className="spin" /> : (
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2c-7.7 0-14.4 4.3-17.7 10.7z"/><path fill="#FBBC05" d="M24 46c5.8 0 10.7-1.9 14.3-5.2l-6.6-5.4C29.7 37 27 38 24 38c-5.9 0-10.9-3.8-12.7-9.1l-7 5.4C7.9 41.7 15.4 46 24 46z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1 2.9-2.9 5.2-5.3 6.9l6.6 5.4C41.3 37.4 45 31.2 45 24c0-1.3-.2-2.7-.5-4z"/></svg>
            )}
            {signing ? t("landing.loading") : t("landing.continueWithGoogle")}
          </motion.button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 22 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{t("landing.or")}</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>
          <EmailAuthForm onEmailSignIn={onEmailSignIn} onEmailSignUp={onEmailSignUp} />
          <p style={{ marginTop: 14, fontSize: 12, color: "#4A4845" }}>{t("landing.privacyNote")}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {features.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{FEATURE_ICONS[i]}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8E6E1", marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ marginTop: 40, textAlign: "center", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ display: "flex", gap: 24, justifyContent: "center", fontSize: 13, color: "var(--muted)" }}>
            <span>{t("landing.badgeNoAds")}</span>
            <span>{t("landing.badgeCloudSync")}</span>
            <span>{t("landing.badgeOffline")}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleClick} disabled={signing}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.35)", color: "#C9A24B", borderRadius: 14, padding: "13px 32px", fontSize: 15, fontWeight: 700, cursor: signing ? "wait" : "pointer", fontFamily: "inherit" }}>
            <LogIn size={18} />
            {t("landing.signInNow")}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

function Header({ view, setView, gamify, stats, hasCloud, user, onSignIn, onSignOut, subscription, theme, toggleTheme, customColorsEnabled, sectionColors, onStartTour }) {
  const { t, i18n } = useTranslation();
  const isVip = !!subscription?.isVip;
  const isSub = isActiveSubscriber(subscription);
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const lv = getLevel(gamify.points, i18n.language);
  const lvProgress = lv.next ? (gamify.points - lv.current) / (lv.next - lv.current) : 1;
  const isToday = view === "today";
  return (
    <>
      <div style={S.header} className="masar-header">
        <div style={S.headerTop}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label={t("nav.menu")}
              className="masar-menu-btn"
              data-tour="menu-btn"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 10, background: "var(--surface-sunken)", border: "1px solid var(--line)", color: "var(--ink)", cursor: "pointer", flexShrink: 0, padding: 0 }}
            >
              <Menu size={18} />
            </button>
            <div style={S.brand}>
              <img src="/logo-mark.png" alt="" style={S.brandLogo} />
              <span style={S.brandText}>{t("splash.wordmark")}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? t("header.lightMode") : t("header.darkMode")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "var(--surface-raised)", border: "1px solid var(--line)", color: "var(--gold)", cursor: "pointer", flexShrink: 0, padding: 0 }}
            >
              {theme === "dark" ? <Moon size={12} /> : <Sun size={12} />}
            </button>
            {hasAuth && (user ? (
              <button onClick={onSignOut} title={`${user.name || user.email} · ${t("header.signOut")}`} style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, background: "rgba(95,168,160,0.12)", border: "1px solid rgba(95,168,160,0.3)", color: "#5FA8A0", borderRadius: 10, padding: "3px 7px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                {user.avatar ? <img src={user.avatar} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} /> : <User size={14} />}
                {isVip ? (
                  <span title={t("header.vipBadge")} style={{ ...SUB.vipBadge, position: "absolute", top: -6, insetInlineStart: -6, width: 15, height: 15 }}><Crown size={9} /></span>
                ) : isSub ? (
                  <span title={t("header.subBadge")} style={{ ...SUB.subBadge, position: "absolute", top: -6, insetInlineStart: -6, width: 15, height: 15 }}><Star size={9} fill="var(--on-accent)" /></span>
                ) : null}
                <LogOut size={11} />
              </button>
            ) : (
              <button onClick={onSignIn} title={t("header.signInGoogle")} style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "#C9A24B", borderRadius: 10, padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {isVip ? (
                  <span title={t("header.vipBadge")} style={{ ...SUB.vipBadge, position: "absolute", top: -6, insetInlineStart: -6, width: 15, height: 15 }}><Crown size={9} /></span>
                ) : isSub ? (
                  <span title={t("header.subBadge")} style={{ ...SUB.subBadge, position: "absolute", top: -6, insetInlineStart: -6, width: 15, height: 15 }}><Star size={9} fill="var(--on-accent)" /></span>
                ) : null}
                <LogIn size={11} /> {t("header.signIn")}
              </button>
            ))}
          </div>
        </div>
        <div style={S.headerStats}>
          <button
            onClick={() => setView("today")}
            style={{
              display: "flex", alignItems: "center", gap: 5, borderRadius: 20, padding: "3px 10px",
              fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", borderStyle: "solid", borderWidth: 1,
              background: isToday ? "var(--gold)" : "rgba(201,162,75,0.1)",
              color: isToday ? "var(--on-accent)" : "#C9A24B",
              borderColor: isToday ? "var(--gold)" : "rgba(201,162,75,0.3)",
            }}
          >
            <Clock size={12} /> {t("nav.today")}
          </button>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.25)", borderRadius: 10, padding: "3px 8px", fontSize: 11.5, color: "#C9A24B", fontWeight: 700 }}>
            <Star size={11} color="#C9A24B" /> {lv.label} {lv.level}
            <span style={{ width: 36, height: 4, borderRadius: 2, background: "var(--surface-raised)", overflow: "hidden", marginInlineStart: 2 }}>
              <span style={{ display: "block", height: "100%", width: `${Math.round(lvProgress * 100)}%`, background: "#C9A24B", borderRadius: 2 }} />
            </span>
          </span>
          <span title={hasCloud ? t("header.cloudSynced") : t("header.localStorage")} style={{ ...S.cloudDot, background: hasCloud ? "rgba(95,168,160,0.15)" : "rgba(107,104,99,0.15)", color: hasCloud ? "#5FA8A0" : "var(--muted2)", display: "flex", alignItems: "center", gap: 4 }}>
            {hasCloud ? <Cloud size={11} /> : <CloudOff size={11} />}
          </span>
          <span style={S.hStat}><Flame size={13} color="#D17B5F" /> {stats.streak}</span>
          <span style={S.hStat}><Star size={13} color="#C9A24B" /> {gamify.points}</span>
        </div>
      </div>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} view={view} setView={setView} customColorsEnabled={customColorsEnabled} sectionColors={sectionColors} onHelp={() => setHelpOpen(true)} />
      {helpOpen && <HelpCenter view={view} setView={setView} onClose={() => setHelpOpen(false)} onStartTour={onStartTour} />}
    </>
  );
}

// المفاتيح الدينية داخل MANDATORY_TASKS (قراءة القرآن، سورة الكهف) يجب أن
// تبقى بالعربي دائماً بغض النظر عن لغة الواجهة — نفس مبدأ الاستثناء الدائم
// للمحتوى الديني الذي سيُطبَّق حرفياً على "الأذكار" و"القرآن" و"الاستغفار"
// في مراحل الترجمة القادمة. المهام غير الدينية (السرير، الأسنان) تُترجم
// عادياً عبر todayView.mandatoryTasks.
const RELIGIOUS_MANDATORY_TASK_KEYS = ["quran_daily", "alkahf"];
function mandatoryTaskLabel(task, t) {
  if (RELIGIOUS_MANDATORY_TASK_KEYS.includes(task.key)) return task.label;
  return t(`todayView.mandatoryTasks.${task.key}`, task.label);
}

// كل فئة تُترجم فقط إن كانت لا تزال مطابقة تماماً لأحد الأسماء الافتراضية
// (id + name معاً) - أي فئة أعاد المستخدم تسميتها تحتفظ بنصّه الحرفي في كل
// لغة، فلا نستبدل تخصيصه الشخصي باسم إنجليزي لم يطلبه.
function catDisplayName(cat, language) {
  if (!cat) return cat;
  if (language !== "en") return cat.name;
  const def = DEFAULT_CATEGORIES.find((d) => d.id === cat.id && d.name === cat.name);
  return def ? def.nameEn : cat.name;
}

function TodayView({ date, setDate, entries, setEntries, categories, setCategories, tasks, setTasks, reports, setReports, aiHistory, mandatoryLog, setMandatoryLog, focus, addPoints, showToast, subscription }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isSub = isActiveSubscriber(subscription);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [manualPeriod, setManualPeriod] = useState(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const dayEntries = useMemo(() => entries.filter((e) => e.date === date).sort((a, b) => a.start.localeCompare(b.start)), [entries, date]);
  const dayFocusSessions = useMemo(
    () => (focus || []).filter((f) => f.date === date && f.start && f.end).sort((a, b) => a.start.localeCompare(b.start)),
    [focus, date]
  );
  const totalMinutes = dayEntries.reduce((s, e) => s + diffMinutes(e.start, e.end), 0);
  const totalTrackedMinutes = totalMinutes + dayFocusSessions.reduce((s, f) => s + diffMinutes(f.start, f.end), 0);
  const isFutureDay = date > todayKey();
  const now = new Date();
  const dayLengthMinutes = date === todayKey() ? now.getHours() * 60 + now.getMinutes() : 1440;
  const unrecordedMinutes = isFutureDay ? 0 : Math.max(0, dayLengthMinutes - totalTrackedMinutes);
  const currentHour = now.getHours();
  // A real clock face only shows one 12-hour lap at a time, so the auto
  // period follows the classic AM/PM split (not a workday-ish 5–17 window).
  const autoPeriod = currentHour < 12 ? "morning" : "evening";
  const period = manualPeriod || autoPeriod;
  const periodLabel = period === "morning" ? t("todayView.morning") : t("todayView.evening");
  const periodGlow = period === "morning" ? "rgba(201,162,75,0.4)" : "rgba(94,150,224,0.4)";
  function togglePeriod() { setManualPeriod(period === "morning" ? "evening" : "morning"); }
  const isAmTime = (hhmm) => parseInt(hhmm.split(":")[0], 10) < 12;
  const halfEntries = useMemo(
    () => dayEntries.filter((e) => isAmTime(e.start) === (period === "morning")),
    [dayEntries, period]
  );
  const halfFocusSessions = useMemo(
    () => dayFocusSessions.filter((f) => isAmTime(f.start) === (period === "morning")),
    [dayFocusSessions, period]
  );
  const halfTrackedMinutes = halfEntries.reduce((s, e) => s + diffMinutes(e.start, e.end), 0)
    + halfFocusSessions.reduce((s, f) => s + diffMinutes(f.start, f.end), 0);
  const dayTasks = tasks.filter((t) => t.due === date);
  const isToday = date === todayKey();
  const dailyReport = reports.find((r) => r.kind === "daily" && r.date === date);
  const isFriday = new Date().getDay() === 5;
  const todayMandatory = (mandatoryLog || {})[todayKey()] || {};
  const mandatoryVisible = MANDATORY_TASKS.filter((t) => !t.fridayOnly || isFriday);
  const mandatoryDoneCount = mandatoryVisible.filter((t) => !!todayMandatory[t.key]).length;

  async function toggleMandatoryToday(task) {
    const today = todayKey();
    const done = !todayMandatory[task.key];
    const prevLog = mandatoryLog;
    const newLog = { ...(mandatoryLog || {}), [today]: { ...todayMandatory, [task.key]: done } };
    if (setMandatoryLog) setMandatoryLog(newLog);
    const res = await store.saveMandatoryItem(today, task.key, done);
    if (!res.ok) { if (setMandatoryLog) setMandatoryLog(prevLog); showToast(t("common.errors.saveFailed")); return; }
    const label = mandatoryTaskLabel(task, t);
    if (done) { addPoints(task.points, label); showToast(`+${task.points} ${t("todayView.pointsSuffix")}`); }
    else addPoints(-task.points, t("todayView.revertedTask", { label }));
  }

  async function saveEntry(entry) {
    const isNew = !editingEntry;
    setEntries((prev) => prev.some((e) => e.id === entry.id) ? prev.map((e) => (e.id === entry.id ? entry : e)) : [...prev, entry]);
    const res = await store.saveEntry(entry);
    if (!res.ok) {
      setEntries((prev) => isNew ? prev.filter((e) => e.id !== entry.id) : prev);
      showToast(t("common.errors.saveFailed"));
      return;
    }
    if (isNew) addPoints(15);
    setModalOpen(false); setEditingEntry(null); showToast(t("todayView.savedSuccess"));
  }
  async function deleteEntry(id) {
    const removed = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const res = await store.deleteEntry(id);
    if (!res.ok) { if (removed) setEntries((prev) => [...prev, removed]); showToast(t("common.errors.deleteFailed")); return; }
    addPoints(-15, t("todayView.deletedActivity"));
    showToast(t("todayView.deletedSuccess"));
  }
  async function toggleTask(taskItem) {
    const updated = { ...taskItem, done: !taskItem.done };
    setTasks((prev) => prev.map((x) => x.id === taskItem.id ? updated : x));
    const res = await store.saveTask(updated);
    if (!res.ok) { setTasks((prev) => prev.map((x) => x.id === taskItem.id ? taskItem : x)); showToast(t("common.errors.saveFailed")); return; }
    if (!taskItem.done) addPoints(10);
    else addPoints(-10, t("todayView.revertedTaskGeneric"));
  }

  const byCategory = useMemo(() => {
    const m = {};
    dayEntries.forEach((e) => { m[e.catId] = (m[e.catId] || 0) + diffMinutes(e.start, e.end); });
    return Object.entries(m).map(([catId, mins]) => ({ catId, mins, ...catMap[catId] })).sort((a, b) => b.mins - a.mins);
  }, [dayEntries, catMap]);

  function shiftDay(delta) {
    const d = new Date(date); d.setDate(d.getDate() + delta); setDate(todayKey(d));
  }

  return (
    <div style={S.view}>
      <div style={S.dateRow}>
        {/* الأيقونتان تتبادلان حسب اللغة: كل زر يمثّل "سابق"/"تالي" منطقياً،
            لكن اتجاه السهم يجب أن يشير دائماً نحو حافة الصف الخارجية التي
            يقع عليها الزر فعلياً بعد انعكاس RTL/LTR، لا اتجاهاً ثابتاً. */}
        <button onClick={() => shiftDay(-1)} style={S.iconBtn}>{language === "en" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}</button>
        <div style={S.dateLabel}>{arabicDate(date, { weekday: "long", day: "numeric", month: "long" }, language === "en" ? "en-US" : undefined)}{isToday && <span style={S.todayPill}>{t("nav.today")}</span>}</div>
        <button onClick={() => shiftDay(1)} style={S.iconBtn}>{language === "en" ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
      </div>

      {mandatoryVisible.length > 0 && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>{t("todayView.dailyMandatoryTitle")}</span>
            <span style={{ fontSize: 11, color: mandatoryDoneCount === mandatoryVisible.length ? "#5FA8A0" : "var(--muted2)", direction: "ltr" }}>{mandatoryDoneCount}/{mandatoryVisible.length}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {mandatoryVisible.map((task) => {
              const done = !!todayMandatory[task.key];
              return (
                <button key={task.key} onClick={() => toggleMandatoryToday(task)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 20, border: done ? "1px solid rgba(95,168,160,0.5)" : "1px solid var(--line)", background: done ? "rgba(95,168,160,0.1)" : "transparent", color: done ? "#5FA8A0" : "var(--muted2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: done ? "line-through" : "none" }}>
                  <span>{task.icon}</span><span>{mandatoryTaskLabel(task, t)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={S.wheelSection} className="masar-hero-graphic" data-tour="today-daywheel">
        <DayWheel
          entries={halfEntries}
          focusSessions={halfFocusSessions}
          catMap={catMap}
          size={224}
          glow={periodGlow}
          period={period}
          centerLabel={(halfEntries.length === 0 && halfFocusSessions.length === 0) ? t("todayView.startYourDay") : periodLabel}
          centerValue={fmtHM(halfTrackedMinutes, language)}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, marginTop: -4 }}>
        <button onClick={togglePeriod} style={{ ...S.periodToggle, ...(period === "morning" ? S.periodToggleMorning : S.periodToggleEvening) }}>
          {period === "morning" ? "☀️" : "🌙"} {periodLabel}
        </button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{t("todayView.tapArcHint")}</span>
      </div>
      {!isFutureDay && unrecordedMinutes > 30 && (
        <div style={{ background: "rgba(201,162,75,0.08)", border: "1px solid rgba(201,162,75,0.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, textAlign: "center" }}>
          <span style={{ fontSize: 12.5, color: "#C9A24B", lineHeight: 1.7 }}>
            {t(date === todayKey() ? "todayView.unrecordedToday" : "todayView.unrecordedOtherDay", { time: fmtHM(unrecordedMinutes, language) })}
          </span>
        </div>
      )}

      <div style={S.legendRow} data-tour="today-categories">
        {byCategory.map((c) => (
          <div key={c.catId} style={S.legendChip}><span style={{ ...S.legendDot, background: c.color }} /><span>{catDisplayName(c, language)}</span><span style={S.legendMins}>{fmtHM(c.mins, language)}</span></div>
        ))}
        {byCategory.length === 0 && <div style={S.emptyHint}>{t("todayView.noActivitiesToday")}</div>}
        <button onClick={() => setCategoryManagerOpen(true)} style={S.manageCategoriesChip}>
          <Palette size={12} /> <span>{t("todayView.manageCategories")}</span>
        </button>
      </div>

      {categoryManagerOpen && (
        <div style={S.modalOverlay} className="overlay-in" onClick={() => setCategoryManagerOpen(false)}>
          <div style={S.modal} className="sheet-in" onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}><span>{t("todayView.categoriesModalTitle")}</span><button onClick={() => setCategoryManagerOpen(false)} style={S.iconBtn}><X size={18} /></button></div>
            <div style={S.modalBody}>
              <CategoryManagerCard categories={categories} setCategories={setCategories} isSub={isSub} showToast={showToast} />
            </div>
          </div>
        </div>
      )}

      <DailyEvolution
        date={date} dayEntries={dayEntries} catMap={catMap}
        report={dailyReport?.payload} aiHistory={aiHistory}
        subscription={subscription}
        onSave={async (payload, gist) => {
          const prevReports = reports;
          const rep = { id: uid(), kind: "daily", date, payload, gist };
          setReports((prev) => [rep, ...prev.filter((r) => !(r.kind === "daily" && r.date === date))]);
          const res = await store.saveReport(rep);
          if (!res.ok) { setReports(prevReports); showToast(t("common.errors.saveFailed")); }
        }}
      />

      <div style={S.entryListHeader}>
        <span>{t("todayView.log")}</span>
        <button onClick={() => { setEditingEntry(null); setModalOpen(true); }} style={S.addBtn} data-tour="today-add-activity"><Plus size={16} /><span>{t("todayView.addActivity")}</span></button>
      </div>
      <div style={S.entryList} className="stagger-in responsive-card-list">
        {dayEntries.length === 0 && <div style={S.emptyState}><div style={S.emptyStateTitle}>{t("todayView.startYourDay")}</div><div style={S.emptyStateSub}>{t("todayView.emptyStateSub")}</div></div>}
        {dayEntries.map((e) => {
          const cat = catMap[e.catId] || { name: t("todayView.unspecified"), color: "#9A968F" };
          async function adjustMins(delta) {
            const currentDur = diffMinutes(e.start, e.end);
            const newDur = Math.max(1, currentDur + delta);
            const newEnd = addMinutesToTime(e.start, newDur);
            const updated = { ...e, end: newEnd };
            setEntries((prev) => prev.map((x) => x.id === e.id ? updated : x));
            const res = await store.saveEntry(updated);
            if (!res.ok) { setEntries((prev) => prev.map((x) => x.id === e.id ? e : x)); showToast(t("common.errors.saveFailed")); }
          }
          return (
            <div key={e.id} style={S.entryRow} onClick={() => { setEditingEntry(e); setModalOpen(true); }}>
              <span style={{ ...S.entryBar, background: cat.color }} />
              <div style={S.entryInfo}><div style={S.entryName}>{catDisplayName(cat, language)}</div>{e.note && <div style={S.entryNote}>{e.note}</div>}</div>
              <div style={S.entryTime}><div style={S.entryDuration}>{fmtHM(diffMinutes(e.start, e.end), language)}</div></div>
              <div style={{ display: "flex", gap: 3, alignItems: "center" }} onClick={(ev) => ev.stopPropagation()}>
                <button onClick={() => adjustMins(-2)} style={{ ...S.deleteBtn, fontSize: 12, color: "var(--muted2)" }}>-2</button>
                <button onClick={() => adjustMins(2)} style={{ ...S.deleteBtn, fontSize: 12, color: "#C9A24B" }}>+2</button>
                <button onClick={(ev) => { ev.stopPropagation(); deleteEntry(e.id); }} style={S.deleteBtn}><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {dayTasks.length > 0 && (
        <div style={S.quickTasks}>
          <div style={S.quickTasksTitle}>{t("todayView.todaysTasks")}</div>
          {dayTasks.map((qt) => (
            <div key={qt.id} style={S.quickTaskRow} onClick={() => toggleTask(qt)}>
              <span style={{ ...S.checkbox, ...(qt.done ? S.checkboxDone : {}) }}>{qt.done && <Check size={12} />}</span>
              <span style={{ ...S.quickTaskText, ...(qt.done ? S.quickTaskTextDone : {}) }}>{qt.title}</span>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <EntryModal entry={editingEntry} date={date} categories={categories} onSave={saveEntry} onClose={() => { setModalOpen(false); setEditingEntry(null); }} />}
    </div>
  );
}

function DailyEvolution({ date, dayEntries, catMap, report, aiHistory, onSave, subscription }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState(report || null);
  useEffect(() => { setLocal(report || null); }, [report, date]);

  if (!isActiveSubscriber(subscription)) {
    return <UpsellCard icon={Sun} title={t("todayView.evolution.upsellTitle")} message={t("todayView.evolution.upsellMessage")} compact />;
  }

  async function generate() {
    if (dayEntries.length === 0) { setLocal({ error: t("todayView.evolution.noEntriesError") }); return; }
    setLoading(true);
    try {
      const summary = dayEntries.map((e) => `${catMap[e.catId]?.name || t("todayView.unspecified")} | ${e.start}-${e.end} | ${e.note || ""}`).join("\n");
      const prevGists = aiHistory.slice(0, 3).map((h) => h.gist).join(" / ");
      // محتوى الطلب المُرسَل للذكاء الاصطناعي نفسه (وليس واجهة المستخدم)
      // يتبع لغة الواجهة أيضاً حتى لا يظهر ملخص عربي داخل تجربة إنجليزية،
      // لكنه يبقى خارج ملفات الترجمة لأنه تعليمات نموذج وليس نص عرض.
      const prompt = language === "en"
        ? `You are a self-development coach writing in simple, warm English, without long dashes. This is the user's activity log for one day:\n${summary}\n\n${prevGists ? `Summaries of previous days — don't repeat them, build on them: ${prevGists}` : ""}\n\nWrite a short, inspiring summary of today's performance with one practical tip for tomorrow. Reply ONLY with JSON, no other text or markdown:\n{"summary":"two sentences about today's performance","tip":"one short tip for tomorrow","mood":"one word describing the day","gist":"6-word summary"}`
        : `أنت مرشد تطوير ذاتي يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. هذا سجل أنشطة المستخدم ليوم واحد:\n${summary}\n\n${prevGists ? `ملخصات أيام سابقة لا تكررها بل تبني عليها: ${prevGists}` : ""}\n\nاكتب ملخصاً ملهماً قصيراً عن أداء اليوم مع نصيحة عملية للغد. أعد فقط JSON بدون أي نص أو markdown:\n{"summary":"جملتان عن أداء اليوم","tip":"نصيحة واحدة قصيرة للغد","mood":"كلمة واحدة تصف اليوم","gist":"ملخص 6 كلمات"}`;
      const text = await analyze(prompt, 800);
      const parsed = parseJsonLoose(text);
      setLocal(parsed); onSave(parsed, parsed.gist);
    } catch (err) {
      console.error("[DailyEvolution] analyze failed:", err);
      setLocal({ error: t("todayView.evolution.errorGeneric") });
    }
    finally { setLoading(false); }
  }

  return (
    <div style={S.evolutionCard}>
      <div style={S.evolutionHeader}>
        <div style={S.evolutionTitleRow}><Sun size={16} color="#C9A24B" /><span style={S.evolutionTitle}>{t("todayView.evolution.title")}</span></div>
        <button onClick={generate} disabled={loading} style={S.evolutionBtn}>
          {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
          {loading ? "..." : local && !local.error ? t("todayView.evolution.update") : t("todayView.evolution.summarize")}
        </button>
      </div>
      {!local && <div style={S.evolutionEmpty}>{t("todayView.evolution.emptyPrompt")}</div>}
      {local?.error && <div style={S.evolutionEmpty}>{local.error}</div>}
      {local && !local.error && (
        <div>
          {local.mood && <span style={S.moodPill}>{local.mood}</span>}
          <p style={S.evolutionSummary}>{local.summary}</p>
          {local.tip && <div style={S.tipBox}><Target size={13} color="#5FA8A0" /><span>{isolateNumbers(local.tip)}</span></div>}
        </div>
      )}
    </div>
  );
}

// Sunday first so the week reads naturally right-to-left in RTL: Sunday
// renders rightmost (start of week), Saturday renders leftmost (end).
const WEEKDAY_SHORT = {
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

function startOfWeekKey(dateKey) {
  const d = new Date(dateKey);
  const daysSinceSunday = d.getDay(); // Sun=0 -> 0, Mon=1 -> 1, ..., Sat=6 -> 6
  d.setDate(d.getDate() - daysSinceSunday);
  return todayKey(d);
}
function addDaysKey(dateKey, delta) {
  const d = new Date(dateKey);
  d.setDate(d.getDate() + delta);
  return todayKey(d);
}

const FREE_TASK_LIMIT = 3;

function TasksView({ tasks, setTasks, categories, addPoints, showToast, subscription, profile, setProfile, journeyActive }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const weekdayShort = WEEKDAY_SHORT[language] || WEEKDAY_SHORT.ar;
  const isSub = isActiveSubscriber(subscription);
  const [title, setTitle] = useState("");
  const [catId, setCatId] = useState(categories[0]?.id);
  const [weekStart, setWeekStart] = useState(() => startOfWeekKey(todayKey()));
  const [selectedDay, setSelectedDay] = useState(() => todayKey());
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const today = todayKey();
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i)), [weekStart]);

  // جولة المهام السياقية (Onboarding - Phase D): تظهر أول مرة فقط، وتتقدّم
  // فور ظهور أول مهمة فعلية في القائمة - بغض النظر عن ضغط زر الإضافة أو
  // Enter من لوحة المفاتيح (لا نعتمد فقط على استماع الخطوة التفاعلية للنقر).
  const tasksTour = useModuleTour("tasks", profile, setProfile, { active: !journeyActive });
  const taskCountAtTourStartRef = useRef(tasks.length);
  useEffect(() => {
    if (tasksTour.step === 1 && tasks.length > taskCountAtTourStartRef.current) tasksTour.setStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksTour.step, tasks.length]);

  function shiftWeek(delta) {
    const dayOffset = Math.max(0, weekDays.indexOf(selectedDay));
    const nextStart = addDaysKey(weekStart, delta * 7);
    setWeekStart(nextStart);
    setSelectedDay(addDaysKey(nextStart, dayOffset));
  }

  function tasksForDay(dayKey) {
    return tasks.filter((t) => t.due === dayKey).sort((a, b) => (a.done !== b.done ? (a.done ? 1 : -1) : 0));
  }
  function dayStats(dayKey) {
    const list = tasksForDay(dayKey);
    const done = list.filter((t) => t.done).length;
    return { total: list.length, done, complete: list.length > 0 && done === list.length };
  }

  async function addTask() {
    if (!title.trim()) return;
    if (!isSub && tasks.length >= FREE_TASK_LIMIT) {
      showToast(t("tasksView.upsellCategoriesTitle"));
      return;
    }
    const newTask = { id: uid(), title: title.trim(), catId, due: selectedDay, done: false, created: todayKey() };
    setTasks((prev) => [...prev, newTask]);
    const res = await store.saveTask(newTask);
    if (!res.ok) { setTasks((prev) => prev.filter((x) => x.id !== newTask.id)); showToast(t("common.errors.saveFailed")); return; }
    setTitle(""); showToast(t("tasksView.taskAdded"));
  }
  async function toggle(taskItem) {
    const updated = { ...taskItem, done: !taskItem.done };
    setTasks((prev) => prev.map((x) => x.id === taskItem.id ? updated : x));
    const res = await store.saveTask(updated);
    if (!res.ok) { setTasks((prev) => prev.map((x) => x.id === taskItem.id ? taskItem : x)); showToast(t("common.errors.saveFailed")); return; }
    if (!taskItem.done) {
      addPoints(10);
      const after = tasksForDay(taskItem.due).map((x) => (x.id === taskItem.id ? updated : x));
      if (after.length > 0 && after.every((x) => x.done)) showToast(t("tasksView.allDoneToast"));
    } else {
      addPoints(-10, t("tasksView.undidTask"));
    }
  }
  async function remove(id) {
    const removed = tasks.find((x) => x.id === id);
    setTasks((prev) => prev.filter((x) => x.id !== id));
    const res = await store.deleteTask(id);
    if (!res.ok) { if (removed) setTasks((prev) => [...prev, removed]); showToast(t("common.errors.deleteFailed")); return; }
    if (removed?.done) addPoints(-10, t("tasksView.deletedCompletedTask"));
    showToast(t("common.states.deleted"));
  }

  const selectedList = tasksForDay(selectedDay);
  const selectedStats = dayStats(selectedDay);
  const selectedIdx = Math.max(0, weekDays.indexOf(selectedDay));

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>{t("tasksView.notebookTitle")}</div>

      <div style={S.dateRow}>
        <button onClick={() => shiftWeek(-1)} style={S.iconBtn}>{language === "en" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}</button>
        <div style={S.dateLabel}>{arabicDate(weekDays[0], { day: "numeric", month: "short" }, language === "en" ? "en-US" : undefined)} – {arabicDate(weekDays[6], { day: "numeric", month: "short" }, language === "en" ? "en-US" : undefined)}</div>
        <button onClick={() => shiftWeek(1)} style={S.iconBtn}>{language === "en" ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
      </div>

      <div style={S.weekStrip}>
        {weekDays.map((d, i) => {
          const stats = dayStats(d);
          const isSelected = d === selectedDay;
          const isToday = d === today;
          return (
            <button key={d} onClick={() => setSelectedDay(d)} style={{ ...S.dayChip, ...(isSelected ? S.dayChipActive : {}) }}>
              <span style={S.dayChipWeekday}>{weekdayShort[i]}</span>
              <span style={S.dayChipNum}>{new Date(d).getDate()}</span>
              {stats.complete ? <Check size={11} color="#5FA8A0" /> : isToday ? <span style={S.dayChipTodayDot} /> : <span style={{ height: 11 }} />}
            </button>
          );
        })}
      </div>

      <div style={S.taskComposer}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder={t("tasksView.addTaskPlaceholder", { day: weekdayShort[selectedIdx] })} style={S.taskInput} />
        <button onClick={addTask} style={S.taskAddBtn} data-tour="add-task-btn"><Plus size={18} /></button>
      </div>
      <div style={S.taskMeta}>
        <div style={S.catScroll}>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCatId(c.id)} style={{ ...S.catMini, borderColor: catId === c.id ? c.color : "var(--border2)", background: catId === c.id ? `${c.color}22` : "transparent" }}>
              <span style={{ ...S.legendDot, background: c.color }} />{catDisplayName(c, language)}
            </button>
          ))}
        </div>
      </div>

      {!isSub && tasks.length >= FREE_TASK_LIMIT && (
        <UpsellCard icon={ListChecks} title={t("tasksView.upsellUnlimitedTitle")} message={t("tasksView.upsellUnlimitedMessage")} compact />
      )}

      <div style={S.taskList} className="stagger-in responsive-card-list">
        {selectedList.length === 0 && <div style={S.emptyState}><div style={S.emptyStateTitle}>{t("tasksView.emptyTitle")}</div><div style={S.emptyStateSub}>{t("tasksView.emptySub")}</div></div>}
        {selectedList.map((task, idx) => {
          const cat = catMap[task.catId];
          return (
            <div key={task.id} style={S.taskRow}>
              <span onClick={() => toggle(task)} style={{ ...S.checkbox, ...(task.done ? S.checkboxDone : {}) }} data-tour={idx === 0 ? "task-row-first" : undefined}>{task.done && <Check size={12} />}</span>
              <div style={S.taskInfo}>
                <div style={{ ...S.taskTitle, ...(task.done ? S.taskTitleDone : {}) }}>{task.title}</div>
                {cat && <div style={S.taskTags}><span style={S.taskTag}><span style={{ ...S.legendDot, background: cat.color, width: 6, height: 6 }} />{catDisplayName(cat, language)}</span></div>}
              </div>
              <button onClick={() => remove(task.id)} style={S.deleteBtn}><Trash2 size={14} /></button>
            </div>
          );
        })}
        {selectedStats.complete && <div style={S.dayCompleteBanner}>{t("tasksView.allDoneBanner")}</div>}
      </div>

      {tasksTour.step === 1 && (
        <SpotlightTour
          steps={[{ target: '[data-tour="add-task-btn"]', interactive: true, title: t("onboarding.tasksTour.step1Title"), body: t("onboarding.tasksTour.step1Body") }]}
          stepIndex={0}
          onNext={() => tasksTour.setStep(2)}
          onSkip={tasksTour.finish}
          onFinish={tasksTour.finish}
          labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), tapHere: t("onboarding.tapHere") }}
        />
      )}
      {tasksTour.step === 2 && (
        <SpotlightTour
          steps={[{ target: '[data-tour="task-row-first"]', title: t("onboarding.tasksTour.step2Title"), body: t("onboarding.tasksTour.step2Body") }]}
          stepIndex={0}
          onNext={tasksTour.finish}
          onSkip={tasksTour.finish}
          onFinish={tasksTour.finish}
          labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), tapHere: t("onboarding.tapHere") }}
        />
      )}
    </div>
  );
}

// رسم بياني SVG بسيط ومستقل تماماً عن recharts - يُستخدم فقط داخل تقرير
// PDF المُصدَّر (نافذة طباعة منفصلة لا تُشغِّل React/recharts إطلاقاً)، بدل
// محاولة التقاط SVG المُولَّد من recharts في الصفحة الحيّة (هش ويعتمد على أي
// تبويب فرعي مفتوح وقتها). يبني أعمدة تناسبياً بارتفاعها مع تدرّج ذهبي.
function buildReportBarSvg(data, { width = 620, height = 190, colorStart = "#E0B868", colorEnd = "#8a6d28" } = {}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length);
  const padding = 22;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2 - 18;
  const slot = chartW / n;
  const barW = Math.max(2, slot - 5);
  const showLabels = n <= 10;
  let bars = "";
  data.forEach((d, i) => {
    const x = padding + i * slot + (slot - barW) / 2;
    const h = Math.max(2, (d.value / max) * chartH);
    const y = padding + chartH - h;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="url(#reportBarGrad)" />`;
    if (showLabels) {
      bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${(padding + chartH + 15).toFixed(1)}" font-size="10" fill="#8a6d28" text-anchor="middle" font-family="Tajawal, sans-serif">${escapeHtml(d.label)}</text>`;
    }
  });
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:${width}px">
    <defs><linearGradient id="reportBarGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colorStart}" /><stop offset="100%" stop-color="${colorEnd}" />
    </linearGradient></defs>
    <line x1="${padding}" y1="${padding + chartH}" x2="${width - padding}" y2="${padding + chartH}" stroke="#e4ddc9" stroke-width="1" />
    ${bars}
  </svg>`;
}

const REPORT_SUB_TABS = [
  { id: "comprehensive", labelKey: "reportsView.tabs.comprehensive", icon: Sparkles },
  { id: "overview", labelKey: "reportsView.tabs.overview", icon: TrendingUp },
  { id: "study", labelKey: "reportsView.tabs.study", icon: BookOpen },
  { id: "health", labelKey: "reportsView.tabs.health", icon: Heart },
  { id: "nutrition", labelKey: "reportsView.tabs.nutrition", icon: Utensils },
  { id: "allTime", labelKey: "reportsView.tabs.allTime", icon: Trophy },
];

// ===== Priority 4: التقرير الشامل - أنماط بصرية مخصَّصة لهذا القسم فقط
// (نفس اتفاقية أنماط FS/NS/GS المستخدمة أصلاً لكل قسم في هذا الملف) =====
const RS = {
  sectionBlock: { marginBottom: 18 },
  sectionHeading: { display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, color: "var(--gold)", marginBottom: 10 },
  miniStatGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  miniStatCard: { background: "var(--surface-sunken)", borderRadius: 10, padding: "10px 10px" },
  miniStatLabel: { fontSize: 11, color: "var(--muted2)" },
  miniStatValue: { fontSize: 16, fontWeight: 700, color: "var(--ink)", marginTop: 3 },
  trendRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line)" },
  trendLabel: { fontSize: 12.5, color: "var(--ink-soft)" },
  trendBadge: { display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "3px 9px", direction: "ltr" },
  trendUp: { background: "rgba(95,168,160,0.15)", color: "#5FA8A0" },
  trendDown: { background: "rgba(224,82,82,0.12)", color: "#E05252" },
  trendFlat: { background: "var(--surface-sunken)", color: "var(--muted2)" },
  streakGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  streakCard: { background: "var(--surface-sunken)", borderRadius: 10, padding: "10px 6px", textAlign: "center" },
  streakValue: { fontSize: 17, fontWeight: 700, color: "var(--gold)" },
  streakLabel: { fontSize: 10, color: "var(--muted2)", marginTop: 3 },
  goalsProgressTrack: { width: "100%", height: 8, borderRadius: 20, background: "var(--surface-sunken)", marginTop: 8, overflow: "hidden" },
  goalsProgressFill: { height: "100%", borderRadius: 20, background: "#5FA8A0" },
  microChipRow: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  microChip: { fontSize: 11, color: "var(--ink-soft)", background: "var(--surface-sunken)", borderRadius: 20, padding: "4px 10px" },
  insightCard: { background: "linear-gradient(160deg, var(--warm-tint), var(--panel))", border: "1px solid var(--warm-border)", borderRadius: 14, padding: "16px 14px", marginTop: 4 },
  insightHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  insightIcon: { width: 32, height: 32, borderRadius: 10, background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  insightTitle: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  insightText: { fontSize: 13, lineHeight: 1.8, color: "var(--ink)", margin: 0 },
  journeyHero: { textAlign: "center", marginBottom: 18 },
  journeyHeroValue: { fontFamily: "'Amiri', serif", fontSize: 30, fontWeight: 700, color: "var(--gold)" },
  journeyHeroLabel: { fontSize: 12.5, color: "var(--muted2)", marginTop: 4 },
  journeyGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  journeyCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", textAlign: "center" },
  journeyCardValue: { fontSize: 20, fontWeight: 700, color: "var(--ink)" },
  journeyCardLabel: { fontSize: 11, color: "var(--muted2)", marginTop: 4 },
};

function ReportsView({ entries, categories, focus, profile, setProfile, healthProfile, sleepLog, setSleepLog, showToast, tasks, goals, journeyActive }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const RC = useRecharts();
  const reduceMotion = useReducedMotion();
  const [range, setRange] = useState("week");
  // رؤية Masar السابقة تُبنى على أرقام فترة محدَّدة (أسبوع/شهر) - تغيير
  // الفترة يُبطلها فوراً حتى لا تُعرض رؤية عن فترة مختلفة عن المعروضة حالياً.
  useEffect(() => { setInsightText(""); setInsightError(false); }, [range]);
  const [subTab, setSubTab] = useState("overview");
  const [exporting, setExporting] = useState(false);

  // جولة التقارير السياقية (Onboarding - Phase D): خطوة واحدة فقط - Spotlight
  // على تبويب "الشامل" (أغنى تبويب) بانتظار ضغطة حقيقية، وتكتمل الجولة فوراً
  // بمجرد ذلك (لا حدث "حفظ" لانتظاره هنا كما في التغذية/المهام/الأهداف).
  const reportsTour = useModuleTour("reports", profile, setProfile, { active: !journeyActive });
  const [nutritionLog, setNutritionLog] = useState([]);
  const [nutritionLoaded, setNutritionLoaded] = useState(false);
  // بيانات إضافية خاصة بـ"التقرير الشامل" (Priority 4) - نفس نمط "العرض
  // المستقل" أعلاه بالضبط لسجل التغذية. tasks/goals لا تُجلَب هنا لأنها
  // محمَّلة أصلاً في MasarApp نفسه وتُمرَّر كخصائص جاهزة - لا داعي لجلب مكرَّر.
  const [workoutLog, setWorkoutLog] = useState([]);
  const [fitnessLog, setFitnessLog] = useState({});
  const [waterLog, setWaterLog] = useState({});
  const [comprehensiveLoaded, setComprehensiveLoaded] = useState(false);
  const [insightText, setInsightText] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState(false);

  // سجل التغذية ليس محمَّلاً مركزياً في MasarApp (نفس نمط "العرض المستقل"
  // المستخدم في NutritionView وAssistantView) - يُجلب مرة واحدة هنا فقط
  // عند فتح التقارير.
  useEffect(() => {
    let active = true;
    store.loadNutritionLog().then((log) => { if (active) { setNutritionLog(log); setNutritionLoaded(true); } });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([store.loadWorkoutLog(), store.loadFitnessLog(), store.loadWaterLog()]).then(([wl, fl, wat]) => {
      if (!active) return;
      setWorkoutLog(wl); setFitnessLog(fl); setWaterLog(wat); setComprehensiveLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const span = range === "week" ? 7 : 30;
  const days = useMemo(() => {
    const arr = []; const today = new Date();
    for (let i = span - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); arr.push(todayKey(d)); }
    return arr;
  }, [span]);
  // نافذة الفترة السابقة مباشرة (نفس عدد الأيام قبل بداية الفترة الحالية) -
  // أساس مقارنة "هذا الأسبوع مقابل الماضي" في قسم الاتجاهات (Priority 4)،
  // بنفس منطق بناء days تماماً لكن مُزاحاً بمقدار span يوماً للخلف.
  const prevDays = useMemo(() => {
    const arr = []; const today = new Date();
    for (let i = span * 2 - 1; i >= span; i--) { const d = new Date(today); d.setDate(d.getDate() - i); arr.push(todayKey(d)); }
    return arr;
  }, [span]);
  const barData = days.map((day) => ({
    day, label: range === "week" ? arabicDate(day, { weekday: "short" }, language === "en" ? "en-US" : undefined) : arabicDate(day, { day: "numeric" }, language === "en" ? "en-US" : undefined),
    hours: +(entries.filter((e) => e.date === day).reduce((s, e) => s + diffMinutes(e.start, e.end), 0) / 60).toFixed(1),
  }));
  const totalMin = entries.filter((e) => days.includes(e.date)).reduce((s, e) => s + diffMinutes(e.start, e.end), 0);
  const activeDays = new Set(entries.filter((e) => days.includes(e.date)).map((e) => e.date)).size;
  const avgPerActiveDay = activeDays ? totalMin / activeDays : 0;
  const catTotals = useMemo(() => {
    const m = {};
    entries.filter((e) => days.includes(e.date)).forEach((e) => { m[e.catId] = (m[e.catId] || 0) + diffMinutes(e.start, e.end); });
    return Object.entries(m).map(([catId, mins]) => ({ name: catMap[catId] ? catDisplayName(catMap[catId], language) : t("reportsView.unspecified"), value: mins, color: catMap[catId]?.color || "#9A968F" })).sort((a, b) => b.value - a.value);
  }, [entries, days, catMap, language]);

  // تبويب "الدراسة": يقتصر على الجلسات المعلَّمة isStudy (نفس تمييز
  // الدراسة/العام المستخدم أصلاً في تقرير مؤقت التركيز).
  const studyBarData = days.map((day) => ({
    day, label: range === "week" ? arabicDate(day, { weekday: "short" }, language === "en" ? "en-US" : undefined) : arabicDate(day, { day: "numeric" }, language === "en" ? "en-US" : undefined),
    minutes: (focus || []).filter((f) => f.date === day && f.isStudy).reduce((s, f) => s + f.minutes, 0),
  }));
  const studyInRange = (focus || []).filter((f) => days.includes(f.date) && f.isStudy);
  const studyTotalMin = studyInRange.reduce((s, f) => s + f.minutes, 0);
  const studySessions = studyInRange.length;
  const studyActiveDays = new Set(studyInRange.map((f) => f.date)).size;
  const studyAvgPerActiveDay = studyActiveDays ? studyTotalMin / studyActiveDays : 0;

  // تبويب "التغذية": نفس نافذة الأيام المعروضة (أسبوع/شهر) - سجل التغذية
  // نفسه مُقيَّد فعلياً بـ90 يوماً من جهة الخادم (راجع loadNutritionLog في
  // store.js)، وهو أوسع من أطول مدى معروض هنا (شهر) فلا فقدان بيانات.
  const nutritionByDay = days.map((day) => ({
    day, label: range === "week" ? arabicDate(day, { weekday: "short" }, language === "en" ? "en-US" : undefined) : arabicDate(day, { day: "numeric" }, language === "en" ? "en-US" : undefined),
    calories: Math.round(sumNutritionEntries(nutritionLog.filter((e) => e.date === day)).calories),
  }));
  const nutritionInRange = nutritionLog.filter((e) => days.includes(e.date));
  const nutritionTotals = sumNutritionEntries(nutritionInRange);
  const nutritionActiveDays = new Set(nutritionInRange.map((e) => e.date)).size;
  const nutritionAvgCalories = nutritionActiveDays ? Math.round(nutritionTotals.calories / nutritionActiveDays) : 0;
  const nutritionAvgProtein = nutritionActiveDays ? Math.round(nutritionTotals.protein / nutritionActiveDays) : 0;
  const nutritionAvgCarbs = nutritionActiveDays ? Math.round(nutritionTotals.carbs / nutritionActiveDays) : 0;
  const nutritionAvgFat = nutritionActiveDays ? Math.round(nutritionTotals.fat / nutritionActiveDays) : 0;
  const nutritionAvgFiber = nutritionActiveDays ? Math.round(nutritionTotals.fiber / nutritionActiveDays) : 0;
  const nutritionAvgSodium = nutritionActiveDays ? Math.round(nutritionTotals.sodium / nutritionActiveDays) : 0;
  const nutritionAvgCholesterol = nutritionActiveDays ? Math.round(nutritionTotals.cholesterol / nutritionActiveDays) : 0;
  const macroData = [
    { name: t("reportsView.protein"), value: Math.round(nutritionTotals.protein), color: "#5FA8A0" },
    { name: t("reportsView.carbs"), value: Math.round(nutritionTotals.carbs), color: "#C9A24B" },
    { name: t("reportsView.fat"), value: Math.round(nutritionTotals.fat), color: "#8A7BD1" },
  ].filter((m) => m.value > 0);

  // توزيع السعرات على الوجبات الأربع - متوسط لكل يوم في كامل الفترة (لا لكل
  // يوم سُجِّلت فيه هذه الوجبة تحديداً) عمداً، حتى تظهر وجبة مُهمَلة بانتظام
  // كعمود قصير بصرياً بدل إخفاء الإهمال داخل متوسط "أيام سُجِّلت فيها فقط".
  const mealTypeChartData = MEAL_TYPES.map((mt) => {
    const mealEntries = nutritionInRange.filter((e) => e.mealType === mt);
    const totalCal = mealEntries.reduce((s, e) => s + (e.calories || 0), 0);
    return {
      mealType: mt,
      name: t(`nutrition.mealTypes.${mt}`),
      avgCalories: days.length > 0 ? Math.round(totalCal / days.length) : 0,
      daysLogged: new Set(mealEntries.map((e) => e.date)).size,
    };
  });
  // ملاحظات أنماط حقيقية مبنية فقط على ما سُجِّل فعلاً (meal_type) - null إن
  // كانت البيانات غير كافية لأي استنتاج موثوق (انظر عتبات analyzeMealPatterns).
  const mealPatterns = useMemo(() => analyzeMealPatterns(nutritionInRange, days), [nutritionInRange, days]);

  const rangeEntries = useMemo(() => sleepLog.filter((s) => days.includes(s.date)), [sleepLog, days]);
  const sleepAvgHours = rangeEntries.length ? rangeEntries.reduce((sum, s) => sum + s.hours, 0) / rangeEntries.length : null;

  // ===== Priority 4: التقرير الشامل - تجميع أرقام حقيقية من كل الأقسام
  // الموجودة فعلاً (لا بيانات مخترعة) لنفس نافذة days الحالية، بالإضافة
  // لنافذة prevDays للمقارنة الاتجاهية "هذا الأسبوع مقابل الماضي". =====
  const prevTotalMin = useMemo(() => entries.filter((e) => prevDays.includes(e.date)).reduce((s, e) => s + diffMinutes(e.start, e.end), 0), [entries, prevDays]);
  const nutritionPrevInRange = useMemo(() => nutritionLog.filter((e) => prevDays.includes(e.date)), [nutritionLog, prevDays]);
  const nutritionPrevActiveDays = new Set(nutritionPrevInRange.map((e) => e.date)).size;

  const fitnessDaysInRange = useMemo(() => days.filter((d) => fitnessLog[d]), [days, fitnessLog]);
  const fitnessDaysInPrevRange = useMemo(() => prevDays.filter((d) => fitnessLog[d]), [prevDays, fitnessLog]);
  const workoutLogInRange = useMemo(() => workoutLog.filter((l) => days.includes(l.date)), [workoutLog, days]);
  const workoutLogInPrevRange = useMemo(() => workoutLog.filter((l) => prevDays.includes(l.date)), [workoutLog, prevDays]);
  const volumeOf = (log) => log.reduce((s, l) => s + (l.weight || 0) * (l.reps || 0) * (l.setsCompleted || 0), 0);
  const totalTrainingVolume = volumeOf(workoutLogInRange);
  const prevTrainingVolume = volumeOf(workoutLogInPrevRange);
  const distinctExercisesTrained = new Set(workoutLogInRange.map((l) => l.exerciseId)).size;
  const workoutStreak = useMemo(() => computeStreak(Object.keys(fitnessLog).filter((d) => fitnessLog[d])), [fitnessLog]);

  const tasksInRange = useMemo(() => (tasks || []).filter((tk) => tk.due && days.includes(tk.due)), [tasks, days]);
  const tasksPrevInRange = useMemo(() => (tasks || []).filter((tk) => tk.due && prevDays.includes(tk.due)), [tasks, prevDays]);
  const tasksCompletedCount = tasksInRange.filter((tk) => tk.done).length;
  const tasksMissedCount = tasksInRange.filter((tk) => !tk.done && tk.due < todayKey()).length;
  const tasksPrevCompletedCount = tasksPrevInRange.filter((tk) => tk.done).length;

  const nutritionLoggingStreak = useMemo(() => computeStreak(Array.from(new Set(nutritionLog.map((e) => e.date)))), [nutritionLog]);
  const taskCompletionStreak = useMemo(() => computeStreak((tasks || []).filter((tk) => tk.done && tk.due).map((tk) => tk.due)), [tasks]);

  const goalsDoneCount = (goals || []).filter((g) => g.status === "done").length;
  const goalsFailedCount = (goals || []).filter((g) => g.status === "failed").length;
  const goalsActiveCount = (goals || []).filter((g) => g.status === "active").length;
  const goalsResolvedCount = goalsDoneCount + goalsFailedCount;
  const goalsProgressPct = goalsResolvedCount > 0 ? Math.round((goalsDoneCount / goalsResolvedCount) * 100) : null;

  const waterDaysLogged = days.filter((d) => waterLog[d] != null).length;
  const avgWaterCups = waterDaysLogged > 0 ? days.reduce((s, d) => s + (waterLog[d] || 0), 0) / waterDaysLogged : 0;

  // أهم 3 فيتامينات/معادن (بأعلى نسبة تغطية من الاحتياج اليومي المرجعي)
  // ممن تتوفر لها بيانات فعلية في الفترة فقط - لا قائمة ثابتة، فقط ما ساهم
  // فيه طعام حقيقي واحد على الأقل (انظر micronutrients في sumNutritionEntries).
  const topMicronutrients = useMemo(() => {
    const daysCount = Math.max(1, nutritionActiveDays);
    return Object.entries(nutritionTotals.micronutrients || {})
      .map(([key, total]) => {
        const meta = MICRONUTRIENT_META[key];
        if (!meta) return null;
        const avgPerDay = total / daysCount;
        return { key, avgPerDay: Math.round(avgPerDay * 10) / 10, unit: meta.unit === "مكغ" ? "mcg" : "mg", pct: Math.round((avgPerDay / meta.rdi) * 100), approx: !!nutritionTotals.microApprox?.[key] };
      })
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }, [nutritionTotals, nutritionActiveDays]);

  // مقارنة اتجاه عامة: نسبة تغيّر آمنة من القسمة على صفر - إن كانت القيمة
  // السابقة صفراً وأصبحت الحالية أكبر منها يُعتبر اتجاهاً "جديداً" (isNew)
  // بدل نسبة مئوية بلا معنى (∞%)؛ تساوي القيمتين (بما فيهما صفر=صفر) يعني
  // اتجاهاً مستقراً (flat) بلا سهم.
  function computeTrend(current, previous) {
    if (current === previous) return { direction: "flat", pct: 0, isNew: false };
    if (previous === 0) return { direction: "up", pct: null, isNew: true };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { direction: pct > 0 ? "up" : "down", pct: Math.abs(pct), isNew: false };
  }

  const trends = [
    { key: "fitness", labelKey: "reportsView.comprehensive.trendFitness", current: fitnessDaysInRange.length, previous: fitnessDaysInPrevRange.length, ...computeTrend(fitnessDaysInRange.length, fitnessDaysInPrevRange.length) },
    { key: "time", labelKey: "reportsView.comprehensive.trendTime", current: totalMin, previous: prevTotalMin, ...computeTrend(totalMin, prevTotalMin) },
    { key: "nutrition", labelKey: "reportsView.comprehensive.trendNutrition", current: nutritionActiveDays, previous: nutritionPrevActiveDays, ...computeTrend(nutritionActiveDays, nutritionPrevActiveDays) },
    { key: "tasks", labelKey: "reportsView.comprehensive.trendTasks", current: tasksCompletedCount, previous: tasksPrevCompletedCount, ...computeTrend(tasksCompletedCount, tasksPrevCompletedCount) },
  ];

  // ===== "الرحلة الكاملة" (All-Time، Priority 4 البند 4) - رحلة المستخدم
  // منذ أول استخدام. workoutLog/fitnessLog/tasks بلا سقف زمني من جهة
  // الخادم (انظر store.js) فتمثّل التاريخ الكامل فعلياً. nutritionLog وحده
  // مُقيَّد بـ90 يوماً من جهة الخادم (نفس القيد المذكور أعلى الملف) فلا
  // يمكن ادّعاء أنه يمثّل كل الوجبات منذ أول استخدام - يُعرض بعلامة نطاقه
  // الحقيقي صراحة بدل الإيحاء بأنه إجمالي مطلق. حساب واحد بسيط O(n) على
  // بيانات محمَّلة أصلاً بالفعل - لا استعلامات إضافية، ولا يعاد حسابه إلا
  // عند تغيّر البيانات المصدرية فعلياً (useMemo).
  const allTimeStats = useMemo(() => {
    const totalWorkouts = Object.values(fitnessLog).filter(Boolean).length;
    const activeDaysAllTime = new Set([...entries.map((e) => e.date), ...focus.map((f) => f.date)]).size;
    const totalTasksCompleted = (tasks || []).filter((tk) => tk.done).length;
    const longestWorkoutStreak = longestStreak(Object.keys(fitnessLog).filter((d) => fitnessLog[d]));

    let bestWeek = null;
    if (workoutLog.length > 0) {
      const weekMs = 7 * 24 * 3600 * 1000;
      const weeks = {};
      for (const log of workoutLog) {
        const d = new Date(`${log.date}T00:00:00`);
        if (Number.isNaN(d.getTime())) continue;
        const weekIndex = Math.floor(d.getTime() / weekMs);
        const vol = (log.weight || 1) * (log.reps || 0) * (log.setsCompleted || 0);
        weeks[weekIndex] = (weeks[weekIndex] || 0) + vol;
      }
      const [topWeekIndex, topVolume] = Object.entries(weeks).sort((a, b) => b[1] - a[1])[0] || [null, 0];
      if (topWeekIndex != null && topVolume > 0) {
        const weekStart = new Date(Number(topWeekIndex) * weekMs);
        bestWeek = { start: todayKey(weekStart), volume: Math.round(topVolume) };
      }
    }
    return { totalWorkouts, activeDaysAllTime, totalTasksCompleted, longestWorkoutStreak, bestWeek, totalMealsLogged: nutritionLog.length };
  }, [fitnessLog, entries, focus, tasks, workoutLog, nutritionLog]);

  // ===== "Masar Insight": فقرة قصيرة من Gemini مبنية حصراً على الأرقام
  // الحقيقية المحسوبة أعلاه لهذه الفترة بالذات - بلا أي افتراض أو رقم غير
  // موجود فعلاً، بنفس مبدأ توصية PDF الذكية الموجودة أصلاً أدناه (exportPdf)
  // لكن بمدخلات أوسع تغطي كل الأقسام، وتُعرض داخل التطبيق مباشرة لا فقط
  // في ملف PDF مُصدَّر. مولَّدة عند الطلب (زر) لا تلقائياً، لضبط تكلفة
  // الاستدعاء - نفس نمط "اقتراحات الوجبات"/"نصيحة اليوم" في NutritionPlanView.
  const isEnLang = language === "en";
  async function generateInsight() {
    setInsightLoading(true);
    setInsightError(false);
    try {
      const rangeWord = range === "week" ? (isEnLang ? "week" : "الأسبوع") : (isEnLang ? "month" : "الشهر");
      const lines = [
        `${isEnLang ? "Workouts completed" : "تمارين مكتملة"}: ${fitnessDaysInRange.length}`,
        `${isEnLang ? "Total tracked time" : "إجمالي الوقت المتتبَّع"}: ${fmtHM(totalMin, language)}`,
        `${isEnLang ? "Study/focus time" : "وقت الدراسة/التركيز"}: ${fmtHM(studyTotalMin, language)}`,
        `${isEnLang ? "Days with nutrition logged" : "أيام سُجِّلت فيها التغذية"}: ${nutritionActiveDays} / ${days.length}`,
        nutritionActiveDays > 0 ? `${isEnLang ? "Average daily calories" : "متوسط السعرات اليومي"}: ${nutritionAvgCalories} kcal` : "",
        `${isEnLang ? "Tasks completed" : "مهام مكتملة"}: ${tasksCompletedCount}`,
        `${isEnLang ? "Tasks missed" : "مهام فائتة"}: ${tasksMissedCount}`,
        `${isEnLang ? "Goals: done/active/failed" : "الأهداف: مكتملة/قيد التقدّم/فائتة"}: ${goalsDoneCount}/${goalsActiveCount}/${goalsFailedCount}`,
        `${isEnLang ? "Workout streak" : "سلسلة الرياضة"}: ${workoutStreak} ${isEnLang ? "days" : "يوم"}`,
        `${isEnLang ? "Fitness trend vs previous " + rangeWord : "اتجاه الرياضة مقابل " + rangeWord + " الماضي"}: ${fitnessDaysInRange.length} ${isEnLang ? "vs" : "مقابل"} ${fitnessDaysInPrevRange.length}`,
        `${isEnLang ? "Task-completion trend vs previous " + rangeWord : "اتجاه إنجاز المهام مقابل " + rangeWord + " الماضي"}: ${tasksCompletedCount} ${isEnLang ? "vs" : "مقابل"} ${tasksPrevCompletedCount}`,
      ].filter(Boolean).join("\n");

      const prompt = isEnLang
        ? `You are a personal-development coach. Using ONLY the real numbers below for the user's ${rangeWord}, write a short (4-6 sentences), clear, practical analysis of their ${rangeWord} across fitness, nutrition, tasks and goals, then end with exactly ONE concrete, specific improvement opportunity for next ${rangeWord}. Do NOT invent any number, event, or pattern not stated below. Keep numbers clearly separated (don't stack more than two back to back in one clause).\n\n${lines}`
        : `أنت مدرّب تطوير شخصي. باستخدام الأرقام الحقيقية أدناه فقط عن ${rangeWord} المستخدم، اكتب تحليلاً قصيراً (4-6 جمل) واضحاً وعملياً عن ${rangeWord}ه عبر الرياضة والتغذية والمهام والأهداف، ثم اختم بفرصة تحسّن واحدة ملموسة ومحدَّدة لـ${rangeWord} القادم. لا تخترع أي رقم أو حدث أو نمط غير مذكور أدناه. حافظ على وضوح فصل الأرقام (لا تحشر أكثر من رقمين متتاليين في نفس الجملة).\n\n${lines}`;

      const text = (await analyze(prompt, 400)).trim();
      setInsightText(text);
    } catch (err) {
      console.error("[ReportsView] generateInsight failed:", err);
      setInsightError(true);
    } finally {
      setInsightLoading(false);
    }
  }

  async function exportPdf() {
    if (exporting) return;
    setExporting(true);
    const isEn = language === "en";
    const rangeLabel = range === "week" ? "الأسبوعي" : "الشهري";
    const periodStart = arabicDate(days[0], { day: "numeric", month: "long" }, isEn ? "en-US" : undefined);
    const periodEnd = arabicDate(days[days.length - 1], { day: "numeric", month: "long", year: "numeric" }, isEn ? "en-US" : undefined);
    const catRows = catTotals.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${fmtHM(c.value, language)}</td></tr>`).join("");
    const chartSvg = buildReportBarSvg(barData.map((d) => ({ label: d.label, value: d.hours })));

    // توصية ذكية مبنية على أرقام الفترة الفعلية فقط - نفس محرك التحليل
    // المستخدم أصلاً في "لخّص يومي" و"أنجز" (analyze عبر Gemini)، وهذا القسم
    // متاح فقط لأن ReportsView نفسها محجوبة عن غير المشتركين بالفعل. محتوى
    // الطلب نفسه (وليس واجهة المستخدم) يتبع لغة الواجهة أيضاً عبر مفاتيح
    // pdfReport.aiPromptWeek/aiPromptMonth الجاهزة للاستيفاء (interpolation).
    let smartTip = "";
    try {
      const sleepLine = sleepAvgHours !== null
        ? (isEn ? `- Average sleep: ${sleepAvgHours.toFixed(1)} hours` : `- متوسط ساعات النوم: ${sleepAvgHours.toFixed(1)} ساعة`)
        : "";
      let nutritionLine = nutritionAvgCalories
        ? (isEn ? `- Average daily calories: ${nutritionAvgCalories} kcal` : `- متوسط السعرات اليومي: ${nutritionAvgCalories} سعرة`)
        : "";
      // حقائق أنماط وجبات حقيقية (meal_type) - تُضاف فقط إن وُجد نمط فعلي في
      // البيانات (mealPatterns تُرجع null أو حقولاً فارغة إن لم يوجد دليل
      // كافٍ) حتى يبني الذكاء الاصطناعي توصيته على أرقام حقيقية لا افتراضات.
      if (mealPatterns) {
        if (mealPatterns.daysWithoutBreakfastCount > 0) {
          nutritionLine += isEn
            ? `\n- No breakfast logged on ${mealPatterns.daysWithoutBreakfastCount} of ${mealPatterns.loggedDaysCount} days with logged food`
            : `\n- لم يُسجَّل فطور في ${mealPatterns.daysWithoutBreakfastCount} من ${mealPatterns.loggedDaysCount} يوماً سُجِّل فيها طعام`;
        }
        if (mealPatterns.lowCalorieMeal) {
          const mealLabel = t(`nutrition.mealTypes.${mealPatterns.lowCalorieMeal.mealType}`);
          nutritionLine += isEn
            ? `\n- ${mealLabel} is noticeably lower in calories than other meals on average`
            : `\n- وجبة ${mealLabel} أقل سعرات بشكل ملحوظ من باقي الوجبات في المتوسط`;
        }
        if (mealPatterns.lowProteinMeal) {
          const mealLabel = t(`nutrition.mealTypes.${mealPatterns.lowProteinMeal.mealType}`);
          nutritionLine += isEn
            ? `\n- ${mealLabel} is noticeably lower in protein than other meals on average`
            : `\n- وجبة ${mealLabel} أقل بروتيناً بشكل ملحوظ من باقي الوجبات في المتوسط`;
        }
      }
      const promptKey = range === "week" ? "pdfReport.aiPromptWeek" : "pdfReport.aiPromptMonth";
      const prompt = t(promptKey, {
        totalTime: fmtHM(totalMin, language), activeDays, totalDays: days.length,
        studyTime: fmtHM(studyTotalMin, language), sleepLine, nutritionLine,
      });
      smartTip = (await analyze(prompt, 350)).trim();
    } catch (err) {
      console.error("[ReportsView] smart recommendation failed:", err);
    }

    // على الجوال، window.open("", "_blank") لا يفتح تبويباً منفصلاً دائماً
    // (بعض متصفحات الجوال تستبدل التبويب الحالي بدلاً منه)، فتضيع صفحة
    // التطبيق كاملة دون أي رابط عودة. الزر أدناه يحاول إغلاق النافذة أولاً
    // (يعمل إن كانت فعلاً تبويباً منفصلاً فتحه السكربت)، وإن بقيت مفتوحة
    // (يعني أنها نفس التبويب) ينقل المستخدم فعلياً لرابط التطبيق نفسه —
    // إخراج مضمون من الشاشة العالقة في الحالتين. مخفي عند الطباعة الفعلية
    // حتى لا يظهر داخل ملف الـ PDF نفسه.
    const appUrl = window.location.href;
    const logoUrl = `${window.location.origin}/logo-mark.png`;
    const htmlAr = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير مسار ${rangeLabel}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Amiri:wght@700&display=swap');
        body{font-family:'Tajawal',sans-serif;color:#2B2621;padding:88px 40px 40px;max-width:700px;margin:auto;background:#FBF8F2}
        .brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}
        .brand img{width:34px;height:34px;border-radius:9px}
        .brand span{font-family:'Amiri',serif;font-size:20px;font-weight:700;color:#1B3A3A}
        h1{font-family:'Amiri',serif;color:#8a6d28;border-bottom:2px solid #C9A24B;padding-bottom:10px;margin-top:0}
        .meta{color:#6B6355;font-size:13px;margin-bottom:24px}
        .kpis{display:flex;gap:16px;margin-bottom:24px}
        .kpi{flex:1;background:#fff;border:1px solid #E8D9B5;border-radius:12px;padding:14px;text-align:center}
        .kpi .v{font-family:'Amiri',serif;font-size:22px;font-weight:700;color:#8a6d28}
        .kpi .l{font-size:12px;color:#6B6355;margin-top:4px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th,td{text-align:right;padding:8px 12px;border-bottom:1px solid #EDE4CE;font-size:14px}
        th{color:#8a6d28;font-size:12px}
        h2{font-family:'Amiri',serif;font-size:17px;margin-top:28px;color:#1B3A3A;border-right:4px solid #C9A24B;padding-right:10px}
        .chart-box{background:#fff;border:1px solid #E8D9B5;border-radius:12px;padding:14px;margin-bottom:10px;text-align:center}
        .smart-box{background:linear-gradient(160deg,#FBF3E4,#fff);border:1px solid #E8D9B5;border-radius:12px;padding:16px;line-height:1.9;font-size:14px;color:#3A342C}
        .footer{margin-top:40px;color:#9A8F78;font-size:11px;text-align:center;border-top:1px solid #EDE4CE;padding-top:14px}
        .back-btn{position:fixed;top:14px;left:14px;z-index:999;display:flex;align-items:center;gap:6px;background:#8a6d28;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.2)}
        @media print{ body{padding-top:40px} .back-btn{display:none !important} }
      </style></head><body>
      <button class="back-btn" onclick="window.close(); setTimeout(function(){ window.location.href='${appUrl}'; }, 250);">✕ إغلاق والعودة لمسار</button>
      <div class="brand"><img src="${logoUrl}" alt="مسار" /><span>مسار</span></div>
      <h1>تقرير ${rangeLabel}</h1>
      <div class="meta">الفترة: من ${periodStart} إلى ${periodEnd}${profile?.about ? " · " + escapeHtml(profile.about) : ""}</div>
      <div class="kpis">
        <div class="kpi"><div class="v">${fmtHM(totalMin)}</div><div class="l">إجمالي الوقت المسجّل</div></div>
        <div class="kpi"><div class="v">${activeDays}</div><div class="l">أيام نشطة</div></div>
        <div class="kpi"><div class="v">${fmtHM(studyTotalMin)}</div><div class="l">وقت الدراسة</div></div>
      </div>
      <h2>الساعات اليومية</h2>
      <div class="chart-box">${chartSvg}</div>
      <h2>توزيع الأنشطة</h2>
      <table><tr><th>الفئة</th><th>الوقت</th></tr>${catRows || '<tr><td colspan=2>لا بيانات</td></tr>'}</table>
      ${(sleepAvgHours !== null || nutritionActiveDays > 0) ? `<h2>الصحة والتغذية</h2><div class="kpis">
        ${sleepAvgHours !== null ? `<div class="kpi"><div class="v">${sleepAvgHours.toFixed(1)} س</div><div class="l">متوسط النوم</div></div>` : ""}
        ${nutritionActiveDays > 0 ? `<div class="kpi"><div class="v">${nutritionAvgCalories}</div><div class="l">متوسط السعرات اليومي</div></div>` : ""}
      </div>` : ""}
      ${smartTip ? `<h2>توصية مسار الذكية</h2><div class="smart-box">${escapeHtml(isolateNumbers(smartTip))}</div>` : ""}
      <div class="footer">مسار · أداتك الشخصية للوقت وتطوير الذات · صدر بتاريخ ${arabicDate(todayKey(), { day: "numeric", month: "long", year: "numeric" })}</div>
      </body></html>`;
    // فرع إنجليزي مواز كامل - نفس البنية والـCSS تماماً لكن بخصائص منطقية
    // معكوسة (LTR بدل RTL: border-left/padding-left بدل right، محاذاة نص
    // يسارية، وزر الإغلاق في أقصى اليمين بدل اليسار)، وكل النصوص من مساحة
    // أسماء pdfReport.* في ملفات الترجمة.
    const reportTitle = range === "week" ? t("pdfReport.titleWeek") : t("pdfReport.titleMonth");
    const reportHeader = range === "week" ? t("pdfReport.headerWeek") : t("pdfReport.headerMonth");
    const htmlEn = `<!doctype html><html dir="ltr" lang="en"><head><meta charset="utf-8"><title>${reportTitle}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=Amiri:wght@700&display=swap');
        body{font-family:'Tajawal',sans-serif;color:#2B2621;padding:88px 40px 40px;max-width:700px;margin:auto;background:#FBF8F2}
        .brand{display:flex;align-items:center;gap:10px;margin-bottom:14px}
        .brand img{width:34px;height:34px;border-radius:9px}
        .brand span{font-family:'Amiri',serif;font-size:20px;font-weight:700;color:#1B3A3A}
        h1{font-family:'Amiri',serif;color:#8a6d28;border-bottom:2px solid #C9A24B;padding-bottom:10px;margin-top:0}
        .meta{color:#6B6355;font-size:13px;margin-bottom:24px}
        .kpis{display:flex;gap:16px;margin-bottom:24px}
        .kpi{flex:1;background:#fff;border:1px solid #E8D9B5;border-radius:12px;padding:14px;text-align:center}
        .kpi .v{font-family:'Amiri',serif;font-size:22px;font-weight:700;color:#8a6d28}
        .kpi .l{font-size:12px;color:#6B6355;margin-top:4px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #EDE4CE;font-size:14px}
        th{color:#8a6d28;font-size:12px}
        h2{font-family:'Amiri',serif;font-size:17px;margin-top:28px;color:#1B3A3A;border-left:4px solid #C9A24B;padding-left:10px}
        .chart-box{background:#fff;border:1px solid #E8D9B5;border-radius:12px;padding:14px;margin-bottom:10px;text-align:center}
        .smart-box{background:linear-gradient(160deg,#FBF3E4,#fff);border:1px solid #E8D9B5;border-radius:12px;padding:16px;line-height:1.9;font-size:14px;color:#3A342C}
        .footer{margin-top:40px;color:#9A8F78;font-size:11px;text-align:center;border-top:1px solid #EDE4CE;padding-top:14px}
        .back-btn{position:fixed;top:14px;right:14px;z-index:999;display:flex;align-items:center;gap:6px;background:#8a6d28;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.2)}
        @media print{ body{padding-top:40px} .back-btn{display:none !important} }
      </style></head><body>
      <button class="back-btn" onclick="window.close(); setTimeout(function(){ window.location.href='${appUrl}'; }, 250);">${t("pdfReport.closeAndReturn")}</button>
      <div class="brand"><img src="${logoUrl}" alt="Masar" /><span>${t("splash.wordmark")}</span></div>
      <h1>${reportHeader}</h1>
      <div class="meta">${t("pdfReport.period", { start: periodStart, end: periodEnd })}${profile?.about ? " · " + escapeHtml(profile.about) : ""}</div>
      <div class="kpis">
        <div class="kpi"><div class="v">${fmtHM(totalMin, "en")}</div><div class="l">${t("pdfReport.totalTimeLogged")}</div></div>
        <div class="kpi"><div class="v">${activeDays}</div><div class="l">${t("pdfReport.activeDays")}</div></div>
        <div class="kpi"><div class="v">${fmtHM(studyTotalMin, "en")}</div><div class="l">${t("pdfReport.studyTime")}</div></div>
      </div>
      <h2>${t("pdfReport.dailyHours")}</h2>
      <div class="chart-box">${chartSvg}</div>
      <h2>${t("pdfReport.activityBreakdown")}</h2>
      <table><tr><th>${t("pdfReport.category")}</th><th>${t("pdfReport.time")}</th></tr>${catRows || `<tr><td colspan=2>${t("pdfReport.noData")}</td></tr>`}</table>
      ${(sleepAvgHours !== null || nutritionActiveDays > 0) ? `<h2>${t("pdfReport.healthAndNutrition")}</h2><div class="kpis">
        ${sleepAvgHours !== null ? `<div class="kpi"><div class="v">${sleepAvgHours.toFixed(1)} ${t("common.units.hours")}</div><div class="l">${t("pdfReport.averageSleep")}</div></div>` : ""}
        ${nutritionActiveDays > 0 ? `<div class="kpi"><div class="v">${nutritionAvgCalories}</div><div class="l">${t("pdfReport.averageDailyCalories")}</div></div>` : ""}
      </div>` : ""}
      ${smartTip ? `<h2>${t("pdfReport.smartRecommendation")}</h2><div class="smart-box">${escapeHtml(isolateNumbers(smartTip))}</div>` : ""}
      <div class="footer">${t("pdfReport.footer", { date: arabicDate(todayKey(), { day: "numeric", month: "long", year: "numeric" }, "en-US") })}</div>
      </body></html>`;
    const html = isEn ? htmlEn : htmlAr;
    const w = window.open("", "_blank");
    if (!w) { showToast(t("reportsView.popupBlocked")); setExporting(false); return; }
    w.document.write(html); w.document.close();
    setExporting(false);
    setTimeout(() => { w.focus(); w.print(); }, 600);
  }

  function renderTrendBadge(trend) {
    if (trend.isNew) return <span style={{ ...RS.trendBadge, ...RS.trendUp }}><TrendingUp size={12} /> {t("reportsView.comprehensive.trendNew")}</span>;
    if (trend.direction === "flat") return <span style={{ ...RS.trendBadge, ...RS.trendFlat }}><Minus size={12} /> {t("reportsView.comprehensive.trendFlat")}</span>;
    const Icon = trend.direction === "up" ? TrendingUp : TrendingDown;
    return <span style={{ ...RS.trendBadge, ...(trend.direction === "up" ? RS.trendUp : RS.trendDown) }}><Icon size={12} /> <NumericValue value={trend.pct} unit="%" /></span>;
  }

  return (
    <div style={S.view}>
      <div style={S.reportsHead}>
        <div style={S.sectionTitle}>{t("reportsView.title")}</div>
        {subTab !== "allTime" && (
          <div style={S.rangeToggle}>
            <button onClick={() => setRange("week")} style={{ ...S.rangeBtn, ...(range === "week" ? S.rangeBtnActive : {}) }}>{t("reportsView.rangeWeek")}</button>
            <button onClick={() => setRange("month")} style={{ ...S.rangeBtn, ...(range === "month" ? S.rangeBtnActive : {}) }}>{t("reportsView.rangeMonth")}</button>
          </div>
        )}
      </div>

      <button onClick={exportPdf} disabled={exporting} style={S.exportBtn}>
        {exporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />} {exporting ? t("reportsView.preparingReport") : t("reportsView.exportPdf")}
      </button>

      <div style={S.subTabRow}>
        {REPORT_SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setSubTab(tab.id)} style={{ ...S.subTab, ...(subTab === tab.id ? S.subTabActive : {}) }} data-tour={tab.id === "comprehensive" ? "reports-tab-comprehensive" : undefined}>
              <Icon size={13} /> {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {subTab === "comprehensive" && (
        !(nutritionLoaded && comprehensiveLoaded) ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Loader2 size={20} className="spin" color="#C9A24B" /></div>
        ) : (
          <>
            <div style={RS.sectionBlock}>
              <div style={RS.sectionHeading}><Dumbbell size={14} /> {t("reportsView.comprehensive.fitnessTitle")}</div>
              <div style={RS.miniStatGrid}>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.comprehensive.workoutsCompleted")}</div><div style={RS.miniStatValue}><NumericValue value={fitnessDaysInRange.length} /></div></div>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.comprehensive.exercisesTrained")}</div><div style={RS.miniStatValue}><NumericValue value={distinctExercisesTrained} /></div></div>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.comprehensive.setsLogged")}</div><div style={RS.miniStatValue}><NumericValue value={workoutLogInRange.length} /></div></div>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.comprehensive.trainingVolume")}</div><div style={RS.miniStatValue}>{totalTrainingVolume > 0 ? isolateNumbers(`${formatNumberLatin(Math.round(totalTrainingVolume), language)} ${t("fitness.volumeUnit")}`) : "—"}</div></div>
              </div>
            </div>

            <div style={RS.sectionBlock}>
              <div style={RS.sectionHeading}><Utensils size={14} /> {t("reportsView.comprehensive.nutritionTitle")}</div>
              {nutritionActiveDays === 0 ? <div style={S.emptyHint}>{t("reportsView.noNutritionDataYet")}</div> : (
                <>
                  <div style={RS.miniStatGrid}>
                    <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.averageCalories")}</div><div style={RS.miniStatValue}><NumericValue value={nutritionAvgCalories} unit="kcal" /></div></div>
                    <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.protein")}</div><div style={RS.miniStatValue}><NumericValue value={nutritionAvgProtein} unit="g" /></div></div>
                    <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.carbs")}</div><div style={RS.miniStatValue}><NumericValue value={nutritionAvgCarbs} unit="g" /></div></div>
                    <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.fat")}</div><div style={RS.miniStatValue}><NumericValue value={nutritionAvgFat} unit="g" /></div></div>
                    <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("common.units.fiber")}</div><div style={RS.miniStatValue}><NumericValue value={nutritionAvgFiber} unit="g" /></div></div>
                    <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.comprehensive.avgWater")}</div><div style={RS.miniStatValue}>{waterDaysLogged > 0 ? <NumericValue value={Math.round(avgWaterCups * 10) / 10} unit={t("nutrition.unitOptions.cup")} /> : "—"}</div></div>
                    <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.avgSodium")}</div><div style={RS.miniStatValue}><NumericValue value={nutritionAvgSodium} unit="mg" /></div></div>
                    <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.avgCholesterol")}</div><div style={RS.miniStatValue}><NumericValue value={nutritionAvgCholesterol} unit="mg" /></div></div>
                  </div>
                  {(nutritionAvgSodium > 0 || nutritionAvgCholesterol > 0) && (
                    <div style={{ fontSize: 10.5, color: "var(--muted2)", marginTop: 8, lineHeight: 1.5 }}>
                      {t("reportsView.sodiumCholesterolNote")}
                    </div>
                  )}
                  {topMicronutrients.length > 0 && (
                    <div style={RS.microChipRow}>
                      {topMicronutrients.map((m) => (
                        <span key={m.key} style={RS.microChip}>{m.approx ? "≈ " : ""}{t(`nutrition.micronutrients.${m.key}`)}: <NumericValue value={m.avgPerDay} unit={t(`common.units.${m.unit}`)} /></span>
                      ))}
                    </div>
                  )}
                  {mealPatterns && (mealPatterns.daysWithoutBreakfastCount > 0 || mealPatterns.lowCalorieMeal || mealPatterns.lowProteinMeal) && (
                    <div style={{ ...S.tipBox, marginTop: 10, flexDirection: "column", gap: 6, alignItems: "stretch" }}>
                      {mealPatterns.daysWithoutBreakfastCount > 0 && (
                        <span>{isolateNumbers(t("reportsView.noBreakfastPattern", { count: mealPatterns.daysWithoutBreakfastCount, total: mealPatterns.loggedDaysCount }))}</span>
                      )}
                      {mealPatterns.lowCalorieMeal && (
                        <span>{t("reportsView.lowCalorieMealPattern", { meal: t(`nutrition.mealTypes.${mealPatterns.lowCalorieMeal.mealType}`) })}</span>
                      )}
                      {mealPatterns.lowProteinMeal && (
                        <span>{t("reportsView.lowProteinMealPattern", { meal: t(`nutrition.mealTypes.${mealPatterns.lowProteinMeal.mealType}`) })}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={RS.sectionBlock}>
              <div style={RS.sectionHeading}><Clock size={14} /> {t("reportsView.comprehensive.timeTitle")}</div>
              <div style={RS.miniStatGrid}>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.total")}</div><div style={RS.miniStatValue}>{isolateNumbers(fmtHM(totalMin, language))}</div></div>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.totalStudyTime")}</div><div style={RS.miniStatValue}>{isolateNumbers(fmtHM(studyTotalMin, language))}</div></div>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.comprehensive.tasksCompleted")}</div><div style={RS.miniStatValue}><NumericValue value={tasksCompletedCount} /></div></div>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.comprehensive.tasksMissed")}</div><div style={RS.miniStatValue}><NumericValue value={tasksMissedCount} /></div></div>
              </div>
            </div>

            <div style={RS.sectionBlock}>
              <div style={RS.sectionHeading}><Target size={14} /> {t("reportsView.comprehensive.goalsTitle")}</div>
              <div style={RS.miniStatGrid}>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("goals.achievedBadge")}</div><div style={RS.miniStatValue}><NumericValue value={goalsDoneCount} /></div></div>
                <div style={RS.miniStatCard}><div style={RS.miniStatLabel}>{t("reportsView.comprehensive.goalsActive")}</div><div style={RS.miniStatValue}><NumericValue value={goalsActiveCount} /></div></div>
              </div>
              {goalsProgressPct != null ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12.5, color: "var(--ink-soft)" }}>
                    <span>{t("reportsView.comprehensive.goalsProgress")}</span>
                    <NumericValue value={goalsProgressPct} unit="%" />
                  </div>
                  <div style={RS.goalsProgressTrack}><div style={{ ...RS.goalsProgressFill, width: `${goalsProgressPct}%` }} /></div>
                </>
              ) : (
                <div style={S.emptyHint}>{t("reportsView.comprehensive.noGoalsResolved")}</div>
              )}
            </div>

            <div style={RS.sectionBlock}>
              <div style={RS.sectionHeading}><Flame size={14} /> {t("reportsView.comprehensive.consistencyTitle")}</div>
              <div style={{ ...S.kpiRow, marginBottom: 10 }}>
                <div style={S.kpiCard}><div style={S.kpiValue}><NumericValue value={activeDays} /></div><div style={S.kpiLabel}>{t("reportsView.activeDays")}</div></div>
              </div>
              <div style={RS.streakGrid}>
                <div style={RS.streakCard}><div style={RS.streakValue}><NumericValue value={workoutStreak} /></div><div style={RS.streakLabel}>{t("reportsView.comprehensive.workoutStreak")}</div></div>
                <div style={RS.streakCard}><div style={RS.streakValue}><NumericValue value={nutritionLoggingStreak} /></div><div style={RS.streakLabel}>{t("reportsView.comprehensive.nutritionStreak")}</div></div>
                <div style={RS.streakCard}><div style={RS.streakValue}><NumericValue value={taskCompletionStreak} /></div><div style={RS.streakLabel}>{t("reportsView.comprehensive.taskStreak")}</div></div>
              </div>
            </div>

            <div style={RS.sectionBlock}>
              <div style={RS.sectionHeading}><TrendingUp size={14} /> {t("reportsView.comprehensive.trendsTitle")}</div>
              <div style={S.chartCard}>
                {trends.map((tr) => (
                  <div key={tr.key} style={RS.trendRow}>
                    <span style={RS.trendLabel}>{t(tr.labelKey)}</span>
                    {renderTrendBadge(tr)}
                  </div>
                ))}
              </div>
            </div>

            <div style={RS.sectionBlock}>
              <div style={RS.insightCard}>
                <div style={RS.insightHead}>
                  <div style={RS.insightIcon}><Sparkles size={16} color="var(--on-accent)" /></div>
                  <div style={RS.insightTitle}>{t("reportsView.comprehensive.insightTitle")}</div>
                </div>
                {insightLoading ? (
                  <p style={{ ...RS.insightText, color: "var(--muted2)" }}><Loader2 size={14} className="spin" style={{ marginInlineEnd: 6 }} />{t("reportsView.comprehensive.insightLoading")}</p>
                ) : insightText ? (
                  <p style={RS.insightText}>{isolateNumbers(insightText)}</p>
                ) : (
                  <p style={{ ...RS.insightText, color: "var(--muted2)" }}>{insightError ? t("reportsView.comprehensive.insightFailed") : t("reportsView.comprehensive.insightEmpty")}</p>
                )}
                <button onClick={generateInsight} disabled={insightLoading} style={{ ...S.saveBtn, marginTop: 12, marginBottom: 0 }}>
                  <Sparkles size={14} /> {insightText ? t("reportsView.comprehensive.refreshInsightBtn") : t("reportsView.comprehensive.getInsightBtn")}
                </button>
              </div>
            </div>
          </>
        )
      )}

      {subTab === "overview" && (
        <>
          <div style={S.kpiRow}>
            <div style={S.kpiCard}><div style={S.kpiValue}>{isolateNumbers(fmtHM(totalMin, language))}</div><div style={S.kpiLabel}>{t("reportsView.total")}</div></div>
            <div style={S.kpiCard}><div style={S.kpiValue}><NumericValue value={activeDays} /></div><div style={S.kpiLabel}>{t("reportsView.activeDays")}</div></div>
            <div style={S.kpiCard}><div style={S.kpiValue}>{isolateNumbers(fmtHM(avgPerActiveDay, language))}</div><div style={S.kpiLabel}>{t("reportsView.dailyAverage")}</div></div>
          </div>
          <div style={S.chartCard}>
            <div style={S.chartTitle}>{range === "week" ? t("reportsView.dailyHours") : t("reportsView.hoursThisMonth")}</div>
            {!RC ? <ChartLoading /> : totalMin === 0 ? <div style={S.emptyHint}>{t("common.states.noDataYet")}</div> : (
              <RC.ResponsiveContainer width="100%" height={190}>
                <RC.BarChart data={barData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repOverviewBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E0B868" />
                      <stop offset="100%" stopColor="#9A7529" />
                    </linearGradient>
                  </defs>
                  <RC.CartesianGrid strokeDasharray="2 4" stroke="var(--surface-raised)" vertical={false} />
                  <RC.XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} interval={range === "week" ? 0 : 3} />
                  <RC.YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RC.Tooltip cursor={{ fill: "rgba(201,162,75,0.08)" }} contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ${t("common.units.hours")}`, ""]} />
                  <RC.Bar dataKey="hours" radius={[3, 3, 3, 3]} fill="url(#repOverviewBar)" maxBarSize={range === "week" ? 28 : 12} isAnimationActive={!reduceMotion} animationDuration={450} />
                </RC.BarChart>
              </RC.ResponsiveContainer>
            )}
          </div>
          <div style={S.chartCard}>
            <div style={S.chartTitle}>{t("reportsView.activityBreakdown")}</div>
            {!RC ? <ChartLoading /> : catTotals.length === 0 ? <div style={S.emptyHint}>{t("common.states.noDataYet")}</div> : (
              <div style={S.pieRow}>
                <RC.ResponsiveContainer width={140} height={140}>
                  <RC.PieChart>
                    <RC.Pie data={catTotals} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none" isAnimationActive={!reduceMotion} animationDuration={450}>
                      {catTotals.map((c, i) => <RC.Cell key={i} fill={c.color} />)}
                    </RC.Pie>
                    <RC.Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v, n) => [fmtHM(v, language), n]} />
                  </RC.PieChart>
                </RC.ResponsiveContainer>
                <div style={S.pieLegend}>
                  {catTotals.map((c, i) => (
                    <div key={i} style={S.legendChip}><span style={{ ...S.legendDot, background: c.color }} /><span>{c.name}</span><span style={S.legendMins}>{fmtHM(c.value, language)}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div style={S.chartCard}>
            <div style={S.chartTitle}>{t("reportsView.productivityTrend")}</div>
            {!RC ? <ChartLoading /> : totalMin === 0 ? <div style={S.emptyHint}>{t("common.states.noDataYet")}</div> : (
              <RC.ResponsiveContainer width="100%" height={150}>
                <RC.LineChart data={barData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repTrendLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#9A7529" />
                      <stop offset="100%" stopColor="#E0B868" />
                    </linearGradient>
                  </defs>
                  <RC.CartesianGrid strokeDasharray="2 4" stroke="var(--surface-raised)" vertical={false} />
                  <RC.XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} interval={range === "week" ? 0 : 3} />
                  <RC.YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RC.Tooltip cursor={{ stroke: "var(--border2)" }} contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ${t("common.units.hours")}`, ""]} />
                  <RC.Line type="monotone" dataKey="hours" stroke="url(#repTrendLine)" strokeWidth={2.5} dot={{ fill: "#C9A24B", r: range === "week" ? 3 : 0 }} isAnimationActive={!reduceMotion} animationDuration={450} />
                </RC.LineChart>
              </RC.ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {subTab === "study" && (
        <>
          <div style={S.kpiRow}>
            <div style={S.kpiCard}><div style={S.kpiValue}>{isolateNumbers(fmtHM(studyTotalMin, language))}</div><div style={S.kpiLabel}>{t("reportsView.totalStudyTime")}</div></div>
            <div style={S.kpiCard}><div style={S.kpiValue}><NumericValue value={studySessions} /></div><div style={S.kpiLabel}>{t("reportsView.sessions")}</div></div>
            <div style={S.kpiCard}><div style={S.kpiValue}>{isolateNumbers(fmtHM(studyAvgPerActiveDay, language))}</div><div style={S.kpiLabel}>{t("reportsView.dailyAverage")}</div></div>
          </div>
          <div style={S.chartCard}>
            <div style={S.chartTitle}>{range === "week" ? t("reportsView.dailyStudyMinutes") : t("reportsView.studyMinutesThisMonth")}</div>
            {!RC ? <ChartLoading /> : studyTotalMin === 0 ? <div style={S.emptyHint}>{t("reportsView.noStudyDataYet")}</div> : (
              <RC.ResponsiveContainer width="100%" height={190}>
                <RC.BarChart data={studyBarData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="repStudyBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7FC4BC" />
                      <stop offset="100%" stopColor="#1B3A3A" />
                    </linearGradient>
                  </defs>
                  <RC.CartesianGrid strokeDasharray="2 4" stroke="var(--surface-raised)" vertical={false} />
                  <RC.XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} interval={range === "week" ? 0 : 3} />
                  <RC.YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <RC.Tooltip cursor={{ fill: "rgba(95,168,160,0.08)" }} contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [fmtHM(v, language), ""]} />
                  <RC.Bar dataKey="minutes" radius={[3, 3, 3, 3]} fill="url(#repStudyBar)" maxBarSize={range === "week" ? 28 : 12} isAnimationActive={!reduceMotion} animationDuration={450} />
                </RC.BarChart>
              </RC.ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {subTab === "health" && (
        <SleepSection sleepLog={sleepLog} setSleepLog={setSleepLog} days={days} range={range} showToast={showToast} />
      )}

      {subTab === "nutrition" && (
        !nutritionLoaded ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Loader2 size={20} className="spin" color="#C9A24B" /></div>
        ) : (
          <>
            <div style={S.kpiRow}>
              <div style={S.kpiCard}><div style={S.kpiValue}>{nutritionAvgCalories ? <NumericValue value={nutritionAvgCalories} /> : "—"}</div><div style={S.kpiLabel}>{t("reportsView.averageCalories")}</div></div>
              <div style={S.kpiCard}><div style={S.kpiValue}><NumericValue value={nutritionActiveDays} /></div><div style={S.kpiLabel}>{t("reportsView.loggedDays")}</div></div>
              <div style={S.kpiCard}><div style={S.kpiValue}>{healthProfile?.tee ? <NumericValue value={Math.round(healthProfile.tee)} /> : "—"}</div><div style={S.kpiLabel}>{t("reportsView.dailyGoalTee")}</div></div>
            </div>
            <div style={S.chartCard}>
              <div style={S.chartTitle}>{range === "week" ? t("reportsView.dailyCalories") : t("reportsView.caloriesThisMonth")}</div>
              {!RC ? <ChartLoading /> : nutritionActiveDays === 0 ? <div style={S.emptyHint}>{t("reportsView.noNutritionDataYet")}</div> : (
                <RC.ResponsiveContainer width="100%" height={190}>
                  <RC.BarChart data={nutritionByDay} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="repNutritionBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E0B868" />
                        <stop offset="100%" stopColor="#9A7529" />
                      </linearGradient>
                    </defs>
                    <RC.CartesianGrid strokeDasharray="2 4" stroke="var(--surface-raised)" vertical={false} />
                    <RC.XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} interval={range === "week" ? 0 : 3} />
                    <RC.YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <RC.Tooltip cursor={{ fill: "rgba(201,162,75,0.08)" }} contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ${t("common.units.kcal")}`, ""]} />
                    <RC.Bar dataKey="calories" radius={[3, 3, 3, 3]} fill="url(#repNutritionBar)" maxBarSize={range === "week" ? 28 : 12} isAnimationActive={!reduceMotion} animationDuration={450} />
                  </RC.BarChart>
                </RC.ResponsiveContainer>
              )}
            </div>
            <div style={S.chartCard}>
              <div style={S.chartTitle}>{t("reportsView.macroBreakdown")}</div>
              {!RC ? <ChartLoading /> : macroData.length === 0 ? <div style={S.emptyHint}>{t("common.states.noDataYet")}</div> : (
                <div style={S.pieRow}>
                  <RC.ResponsiveContainer width={140} height={140}>
                    <RC.PieChart>
                      <RC.Pie data={macroData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none" isAnimationActive={!reduceMotion} animationDuration={450}>
                        {macroData.map((c, i) => <RC.Cell key={i} fill={c.color} />)}
                      </RC.Pie>
                      <RC.Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v, n) => [`${v}${t("common.units.g")}`, n]} />
                    </RC.PieChart>
                  </RC.ResponsiveContainer>
                  <div style={S.pieLegend}>
                    {macroData.map((c, i) => (
                      <div key={i} style={S.legendChip}><span style={{ ...S.legendDot, background: c.color }} /><span>{c.name}</span><span style={S.legendMins}>{c.value}{t("common.units.g")}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={S.chartCard}>
              <div style={S.chartTitle}>{t("reportsView.mealTypeDistribution")}</div>
              {!RC ? <ChartLoading /> : nutritionActiveDays === 0 ? <div style={S.emptyHint}>{t("reportsView.noNutritionDataYet")}</div> : (
                <>
                  <RC.ResponsiveContainer width="100%" height={170}>
                    <RC.BarChart data={mealTypeChartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="repMealTypeBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8FBFA8" />
                          <stop offset="100%" stopColor="#3E7E78" />
                        </linearGradient>
                      </defs>
                      <RC.CartesianGrid strokeDasharray="2 4" stroke="var(--surface-raised)" vertical={false} />
                      <RC.XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} />
                      <RC.YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RC.Tooltip
                        cursor={{ fill: "rgba(95,168,160,0.08)" }}
                        contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }}
                        formatter={(v, n, p) => [isolateNumbers(`${v} ${t("common.units.kcal")} · ${t("reportsView.mealLoggedDays", { n: p.payload.daysLogged })}`), ""]}
                      />
                      <RC.Bar dataKey="avgCalories" radius={[3, 3, 3, 3]} fill="url(#repMealTypeBar)" maxBarSize={40} isAnimationActive={!reduceMotion} animationDuration={450} />
                    </RC.BarChart>
                  </RC.ResponsiveContainer>
                  <div style={S.emptyHint}>{isolateNumbers(t("reportsView.mealTypeDistributionNote", { n: days.length }))}</div>
                  {mealPatterns && (mealPatterns.daysWithoutBreakfastCount > 0 || mealPatterns.lowCalorieMeal || mealPatterns.lowProteinMeal) && (
                    <div style={{ ...S.tipBox, marginTop: 10, flexDirection: "column", gap: 6, alignItems: "stretch" }}>
                      {mealPatterns.daysWithoutBreakfastCount > 0 && (
                        <span>{isolateNumbers(t("reportsView.noBreakfastPattern", { count: mealPatterns.daysWithoutBreakfastCount, total: mealPatterns.loggedDaysCount }))}</span>
                      )}
                      {mealPatterns.lowCalorieMeal && (
                        <span>{t("reportsView.lowCalorieMealPattern", { meal: t(`nutrition.mealTypes.${mealPatterns.lowCalorieMeal.mealType}`) })}</span>
                      )}
                      {mealPatterns.lowProteinMeal && (
                        <span>{t("reportsView.lowProteinMealPattern", { meal: t(`nutrition.mealTypes.${mealPatterns.lowProteinMeal.mealType}`) })}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )
      )}

      {subTab === "allTime" && (
        !comprehensiveLoaded ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 30 }}><Loader2 size={20} className="spin" color="#C9A24B" /></div>
        ) : (
          <>
            <div style={RS.journeyHero}>
              <Trophy size={28} color="var(--gold)" />
              <div style={{ ...RS.journeyHeroValue, marginTop: 8 }}><NumericValue value={allTimeStats.longestWorkoutStreak} unit={t("reportsView.comprehensive.daysUnit")} /></div>
              <div style={RS.journeyHeroLabel}>{t("reportsView.allTime.longestStreak")}</div>
            </div>

            <div style={RS.journeyGrid}>
              <div style={RS.journeyCard}><div style={RS.journeyCardValue}><NumericValue value={allTimeStats.totalWorkouts} /></div><div style={RS.journeyCardLabel}>{t("reportsView.allTime.totalWorkouts")}</div></div>
              <div style={RS.journeyCard}><div style={RS.journeyCardValue}><NumericValue value={allTimeStats.activeDaysAllTime} /></div><div style={RS.journeyCardLabel}>{t("reportsView.allTime.totalActiveDays")}</div></div>
              <div style={RS.journeyCard}><div style={RS.journeyCardValue}><NumericValue value={allTimeStats.totalTasksCompleted} /></div><div style={RS.journeyCardLabel}>{t("reportsView.allTime.totalTasksCompleted")}</div></div>
              <div style={RS.journeyCard}><div style={RS.journeyCardValue}><NumericValue value={allTimeStats.totalMealsLogged} /></div><div style={RS.journeyCardLabel}>{t("reportsView.allTime.totalMealsLogged")}</div></div>
            </div>

            <div style={{ ...S.chartCard, marginTop: 14 }}>
              <div style={S.chartTitle}>{t("reportsView.allTime.bestWeekTitle")}</div>
              {allTimeStats.bestWeek ? (
                <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                  {isolateNumbers(t("reportsView.allTime.bestWeekValue", {
                    date: arabicDate(allTimeStats.bestWeek.start, { day: "numeric", month: "long" }, language === "en" ? "en-US" : undefined),
                    volume: formatNumberLatin(allTimeStats.bestWeek.volume, language),
                    unit: t("fitness.volumeUnit"),
                  }))}
                </div>
              ) : (
                <div style={S.emptyHint}>{t("common.states.noDataYet")}</div>
              )}
            </div>

            <p style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.6, marginTop: 4 }}>{t("reportsView.allTime.mealsScopeNote")}</p>
          </>
        )
      )}

      {reportsTour.step === 1 && (
        <SpotlightTour
          steps={[{ target: '[data-tour="reports-tab-comprehensive"]', interactive: true, title: t("onboarding.reportsTour.step1Title"), body: t("onboarding.reportsTour.step1Body") }]}
          stepIndex={0}
          onNext={reportsTour.finish}
          onSkip={reportsTour.finish}
          onFinish={reportsTour.finish}
          labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), tapHere: t("onboarding.tapHere") }}
        />
      )}
    </div>
  );
}

function SleepSection({ sleepLog, setSleepLog, days, range, showToast }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const RC = useRecharts();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState("hours"); // 'hours' | 'times'
  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [hoursInput, setHoursInput] = useState("7.5");

  const today = localDayKey();
  const todayEntry = sleepLog.find((s) => s.date === today);

  async function submitEntry() {
    let hours, sTime = null, wTime = null;
    if (mode === "times") {
      hours = +(diffMinutes(sleepTime, wakeTime) / 60).toFixed(2);
      sTime = sleepTime; wTime = wakeTime;
    } else {
      hours = parseFloat(hoursInput);
    }
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) { showToast(t("sleep.invalidHours")); return; }
    const existing = sleepLog.find((s) => s.date === today);
    const entry = { id: existing ? existing.id : uid(), date: today, sleepTime: sTime, wakeTime: wTime, hours };
    const prevLog = sleepLog;
    setSleepLog((prev) => existing ? prev.map((s) => (s.date === today ? entry : s)) : [entry, ...prev]);
    const ok = await store.saveSleepEntry(entry);
    if (ok) showToast(t("sleep.logged"));
    else { setSleepLog(prevLog); showToast(t("common.errors.saveFailed")); }
  }

  const rangeEntries = useMemo(() => sleepLog.filter((s) => days.includes(s.date)), [sleepLog, days]);
  const avgHours = rangeEntries.length ? rangeEntries.reduce((sum, s) => sum + s.hours, 0) / rangeEntries.length : null;
  const typicalBedtime = useMemo(() => {
    const bedtimes = rangeEntries.filter((s) => s.sleepTime).map((s) => s.sleepTime);
    if (!bedtimes.length) return null;
    const counts = {};
    bedtimes.forEach((t) => { counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [rangeEntries]);

  // إطار تحفيزي فقط: نحتفي بالنوم الكافي، ونشجّع بلطف دون أي لوم عندما
  // يكون النوم أقل أو أكثر من المعتاد — لا رسالة تحذيرية إطلاقاً.
  const rating = avgHours === null ? null
    : (avgHours >= 7 && avgHours <= 9) ? { label: t("sleep.excellentSleep"), emoji: "👏" }
    : { label: t("sleep.tryCloserTo"), emoji: "🌙" };

  const chartData = days.map((day) => {
    const e = sleepLog.find((s) => s.date === day);
    return {
      day,
      label: range === "week" ? arabicDate(day, { weekday: "short" }, language === "en" ? "en-US" : undefined) : arabicDate(day, { day: "numeric" }, language === "en" ? "en-US" : undefined),
      hours: e ? e.hours : 0,
    };
  });

  return (
    <div style={S.chartCard}>
      <div style={S.chartTitle}>{t("sleep.chartTitle")}</div>

      <div style={S.rangeToggle}>
        <button onClick={() => setMode("hours")} style={{ ...S.rangeBtn, flex: 1, ...(mode === "hours" ? S.rangeBtnActive : {}) }}>{t("sleep.hoursCount")}</button>
        <button onClick={() => setMode("times")} style={{ ...S.rangeBtn, flex: 1, ...(mode === "times" ? S.rangeBtnActive : {}) }}>{t("sleep.sleepWakeTimes")}</button>
      </div>

      {mode === "hours" ? (
        <>
          <label style={S.label}>{t("sleep.howManyHours")}</label>
          <input type="number" step="0.25" min="0" max="24" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
        </>
      ) : (
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>{t("sleep.bedtime")}</label>
            <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>{t("sleep.wakeTime")}</label>
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
          </div>
        </div>
      )}
      <button onClick={submitEntry} style={{ ...S.saveBtn, marginTop: 12 }}>{todayEntry ? t("sleep.updateLastNight") : t("sleep.logLastNight")}</button>

      <div style={{ ...S.kpiRow, marginTop: 16 }}>
        <div style={S.kpiCard}>
          <div style={S.kpiValue}>{avgHours === null ? "—" : isolateNumbers(`${avgHours.toFixed(1)} ${t("common.units.hours")}`)}</div>
          <div style={S.kpiLabel}>{t("sleep.averageSleep")}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiValue}>{typicalBedtime ? isolateNumbers(to12h(typicalBedtime)) : "—"}</div>
          <div style={S.kpiLabel}>{t("sleep.usualBedtime")}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiValue}>{rating ? rating.emoji : "—"}</div>
          <div style={S.kpiLabel}>{rating ? rating.label : t("sleep.logToSeeResult")}</div>
        </div>
      </div>

      {!RC ? <ChartLoading /> : (
        <RC.ResponsiveContainer width="100%" height={150}>
          <RC.BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <RC.CartesianGrid strokeDasharray="2 4" stroke="var(--surface-raised)" vertical={false} />
            <RC.XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} interval={range === "week" ? 0 : 3} />
            <RC.YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <RC.Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ${t("common.units.hours")}`, ""]} />
            <RC.Bar dataKey="hours" radius={[3, 3, 3, 3]} fill="#5FA8A0" maxBarSize={range === "week" ? 28 : 12} isAnimationActive={!reduceMotion} animationDuration={450} />
          </RC.BarChart>
        </RC.ResponsiveContainer>
      )}
    </div>
  );
}

function AssistantView({ entries, tasks, categories, focus, prayerLog, religious, profile, setProfile, stats, setView, healthProfile, goals, showToast, journeyActive }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const today = todayKey();
  const hasIdentity = !!(profile?.hobbies?.trim() || profile?.about?.trim());

  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // جولة المساعد السياقية (Onboarding - Phase D): تظهر فقط عندما تكون
  // شرائح الأسئلة الجاهزة معروضة فعلاً (لا محادثة سابقة بعد) - تفاعلية على
  // أول شريحة (مثال حقيقي، لا شرح نظري)، ثم تلميح ختامي بعد وصول أول رد فعلي.
  const assistantTour = useModuleTour("ai", profile, setProfile, { active: hasIdentity && !loadingHistory && messages.length === 0 && !journeyActive });
  const msgCountAtTourStartRef = useRef(0);
  useEffect(() => {
    if (assistantTour.step === 1 && messages.length > msgCountAtTourStartRef.current) assistantTour.setStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantTour.step, messages.length]);

  // بيانات الأقسام غير المحمَّلة مركزياً في MasarApp (الرياضة/التغذية/الماء/
  // الصحة النفسية تتبع نمط "العرض المستقل" نفسه المستخدم في صفحاتها). تُجلب
  // مرة واحدة فقط عند فتح المساعد (بالتوازي مع تحميل سجل المحادثة، عبر
  // Promise.all بدل استعلامات متتالية) لا عند كل رسالة، حتى لا يُبطئ الإرسال
  // أو يكرر نفس الاستعلامات بلا داعٍ. إن لم تكتمل بعد وقت الإرسال، تُحذف
  // أقسامها من السياق بدل حجب الرسالة.
  const [extra, setExtra] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      store.loadFitnessProfile(), store.loadFitnessLog(),
      store.loadNutritionLog(), store.loadWaterLog(),
      store.loadMentalHealthLog(),
    ]).then(([fitnessProfile, fitnessLog, nutritionLog, waterLog, mentalLog]) => {
      if (!active) return;
      setExtra({ fitnessProfile, fitnessLog, nutritionLog, waterLog, mentalLog });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    store.loadChatMessages().then((msgs) => {
      if (!active) return;
      setMessages(msgs);
      setLoadingHistory(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const buildContext = useCallback(() => {
    const isEn = language === "en";
    const catMap = Object.fromEntries((categories || []).map((c) => [c.id, c.name]));
    const todayEntries = (entries || []).filter((e) => e.date === today);
    const entryLines = todayEntries.map((e) => `${catMap[e.catId] || (isEn ? "activity" : "نشاط")} ${e.start}-${e.end}`).join(isEn ? ", " : "، ") || (isEn ? "None" : "لا يوجد");
    const tasksToday = (tasks || []).filter((tk) => tk.due === today);
    const doneTasks = tasksToday.filter((tk) => tk.done).length;
    const prayersToday = (prayerLog || []).filter((p) => p.date === today).length;
    const religiousDone = (religious || []).filter((r) => r.date === today && r.done).length;

    // آخر 7 أيام تقويمية محلياً (نفس نمط النافذة المتدحرجة المستخدم في
    // قسمي الرياضة والصحة النفسية) — تُستخدم لكل من مجاميع التركيز الأسبوعية
    // وتقدّم الرياضة الأسبوعي وآخر أيام الصحة النفسية المسجّلة.
    const last7 = [];
    { const d = new Date(); for (let i = 0; i < 7; i++) { last7.push(localDayKey(d)); d.setDate(d.getDate() - 1); } }
    const weekFocusMinutes = (focus || []).filter((f) => last7.includes(f.date)).reduce((s, f) => s + (f.minutes || 0), 0);

    const lines = isEn ? [
      `Date: ${arabicDate(today, undefined, "en-US")}`,
      `Today's activities: ${entryLines}`,
      `Tasks: ${doneTasks} of ${tasksToday.length} completed`,
      `Focus/study this week: ${fmtHM(weekFocusMinutes, "en")}`,
      `Prayers logged today: ${prayersToday} of 5`,
      `Religious tasks completed today: ${religiousDone}`,
      `Commitment streak: ${stats?.streak || 0} days`,
      profile?.name?.trim() ? `User's name: ${profile.name.trim()}` : "",
      profile?.field ? `User's field: ${profile.field}` : "",
      profile?.hobbies ? `User's hobbies: ${profile.hobbies}` : "",
      profile?.about ? `About the user: ${profile.about}` : "",
    ] : [
      `التاريخ: ${arabicDate(today)}`,
      `أنشطة اليوم: ${entryLines}`,
      `المهام: ${doneTasks} من ${tasksToday.length} مكتملة`,
      `تركيز/دراسة هذا الأسبوع: ${fmtHM(weekFocusMinutes)}`,
      `الصلوات المسجلة اليوم: ${prayersToday} من 5`,
      `الأعمال الروحية المنجزة اليوم: ${religiousDone}`,
      `سلسلة الالتزام: ${stats?.streak || 0} يوم`,
      profile?.name?.trim() ? `اسم المستخدم: ${profile.name.trim()}` : "",
      profile?.field ? `مجال المستخدم: ${profile.field}` : "",
      profile?.hobbies ? `هوايات المستخدم: ${profile.hobbies}` : "",
      profile?.about ? `عن المستخدم: ${profile.about}` : "",
    ];

    // "أنت": فقط إذا أكمل المستخدم ملفه الصحي فعلاً (BMI محسوب) - لا نفترض
    // شيئاً عن مستخدم لم يستخدم هذا القسم بعد.
    if (healthProfile?.bmi) {
      const activityLabel = healthProfile.activityLevel ? t(`you.activityLevels.${healthProfile.activityLevel}`, "") : "";
      const goalMatch = FITNESS_GOALS.find((g) => g.key === extra?.fitnessProfile?.goal);
      const goalLabel = goalMatch ? (isEn ? goalMatch.nameEn : goalMatch.name) : null;
      lines.push(isEn
        ? `"You" profile: BMI ${healthProfile.bmi} (${healthProfile.bmiCategory})` +
          (goalLabel ? `, goal: ${goalLabel}` : "") +
          (activityLabel ? `, activity level: ${activityLabel}` : "")
        : `ملف "أنت": BMI ${healthProfile.bmi} (${healthProfile.bmiCategory})` +
          (goalLabel ? `، الهدف: ${goalLabel}` : "") +
          (activityLabel ? `، مستوى النشاط: ${activityLabel}` : "")
      );
    }

    if (extra) {
      // التغذية والماء: فقط إذا وُجد TEE محسوب من "أنت" (شرط توفّر بيانات
      // كافية للمقارنة)، بغض النظر عن كون رقم اليوم صفراً (صفر رقم حقيقي
      // وليس افتراضاً).
      if (healthProfile?.tee) {
        const caloriesToday = Math.round(sumNutritionEntries((extra.nutritionLog || []).filter((e) => e.date === today)).calories);
        lines.push(isEn
          ? `Nutrition today: ${caloriesToday} kcal out of ${Math.round(healthProfile.tee)} kcal (TEE)`
          : `التغذية اليوم: ${caloriesToday} سعرة من أصل ${Math.round(healthProfile.tee)} سعرة (TEE)`);
      }
      const goalCups = waterGoalCups(healthProfile?.weightKg);
      if (goalCups) {
        lines.push(isEn
          ? `Water today: ${extra.waterLog?.[today] || 0} of ${goalCups} cups`
          : `الماء اليوم: ${extra.waterLog?.[today] || 0} من ${goalCups} كوب`);
      }

      // الرياضة: فقط إذا أعدّ المستخدم برنامجه فعلاً في هذا القسم.
      if (extra.fitnessProfile?.goal) {
        const weekCompleted = last7.filter((d) => extra.fitnessLog?.[d]).length;
        const goalMatch2 = FITNESS_GOALS.find((g) => g.key === extra.fitnessProfile.goal);
        const goalLabel = goalMatch2 ? (isEn ? goalMatch2.nameEn : goalMatch2.name) : extra.fitnessProfile.goal;
        lines.push(isEn
          ? `Fitness: goal ${goalLabel}, completed ${weekCompleted} of ${extra.fitnessProfile.daysPerWeek} days this week, ` +
            (extra.fitnessLog?.[today] ? "completed today's workout" : "hasn't completed today's workout yet")
          : `الرياضة: هدفه ${goalLabel}، أكمل ${weekCompleted} من ${extra.fitnessProfile.daysPerWeek} أيام هذا الأسبوع، ` +
            (extra.fitnessLog?.[today] ? "أنجز تمرين اليوم" : "لم يُنجز تمرين اليوم بعد")
        );
      }

      // الصحة النفسية: فقط إذا وُجد تسجيل واحد على الأقل ضمن آخر 5 أيام.
      // آخر يوم مسجَّل (وليس بالضرورة أحدث الأيام السبعة) هو ما يُفحص لعلم
      // الخطر، لأنه أحدث ما لدينا فعلياً عن حالة المستخدم.
      const last5 = last7.slice(0, 5);
      const mentalEntries = last5.map((d) => (extra.mentalLog?.[d] ? { date: d, ...extra.mentalLog[d] } : null)).filter(Boolean);
      if (mentalEntries.length > 0) {
        const avg = (key) => Math.round((mentalEntries.reduce((s, e) => s + (e[key] || 0), 0) / mentalEntries.length) * 10) / 10;
        lines.push(isEn
          ? `Mental health (last ${mentalEntries.length} entries): average mood ${avg("mood")}/5, average stress ${avg("stress")}/5, average energy ${avg("energy")}/5`
          : `الصحة النفسية (آخر ${mentalEntries.length} تسجيل/تسجيلات): متوسط المزاج ${avg("mood")}/5، متوسط التوتر ${avg("stress")}/5، متوسط الطاقة ${avg("energy")}/5`);
        if (mentalEntries[0].flaggedRisk) {
          lines.push(isEn
            ? "⚠️ Top-priority alert: the user's latest mental health entry is flagged as a risk state. Handle this with the utmost gentleness and sensitivity regardless of what they ask about, and gently point them to a real source of help if appropriate - never ignore this flag no matter the question."
            : "⚠️ تنبيه أولوية قصوى: آخر تسجيل نفسي للمستخدم مُعلَّم كحالة خطر (flagged risk). تعامل بأقصى درجات اللطف والحساسية بغض النظر عن موضوع سؤاله، ووجّهه بلطف لمصدر مساعدة حقيقي إن كان ذلك مناسباً - لا تتجاهل هذا الإشارة مهما كان السؤال.");
        }
      }
    }

    // الأهداف: فقط الأهداف النشطة فعلياً حالياً.
    const activeGoals = (goals || []).filter((g) => g.status === "active");
    if (activeGoals.length > 0) {
      const goalLines = activeGoals.slice(0, 5).map((g) => `${g.title} (${GOAL_PERIODS[g.period]?.label || g.period}): ${g.checkpointIndex} ${isEn ? "of" : "من"} ${(g.checkpoints || []).length}`).join(isEn ? ", " : "، ");
      lines.push((isEn ? "Active goals: " : "الأهداف النشطة: ") + goalLines);
    }

    return lines.filter(Boolean).join("\n");
  }, [entries, tasks, categories, focus, prayerLog, religious, stats, profile, today, healthProfile, goals, extra, language]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || sending || !hasIdentity) return;
    const userMsg = { id: uid(), role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);
    store.saveChatMessage(userMsg).then((res) => {
      if (!res.ok) showToast?.(t("assistant.saveMsgFailed"));
    });
    try {
      const reply = await coachChat(next, buildContext(), language);
      const botMsg = { id: uid(), role: "assistant", content: reply };
      setMessages([...next, botMsg]);
      store.saveChatMessage(botMsg).then((res) => {
        if (!res.ok) showToast?.(t("assistant.saveReplyFailed"));
      });
    } catch (err) {
      // Transient failures aren't saved — retrying shouldn't clutter the
      // permanent conversation history with dead-end error bubbles.
      console.error("[AssistantView] coachChat failed:", err);
      setMessages([...next, { id: uid(), role: "assistant", content: t(`common.errors.${err.code || "UNKNOWN"}`) }]);
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    const prevMessages = messages;
    setMessages([]);
    const res = await store.clearChatMessages();
    if (!res.ok) { setMessages(prevMessages); showToast?.(t("assistant.clearFailed")); }
  }

  const suggestions = t("assistant.suggestions", { returnObjects: true });

  return (
    <div style={S.view}>
      <div style={HS.wrap}>
        <div style={HS.hero}>
          <div style={HS.heroIcon}><MessageCircle size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={HS.heroTitle}>{t("assistant.heroTitle")}</div>
            <div style={HS.heroSub}>{t("assistant.heroSub")}</div>
          </div>
        </div>

        {!hasIdentity && (
          <div style={S.setupCard} data-tour="identity-setup-card">
            <User size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={S.setupText}>
              {t("assistant.setupNudge")}
              <div>
                <button onClick={() => setView("settings")} style={{ ...S.linkBtn, marginTop: 8 }}>{t("assistant.goToSettings")}</button>
              </div>
            </div>
          </div>
        )}

        {hasIdentity && (
        <div style={HS.chatCard}>
          <div style={{ ...HS.chatHead, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Sparkles size={15} color="#C9A24B" /><span style={HS.chatTitle}>{t("assistant.chatTitle")}</span>
            </div>
            {messages.length > 0 && (
              <button onClick={clearChat} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                <Trash2 size={12} /> {t("assistant.clearConversation")}
              </button>
            )}
          </div>
          <div style={HS.chatScroll} ref={scrollRef}>
            {loadingHistory && (
              <div style={{ ...HS.msgBot, color: "var(--muted2)", display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="spin" /> {t("assistant.loadingHistory")}
              </div>
            )}
            {!loadingHistory && messages.length === 0 && (
              <div style={HS.msgBot}>{t("assistant.emptyWelcome")}</div>
            )}
            {messages.map((m) => (
              <div key={m.id} style={m.role === "user" ? HS.msgUser : HS.msgBot}>{isolateNumbers(m.content)}</div>
            ))}
            {sending && (
              <div style={{ ...HS.msgBot, color: "var(--muted2)", display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="spin" /> {t("assistant.typingIndicator")}
              </div>
            )}
          </div>
          {!loadingHistory && messages.length === 0 && (
            <div style={HS.suggestionRow}>
              {suggestions.map((s, sIdx) => (
                <button key={s} onClick={() => send(s)} style={HS.suggestionChip} data-tour={sIdx === 0 ? "assistant-suggestion-0" : undefined}>{s}</button>
              ))}
            </div>
          )}
          <div style={HS.chatInputRow}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder={t("assistant.inputPlaceholder")}
              style={HS.chatInput}
              disabled={sending}
            />
            <button onClick={() => send()} disabled={sending || !input.trim()} style={{ ...HS.chatSend, ...(sending || !input.trim() ? { opacity: 0.5, cursor: "default" } : {}) }}>
              <Send size={17} />
            </button>
          </div>
        </div>
        )}
      </div>

      {assistantTour.step === 1 && (
        <SpotlightTour
          steps={[{ target: '[data-tour="assistant-suggestion-0"]', interactive: true, title: t("onboarding.aiTour.step1Title"), body: t("onboarding.aiTour.step1Body") }]}
          stepIndex={0}
          onNext={() => assistantTour.setStep(2)}
          onSkip={assistantTour.finish}
          onFinish={assistantTour.finish}
          labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), tapHere: t("onboarding.tapHere") }}
        />
      )}
      {assistantTour.step === 2 && (
        <SpotlightTour
          steps={[{ title: t("onboarding.aiTour.step2Title"), body: t("onboarding.aiTour.step2Body") }]}
          stepIndex={0}
          onNext={assistantTour.finish}
          onSkip={assistantTour.finish}
          onFinish={assistantTour.finish}
          labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), tapHere: t("onboarding.tapHere") }}
        />
      )}
    </div>
  );
}

const RELIGIOUS_PRESETS = [
  { key: "istighfar", title: "الاستغفار 1000 مرة", titleKey: "prayer.presets.istighfar1000Title", targetCount: 1000, targetMinutes: null },
  { key: "quran", title: "قراءة القرآن 30 دقيقة", titleKey: "prayer.presets.quran30Title", targetCount: null, targetMinutes: 30 },
];

// أول الوقت يُحتسب خلال أول ربع ساعة من الأذان — عتبة تحفيزية فقط، لا
// علاقة لها بأي حكم شرعي، تُستخدم لصياغة رسالة مشجّعة عند التبكير.
const PRAYER_ON_TIME_MINUTES = 15;

// صياغات إيجابية فقط بلا أي لوم أو تخويف، سواء صلّى المستخدم في أول
// وقته أو تأخّر قليلاً أو كثيراً — الاحتفاء دائماً بأصل الفعل نفسه.
function prayerTimingMessage(prayerName, minutesAfterAdhan, t) {
  if (minutesAfterAdhan <= PRAYER_ON_TIME_MINUTES) return t("prayer.onTimeToast", { prayer: prayerName });
  return t("prayer.afterAdhanToast", { prayer: prayerName, minutes: minutesAfterAdhan });
}
function prayerTimingNote(minutesAfterAdhan, t) {
  return minutesAfterAdhan <= PRAYER_ON_TIME_MINUTES ? t("prayer.onTimeGeneric") : t("prayer.afterAdhanGeneric", { minutes: minutesAfterAdhan });
}
// المهام الدينية الجاهزة (RELIGIOUS_PRESETS) تُخزَّن بعنوانها الخام وقت
// الإضافة، لكن عرضها لاحقاً يمر دائماً عبر هذه الدالة بدل الاعتماد على
// task.title المخزَّن، حتى يتغيّر العرض مع تبديل اللغة لاحقاً - نفس فكرة
// mandatoryTaskLabel أعلاه لكن لمهام "الصلاة" الدينية الجاهزتين فقط.
function religiousTaskTitle(task, t) {
  if (task.taskKey === "istighfar") return t("prayer.presets.istighfar1000Title");
  if (task.taskKey === "quran") return t("prayer.presets.quran30Title");
  return task.title;
}

function PrayerView({
  prayerLog, setPrayerLog, religious, setReligious,
  azkarLog, setAzkarLog, azkarItems, setAzkarItems, quranProgress, setQuranProgress, istighfar, setIstighfar,
  addPoints, showToast, profile, setProfile,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const prayerName = (id) => t(`prayer.names.${id}`);
  const [now, setNow] = useState(new Date());
  // لا يوجد بعد أي جدولة Push حقيقية لأوقات الصلاة (ستُبنى لاحقاً بعد نجاح
  // اختبار Push الأساسي) - هذا الاحتياطي المحلي (setInterval + Notification
  // مباشرة داخل الصفحة) هو الآلية الوحيدة الفعلية حالياً، فلا ازدواج إشعار
  // ممكن اليوم. يُبنى إذنه على نفس فحص الإذن الحي المستخدم في الإعدادات
  // (Notification.permission) بدل حالة محلية منفصلة تُنسى بعد كل تحميل صفحة.
  const [notifEnabled, setNotifEnabled] = useState(() => {
    try { return typeof Notification !== "undefined" && Notification.permission === "granted"; } catch { return false; }
  });
  const notifiedRef = useRef({});
  const [azkarTab, setAzkarTab] = useState("morning");
  const ISTIGHFAR_TARGET = 1000;

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(iv);
  }, []);

  const prayers = useMemo(() => fivePrayers(now), [now]);
  const next = useMemo(() => nextPrayer(now), [now]);
  const today = todayKey();
  const todayLog = prayerLog.filter((p) => p.date === today);
  const isDone = (id) => todayLog.some((p) => p.prayerId === id);

  useEffect(() => {
    if (!notifEnabled || typeof Notification === "undefined") return;
    const cur = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    for (const p of prayers) {
      if (p.time === cur && !notifiedRef.current[p.id + today]) {
        notifiedRef.current[p.id + today] = true;
        try { new Notification(t("prayer.notificationTitle"), { body: t("prayer.notificationBody", { prayer: prayerName(p.id) }) }); } catch {}
      }
    }
  }, [now, notifEnabled, prayers, today]);

  // يستخدم نفس مسار الإذن/الاشتراك/الحفظ الحقيقي المستخدم في الإعدادات
  // والتغذية (لا طلب إذن منفصل) - الاحتياطي المحلي أعلاه يحتاج فقط الإذن
  // الممنوح ليعمل (granted)، بصرف النظر عن نجاح حفظ اشتراك Push الحقيقي.
  async function enableNotifications() {
    if (typeof Notification === "undefined") { showToast(t("prayer.notSupported")); return; }
    const result = await requestNotificationPermission(language);
    if (result.granted) {
      setNotifEnabled(true);
      const enabled = !!result.saved;
      setProfile?.((p) => ({ ...p, notificationsEnabled: enabled, notificationsAsked: true }));
      await store.saveNotificationsPreference(enabled, true);
      showToast(enabled ? t("prayer.notifEnabled") : t(`common.errors.${result.error || "PUSH_SAVE_FAILED"}`));
    } else {
      setProfile?.((p) => ({ ...p, notificationsAsked: true }));
      await store.saveNotificationsPreference(false, true);
      showToast(result.error ? t(`common.errors.${result.error}`) : t("prayer.notifDenied"));
    }
  }

  async function togglePrayer(p) {
    if (isDone(p.id)) {
      const removed = prayerLog.find((x) => x.date === today && x.prayerId === p.id);
      setPrayerLog((prev) => prev.filter((x) => !(x.date === today && x.prayerId === p.id)));
      const res = await store.removePrayer(today, p.id);
      if (!res.ok) { if (removed) setPrayerLog((prev) => [removed, ...prev]); showToast(t("common.errors.genericRetry")); return; }
      addPoints(-20, t("prayer.undoPrayer", { prayer: prayerName(p.id) }));
    } else {
      const [adhanH, adhanM] = p.time.split(":").map(Number);
      const minutesAfterAdhan = Math.max(0, (now.getHours() * 60 + now.getMinutes()) - (adhanH * 60 + adhanM));
      const entry = { id: uid(), date: today, prayerId: p.id, minutesAfterAdhan };
      setPrayerLog((prev) => [entry, ...prev]);
      const res = await store.savePrayer(entry);
      if (!res.ok) { setPrayerLog((prev) => prev.filter((x) => x.id !== entry.id)); showToast(t("common.errors.saveFailed")); return; }
      addPoints(20);
      playSaveSound();
      showToast(prayerTimingMessage(prayerName(p.id), minutesAfterAdhan, t));
    }
  }

  // نافذة الأسبوع الحالي بالتاريخ المحلي (localDayKey) لا UTC، حتى لا
  // تنزاح إحصائية "هذا الأسبوع" ساعات قرب منتصف الليل كما كان يحدث سابقاً
  // في "بصيرة" قبل إصلاحها لنفس السبب.
  const weekEntries = useMemo(() => {
    const days = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) { days.push(localDayKey(d)); d.setDate(d.getDate() - 1); }
    return prayerLog.filter((p) => days.includes(p.date) && typeof p.minutesAfterAdhan === "number");
  }, [prayerLog, today]);
  const weekOnTimeCount = weekEntries.filter((p) => p.minutesAfterAdhan <= PRAYER_ON_TIME_MINUTES).length;
  const weekOnTimePercent = weekEntries.length > 0 ? Math.round((weekOnTimeCount / weekEntries.length) * 100) : null;

  const todayReligious = religious.filter((r) => r.date === today);
  async function addReligiousPreset(preset) {
    if (todayReligious.some((r) => r.taskKey === preset.key)) { showToast(t("prayer.alreadyAddedToday")); return; }
    const newTask = { id: uid(), date: today, taskKey: preset.key, title: preset.title, targetCount: preset.targetCount, targetMinutes: preset.targetMinutes, minutesSpent: 0, done: false };
    setReligious((prev) => [newTask, ...prev]);
    const res = await store.saveReligious(newTask);
    if (!res.ok) { setReligious((prev) => prev.filter((x) => x.id !== newTask.id)); showToast(t("common.errors.saveFailed")); return; }
    // "missing locale key" لهذا السطر: prayer.taskAddedToast ("Task added" / "أضيفت المهمة")
    showToast(language === "en" ? "Task added" : "أضيفت المهمة");
  }
  async function updateReligious(updated) {
    const prev = religious.find((x) => x.id === updated.id);
    setReligious((prevList) => prevList.map((x) => x.id === updated.id ? updated : x));
    const res = await store.saveReligious(updated);
    if (!res.ok) { if (prev) setReligious((prevList) => prevList.map((x) => x.id === updated.id ? prev : x)); showToast(t("common.errors.saveFailed")); }
  }
  async function removeReligious(id) {
    const removed = religious.find((x) => x.id === id);
    setReligious((prev) => prev.filter((x) => x.id !== id));
    const res = await store.deleteReligious(id);
    if (!res.ok) { if (removed) setReligious((prev) => [...prev, removed]); showToast(t("common.errors.deleteFailed")); }
  }

  const todayAzkar = azkarLog[today] || {};
  const quranDoneCount = Object.values(quranProgress).filter(Boolean).length;
  const todayIstighfar = (istighfar.daily || {})[today] ?? ISTIGHFAR_TARGET;
  const azkarList = azkarTab === "morning" ? AZKAR_MORNING : AZKAR_EVENING;

  async function toggleAzkarItem(itemId, session, allSessionIds) {
    const todayItems = (azkarItems || {})[today] || {};
    const newDone = !todayItems[itemId];
    const newTodayItems = { ...todayItems, [itemId]: newDone };
    const newAzkarItems = { ...(azkarItems || {}), [today]: newTodayItems };
    setAzkarItems(newAzkarItems);
    await store.saveAzkarItem(today, itemId, newDone);
    const wasSessionDone = allSessionIds.every((id) => !!todayItems[id]);
    const isNowSessionDone = allSessionIds.every((id) => !!newTodayItems[id]);
    if (!wasSessionDone && isNowSessionDone) {
      const prevLog = azkarLog;
      const newLog = { ...azkarLog, [today]: { ...todayAzkar, [session]: true } };
      setAzkarLog(newLog);
      const res = await store.saveAzkarLog(today, session, true);
      if (!res.ok) { setAzkarLog(prevLog); showToast(t("common.errors.saveFailed")); return; }
      addPoints(15, t(session === "morning" ? "prayer.azkarLogReasonMorning" : "prayer.azkarLogReasonEvening"));
      showToast(t("prayer.azkarCompleted"));
    } else if (wasSessionDone && !isNowSessionDone && todayAzkar[session]) {
      const prevLog = azkarLog;
      const newLog = { ...azkarLog, [today]: { ...todayAzkar, [session]: false } };
      setAzkarLog(newLog);
      const res = await store.saveAzkarLog(today, session, false);
      if (!res.ok) { setAzkarLog(prevLog); showToast(t("common.errors.saveFailed")); return; }
      addPoints(-15, t("prayer.undoAzkar", { session: t(session === "morning" ? "todayView.morning" : "todayView.evening") }));
    }
  }

  async function toggleJuz(juzNum) {
    const prevProgress = quranProgress;
    const done = !quranProgress[juzNum];
    const next2 = { ...quranProgress, [juzNum]: done };
    setQuranProgress(next2);
    const res = await store.saveQuranJuz(juzNum, done);
    if (!res.ok) { setQuranProgress(prevProgress); showToast(t("common.errors.saveFailed")); return; }
    if (done) { addPoints(20, t("prayer.quranJuzLogReason", { n: juzNum })); showToast(t("prayer.quranJuzCompleted", { n: juzNum })); }
    else addPoints(-20, t("prayer.undoQuranJuz", { n: juzNum }));
  }

  async function toggleQuran30() {
    const prevLog = azkarLog;
    const done = !todayAzkar.quran30;
    const newLog = { ...azkarLog, [today]: { ...todayAzkar, quran30: done } };
    setAzkarLog(newLog);
    const res = await store.saveAzkarLog(today, "quran30", done);
    if (!res.ok) { setAzkarLog(prevLog); showToast(t("common.errors.saveFailed")); return; }
    if (done) { addPoints(15, t("prayer.quran30LogReason")); showToast(t("prayer.quran30Completed")); }
    else addPoints(-15, t("prayer.undoQuran30"));
  }

  async function addIstighfar(amount) {
    const remaining = todayIstighfar;
    if (remaining <= 0) return;
    const prevIstighfar = istighfar;
    const newRemaining = Math.max(0, remaining - amount);
    const newTotal = (istighfar.total || 0) + Math.min(amount, remaining);
    const newData = { daily: { ...(istighfar.daily || {}), [today]: newRemaining }, total: newTotal };
    setIstighfar(newData);
    const res = await store.saveIstighfar(newData);
    if (!res.ok) { setIstighfar(prevIstighfar); showToast(t("common.errors.saveFailed")); return; }
    if (remaining > 0 && newRemaining === 0) {
      addPoints(10, t("prayer.istighfarLogReason")); showToast(t("prayer.istighfarCompleted"));
    }
  }

  async function resetIstighfarDay() {
    const prevIstighfar = istighfar;
    const wasDone = todayIstighfar === 0;
    const newData = { daily: { ...(istighfar.daily || {}), [today]: ISTIGHFAR_TARGET }, total: istighfar.total || 0 };
    setIstighfar(newData);
    const res = await store.saveIstighfar(newData);
    if (!res.ok) { setIstighfar(prevIstighfar); showToast(t("common.errors.genericRetry")); return; }
    if (wasDone) addPoints(-10, t("prayer.istighfarResetReason"));
    showToast(t("prayer.istighfarResetDone"));
  }

  const hh = String(next.minutesUntil ? Math.floor(next.minutesUntil / 60) : 0).padStart(2, "0");
  const mm = String(next.minutesUntil ? next.minutesUntil % 60 : 0).padStart(2, "0");

  return (
    <div style={S.view}>
      <div style={PS.prayerHero}>
        <Moon size={18} color="#C9A24B" />
        <div>
          <div style={PS.prayerHeroTitle}>{t("prayer.headerTitle")}</div>
          <div style={PS.prayerHeroSub}>{arabicDate(today, { weekday: "long", day: "numeric", month: "long" }, language === "en" ? "en-US" : undefined)}</div>
        </div>
      </div>
      <div style={PS.nextPrayerCard} data-tour="prayer-next-card">
        <div style={PS.nextLabel}>{t("prayer.nextPrayer")}</div>
        <div style={PS.nextName}>{prayerName(next.id)}{next.tomorrow ? t("prayer.tomorrow") : ""}</div>
        <div style={PS.nextTime}>{to12h(next.time)}</div>
        <div style={PS.nextCountdown}>{t("prayer.inTime", { hh, mm })}</div>
      </div>
      <div style={PS.weeklyCard}>
        <div style={S.catEditorHeader}><Star size={14} color="#C9A24B" /><span>{t("prayer.weeklyAchievement")}</span></div>
        {weekOnTimePercent === null ? (
          <div style={S.emptyHint}>{t("prayer.logToSeeWeekly")}</div>
        ) : (
          <>
            <div style={PS.weeklyPercentText}>{t("prayer.weekOnTimePercent", { percent: weekOnTimePercent })}</div>
            <div style={PS.weeklyBarTrack}><div style={{ ...PS.weeklyBarFill, width: `${weekOnTimePercent}%` }} /></div>
          </>
        )}
        <div style={PS.weeklyMotivation}>{t("prayer.onTimeHadith")}</div>
      </div>
      {!notifEnabled && (
        <button onClick={enableNotifications} style={PS.notifBtn}><Bell size={15} /> {t("prayer.enableAdhanNotif")}</button>
      )}
      <div style={PS.prayerList}>
        {prayers.map((p, pIdx) => {
          const done = isDone(p.id);
          const isNext = p.id === next.id && !next.tomorrow;
          const entry = done ? todayLog.find((x) => x.prayerId === p.id) : null;
          return (
            <div key={p.id} style={{ ...PS.prayerRow, ...(isNext ? PS.prayerRowNext : {}), ...(done ? PS.prayerRowDone : {}) }}>
              <div style={PS.prayerInfo}>
                <div style={PS.prayerName}>{prayerName(p.id)}</div>
                <div style={PS.prayerTime}>{to12h(p.time)}</div>
                {entry && typeof entry.minutesAfterAdhan === "number" && (
                  <div style={PS.prayerTimingNote}>{prayerTimingNote(entry.minutesAfterAdhan, t)}</div>
                )}
              </div>
              <button onClick={() => togglePrayer(p)} style={{ ...PS.prayerBtn, ...(done ? PS.prayerBtnDone : {}) }} data-tour={pIdx === 0 ? "prayer-mark-btn" : undefined}>
                {done ? <><CheckCircle2 size={15} /> {t("prayer.done")}</> : t("prayer.markPrayed")}
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ ...PS.religiousCard }}>
        <div style={S.catEditorHeader}><BookMarked size={15} color="#C9A24B" /><span>{t("prayer.dailyReligiousTasks")}</span></div>
        <p style={S.profileHint}>{t("prayer.dailyTasksNote")}</p>
        {todayReligious.length === 0 && (
          <div style={PS.religiousPresets}>
            {RELIGIOUS_PRESETS.map((p) => (
              <button key={p.key} onClick={() => addReligiousPreset(p)} style={PS.presetAddBtn}><Plus size={14} /> {t(p.titleKey)}</button>
            ))}
          </div>
        )}
        <div style={PS.religiousList}>
          {todayReligious.map((rt) => (
            <ReligiousTask key={rt.id} task={rt} onUpdate={updateReligious} onRemove={removeReligious} addPoints={addPoints} showToast={showToast} />
          ))}
        </div>
        {todayReligious.length > 0 && todayReligious.length < RELIGIOUS_PRESETS.length && (
          <div style={PS.religiousPresets}>
            {RELIGIOUS_PRESETS.filter((p) => !todayReligious.some((r) => r.taskKey === p.key)).map((p) => (
              <button key={p.key} onClick={() => addReligiousPreset(p)} style={PS.presetAddBtn}><Plus size={14} /> {t(p.titleKey)}</button>
            ))}
          </div>
        )}
      </div>

      <div style={PS.essSection} data-tour="prayer-extras">
        <div style={PS.essSectionHead}>
          <span style={{ fontSize: 16 }}>🤲</span>
          <span style={PS.essSectionTitle}>{t("prayer.istighfarCounter")}</span>
          <span style={PS.essProgressBadge}>{todayIstighfar === 0 ? t("prayer.istighfarCompleteCheck") : isolateNumbers(t("prayer.istighfarRemaining", { count: todayIstighfar }))}</span>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 6, background: "var(--surface-raised)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, ((ISTIGHFAR_TARGET - todayIstighfar) / ISTIGHFAR_TARGET) * 100)}%`, background: todayIstighfar === 0 ? "#5FA8A0" : "#C9A24B", borderRadius: 3, transition: "width 0.4s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 11, color: "var(--muted2)" }}>
              {todayIstighfar === 0 ? t("prayer.istighfarDoneToday") : isolateNumbers(t("prayer.istighfarProgress", { done: formatNumberLatin(ISTIGHFAR_TARGET - todayIstighfar, language), target: ISTIGHFAR_TARGET }))}
            </span>
            <span style={{ fontSize: 11, color: "var(--muted2)" }}>{isolateNumbers(t("prayer.istighfarTotal", { total: formatNumberLatin(istighfar.total || 0, language) }))}</span>
          </div>
        </div>
        {todayIstighfar === 0 ? (
          <button onClick={resetIstighfarDay} style={PS.essCompleteBtn}>{t("prayer.resetTo1000")}</button>
        ) : (
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[1, 10, 33, 100].map((n) => (
              <button key={n} onClick={() => addIstighfar(n)} style={PS.istighfarBtn}>-{n}</button>
            ))}
          </div>
        )}
      </div>

      <div style={PS.essSection}>
        <div style={PS.essSectionHead}>
          <BookMarked size={16} color="#C9A24B" />
          <span style={PS.essSectionTitle}>{t("prayer.adhkarTitle")}</span>
          <span style={PS.essProgressBadge}>{todayAzkar.morning && "☀ "}{todayAzkar.evening && "🌙"}</span>
        </div>
        <div style={PS.essTabRow}>
          <button style={{ ...PS.essTab, ...(azkarTab === "morning" ? PS.essTabActive : {}) }} onClick={() => setAzkarTab("morning")}>
            {t("prayer.morningTab")} {todayAzkar.morning ? "✓" : ""}
          </button>
          <button style={{ ...PS.essTab, ...(azkarTab === "evening" ? PS.essTabActive : {}) }} onClick={() => setAzkarTab("evening")}>
            {t("prayer.eveningTab")} {todayAzkar.evening ? "✓" : ""}
          </button>
        </div>
        {(() => {
          const todayItems = (azkarItems || {})[today] || {};
          const allIds = azkarList.map((z) => z.id);
          return azkarList.map((z) => {
            const itemDone = !!todayItems[z.id];
            return (
              <div key={z.id} style={{ ...PS.essAzkarItem, cursor: "pointer" }} onClick={() => toggleAzkarItem(z.id, azkarTab, allIds)}>
                <span style={{ ...PS.essAzkarText, textDecoration: itemDone ? "line-through" : "none", color: itemDone ? "var(--muted2)" : "var(--ink)" }}>{z.short}</span>
                <span style={PS.essAzkarCount}>×{z.count}</span>
                <span style={{ ...S.checkbox, ...(itemDone ? S.checkboxDone : {}), flexShrink: 0, marginInlineStart: 4 }}>{itemDone && <Check size={12} />}</span>
              </div>
            );
          });
        })()}
        {todayAzkar[azkarTab] && (
          <div style={{ ...PS.essCompleteBtn, ...PS.essCompleteBtnDone, cursor: "default" }}>
            <Check size={15} /> {t("prayer.azkarCompletedSession", { session: azkarTab === "morning" ? t("todayView.morning") : t("todayView.evening") })}
          </div>
        )}
      </div>

      <div style={PS.essSection}>
        <div style={PS.essSectionHead}>
          <BookOpen size={16} color="#C9A24B" />
          <span style={PS.essSectionTitle}>{t("prayer.quranProgress")}</span>
          <span style={PS.essProgressBadge}>{t("prayer.quranJuzCount", { count: quranDoneCount })}</span>
        </div>
        <div
          style={{ ...PS.essAzkarItem, cursor: "pointer", borderBottom: "none", paddingTop: 2 }}
          onClick={toggleQuran30}
        >
          <span style={{ ...PS.essAzkarText, textDecoration: todayAzkar.quran30 ? "line-through" : "none", color: todayAzkar.quran30 ? "var(--muted2)" : "var(--ink)" }}>
            {t("prayer.readQuran30Today")}
          </span>
          <span style={{ ...S.checkbox, ...(todayAzkar.quran30 ? S.checkboxDone : {}), flexShrink: 0, marginInlineStart: 4 }}>{todayAzkar.quran30 && <Check size={12} />}</span>
        </div>
        <div style={PS.essJuzGrid}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => {
            const done = !!quranProgress[juz];
            return (
              <button key={juz} onClick={() => toggleJuz(juz)} style={{ ...PS.essJuzBtn, ...(done ? PS.essJuzBtnDone : {}) }}>
                {juz}
              </button>
            );
          })}
        </div>
        <div style={PS.essJuzCount}>
          <div style={{ height: 6, background: "var(--surface-raised)", borderRadius: 3, marginTop: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(quranDoneCount / 30) * 100}%`, background: "#C9A24B", borderRadius: 3, transition: "width 0.5s" }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--muted2)", display: "block", marginTop: 4 }}>
            {quranDoneCount === 30 ? t("prayer.quranKhatmaComplete") : t("prayer.quranJuzRemaining", { count: 30 - quranDoneCount })}
          </span>
        </div>
      </div>

      <div style={S.memoryNote}><Save size={13} color="#5FA8A0" /><span>{t("prayer.savedForeverNote")}</span></div>
    </div>
  );
}

function ReligiousTask({ task, onUpdate, onRemove, addPoints, showToast }) {
  const { t } = useTranslation();
  const displayTitle = religiousTaskTitle(task, t);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(task.minutesSpent * 60);
  const ref = useRef(null);

  useEffect(() => {
    if (running) ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [running]);

  const mins = Math.floor(seconds / 60);
  const secStr = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const metTarget = task.targetMinutes ? mins >= task.targetMinutes : true;

  async function finish() {
    setRunning(false);
    const updated = { ...task, minutesSpent: mins, done: true };
    onUpdate(updated);
    addPoints(30);
    showToast(t("prayer.religiousTaskDoneToast", { title: displayTitle, min: mins }));
  }

  return (
    <div style={{ ...PS.religiousItem, ...(task.done ? PS.religiousItemDone : {}) }}>
      <div style={PS.religiousTop}>
        <div style={{ flex: 1 }}>
          <div style={PS.religiousTitle}>{displayTitle}</div>
          <div style={PS.religiousMeta}>
            {task.done ? t("prayer.completedIn", { min: task.minutesSpent }) : (task.targetMinutes ? t("prayer.timeLabelWithTarget", { time: secStr, target: task.targetMinutes }) : t("prayer.timeLabel", { time: secStr }))}
          </div>
        </div>
        {!task.done && <button onClick={() => onRemove(task.id)} style={S.deleteBtn}><Trash2 size={14} /></button>}
      </div>
      {!task.done && (
        <div style={PS.timerControlsRow}>
          <button onClick={() => setRunning((r) => !r)} style={PS.miniTimerBtn}>
            {running ? <><Pause size={14} /> {t("prayer.stop")}</> : <><Play size={14} /> {seconds > 0 ? t("prayer.resume") : t("prayer.startTimer")}</>}
          </button>
          <button onClick={finish} disabled={seconds === 0} style={{ ...PS.miniDoneBtn, ...(metTarget && seconds > 0 ? PS.miniDoneBtnReady : {}) }}>
            <CheckCircle2 size={14} /> {t("prayer.done")}
          </button>
        </div>
      )}
      {task.done && <div style={PS.religiousDoneRow}><CheckCircle2 size={15} color="#5FA8A0" /> {t("prayer.completed")}</div>}
    </div>
  );
}

const AS = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  heroIcon: { width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,162,75,0.25), 0 4px 14px rgba(201,162,75,0.25)" },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", lineHeight: 1.5, marginTop: 2 },
  grid: { display: "flex", flexDirection: "column", gap: 12 },
  catCard: { display: "flex", alignItems: "center", gap: 14, background: "linear-gradient(165deg, var(--panel), var(--surface-sunken))", border: "1px solid var(--line)", borderRadius: 20, padding: "18px 16px", cursor: "pointer", textAlign: "start", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(0,0,0,0.18)" },
  catIcon: { fontSize: 26, width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 35% 30%, rgba(201,162,75,0.24), rgba(201,162,75,0.05))", border: "1px solid rgba(201,162,75,0.25)", flexShrink: 0 },
  catInfo: { flex: 1, minWidth: 0 },
  catTitle: { fontFamily: "'Amiri', serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" },
  catSub: { fontSize: 11.5, color: "var(--muted2)", marginTop: 3 },
  catBadge: { fontSize: 12, fontWeight: 700, color: "#5FA8A0", background: "rgba(95,168,160,0.1)", border: "1px solid rgba(95,168,160,0.3)", borderRadius: 20, padding: "5px 12px", flexShrink: 0, fontVariantNumeric: "tabular-nums" },
  backRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  backBtn: { display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--muted2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" },
  progressWrap: { marginBottom: 6 },
  progressTop: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted2)", marginBottom: 6 },
  progressBar: { height: 8, background: "var(--surface-raised)", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, transition: "width 0.4s ease" },
  itemCard: { position: "relative", background: "linear-gradient(180deg, var(--panel), var(--surface-sunken))", border: "1px solid var(--line)", borderRadius: 20, padding: "24px 20px", boxShadow: "0 6px 20px rgba(0,0,0,0.2)", transition: "opacity 0.3s ease, transform 0.3s ease" },
  itemCardDone: { opacity: 0.55 },
  itemOrnament: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  itemOrnamentLine: { flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,162,75,0.4))" },
  itemOrnamentLineRev: { flex: 1, height: 1, background: "linear-gradient(270deg, transparent, rgba(201,162,75,0.4))" },
  itemOrnamentDot: { color: "#C9A24B", fontSize: 11, flexShrink: 0 },
  itemText: { fontFamily: "'Amiri', 'Scheherazade New', serif", fontSize: 21, lineHeight: 2.3, letterSpacing: 0.2, color: "var(--ink)", whiteSpace: "pre-line", textAlign: "center" },
  itemTextQuran: { fontSize: 25, lineHeight: 2.6 },
  itemNote: { fontFamily: "'Amiri', serif", fontSize: 13, color: "var(--muted2)", textAlign: "center", marginTop: 12, lineHeight: 1.9 },
  itemFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 10 },
  itemLabel: { fontFamily: "'Amiri', serif", fontSize: 14, color: "var(--muted2)" },
  counterBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 96, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.35)", color: "#C9A24B", borderRadius: 14, padding: "10px 18px", fontSize: 19, fontWeight: 700, cursor: "pointer", fontFamily: "'Amiri', serif", fontVariantNumeric: "tabular-nums" },
  counterBtnDone: { background: "rgba(95,168,160,0.12)", borderColor: "rgba(95,168,160,0.4)", color: "#5FA8A0" },
  doneMsg: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", background: "linear-gradient(160deg, var(--warm-tint), var(--panel))", border: "1px solid rgba(201,162,75,0.35)", borderRadius: 18, padding: "28px 16px" },
  doneMsgIcon: { fontSize: 34 },
  doneMsgText: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700, color: "#C9A24B" },
};

function AdhkarView({ showToast }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const today = todayKey();
  const [selected, setSelected] = useState(null);
  const [progress, setProgress] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    store.loadAdhkarProgress(today).then((p) => {
      if (!active) return;
      setProgress(p);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [today]);

  function stateFor(catId, item) {
    return progress[catId]?.[item.id] || { remaining: item.count, done: false };
  }

  async function decrement(catId, item) {
    const cur = stateFor(catId, item);
    if (cur.done) return;
    const nextRemaining = Math.max(0, cur.remaining - 1);
    const done = nextRemaining === 0;
    setProgress((prev) => ({
      ...prev,
      [catId]: { ...(prev[catId] || {}), [item.id]: { remaining: nextRemaining, done } },
    }));
    const res = await store.saveAdhkarProgressItem(today, catId, item.id, nextRemaining, done);
    if (!res.ok) {
      setProgress((prev) => ({ ...prev, [catId]: { ...(prev[catId] || {}), [item.id]: cur } }));
      showToast(t("adhkar.saveFailed"));
      return;
    }
    if (done) showToast(t("adhkar.completedCheck"));
  }

  function categoryStats(catId) {
    const items = ADHKAR[catId] || [];
    const doneCount = items.filter((it) => stateFor(catId, it).done).length;
    return { done: doneCount, total: items.length };
  }

  if (!loaded) {
    return <div style={S.view}><div style={{ color: "var(--muted2)", textAlign: "center", marginTop: 40 }}><Loader2 size={20} className="spin" /></div></div>;
  }

  if (!selected) {
    return (
      <div style={S.view}>
        <div style={AS.wrap}>
          <div style={AS.hero}>
            <div style={{ ...AS.heroIcon, color: "var(--on-accent)" }}><TasbihIcon size={22} /></div>
            <div>
              <div style={AS.heroTitle}>{t("adhkar.heroTitle")}</div>
              <div style={AS.heroSub}>{t("adhkar.heroSub")}</div>
            </div>
          </div>
          <div style={AS.grid}>
            {ADHKAR_CATEGORIES.map((cat, catIdx) => {
              const stats = categoryStats(cat.id);
              return (
                <button key={cat.id} onClick={() => setSelected(cat.id)} style={AS.catCard} data-tour={catIdx === 0 ? "adhkar-cat-first" : undefined}>
                  <span style={AS.catIcon}>{cat.icon}</span>
                  <div style={AS.catInfo}>
                    <div style={AS.catTitle}>{t(`adhkar.categories.${cat.id}.title`)}</div>
                    <div style={AS.catSub}>{t(`adhkar.categories.${cat.id}.subtitle`)} · {t("adhkar.countSuffix", { count: (ADHKAR[cat.id] || []).length })}</div>
                  </div>
                  <span style={AS.catBadge}>{stats.done}/{stats.total}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const cat = ADHKAR_CATEGORIES.find((c) => c.id === selected);
  const catTitle = t(`adhkar.categories.${cat.id}.title`);
  const catSubtitle = t(`adhkar.categories.${cat.id}.subtitle`);
  const items = ADHKAR[selected] || [];
  const stats = categoryStats(selected);
  const allDone = stats.total > 0 && stats.done === stats.total;
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div style={S.view}>
      <div style={AS.wrap}>
        <div style={AS.backRow}>
          <button onClick={() => setSelected(null)} style={AS.backBtn}>{language === "en" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />} {t("adhkar.backToCategories")}</button>
        </div>
        <div style={AS.hero}>
          <div style={AS.heroTitle}>{cat.icon} {catTitle}</div>
          <div style={AS.heroSub}>{catSubtitle}</div>
        </div>
        <div style={AS.progressWrap}>
          <div style={AS.progressTop}><span>{t("adhkar.progressCount", { done: stats.done, total: stats.total })}</span><span>{pct}%</span></div>
          <div style={AS.progressBar}><div style={{ ...AS.progressFill, width: `${pct}%`, background: allDone ? "#5FA8A0" : "#C9A24B" }} /></div>
        </div>

        {allDone && (
          <div style={AS.doneMsg}>
            <span style={AS.doneMsgIcon}>🤍</span>
            <span style={AS.doneMsgText}>{t("adhkar.acceptedByAllah")}</span>
          </div>
        )}

        {items.map((item, itemIdx) => {
          const st = stateFor(selected, item);
          const isQuran = /^\[/.test(item.note || "");
          return (
            <div key={item.id} style={{ ...AS.itemCard, ...(st.done ? AS.itemCardDone : {}) }}>
              <div style={AS.itemOrnament}>
                <div style={AS.itemOrnamentLine} />
                <span style={AS.itemOrnamentDot}>◆</span>
                <div style={AS.itemOrnamentLineRev} />
              </div>
              <div style={{ ...AS.itemText, ...(isQuran ? AS.itemTextQuran : {}) }}>{item.text}</div>
              {item.note && <div style={AS.itemNote}>{item.note}</div>}
              <div style={AS.itemFooter}>
                <span style={AS.itemLabel}>{item.countLabel}</span>
                <button onClick={() => decrement(selected, item)} disabled={st.done} style={{ ...AS.counterBtn, ...(st.done ? AS.counterBtnDone : {}) }} data-tour={itemIdx === 0 ? "adhkar-counter-first" : undefined}>
                  {st.done ? <><Check size={18} /> {t("adhkar.done")}</> : st.remaining}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TS = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  heroIcon: { width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,162,75,0.25), 0 4px 14px rgba(201,162,75,0.25)" },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", lineHeight: 1.5, marginTop: 2 },
  dateLabel: { fontSize: 12.5, color: "var(--muted2)", textAlign: "center" },
  card: { position: "relative", background: "linear-gradient(180deg, var(--panel), var(--surface-sunken))", border: "1px solid var(--line)", borderRadius: 22, padding: "30px 22px 24px", boxShadow: "0 6px 24px rgba(0,0,0,0.22)" },
  ornament: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  ornamentLine: { flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,162,75,0.4))" },
  ornamentLineRev: { flex: 1, height: 1, background: "linear-gradient(270deg, transparent, rgba(201,162,75,0.4))" },
  ornamentDot: { color: "#C9A24B", fontSize: 11, flexShrink: 0 },
  quoteText: { fontFamily: "'Amiri', serif", fontSize: 21, lineHeight: 2.1, letterSpacing: 0.2, color: "var(--ink)", textAlign: "center", margin: 0 },
  footerRow: { display: "flex", alignItems: "center", justifyContent: "center", marginTop: 20 },
  categoryPill: { fontSize: 11.5, fontWeight: 700, color: "#C9A24B", background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 20, padding: "5px 14px" },
  footerNote: { fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 4 },
  archiveHeader: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--muted2)" },
  archiveHeaderLine: { flex: 1, height: 1, background: "var(--line)" },
  archiveList: { display: "flex", flexDirection: "column", gap: 8 },
  archiveItem: { background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 },
  archiveTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  archiveDate: { fontSize: 11, color: "var(--muted2)", whiteSpace: "nowrap" },
  archiveText: { fontFamily: "'Amiri', serif", fontSize: 14.5, lineHeight: 1.8, color: "#C9C6C0" },
};

function TipsView({ tipsLog, setTipsLog, showToast, subscription }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isSub = isActiveSubscriber(subscription);
  // Deliberately NOT todayKey() (UTC-based, a quirk relied on elsewhere in
  // the app) — the daily tip must flip at the user's own local midnight,
  // not at UTC midnight, so this uses the local calendar date throughout:
  // picking the tip, the tips_log key, and the "already logged?" check.
  //
  // This is state, not a plain const, on purpose: a plain const only gets
  // recomputed when React re-renders this component for some other reason
  // (navigating away and back, a manual reload). If the tab/app is simply
  // left open and mounted across real midnight — very common for a PWA
  // left in the background overnight — nothing would ever trigger that
  // re-render, and the card would keep showing yesterday's already-computed
  // tip indefinitely. The effect below re-checks the local day whenever the
  // page becomes visible again and on a periodic timer, so a long-lived
  // mounted view still catches the day change without any reload.
  const [today, setToday] = useState(() => localDayKey());

  useEffect(() => {
    function syncToday() {
      setToday((prev) => {
        const now = localDayKey();
        return prev === now ? prev : now;
      });
    }
    const interval = setInterval(syncToday, 60000);
    document.addEventListener("visibilitychange", syncToday);
    window.addEventListener("focus", syncToday);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", syncToday);
      window.removeEventListener("focus", syncToday);
    };
  }, []);

  // pickDailyTip already falls back internally on any error, but the owner
  // lookup itself runs here, so guard it too — the card must never go
  // blank just because logging or owner resolution had a bad day.
  const todayTip = useMemo(() => {
    try {
      const tip = pickDailyTip(today, getOwner());
      return (tip && tip.text) ? tip : pickDailyTip(today);
    } catch (e) {
      console.error("[TipsView] falling back to a safe tip after error:", e);
      return pickDailyTip(today);
    }
  }, [today]);

  // مستخدم غير مشترك يرى نصيحة يومه الأول فقط — أول مفتاح تاريخ مسجّل
  // في tipsLog، أو اليوم نفسه إن كان السجل فارغاً بعد (يعني هذا فعلاً
  // أول يوم). المشترك/VIP لا يخضع لهذا الشرط إطلاقاً.
  const firstDayKey = useMemo(() => {
    const keys = Object.keys(tipsLog || {});
    return keys.length ? keys.sort()[0] : today;
  }, [tipsLog, today]);
  const canSeeTodayTip = isSub || today === firstDayKey;

  useEffect(() => {
    if (!canSeeTodayTip) return; // لا نسجّل نصيحة يوم لم يُعرَض له فعلاً
    try {
      if ((tipsLog || {})[today] === todayTip.id) return;
      setTipsLog((prev) => ({ ...(prev || {}), [today]: todayTip.id }));
      store.saveTipsLog(today, todayTip.id).then((res) => {
        if (!res.ok) {
          setTipsLog((prev) => { const next = { ...(prev || {}) }; delete next[today]; return next; });
          showToast(t("tips.saveFailed"));
        }
      });
    } catch (e) {
      console.warn("[TipsView] could not record today's tip in the log:", e);
    }
  }, [today, todayTip.id, canSeeTodayTip]);

  // خلل حقيقي وُجد وأُصلح هنا: كان أي يوم مسجَّل في tips_log بمعرّف نصيحة
  // غير موجود في بنك TIPS الحالي يسقط من الأرشيف بصمت تماماً (بسبب
  // .filter((entry) => entry.tip) القديم) - وهذا يحدث فعلياً في الإنتاج لأن
  // pickDailyTip تُرجع FALLBACK_TIP بمعرّف "fallback" (ليس ضمن البنك عمداً)
  // في أي يوم فشل فيه الاختيار لأي سبب: نصيحة ذلك اليوم تظهر طبيعياً وقتها
  // (البطاقة تعرض الكائن مباشرة)، ثم "تختفي من الأرشيف" ابتداءً من اليوم
  // التالي. القاعدة الآن: أي يوم مسجَّل يظهر في الأرشيف دائماً - "fallback"
  // يُحلّ إلى نص النصيحة الاحتياطية نفسها التي رآها المستخدم فعلاً ذلك
  // اليوم، وأي معرّف مجهول آخر (من إصدار أقدم مثلاً) يظهر ببطاقة صريحة بدل
  // الإسقاط الصامت.
  const archive = useMemo(
    () => Object.entries(tipsLog || {})
      .filter(([date]) => date !== today)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, tipId]) => {
        let tip = TIPS.find((tp) => tp.id === tipId);
        if (!tip && tipId === FALLBACK_TIP.id) tip = FALLBACK_TIP;
        if (!tip) {
          console.warn(`[TipsView] archive: معرّف نصيحة غير معروف (${tipId}) ليوم ${date} - يُعرض ببطاقة بديلة بدل إسقاطه`);
          tip = { id: tipId, category: "selfdev", text: t("tips.oldTipUnavailable") };
        }
        return { date, tip };
      }),
    [tipsLog, today, language]
  );

  return (
    <div style={S.view}>
      <div style={TS.wrap}>
        <div style={TS.hero} data-tour="tips-hero">
          <div style={TS.heroIcon}><Eye size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={TS.heroTitle}>{t("tips.heroTitle")}</div>
            <div style={TS.heroSub}>{t("tips.heroSub")}</div>
          </div>
        </div>
        {canSeeTodayTip ? (
          <>
            <div style={TS.dateLabel}>{arabicDate(new Date(), { weekday: "long", day: "numeric", month: "long" }, language === "en" ? "en-US" : undefined)}</div>
            <div style={TS.card}>
              <div style={TS.ornament}>
                <span style={TS.ornamentLine} /><span style={TS.ornamentDot}>◆</span><span style={TS.ornamentLineRev} />
              </div>
              <p style={TS.quoteText}>{language === "en" ? (todayTip.textEn || todayTip.text) : todayTip.text}</p>
              <div style={TS.footerRow}>
                <span style={TS.categoryPill}>{t(`tips.categories.${todayTip.category}`, TIP_CATEGORY_LABELS[todayTip.category] || t("tips.categoryFallback"))}</span>
              </div>
            </div>
            <div style={TS.footerNote}>{t("tips.comeBackTomorrow")}</div>
          </>
        ) : (
          <UpsellCard icon={Eye} title={t("tips.upsellTitle")} message={t("tips.upsellMessage")} />
        )}

        {archive.length > 0 && (
          <>
            <div style={TS.archiveHeader}><span style={TS.archiveHeaderLine} /><span>{t("tips.archiveTitle")}</span><span style={TS.archiveHeaderLine} /></div>
            <div style={TS.archiveList} className="stagger-in responsive-card-list">
              {archive.map(({ date, tip }) => {
                // arabicDate(dateString) would parse "YYYY-MM-DD" as UTC
                // midnight, shifting the shown day back by one for anyone
                // west of UTC — build the Date from local components instead.
                const [y, m, d] = date.split("-").map(Number);
                return (
                  <div key={date} style={TS.archiveItem}>
                    <div style={TS.archiveTop}>
                      <span style={TS.categoryPill}>{t(`tips.categories.${tip.category}`, TIP_CATEGORY_LABELS[tip.category] || t("tips.categoryFallback"))}</span>
                      <span style={TS.archiveDate}>{arabicDate(new Date(y, m - 1, d), { weekday: "long", day: "numeric", month: "long" }, language === "en" ? "en-US" : undefined)}</span>
                    </div>
                    <p style={TS.archiveText}>{language === "en" ? (tip.textEn || tip.text) : tip.text}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DailyTipModal({ tip, onClose }) {
  const { t, i18n } = useTranslation();
  return (
    <div style={S.modalOverlay} className="overlay-in" onClick={onClose}>
      <div style={{ ...S.modal, borderRadius: 20, maxWidth: 420 }} className="sheet-in" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}><span>{t("tips.modalTitle")}</span><button onClick={onClose} style={S.iconBtn}><X size={18} /></button></div>
        <div style={TS.card}>
          <div style={TS.ornament}>
            <span style={TS.ornamentLine} /><span style={TS.ornamentDot}>◆</span><span style={TS.ornamentLineRev} />
          </div>
          <p style={TS.quoteText}>{i18n.language === "en" ? (tip.textEn || tip.text) : tip.text}</p>
          <div style={TS.footerRow}>
            <span style={TS.categoryPill}>{t(`tips.categories.${tip.category}`, TIP_CATEGORY_LABELS[tip.category] || t("tips.categoryFallback"))}</span>
          </div>
        </div>
        <button onClick={onClose} style={S.saveBtn}>{t("common.buttons.ok")}</button>
      </div>
    </div>
  );
}

// فهرس بحث "وين ألقى...؟" - مطابقة كلمات مفتاحية محلية بسيطة (بلا أي
// استدعاء AI، تفادياً للكلفة والتأخير على سؤال بهذا البساطة) بالعربية
// والإنجليزية معاً في نفس المصفوفة، حتى تُطابق كتابة المستخدم بأي من
// اللغتين بغض النظر عن لغة الواجهة الحالية.
const HELP_SEARCH_INDEX = [
  { viewId: "nutrition", keywords: ["meal", "food", "calories", "macro", "diet", "وجبة", "اكل", "أكل", "طعام", "سعرات", "تغذية"] },
  { viewId: "fitness", keywords: ["workout", "exercise", "gym", "training", "رياضة", "تمرين", "تمارين", "جيم", "تدريب"] },
  { viewId: "tasks", keywords: ["task", "todo", "reminder", "مهمة", "مهام", "تذكير"] },
  { viewId: "goals", keywords: ["goal", "target", "هدف", "اهداف", "أهداف"] },
  { viewId: "reports", keywords: ["report", "progress", "stats", "تقرير", "تقارير", "احصائيات", "إحصائيات", "تقدم"] },
  { viewId: "assistant", keywords: ["ai", "chat", "ask", "assistant", "ذكاء", "مساعد", "اسأل", "شات"] },
  { viewId: "achieve", keywords: ["achieve", "challenge", "project", "أنجز", "تحدي", "مشروع"] },
  { viewId: "you", keywords: ["profile", "about", "health", "أنت", "بيانات", "صحية", "ملف", "هوايات"] },
  { viewId: "prayer", keywords: ["prayer", "salah", "صلاة", "استغفار"] },
  { viewId: "adhkar", keywords: ["adhkar", "dhikr", "اذكار", "أذكار", "تسبيح"] },
  { viewId: "tips", keywords: ["wisdom", "tip", "بصيرة", "حكمة", "نصيحة"] },
  { viewId: "focus", keywords: ["focus", "study", "timer", "تركيز", "دراسة", "مؤقت"] },
  { viewId: "vault", keywords: ["money", "expense", "budget", "خزنة", "مال", "مصروف", "ميزانية"] },
  { viewId: "mental", keywords: ["mental", "mood", "mind", "نفسية", "مزاج"] },
  { viewId: "nutritionPlan", keywords: ["diet plan", "نظام غذائي", "خطة تغذية"] },
  { viewId: "dietPlans", keywords: ["diet plans", "انظمة غذائية", "أنظمة"] },
  { viewId: "settings", keywords: ["settings", "hobbies", "theme", "اعدادات", "إعدادات", "تخصيص"] },
];
const HELP_NAV_LABEL_KEY = { mental: "mentalHealth", focus: "focusStudy", groups: "studyGroups" };
// قائمة الجولات السياقية القابلة لإعادة التشغيل الفردية من الإعدادات -
// نفس معرّفات tour_progress.modules.<id> المستخدَمة في كل قسم (راجع
// useModuleTour في كل من NutritionView/FitnessView/MasarApp).
const MODULE_TOUR_LIST = [
  { id: "nutrition", navKey: "nutrition" },
  { id: "fitness", navKey: "fitness" },
  { id: "tasks", navKey: "tasks" },
  { id: "goals", navKey: "goals" },
  { id: "ai", navKey: "assistant" },
  { id: "reports", navKey: "reports" },
];

function HelpCenter({ view, setView, onClose, onStartTour }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const pageBody = t(`help.pages.${view}`, { defaultValue: "" });

  const q = query.trim().toLowerCase();
  const matches = q.length === 0 ? [] : HELP_SEARCH_INDEX.filter((entry) => entry.keywords.some((k) => k.includes(q) || q.includes(k)));

  function goToMatch(viewId) {
    setView(viewId);
    onClose();
  }

  return (
    <div style={S.modalOverlay} className="overlay-in" onClick={onClose}>
      <div style={{ ...S.modal, borderRadius: 20, maxWidth: 420 }} className="sheet-in" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}><span>{t("help.title")}</span><button onClick={onClose} style={S.iconBtn}><X size={18} /></button></div>

        {pageBody && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>{t("help.aboutThisPage")}</div>
            <p style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.7, margin: 0 }}>{pageBody}</p>
          </div>
        )}

        <label style={S.label}>{t("help.whereIsPrompt")}</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("help.searchPlaceholder")} style={S.input} />
        {q.length > 0 && (
          matches.length > 0 ? (
            <div style={{ marginTop: 10, marginBottom: 6, display: "flex", flexDirection: "column", gap: 6 }}>
              {matches.map((m) => (
                <button key={m.viewId} onClick={() => goToMatch(m.viewId)} style={{ ...S.exportBtn, marginTop: 0, marginBottom: 0, justifyContent: "space-between" }}>
                  <span>{t(`nav.${HELP_NAV_LABEL_KEY[m.viewId] || m.viewId}`)}</span>
                  <span style={{ color: "var(--gold)" }}>{t("help.goThere")}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ ...S.emptyHint, marginTop: 10 }}>{t("help.noMatch")}</div>
          )
        )}

        <button onClick={() => { onClose(); onStartTour(); }} style={{ ...S.exportBtn, marginTop: 16 }}>{t("settings.replayTour")}</button>
      </div>
    </div>
  );
}

const GS = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  heroIcon: { width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,162,75,0.25), 0 4px 14px rgba(201,162,75,0.25)" },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", lineHeight: 1.5, marginTop: 2 },
  addCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px" },
  periodRow: { display: "flex", gap: 8, marginTop: 10, marginBottom: 12 },
  periodChip: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "1px solid var(--border2)", borderRadius: 10, padding: "9px 0", fontSize: 12.5, color: "var(--muted2)", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 },
  periodChipActive: { background: "rgba(201,162,75,0.1)", borderColor: "rgba(201,162,75,0.4)", color: "#C9A24B" },
  goalsList: { display: "flex", flexDirection: "column", gap: 12 },
  goalCard: { background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 10 },
  goalTop: { display: "flex", alignItems: "flex-start", gap: 8 },
  goalTitle: { fontSize: 14, fontWeight: 700, color: "var(--ink)", flex: 1 },
  goalMeta: { fontSize: 11, color: "var(--muted2)", marginTop: 3 },
  statusBadge: { fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, height: "fit-content", flexShrink: 0 },
  statusDone: { color: "#5FA8A0", background: "rgba(95,168,160,0.12)" },
  statusFailed: { color: "#E05252", background: "rgba(224,82,82,0.1)" },
  calendarRow: { display: "flex", flexWrap: "wrap", gap: 5 },
  cell: { width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, border: "1px solid var(--border2)", color: "#5A5650", flexShrink: 0 },
  cellMonth: { width: "auto", minWidth: 40, height: 22, padding: "0 6px", borderRadius: 8, fontSize: 9 },
  cellPast: { background: "rgba(201,162,75,0.16)", borderColor: "rgba(201,162,75,0.3)", color: "#C9A24B" },
  cellToday: { background: "#C9A24B", borderColor: "#C9A24B", color: "var(--on-accent)", boxShadow: "0 0 0 2px rgba(201,162,75,0.3)" },
  reviewCard: { background: "linear-gradient(160deg, rgba(201,162,75,0.12), rgba(201,162,75,0.03))", border: "1px solid rgba(201,162,75,0.35)", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  reviewTitle: { fontSize: 13.5, fontWeight: 700, color: "#C9A24B" },
  reviewQuestion: { fontSize: 13, color: "var(--ink)", lineHeight: 1.6 },
  reviewBtnRow: { display: "flex", gap: 10 },
  reviewYesBtn: { flex: 1, background: "rgba(95,168,160,0.14)", border: "1px solid rgba(95,168,160,0.4)", color: "#5FA8A0", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  reviewNoBtn: { flex: 1, background: "rgba(224,82,82,0.1)", border: "1px solid rgba(224,82,82,0.35)", color: "#E05252", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  reasonBox: { display: "flex", flexDirection: "column", gap: 8 },
  reasonInput: { width: "100%", background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 10, padding: "10px 12px", color: "var(--ink)", fontSize: 13, fontFamily: "inherit", minHeight: 70, resize: "vertical" },
  reasonConfirmBtn: { background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  reasonConfirmBtnDisabled: { opacity: 0.5, cursor: "default" },
  failuresCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px" },
  failuresList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 10 },
  failureItem: { background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 4 },
  failureTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  failureTitle: { fontSize: 13, fontWeight: 700, color: "var(--ink)" },
  failureDate: { fontSize: 10.5, color: "var(--muted2)", whiteSpace: "nowrap" },
  failureReason: { fontSize: 12, color: "var(--muted2)", lineHeight: 1.6 },
  pendingNote: { fontSize: 11.5, color: "#E05252", textAlign: "center" },
};

function GoalCalendar({ goal, today }) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const isMonthUnit = goal.unit === "month";
  const todayMonthKey = today.slice(0, 7);
  return (
    <div style={GS.calendarRow}>
      {goal.cells.map((cell, i) => {
        const isPast = isMonthUnit ? cell.slice(0, 7) < todayMonthKey : cell < today;
        const isToday = isMonthUnit ? cell.slice(0, 7) === todayMonthKey : cell === today;
        const label = isMonthUnit ? arabicDate(cell, { month: "short" }, language === "en" ? "en-US" : undefined) : String(Number(cell.slice(8, 10)));
        return (
          <div key={i} style={{ ...GS.cell, ...(isMonthUnit ? GS.cellMonth : {}), ...(isPast ? GS.cellPast : {}), ...(isToday ? GS.cellToday : {}) }}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

function GoalsView({ goals, setGoals, addPoints, showToast, profile, setProfile, journeyActive }) {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("weekly");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const today = localDayKey();

  const hasPendingReason = Object.values(reviewDrafts).some((d) => d?.active);

  // جولة الأهداف السياقية (Onboarding - Phase D): نفس مبدأ جولة المهام -
  // خطوة تفاعلية على زر الإضافة، ثم تلميح ختامي بعد ظهور أول هدف فعلي.
  const goalsTour = useModuleTour("goals", profile, setProfile, { active: !journeyActive });
  const goalCountAtTourStartRef = useRef(goals.length);
  useEffect(() => {
    if (goalsTour.step === 1 && goals.length > goalCountAtTourStartRef.current) goalsTour.setStep(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalsTour.step, goals.length]);

  async function addGoal() {
    if (!title.trim()) return;
    if (hasPendingReason) { showToast(t("goals.finishReasonFirst")); return; }
    const goal = createGoal({ id: uid(), title: title.trim(), period });
    setGoals((prev) => [goal, ...prev]);
    const ok = await store.saveGoal(goal);
    if (ok) { setTitle(""); showToast(t("goals.goalAdded")); }
    else { setGoals((prev) => prev.filter((g) => g.id !== goal.id)); showToast(t("common.errors.saveFailed")); }
  }

  async function confirmSuccess(goal) {
    const updated = { ...goal, status: "done" };
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    const ok = await store.saveGoal(updated);
    if (ok) { addPoints(GOAL_POINTS_SUCCESS, t("goals.achievedLogReason", { title: goal.title })); playSaveSound(); showToast(t("goals.achievedToast", { points: GOAL_POINTS_SUCCESS })); }
    else { setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g))); showToast(t("common.errors.saveFailed")); }
  }

  async function confirmFailure(goal) {
    const reason = (reviewDrafts[goal.id]?.reason || "").trim();
    if (!reason) return;
    const isLast = goal.checkpointIndex >= goal.checkpoints.length - 1;
    const failureEntry = { checkpointDate: goal.checkpoints[goal.checkpointIndex], reason, recordedAt: today };
    const updated = {
      ...goal,
      failures: [...goal.failures, failureEntry],
      checkpointIndex: isLast ? goal.checkpointIndex : goal.checkpointIndex + 1,
      status: isLast ? "failed" : "active",
    };
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    const ok = await store.saveGoal(updated);
    if (ok) {
      addPoints(-GOAL_POINTS_FAILURE, t("goals.notAchievedLogReason", { title: goal.title }));
      setReviewDrafts((prev) => { const next = { ...prev }; delete next[goal.id]; return next; });
      showToast(t("goals.notAchievedToast", { points: GOAL_POINTS_FAILURE }));
    } else {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
      showToast(t("common.errors.saveFailed"));
    }
  }

  async function removeGoal(id) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await store.deleteGoal(id);
  }

  const activeGoals = goals.filter((g) => g.status === "active" || g.status === "done");
  const allFailures = useMemo(
    () => goals.flatMap((g) => g.failures.map((f) => ({ ...f, goalTitle: g.title, period: g.period })))
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [goals]
  );

  return (
    <div style={S.view}>
      <div style={GS.wrap}>
        <div style={GS.hero}>
          <div style={GS.heroIcon}><Target size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={GS.heroTitle}>{t("goals.heroTitle")}</div>
            <div style={GS.heroSub}>{t("goals.heroSub")}</div>
          </div>
        </div>

        <div style={GS.addCard}>
          <label style={S.label}>{t("goals.newGoalLabel")}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGoal()} placeholder={t("goals.newGoalPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
          <div style={GS.periodRow}>
            {Object.keys(GOAL_PERIODS).map((key) => (
              <button key={key} onClick={() => setPeriod(key)} style={{ ...GS.periodChip, ...(period === key ? GS.periodChipActive : {}) }}>{t(`goals.periods.${key}.label`)}</button>
            ))}
          </div>
          {hasPendingReason && <div style={GS.pendingNote}>{t("goals.finishPendingFirst")}</div>}
          <button onClick={addGoal} disabled={hasPendingReason} style={{ ...S.saveBtn, marginTop: hasPendingReason ? 8 : 0, ...(hasPendingReason ? { opacity: 0.5, cursor: "default" } : {}) }} data-tour="add-goal-btn">
            <Plus size={16} style={{ display: "inline", verticalAlign: "-3px" }} /> {t("goals.addGoal")}
          </button>
        </div>

        <div style={GS.goalsList} className="stagger-in responsive-card-list">
          {activeGoals.length === 0 && <div style={S.emptyHint}>{t("goals.emptyState")}</div>}
          {activeGoals.map((goal, goalIdx) => {
            const due = isReviewDue(goal, today);
            const draft = reviewDrafts[goal.id];
            return (
              <div key={goal.id} style={GS.goalCard} data-tour={goalIdx === 0 ? "goal-card-first" : undefined}>
                <div style={GS.goalTop}>
                  <div>
                    <div style={GS.goalTitle}>{goal.title}</div>
                    <div style={GS.goalMeta}>{t(`goals.periods.${goal.period}.label`)} · {t(`goals.periods.${goal.period}.reviewLabel`)}</div>
                  </div>
                  {goal.status === "done" && <span style={{ ...GS.statusBadge, ...GS.statusDone }}><Check size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> {t("goals.achievedBadge")}</span>}
                  <button onClick={() => removeGoal(goal.id)} style={S.deleteBtn}><Trash2 size={14} /></button>
                </div>
                <GoalCalendar goal={goal} today={today} />
                {due && !draft?.active && (
                  <div style={GS.reviewCard}>
                    <div style={GS.reviewTitle}>{t("goals.reviewTime")}</div>
                    <div style={GS.reviewQuestion}>{t("goals.reviewQuestion", { title: goal.title })}</div>
                    <div style={GS.reviewBtnRow}>
                      <button onClick={() => confirmSuccess(goal)} style={GS.reviewYesBtn}>{t("common.buttons.yes")}</button>
                      <button onClick={() => setReviewDrafts((prev) => ({ ...prev, [goal.id]: { active: true, reason: "" } }))} style={GS.reviewNoBtn}>{t("common.buttons.no")}</button>
                    </div>
                  </div>
                )}
                {due && draft?.active && (
                  <div style={GS.reviewCard}>
                    <div style={GS.reviewTitle}>{t("goals.reasonPrompt")}</div>
                    <div style={GS.reasonBox}>
                      <textarea
                        value={draft.reason}
                        onChange={(e) => setReviewDrafts((prev) => ({ ...prev, [goal.id]: { active: true, reason: e.target.value } }))}
                        placeholder={t("goals.reasonPlaceholder")}
                        style={GS.reasonInput}
                      />
                      <button
                        onClick={() => confirmFailure(goal)}
                        disabled={!draft.reason.trim()}
                        style={{ ...GS.reasonConfirmBtn, ...(!draft.reason.trim() ? GS.reasonConfirmBtnDisabled : {}) }}
                      >{t("common.buttons.confirm")}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={GS.failuresCard}>
          <div style={S.catEditorHeader}><AlertTriangle size={15} color="#E05252" /><span>{t("goals.unmetGoals")}</span></div>
          <div style={GS.failuresList}>
            {allFailures.length === 0 && <div style={S.emptyHint}>{t("goals.noUnmetGoals")}</div>}
            {allFailures.map((f, i) => (
              <div key={i} style={GS.failureItem}>
                <div style={GS.failureTop}>
                  <span style={GS.failureTitle}>{f.goalTitle}</span>
                  <span style={GS.failureDate}>{arabicDate(f.checkpointDate, { day: "numeric", month: "short" }, i18n.language === "en" ? "en-US" : undefined)}</span>
                </div>
                <span style={GS.failureReason}>{f.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {goalsTour.step === 1 && (
        <SpotlightTour
          steps={[{ target: '[data-tour="add-goal-btn"]', interactive: true, title: t("onboarding.goalsTour.step1Title"), body: t("onboarding.goalsTour.step1Body") }]}
          stepIndex={0}
          onNext={() => goalsTour.setStep(2)}
          onSkip={goalsTour.finish}
          onFinish={goalsTour.finish}
          labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), tapHere: t("onboarding.tapHere") }}
        />
      )}
      {goalsTour.step === 2 && (
        <SpotlightTour
          steps={[{ target: '[data-tour="goal-card-first"]', title: t("onboarding.goalsTour.step2Title"), body: t("onboarding.goalsTour.step2Body") }]}
          stepIndex={0}
          onNext={goalsTour.finish}
          onSkip={goalsTour.finish}
          onFinish={goalsTour.finish}
          labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), tapHere: t("onboarding.tapHere") }}
        />
      )}
    </div>
  );
}

function FocusView({ focus, setFocus, commitments, setCommitments, categories, entries, addPoints, showToast, subscription }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isSub = isActiveSubscriber(subscription);
  const [targetMin, setTargetMin] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("");
  const [isStudy, setIsStudy] = useState(true);
  const [subTab, setSubTab] = useState("timer");
  const [manualMode, setManualMode] = useState(false);
  const [manualMinutes, setManualMinutes] = useState("25");
  const [loaded, setLoaded] = useState(false);
  const [pendingCompletion, setPendingCompletion] = useState(null);
  const [pickingTime, setPickingTime] = useState(false);
  const [customEndTime, setCustomEndTime] = useState(nowHHMM());
  const [stopChoice, setStopChoice] = useState(null); // { elapsedSec } عند إيقاف جلسة قيد التشغيل قبل اكتمالها
  const intervalRef = useRef(null);
  const sessionRef = useRef(null);
  // جروبات المستخدم (لإشعار الأعضاء الآخرين لحظياً ببدء/انتهاء الجلسة) -
  // تُجلب مرة واحدة فقط عند فتح تركيز، لا حاجة لإعادة الجلب أثناء الجلسة.
  const myGroupIdsRef = useRef([]);
  useEffect(() => {
    if (!isSub) return;
    let active = true;
    store.loadMyGroups().then((groups) => { if (active) myGroupIdsRef.current = (groups || []).map((g) => g.id); });
    return () => { active = false; };
  }, [isSub]);

  useEffect(() => {
    (async () => {
      const active = await store.loadActiveSession();
      if (active) {
        sessionRef.current = active;
        setTargetMin(active.targetMinutes);
        setLabel(active.label || "");
        setIsStudy(active.isStudy);
        if (active.running && active.startedAt) {
          const startedMs = new Date(active.startedAt).getTime();
          const elapsedSec = Math.floor((Date.now() - startedMs) / 1000);
          const totalTargetSec = active.remainingAtStart ?? active.targetMinutes * 60;
          if (elapsedSec >= totalTargetSec) {
            setRemaining(0);
            // Session actually finished while the user was away — use the
            // mathematically correct end time (start + target duration)
            // rather than "now", since real time may have passed since then.
            const endDate = new Date(startedMs + totalTargetSec * 1000);
            const naturalEnd = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
            await completeSession(active, active.targetMinutes, true, naturalEnd);
            sessionRef.current = null;
          } else {
            setRemaining(totalTargetSec - elapsedSec);
            setRunning(true);
            showToast(t("focus.cameBackToast"));
          }
        } else {
          // Paused: the countdown is frozen exactly where the user left it.
          // Only an explicit reset() clears this, never a refresh/navigation.
          setRemaining(active.remainingSec ?? active.targetMinutes * 60);
          setRunning(false);
        }
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) { finishSession(); return 0; }
          return r - 1;
        });
      }, 1000);
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  function adjust(deltaMin) {
    if (running) return;
    const next = Math.max(5, Math.min(180, targetMin + deltaMin));
    setTargetMin(next); setRemaining(next * 60);
  }

  async function startTimer() {
    const startedAt = new Date().toISOString();
    const session = { startedAt, remainingAtStart: targetMin * 60, running: true, targetMinutes: targetMin, label: label.trim(), isStudy };
    sessionRef.current = session;
    await store.saveActiveSession(session);
    setRemaining(targetMin * 60);
    setRunning(true);
    // إشعار لحظي (لا يُخزَّن كسجل دائم) لأعضاء جروباتي - لا ننتظر النتيجة
    // حتى لا يُبطئ بدء الجلسة، ولا نُظهر أي خطأ إن فشل (ثانوي بحت).
    myGroupIdsRef.current.forEach((gid) => store.sendGroupActivityPing(gid, "started", targetMin));
  }

  // Continues an existing (paused) session from whatever time is left,
  // instead of restarting it from the full target duration.
  async function resumeTimer() {
    const startedAt = new Date().toISOString();
    const session = { startedAt, remainingAtStart: remaining, running: true, targetMinutes: targetMin, label: label.trim(), isStudy };
    sessionRef.current = session;
    await store.saveActiveSession(session);
    setRunning(true);
  }

  async function pauseTimer() {
    setRunning(false);
    // Freeze and persist the exact remaining time so a refresh, a tab
    // switch, or closing the browser while paused never loses progress —
    // only the explicit reset() button below clears it.
    const session = { ...(sessionRef.current || {}), running: false, remainingSec: remaining, targetMinutes: targetMin, label: label.trim(), isStudy };
    sessionRef.current = session;
    await store.saveActiveSession(session);
  }

  // إيقاف جلسة قيد التشغيل قبل اكتمالها الطبيعي لم يعد يُجمّد الوقت مباشرة
  // - بل يوقف العدّاد فوراً (فيتجمّد remaining بالضبط عند اللحظة الحالية)
  // ويعرض خيارين للمستخدم: إنهاء الجلسة الآن بتسجيل الدقائق المنقضية فعلاً
  // كجلسة تركيز مكتملة، أو الاستكمال لاحقاً (نفس سلوك pauseTimer القديم
  // تماماً، بلا أي تغيير). العدّاد يبقى مجمَّداً في الحالتين حتى يختار
  // المستخدم، فلا وقت إضافي يُحتسَب أثناء عرض الخيارين.
  function toggle() {
    if (running) { setRunning(false); setStopChoice({ elapsedSec: targetMin * 60 - remaining }); }
    else if (sessionRef.current) resumeTimer();
    else startTimer();
  }

  async function finishSessionNow() {
    const minutesDone = Math.round((stopChoice?.elapsedSec || 0) / 60);
    setStopChoice(null);
    if (minutesDone < 1) { await pauseTimer(); return; } // وقت ضئيل جداً لتسجيله كجلسة فعلية
    await completeSession(sessionRef.current, minutesDone, false, nowHHMM());
    sessionRef.current = null;
    setRemaining(targetMin * 60);
  }

  async function continueSessionLater() {
    setStopChoice(null);
    await pauseTimer();
  }

  function reset() {
    setRunning(false);
    setRemaining(targetMin * 60);
    store.saveActiveSession(null);
    sessionRef.current = null;
  }

  async function completeSession(sess, minutesDone, wasAway, endTime) {
    const end = endTime || nowHHMM();
    const start = addMinutesToTime(end, -minutesDone);
    const session = { id: uid(), date: todayKey(), minutes: minutesDone, label: (sess?.label || "").trim(), isStudy: sess?.isStudy ?? isStudy, start, end };
    setFocus((prev) => [session, ...prev]);
    const res = await store.saveFocus(session);
    if (!res.ok) {
      setFocus((prev) => prev.filter((f) => f.id !== session.id));
      showToast(t("focus.saveFailed"));
      return;
    }
    await store.saveActiveSession(null);
    addPoints(minutesDone);
    showToast(t(wasAway ? "focus.completedAway" : "focus.completed", { min: minutesDone }));
    setRemaining(targetMin * 60);
    setCommitments((prev) => {
      const next = prev.map((c) => ({ ...c, log: { ...c.log, [todayKey()]: (c.log[todayKey()] || 0) + minutesDone } }));
      Promise.all(next.map((updated) => store.saveCommitment(updated))).then((results) => {
        if (results.some((r) => !r.ok)) { setCommitments(prev); showToast(t("focus.commitmentsUpdateFailed")); }
      });
      return next;
    });
    myGroupIdsRef.current.forEach((gid) => store.sendGroupActivityPing(gid, "finished", minutesDone));
  }

  function finishSession() {
    setRunning(false);
    setCustomEndTime(nowHHMM());
    setPendingCompletion({ sess: sessionRef.current, minutesDone: targetMin });
    sessionRef.current = null;
  }

  function logManual() {
    const mins = Math.max(1, Math.min(600, parseInt(manualMinutes, 10) || 0));
    if (!mins) { showToast(t("focus.invalidMinutes")); return; }
    setCustomEndTime(nowHHMM());
    setPendingCompletion({ sess: { label: label.trim(), isStudy }, minutesDone: mins });
  }

  async function confirmCompletionNow() {
    if (!pendingCompletion) return;
    await completeSession(pendingCompletion.sess, pendingCompletion.minutesDone, false, nowHHMM());
    setPendingCompletion(null);
    setPickingTime(false);
  }

  async function confirmCompletionCustomTime() {
    if (!pendingCompletion) return;
    await completeSession(pendingCompletion.sess, pendingCompletion.minutesDone, false, customEndTime);
    setPendingCompletion(null);
    setPickingTime(false);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const progress = 1 - remaining / (targetMin * 60);

  const subTabs = [
    { id: "timer", labelKey: "focus.timerTab", icon: Timer },
    { id: "study", labelKey: "focus.studyReportTab", icon: BookOpen },
    { id: "general", labelKey: "focus.generalReportTab", icon: TrendingUp },
    { id: "bots", labelKey: "focus.challengeTab", icon: Zap },
  ];

  const studyEntries = useMemo(() => {
    const studyCat = (categories || []).find((c) => c.id === "study" || c.name.includes("دراس"));
    if (!studyCat || !entries) return [];
    return entries.filter((e) => e.catId === studyCat.id);
  }, [entries, categories]);

  if (!loaded) return <div style={S.view}><div style={{ color: "var(--muted2)", textAlign: "center", marginTop: 40 }}><Loader2 size={20} className="spin" /></div></div>;

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>{t("focus.sectionTitle")}</div>
      <div style={S.subTabRow}>
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setSubTab(tab.id)} style={{ ...S.subTab, ...(subTab === tab.id ? S.subTabActive : {}) }}>
              <Icon size={13} /> {t(tab.labelKey)}
            </button>
          );
        })}
      </div>
      {subTab === "timer" && (
        <>
          <div style={PS.modeToggleRow}>
            <button onClick={() => setManualMode(false)} style={{ ...PS.modeToggleBtn, ...(!manualMode ? PS.modeToggleBtnActive : {}) }}><Timer size={13} /> {t("focus.autoTimer")}</button>
            <button onClick={() => setManualMode(true)} style={{ ...PS.modeToggleBtn, ...(manualMode ? PS.modeToggleBtnActive : {}) }}><Edit3 size={13} /> {t("focus.manualEntry")}</button>
          </div>
          {!manualMode ? (
            <div style={S.timerCard}>
              <FocusRing progress={progress} size={224}>
                <div style={S.timerTime}>{mm}:{ss}</div>
                <div style={S.timerTargetLabel}>{running ? t("focus.focusNow") : t("focus.minutesLabel", { min: targetMin })}</div>
              </FocusRing>
              <div style={S.adjustRow}>
                <button onClick={() => adjust(-5)} disabled={running} style={S.adjustBtn}>−5</button>
                <button onClick={() => adjust(-1)} disabled={running} style={S.adjustBtnSmall}>−1</button>
                <span style={S.adjustValue}>{t("focus.minutesAbbrev", { min: targetMin })}</span>
                <button onClick={() => adjust(1)} disabled={running} style={S.adjustBtnSmall}>+1</button>
                <button onClick={() => adjust(5)} disabled={running} style={S.adjustBtn}>+5</button>
              </div>
              <div style={S.studyToggleRow}>
                <button onClick={() => setIsStudy(true)} disabled={running} style={{ ...S.studyToggle, ...(isStudy ? S.studyToggleActive : {}) }}><BookOpen size={13} /> {t("focus.study")}</button>
                <button onClick={() => setIsStudy(false)} disabled={running} style={{ ...S.studyToggle, ...(!isStudy ? S.studyToggleActive : {}) }}><Zap size={13} /> {t("focus.generalActivity")}</button>
              </div>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("focus.focusOnPlaceholder")} style={{ ...S.input, marginTop: 12 }} />
              <div style={S.timerControls}>
                <button onClick={reset} style={S.timerSecondary}><RotateCcw size={18} /></button>
                <button onClick={toggle} style={S.timerPrimary} data-tour="focus-timer-start">
                  {running ? <Pause size={20} /> : <Play size={20} />}
                  {running ? t("focus.pause") : sessionRef.current ? t("focus.resume") : t("focus.start")}
                </button>
              </div>
            </div>
          ) : (
            <div style={S.timerCard}>
              <div style={PS.manualEntryRow}>
                <input type="number" inputMode="numeric" value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} style={PS.manualInput} placeholder="25" />
                <span style={PS.manualUnit}>{t("focus.minutesUnit")}</span>
              </div>
              <div style={S.studyToggleRow}>
                <button onClick={() => setIsStudy(true)} style={{ ...S.studyToggle, ...(isStudy ? S.studyToggleActive : {}) }}><BookOpen size={13} /> {t("focus.study")}</button>
                <button onClick={() => setIsStudy(false)} style={{ ...S.studyToggle, ...(!isStudy ? S.studyToggleActive : {}) }}><Zap size={13} /> {t("focus.generalActivity")}</button>
              </div>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("focus.focusedOnPlaceholder")} style={{ ...S.input, marginTop: 12 }} />
              <button onClick={logManual} style={{ ...S.timerPrimary, marginTop: 14, width: "100%" }}>
                <Check size={18} /> {t("focus.logTime")}
              </button>
            </div>
          )}
          <div style={S.memoryNote}><Save size={13} color="#5FA8A0" /><span>{t("focus.persistNote")}</span></div>
          <CommitmentsSection commitments={commitments} setCommitments={setCommitments} categories={categories} focus={focus} showToast={showToast} />
        </>
      )}
      {subTab === "study" && (isSub ? <FocusReport focus={focus.filter((f) => f.isStudy)} studyEntries={studyEntries} title={t("focus.studyReportTab")} color="#5FA8A0" emptyMsg={t("focus.studyReportEmpty")} /> : (
        <UpsellCard icon={BookOpen} title={t("focus.studyReportUpsellTitle")} message={t("focus.studyReportUpsellMessage")} compact />
      ))}
      {subTab === "general" && (isSub ? <FocusReport focus={focus.filter((f) => !f.isStudy)} title={t("focus.generalReportTitle")} color="#C9A24B" emptyMsg={t("focus.generalReportEmpty")} /> : (
        <UpsellCard icon={BookOpen} title={t("focus.generalReportUpsellTitle")} message={t("focus.generalReportUpsellMessage")} compact />
      ))}
      {subTab === "bots" && (isSub ? <BotsChallenge focus={focus} entries={entries} categories={categories} /> : (
        <UpsellCard icon={Zap} title={t("focus.challengeUpsellTitle")} message={t("focus.challengeUpsellMessage")} compact />
      ))}
      {pendingCompletion && (
        <div style={S.modalOverlay} className="overlay-in" onClick={() => { setPendingCompletion(null); setPickingTime(false); }}>
          <div style={S.modal} className="sheet-in" onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>{t("focus.wellDone")}</div>
            <div style={{ fontSize: 13.5, color: "#C9C6C0", lineHeight: 1.7, marginBottom: 16 }}>
              {t("focus.endTimeQuestion")}
            </div>
            {!pickingTime ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={confirmCompletionNow} style={{ ...S.saveBtn, marginTop: 0, flex: 1 }}>{t("focus.now")}</button>
                <button onClick={() => setPickingTime(true)} style={{ ...S.saveBtn, marginTop: 0, flex: 1, background: "var(--surface-raised)", color: "var(--ink)", border: "1px solid var(--border2)" }}>{t("focus.differentTime")}</button>
              </div>
            ) : (
              <>
                <label style={S.label}>{t("focus.whenDidItEnd")}</label>
                <input type="time" value={customEndTime} onChange={(e) => setCustomEndTime(e.target.value)} style={{ ...S.input, marginBottom: 4 }} />
                <button onClick={confirmCompletionCustomTime} style={S.saveBtn}>{t("common.buttons.confirm")}</button>
              </>
            )}
          </div>
        </div>
      )}

      {stopChoice && (
        <div style={S.modalOverlay} className="overlay-in" onClick={continueSessionLater}>
          <div style={S.modal} className="sheet-in" onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>{t("focus.stopSessionTitle")}</div>
            <div style={{ fontSize: 13.5, color: "#C9C6C0", lineHeight: 1.7, marginBottom: 16 }}>
              {t("focus.stopSessionBody", { elapsed: Math.round(stopChoice.elapsedSec / 60), target: targetMin })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={finishSessionNow} style={{ ...S.saveBtn, marginTop: 0 }}>{t("focus.finishNow")}</button>
              <button onClick={continueSessionLater} style={{ ...S.saveBtn, marginTop: 0, background: "var(--surface-raised)", color: "var(--ink)", border: "1px solid var(--border2)" }}>{t("focus.continueLater")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FocusReport({ focus, title, color, emptyMsg, studyEntries }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const RC = useRecharts();
  const reduceMotion = useReducedMotion();
  const entryMinutes = (studyEntries || []).reduce((s, e) => s + diffMinutes(e.start, e.end), 0);
  const totalMin = focus.reduce((s, f) => s + f.minutes, 0) + entryMinutes;
  const todayEntryMin = (studyEntries || []).filter((e) => e.date === todayKey()).reduce((s, e) => s + diffMinutes(e.start, e.end), 0);
  const todayMin = focus.filter((f) => f.date === todayKey()).reduce((s, f) => s + f.minutes, 0) + todayEntryMin;
  const allDays = useMemo(() => {
    const days = new Set(focus.map((f) => f.date));
    (studyEntries || []).forEach((e) => days.add(e.date));
    return days;
  }, [focus, studyEntries]);
  const streak = useMemo(() => {
    let s = 0; let d = new Date();
    if (!allDays.has(todayKey(d))) { d.setDate(d.getDate() - 1); if (!allDays.has(todayKey(d))) return 0; }
    while (allDays.has(todayKey(d))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }, [allDays]);
  const last14 = useMemo(() => {
    const arr = []; const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i); const k = todayKey(d);
      const focusMins = focus.filter((f) => f.date === k).reduce((s, f) => s + f.minutes, 0);
      const entryMins = (studyEntries || []).filter((e) => e.date === k).reduce((s, e) => s + diffMinutes(e.start, e.end), 0);
      arr.push({ label: arabicDate(k, { day: "numeric" }, language === "en" ? "en-US" : undefined), mins: focusMins + entryMins });
    }
    return arr;
  }, [focus, studyEntries, language]);
  const hasAny = focus.length > 0 || (studyEntries || []).length > 0;

  return (
    <div>
      <div style={{ ...S.sectionTitle, fontSize: 17, color }}>{title}</div>
      <div style={S.focusStatsRow}>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{fmtHM(totalMin, language)}</div><div style={S.kpiLabel}>{t("focus.report.total")}</div></div>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{fmtHM(todayMin, language)}</div><div style={S.kpiLabel}>{t("focus.report.today")}</div></div>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{streak}</div><div style={S.kpiLabel}>{t("focus.report.dayStreak")}</div></div>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{focus.length + (studyEntries || []).length}</div><div style={S.kpiLabel}>{t("focus.report.sessions")}</div></div>
      </div>
      <div style={S.chartCard}>
        <div style={S.chartTitle}>{t("focus.report.last14Days")}</div>
        {!RC ? <ChartLoading /> : !hasAny ? <div style={S.emptyHint}>{emptyMsg}</div> : (
          <RC.ResponsiveContainer width="100%" height={160}>
            <RC.BarChart data={last14} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <RC.CartesianGrid strokeDasharray="2 4" stroke="var(--surface-raised)" vertical={false} />
              <RC.XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 9, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} interval={1} />
              <RC.YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <RC.Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ${t("common.units.minutes")}`, ""]} />
              <RC.Bar dataKey="mins" radius={[3, 3, 3, 3]} fill={color} maxBarSize={18} isAnimationActive={!reduceMotion} animationDuration={450} />
            </RC.BarChart>
          </RC.ResponsiveContainer>
        )}
      </div>
      {hasAny && (
        <div style={S.chartCard}>
          <div style={S.chartTitle}>{t("focus.report.savedSessionsLog")}</div>
          <div style={S.sessionLog}>
            {focus.slice(0, 12).map((f) => (
              <div key={f.id} style={S.sessionRow}>
                <span style={{ ...S.legendDot, background: color }} />
                <span style={S.sessionLabel}>{f.label || t("focus.report.focusSessionFallback")}</span>
                <span style={S.sessionMins}>{fmtHM(f.minutes, language)}</span>
                <span style={S.sessionDate}>{arabicDate(f.date, { day: "numeric", month: "short" }, language === "en" ? "en-US" : undefined)}</span>
              </div>
            ))}
            {(studyEntries || []).slice(0, 12).map((e) => (
              <div key={e.id} style={S.sessionRow}>
                <span style={{ ...S.legendDot, background: color }} />
                <span style={S.sessionLabel}>{e.note || t("focus.report.studyActivityFallback")}</span>
                <span style={S.sessionMins}>{fmtHM(diffMinutes(e.start, e.end), language)}</span>
                <span style={S.sessionDate}>{arabicDate(e.date, { day: "numeric", month: "short" }, language === "en" ? "en-US" : undefined)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// traitKey يطابق مفاتيح botsChallenge.traits.* في ملفات الترجمة بنفس ترتيب
// هذه القائمة تماماً - trait نفسها (الوصف العربي الخام) تبقى fallback فقط
// إن غاب المفتاح من ملف الترجمة لأي سبب.
const ROBOT_DATA = [
  { id: "ahmed",  name: "Ahmed",  flag: "🇸🇦", country: "Saudi Arabia", specialty: "Web Dev",      trait: "ناشط ومثابر",      traitKey: "active_persistent",  persona: "veryActive" },
  { id: "fatima", name: "Fatima", flag: "🇪🇬", country: "Egypt",        specialty: "Design",       trait: "مبدعة وملهمة",     traitKey: "creative_inspiring", persona: "moderate"   },
  { id: "omar",   name: "Omar",   flag: "🇦🇪", country: "UAE",          specialty: "Marketing",    trait: "استراتيجي وذكي",   traitKey: "strategic_sharp",    persona: "moderate"   },
  { id: "layla",  name: "Layla",  flag: "🇯🇴", country: "Jordan",       specialty: "UX",           trait: "دقيقة ومتأنية",    traitKey: "precise_deliberate", persona: "sporadic"   },
  { id: "karim",  name: "Karim",  flag: "🇲🇦", country: "Morocco",      specialty: "Data Science", trait: "تحليلي وعميق",     traitKey: "analytical_deep",    persona: "veryActive" },
  { id: "noor",   name: "Noor",   flag: "🇰🇼", country: "Kuwait",       specialty: "Content",      trait: "رشيقة وسريعة",    traitKey: "agile_quick",         persona: "sporadic"   },
  { id: "hassan", name: "Hassan", flag: "🇶🇦", country: "Qatar",        specialty: "Backend",      trait: "صامت وفعّال",      traitKey: "quiet_effective",    persona: "veryActive" },
  { id: "amira",  name: "Amira",  flag: "🇧🇭", country: "Bahrain",      specialty: "Branding",     trait: "أنيقة ومتجددة",    traitKey: "elegant_inventive",  persona: "evening"    },
  { id: "rashid", name: "Rashid", flag: "🇹🇳", country: "Tunisia",      specialty: "iOS Dev",      trait: "شغوف ومتطور",      traitKey: "passionate_evolving", persona: "veryActive" },
  { id: "sara",   name: "Sara",   flag: "🇱🇧", country: "Lebanon",      specialty: "Photography",  trait: "حساسة وفنية",      traitKey: "sensitive_artistic",  persona: "evening"    },
  { id: "zain",   name: "Zain",   flag: "🇮🇶", country: "Iraq",         specialty: "AI",           trait: "فضولي ومتعمق",     traitKey: "curious_thorough",    persona: "veryActive" },
  { id: "dina",   name: "Dina",   flag: "🇾🇪", country: "Yemen",        specialty: "Writing",      trait: "شاعرية وعذبة",     traitKey: "poetic_gentle",       persona: "absentish"  },
  { id: "malik",  name: "Malik",  flag: "🇵🇸", country: "Palestine",    specialty: "SEO",          trait: "صبور ومنهجي",      traitKey: "patient_methodical", persona: "moderate"   },
  { id: "maya",   name: "Maya",   flag: "🇴🇲", country: "Oman",         specialty: "Video",        trait: "حيوية ومبتكرة",    traitKey: "energetic_inventive", persona: "absentish"  },
  { id: "carlos", name: "Carlos", flag: "🇪🇸", country: "Spain",        specialty: "Music",        trait: "إيقاعي ومتدفق",    traitKey: "rhythmic_fluid",      persona: "evening"    },
];

// Each persona is a fixed list of [startHour, endHour, minutes] study
// sessions across the real clock day — no session, no minutes, so every
// bot starts today at 0 and only accumulates as the actual hour arrives.
const BOT_PERSONAS = {
  veryActive: { sessions: [[8, 11, 100], [14, 17, 90], [20, 23, 110]] },
  moderate:   { sessions: [[9, 10.5, 60], [19, 21, 90]] },
  sporadic:   { sessions: [[10, 10.5, 25], [13, 13.33, 15], [17, 17.67, 30]] },
  evening:    { sessions: [[17, 17.25, 15], [20, 23.5, 150]] },
  absentish:  { sessions: [[9, 10, 50], [18, 19.5, 70]] },
};

// Deterministic per (seed) pseudo-random in [0,1) — same bot + same day
// always gives the same result, so the schedule is stable within a day
// and across reloads, but still varies day to day without needing to
// store anything.
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return ((h >>> 0) % 100000) / 100000;
}

function computeBotMinutes(bot, now, todayStr) {
  const persona = BOT_PERSONAS[bot.persona];
  if (bot.persona === "absentish" && seededRandom(`${bot.id}-absent-${todayStr}`) < 0.25) return 0;
  const variance = 0.85 + seededRandom(`${bot.id}-var-${todayStr}`) * 0.3;
  const hourNow = now.getHours() + now.getMinutes() / 60;
  let mins = 0;
  persona.sessions.forEach(([start, end, sessionMins], i) => {
    const jitter = (seededRandom(`${bot.id}-jit-${i}-${todayStr}`) - 0.5) * 0.5; // ±0.25h start/end drift
    const jStart = start + jitter, jEnd = end + jitter;
    const progress = hourNow <= jStart ? 0 : hourNow >= jEnd ? 1 : (hourNow - jStart) / (jEnd - jStart);
    mins += progress * sessionMins;
  });
  return Math.round(mins * variance);
}

function BotsChallenge({ focus, entries, categories }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const studyCat = useMemo(() => (categories || []).find((c) => c.name.includes("دراس") || c.id === "study"), [categories]);
  const generalCat = useMemo(() => (categories || []).find((c) => c.name.includes("عام") || c.id === "general"), [categories]);
  const relevantCatIds = useMemo(() => {
    const ids = new Set(["study"]);
    if (studyCat) ids.add(studyCat.id);
    if (generalCat) ids.add(generalCat.id);
    return ids;
  }, [studyCat, generalCat]);
  const entriesMinutes = useMemo(() => {
    if (!entries || !relevantCatIds.size) return 0;
    const today = todayKey();
    return entries.filter((e) => e.date === today && relevantCatIds.has(e.catId)).reduce((s, e) => s + diffMinutes(e.start, e.end), 0);
  }, [entries, relevantCatIds]);
  const focusMinutes = useMemo(() => {
    const today = todayKey();
    return (focus || []).filter((f) => f.date === today).reduce((s, f) => s + f.minutes, 0);
  }, [focus]);
  const myToday = entriesMinutes + focusMinutes;

  const bots = useMemo(() => {
    const now = new Date();
    const today = todayKey();
    const list = ROBOT_DATA.map((r) => ({
      ...r,
      mins: computeBotMinutes(r, now, today),
      color: "#5FA8A0",
    }));
    const me = { id: "me", name: t("botsChallenge.you"), flag: "⭐", country: "", specialty: "", trait: t("botsChallenge.yourRealProgress"), mins: myToday, color: "var(--ink)", isMe: true };
    return [...list, me].sort((a, b) => b.mins - a.mins);
  }, [tick, myToday, language]);

  const maxMins = Math.max(60, ...bots.map((b) => b.mins));
  const myRank = bots.findIndex((b) => b.isMe) + 1;

  return (
    <div>
      <div style={{ ...S.sectionTitle, fontSize: 17 }}>{t("botsChallenge.title")}</div>
      <p style={S.profileHint}>{t("botsChallenge.subtitle")}</p>
      <div style={S.rankBanner}>
        <Trophy size={16} color={myRank === 1 ? "#C9A24B" : "var(--muted2)"} />
        <span>{t("botsChallenge.yourRank", { rank: myRank })}</span>
        {myRank === 1 && <span style={S.leadPill}>{t("botsChallenge.leading")}</span>}
      </div>
      <div style={S.botsList}>
        {bots.map((b, i) => (
          <div key={b.id} style={{ ...S.botRow, ...(b.isMe ? S.botRowMe : {}) }}>
            <span style={S.botRank}>{i + 1}</span>
            <span style={S.botEmoji}>{b.flag}</span>
            <div style={S.botInfo}>
              <div style={S.botName}>
                {b.name}
                {b.isMe && <span style={S.botYou}>{t("botsChallenge.you")}</span>}
                {!b.isMe && <span style={{ fontSize: 11, color: "var(--muted2)", marginInlineStart: 6 }}>{b.specialty}</span>}
              </div>
              <div style={S.botTrait}>{!b.isMe && <span style={{ marginInlineEnd: 4 }}>{b.country}</span>}{b.isMe ? b.trait : t(`botsChallenge.traits.${b.traitKey}`, b.trait)}</div>
              <div style={S.botBarWrap}><div style={{ ...S.botBarFill, width: `${(b.mins / maxMins) * 100}%`, background: b.isMe ? "var(--ink)" : b.color }} /></div>
            </div>
            <span style={S.botMins}>{fmtHM(b.mins, language)}</span>
          </div>
        ))}
      </div>
      <div style={S.memoryNote}><Zap size={13} color="#C9A24B" /><span>{t("botsChallenge.footnote")}</span></div>
    </div>
  );
}

function FocusRing({ progress, size, children }) {
  const stroke = 8;
  const r = (size - stroke) / 2 - 10;
  const c = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-raised)" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#C9A24B" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function CommitmentsSection({ commitments, setCommitments, categories, focus, showToast }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [title, setTitle] = useState("");
  const [mins, setMins] = useState(60);

  async function add() {
    if (!title.trim()) return;
    const c = { id: uid(), title: title.trim(), targetMinutes: mins, catId: categories[0]?.id, log: {} };
    setCommitments((prev) => [...prev, c]);
    const res = await store.saveCommitment(c);
    if (!res.ok) { setCommitments((prev) => prev.filter((x) => x.id !== c.id)); showToast(t("commitments.saveFailed")); return; }
    setTitle(""); showToast(t("commitments.added"));
  }
  async function remove(id) {
    const removed = commitments.find((c) => c.id === id);
    setCommitments((prev) => prev.filter((c) => c.id !== id));
    const res = await store.deleteCommitment(id);
    if (!res.ok) { if (removed) setCommitments((prev) => [...prev, removed]); showToast(t("commitments.deleteFailed")); }
  }

  function streakOf(c) {
    let s = 0; let d = new Date();
    const met = (k) => (c.log[k] || 0) >= c.targetMinutes;
    if (!met(todayKey(d))) { d.setDate(d.getDate() - 1); if (!met(todayKey(d))) return 0; }
    while (met(todayKey(d))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }

  return (
    <div style={S.commitCard}>
      <div style={S.catEditorHeader}><Zap size={15} color="#C9A24B" /><span>{t("commitments.title")}</span></div>
      <p style={S.profileHint}>{t("commitments.subtitle")}</p>
      <div style={S.commitList}>
        {commitments.map((c) => {
          const todayMin = c.log[todayKey()] || 0;
          const pct = Math.min(100, Math.round((todayMin / c.targetMinutes) * 100));
          const done = todayMin >= c.targetMinutes;
          const streak = streakOf(c);
          return (
            <div key={c.id} style={S.commitItem}>
              <div style={S.commitItemTop}>
                <div style={{ flex: 1 }}>
                  <div style={S.commitTitle}>{c.title}</div>
                  <div style={S.commitMeta}>{t("commitments.goalStreak", { target: c.targetMinutes, streak, dayWord: t(streak === 1 ? "commitments.day" : "commitments.days") })}</div>
                </div>
                {done && <span style={S.commitDoneBadge}><Check size={12} /> {t("commitments.today")}</span>}
                <button onClick={() => remove(c.id)} style={S.deleteBtn}><Trash2 size={14} /></button>
              </div>
              <div style={S.commitBarWrap}><div style={{ ...S.commitBarFill, width: `${pct}%`, background: done ? "#5FA8A0" : "#C9A24B" }} /></div>
              <div style={S.commitProgress}>{t("commitments.progress", { today: fmtHM(todayMin, language), target: fmtHM(c.targetMinutes, language) })}</div>
            </div>
          );
        })}
        {commitments.length === 0 && <div style={S.emptyHint}>{t("commitments.empty")}</div>}
      </div>
      <div style={S.commitAdd}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={t("commitments.placeholder")} style={S.catEditInput} />
        <select value={mins} onChange={(e) => setMins(Number(e.target.value))} style={S.commitSelect}>
          <option value={30}>{t("commitments.options.30")}</option>
          <option value={60}>{t("commitments.options.60")}</option>
          <option value={90}>{t("commitments.options.90")}</option>
          <option value={120}>{t("commitments.options.120")}</option>
        </select>
        <button onClick={add} style={S.taskAddBtn}><Plus size={16} /></button>
      </div>
    </div>
  );
}

function AchieveView({ achieve, setAchieve, profile, focus, tasks, prayerLog, religious, addPoints, showToast, setView }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("challenges");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachReply, setCoachReply] = useState(null);
  const [smartUnavailable, setSmartUnavailable] = useState(false);
  const [promptText, setPromptText] = useState("");
  const hasIdentity = !!(profile?.hobbies?.trim() || profile?.about?.trim());
  const IDENTITY_NUDGE = t("achieve.identityNudge");

  async function askCoach(mood) {
    if (!hasIdentity) { showToast(IDENTITY_NUDGE); return; }
    setCoachLoading(true); setCoachReply(null);
    try {
      const isEn = language === "en";
      const todayFocus = (focus || []).filter((f) => f.date === todayKey()).reduce((s, f) => s + f.minutes, 0);
      const doneToday = (tasks || []).filter((tk) => tk.done && tk.due === todayKey()).length;
      // محتوى طلب الذكاء الاصطناعي (وليس واجهة المستخدم) يتبع لغة الواجهة
      // أيضاً - نفس نمط DailyEvolution/ReportsView أعلاه، لكن دون مفتاح جاهز
      // في ملفات الترجمة هنا فيُبنى النص كاملاً بلغتين.
      const who = isEn
        ? `Bio: ${profile.about || "not specified"}. Hobbies: ${profile.hobbies || "not specified"}. Field: ${profile.field || "not specified"}.`
        : `نبذة: ${profile.about || "غير محدد"}. الهوايات: ${profile.hobbies || "غير محدد"}. التخصص: ${profile.field || "غير محدد"}.`;
      const prompt = isEn
        ? `You are "Achieve", a friendly, smart personal coach writing in clear, natural English with no long dashes. The user: ${who}\nTheir mood right now: ${mood}. Today they focused ${todayFocus} minutes and completed ${doneToday} tasks.\n\nSpeak to them with one sentence that shows you understand their mood, then suggest one specific, short activity to improve their mood or productivity right now, tied to their hobbies or field if possible. Reply ONLY with JSON, no other text or markdown:\n{"message":"a sentence that understands their mood","activity":"one specific suggested activity right now","why":"a short reason why this activity"}`
        : `أنت "أنجز"، مدرب شخصي ذكي ودود يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. المستخدم: ${who}\nمزاجه الآن: ${mood}. ركّز اليوم ${todayFocus} دقيقة وأنجز ${doneToday} مهمة.\n\nتحدّث معه بجملة تتفهّم مزاجه، ثم اقترح له نشاطاً واحداً محدداً وقصيراً يحسّن مزاجه أو إنتاجيته الآن، مرتبطاً بهواياته أو تخصصه إن أمكن. أعد فقط JSON بدون أي نص أو markdown:\n{"message":"جملة تتفهم مزاجه","activity":"نشاط واحد محدد مقترح الآن","why":"سبب قصير لماذا هذا النشاط"}`;
      const text = await analyze(prompt, 800);
      setCoachReply(parseJsonLoose(text));
      setSmartUnavailable(false);
    } catch (err) {
      console.error("[AchieveView] askCoach failed:", err);
      setSmartUnavailable(true);
      setCoachReply(localCoachReply(mood));
    }
    finally { setCoachLoading(false); }
  }

  const filtered = achieve.filter((a) => {
    if (tab === "challenges") return a.kind === "challenge";
    if (tab === "projects") return a.kind === "project";
    if (tab === "paths") return a.kind === "path";
    return true;
  });
  const kindForTab = tab === "challenges" ? "challenge" : tab === "projects" ? "project" : "path";

  async function generate(kind, userRequest) {
    setLoading(true);
    const isEn = language === "en";
    try {
      const who = isEn
        ? `Bio: ${profile.about || "not specified"}. Hobbies: ${profile.hobbies || "not specified"}. Field: ${profile.field || "not specified"}.`
        : `نبذة: ${profile.about || "غير محدد"}. الهوايات: ${profile.hobbies || "غير محدد"}. التخصص: ${profile.field || "غير محدد"}.`;
      const existing = achieve.slice(0, 8).map((a) => a.title).join(" / ");
      const kindLabel = isEn
        ? (kind === "challenge" ? "practical weekly challenges" : kind === "project" ? "small, doable projects" : "gradual learning paths")
        : (kind === "challenge" ? "تحديات أسبوعية عملية" : kind === "project" ? "مشاريع صغيرة قابلة للتنفيذ" : "مسارات تعلّم متدرجة");
      const prompt = isEn
        ? `You are a skills-development coach writing in clear, natural English with no long dashes. The user's exact request: "${userRequest}"\n\nAdditional context about the user, use it to personalize suggestions if relevant: ${who}\n\nBased primarily on the user's request above, suggest 3 ${kindLabel} that precisely meet their request.\n\n${existing ? `Don't repeat these existing items: ${existing}` : ""}\n\nReply ONLY with JSON, no other text or markdown:\n{"items":[{"title":"short title","detail":"a two-sentence description","steps":["step 1","step 2","step 3"],"topic":"the related hobby or field"}]}`
        : `أنت مدرب تطوير مهارات يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. طلب المستخدم بالضبط: "${userRequest}"\n\nسياق إضافي عن المستخدم، استخدمه لتخصيص الاقتراحات إن كان مناسباً: ${who}\n\nبناءً على طلب المستخدم أعلاه بالدرجة الأولى، اقترح 3 ${kindLabel} تلبي طلبه بدقة.\n\n${existing ? `لا تكرر هذه العناصر الموجودة: ${existing}` : ""}\n\nأعد فقط JSON بدون أي نص أو markdown:\n{"items":[{"title":"عنوان قصير","detail":"وصف من جملتين","steps":["خطوة 1","خطوة 2","خطوة 3"],"topic":"الهواية أو التخصص المرتبط"}]}`;
      const text = await analyze(prompt, 2048);
      const parsed = parseJsonLoose(text);
      const newItems = (parsed.items || []).map((it) => ({ id: uid(), kind, title: it.title, detail: it.detail, steps: it.steps || [], topic: it.topic || "", done: false }));
      const results = await Promise.all(newItems.map((it) => store.saveAchieve(it)));
      const savedItems = newItems.filter((_, i) => results[i].ok);
      setAchieve((prev) => [...savedItems, ...prev]);
      setSmartUnavailable(false);
      setPromptText("");
      if (savedItems.length < newItems.length) showToast(t("achieve.addedPartial", { saved: savedItems.length, total: newItems.length }));
      else showToast(t("achieve.addedItems", { count: newItems.length }));
    } catch (err) {
      console.error("[AchieveView] generate failed:", err);
      setSmartUnavailable(true);
      const existing = achieve.slice(0, 8).map((a) => a.title);
      const localItems = localAchieveSuggestions(profile, kind, existing);
      const newItems = localItems.map((it) => ({ id: uid(), kind, title: it.title, detail: it.detail, steps: it.steps || [], topic: it.topic || "", done: false }));
      const results = await Promise.all(newItems.map((it) => store.saveAchieve(it)));
      const savedItems = newItems.filter((_, i) => results[i].ok);
      setAchieve((prev) => [...savedItems, ...prev]);
      if (savedItems.length < newItems.length) showToast(t("achieve.addedPartial", { saved: savedItems.length, total: newItems.length }));
      else showToast(t("achieve.addedTasks", { count: newItems.length }));
    }
    finally { setLoading(false); }
  }

  function handleGenerate() {
    if (!hasIdentity) { showToast(IDENTITY_NUDGE); return; }
    if (!promptText.trim()) { showToast(t("achieve.typeFirst")); return; }
    generate(kindForTab, promptText.trim());
  }

  async function toggleDone(item) {
    const updated = { ...item, done: !item.done };
    setAchieve((prev) => prev.map((a) => a.id === item.id ? updated : a));
    const res = await store.saveAchieve(updated);
    if (!res.ok) { setAchieve((prev) => prev.map((a) => a.id === item.id ? item : a)); showToast(t("achieve.saveFailed")); return; }
    if (!item.done) { addPoints(25); playAchievementSound(); showToast(t("achieve.wellDonePoints")); }
    else addPoints(-25, t("achieve.revertReason"));
  }
  async function remove(id) {
    const removed = achieve.find((a) => a.id === id);
    setAchieve((prev) => prev.filter((a) => a.id !== id));
    const res = await store.deleteAchieve(id);
    if (!res.ok) { if (removed) setAchieve((prev) => [...prev, removed]); showToast(t("achieve.deleteFailed")); return; }
    if (removed?.done) addPoints(-25, t("achieve.deleteCompletedReason"));
    showToast(t("achieve.deleted"));
  }

  useEffect(() => { setPromptText(""); }, [tab]);

  const kindMap = { challenge: t("achieve.kindMap.challenge"), project: t("achieve.kindMap.project"), path: t("achieve.kindMap.path") };
  const promptPlaceholder = tab === "challenges" ? t("achieve.promptPlaceholder.challenge") : tab === "projects" ? t("achieve.promptPlaceholder.project") : t("achieve.promptPlaceholder.path");

  const achieveTabs = [
    { id: "challenges", labelKey: "achieve.tabs.challenges", icon: Trophy },
    { id: "projects", labelKey: "achieve.tabs.projects", icon: Target },
    { id: "paths", labelKey: "achieve.tabs.paths", icon: BookOpen },
  ];
  const moods = [
    { key: "excited" }, { key: "normal" }, { key: "tired" }, { key: "distracted" },
  ];

  return (
    <div style={S.view}>
      <div style={S.achieveHero}>
        <div style={S.achieveHeroIcon}><Rocket size={20} color="var(--on-accent)" /></div>
        <div>
          <div style={S.achieveHeroTitle}>{t("achieve.heroTitle")}</div>
          <div style={S.achieveHeroSub}>{t("achieve.heroSub")}</div>
        </div>
      </div>
      {smartUnavailable && (
        <div style={S.smartBanner}><Zap size={14} color="#C9A24B" /><span>{t("achieve.smartModeUnavailable")}</span></div>
      )}
      {!hasIdentity && (
        <div style={S.setupCard} data-tour="identity-setup-card">
          <User size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={S.setupText}>
            {IDENTITY_NUDGE}
            <div>
              <button onClick={() => setView("settings")} style={{ ...S.linkBtn, marginTop: 8 }}>{t("achieve.goToSettings")}</button>
            </div>
          </div>
        </div>
      )}
      {hasIdentity && (
      <div style={S.coachCard} data-tour="achieve-coach-card">
        <div style={S.coachTitleRow}><Sparkles size={15} color="#C9A24B" /><span style={S.coachTitle}>{t("achieve.moodCardTitle")}</span></div>
        <p style={S.profileHint}>{t("achieve.moodCardSub")}</p>
        <div style={S.moodRow}>
          {moods.map((m) => (
            <button key={m.key} onClick={() => askCoach(t(`achieve.moods.${m.key}`))} disabled={coachLoading} style={S.moodBtn}>{t(`achieve.moods.${m.key}`)}</button>
          ))}
        </div>
        {coachLoading && <div style={S.coachLoading}><Loader2 size={15} className="spin" /> {t("achieve.thinking")}</div>}
        {coachReply && !coachReply.error && (
          <div style={S.coachReply}>
            <div style={S.coachMessage}>{isolateNumbers(coachReply.message)}</div>
            <div style={S.coachActivity}><Rocket size={14} color="#C9A24B" /> {isolateNumbers(coachReply.activity)}</div>
            {coachReply.why && <div style={S.coachWhy}>{isolateNumbers(coachReply.why)}</div>}
          </div>
        )}
      </div>
      )}
      <div style={S.achieveTabs}>
        {achieveTabs.map((tabItem) => {
          const Icon = tabItem.icon;
          return (
            <button key={tabItem.id} onClick={() => setTab(tabItem.id)} style={{ ...S.achieveTab, ...(tab === tabItem.id ? S.achieveTabActive : {}) }}>
              <Icon size={14} /> {t(tabItem.labelKey)}
            </button>
          );
        })}
      </div>
      {hasIdentity && (
      <div style={HS.chatInputRow}>
        <input
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleGenerate(); }}
          placeholder={promptPlaceholder}
          style={HS.chatInput}
          disabled={loading}
        />
        <button onClick={handleGenerate} disabled={loading || !promptText.trim()} style={{ ...HS.chatSend, ...(loading || !promptText.trim() ? { opacity: 0.5, cursor: "default" } : {}) }}>
          {loading ? <Loader2 size={16} className="spin" /> : <Send size={17} />}
        </button>
      </div>
      )}
      <div style={S.achieveList} className="stagger-in responsive-card-list">
        {filtered.length === 0 && !loading && <div style={S.emptyState}><div style={S.emptyStateTitle}>{t("achieve.emptyTitle")}</div><div style={S.emptyStateSub}>{t("achieve.emptySub")}</div></div>}
        {filtered.map((item) => <AchieveCard key={item.id} item={item} kindLabel={kindMap[item.kind]} onToggle={() => toggleDone(item)} onRemove={() => remove(item.id)} />)}
      </div>
    </div>
  );
}

function AchieveCard({ item, kindLabel, onToggle, onRemove }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " " + (item.topic || ""))}`;
  return (
    <div style={{ ...S.achieveCard, ...(item.done ? S.achieveCardDone : {}) }}>
      <div style={S.achieveCardTop}>
        <span onClick={onToggle} style={{ ...S.checkbox, ...(item.done ? S.checkboxDone : {}) }}>{item.done && <Check size={12} />}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.achieveCardHead}>
            <span style={S.achieveKind}>{kindLabel}</span>
            {item.topic && <span style={S.achieveTopic}>{item.topic}</span>}
          </div>
          <div style={{ ...S.achieveTitle, ...(item.done ? S.taskTitleDone : {}) }}>{item.title}</div>
        </div>
        <button onClick={onRemove} style={S.deleteBtn}><Trash2 size={14} /></button>
      </div>
      <p style={S.achieveDetail}>{item.detail}</p>
      {item.steps?.length > 0 && (
        <>
          <button onClick={() => setOpen(!open)} style={S.achieveToggle}>
            <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            {open ? t("achieve.hideSteps") : t("achieve.stepsCount", { count: item.steps.length })}
          </button>
          {open && (
            <div style={S.achieveSteps}>
              {item.steps.map((s, i) => <div key={i} style={S.achieveStep}><span style={S.achieveStepNum}>{i + 1}</span>{s}</div>)}
            </div>
          )}
        </>
      )}
      <a href={searchUrl} target="_blank" rel="noopener noreferrer" style={S.achieveLink}>
        <ExternalLink size={12} /> {t("achieve.tutorialVideos")}
      </a>
    </div>
  );
}

const FREE_CATEGORY_LIMIT = 5;

// إدارة الفئات (إضافة/تعديل/حذف) - مكوّن مستقل يُستخدَم من مكانين: بطاقة
// "فئاتك" داخل الإعدادات (كما كانت دائماً)، وأيضاً من نافذة سريعة تُفتح
// مباشرة من لوحة "اليوم" (زر بجانب شرائط الفئات) - حتى لا يحتاج المستخدم
// للتنقّل لصفحة الإعدادات كاملة فقط لإضافة فئة جديدة. مسار الحفظ نفسه
// (store.saveCategory/deleteCategory) في الحالتين، بلا أي تكرار منطق.
function CategoryManagerCard({ categories, setCategories, isSub, showToast }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [editing, setEditing] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", color: "" });
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_CHOICES[0]);

  async function addCategory() {
    const name = newName.trim();
    if (!name) return;
    if (!isSub && categories.length >= FREE_CATEGORY_LIMIT) {
      showToast(t("settings.unlimitedCategoriesUpsell"));
      return;
    }
    const cat = { id: uid(), name, color: newColor };
    setCategories((prev) => [...prev, cat]);
    const res = await store.saveCategory(cat);
    if (res.ok) { setNewName(""); showToast(t("settings.categoryAdded")); }
    else {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showToast(t("settings.categorySaveFailed"));
    }
  }
  function startEditing(c) {
    setEditing(c.id);
    setEditDraft({ name: c.name, color: c.color });
  }
  async function confirmEditing(id) {
    const name = editDraft.name.trim();
    if (!name) { showToast(t("settings.categoryNameEmpty")); return; }
    let updated;
    setCategories((prev) => prev.map((c) => { if (c.id === id) { updated = { ...c, name, color: editDraft.color }; return updated; } return c; }));
    const res = updated ? await store.saveCategory(updated) : { ok: true };
    if (res.ok) setEditing(null);
    else showToast(t("settings.editSaveFailed"));
  }
  async function removeCategory(id) {
    const removed = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    const res = await store.deleteCategory(id);
    if (res.ok) showToast(t("settings.categoryDeleted"));
    else {
      if (removed) setCategories((prev) => [...prev, removed]);
      showToast(t("settings.categoryDeleteFailed"));
    }
  }

  return (
    <>
      <div style={S.catEditorCard}>
        <div style={S.catEditorHeader}><Palette size={15} color="#C9A24B" /><span>{t("settings.yourCategories")}</span></div>
        <div style={S.catEditList}>
          {categories.map((c) => (
            <div key={c.id} style={S.catEditRow}>
              {editing === c.id ? (
                <>
                  <div style={S.colorPickRow}>{COLOR_CHOICES.map((col) => <button key={col} onClick={() => setEditDraft((d) => ({ ...d, color: col }))} style={{ ...S.colorDot, background: col, ...(editDraft.color === col ? S.colorDotSelected : {}) }} />)}</div>
                  <input
                    value={editDraft.name}
                    onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && confirmEditing(c.id)}
                    style={S.catEditInput}
                    autoFocus
                  />
                  <button onClick={() => confirmEditing(c.id)} style={S.catSaveBtn}><Check size={14} /></button>
                </>
              ) : (
                <>
                  <span style={{ ...S.legendDot, background: c.color, width: 12, height: 12 }} />
                  <span style={S.catEditName}>{isEn ? (DEFAULT_CATEGORIES.find((d) => d.id === c.id && d.name === c.name)?.nameEn || c.name) : c.name}</span>
                  <button onClick={() => startEditing(c)} style={S.catIconBtn}><Edit3 size={13} /></button>
                  <button onClick={() => removeCategory(c.id)} style={S.catIconBtn}><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={S.catAddRow}>
          <div style={S.colorPickRow}>{COLOR_CHOICES.map((col) => <button key={col} onClick={() => setNewColor(col)} style={{ ...S.colorDot, background: col, ...(newColor === col ? S.colorDotSelected : {}) }} />)}</div>
          <div style={S.catAddInputRow}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder={t("settings.newCategoryPlaceholder")} style={S.catEditInput} />
            <button onClick={addCategory} style={S.taskAddBtn}><Plus size={16} /></button>
          </div>
        </div>
      </div>
      {!isSub && categories.length >= FREE_CATEGORY_LIMIT && (
        <UpsellCard icon={Palette} title={t("settings.categoriesUpsellTitle")} message={t("settings.categoriesUpsellMessage")} compact />
      )}
    </>
  );
}

// بطاقة حالة الإشعارات بلغة واضحة بلا أي مصطلحات تقنية (لا "Push API"، لا
// "Service Worker") - 5 حالات فعلية (Phase E): غير مدعومة، يحتاج تثبيت
// (آيفون/آيباد بلا تثبيت للشاشة الرئيسية)، لم تُفعَّل بعد، مفعّلة فعلاً،
// أو لم تكتمل (تحتاج إعادة محاولة). الحالة نفسها من getNotificationStatus
// في src/lib/push.js - لا منطق حالة مكرَّر هنا.
function NotificationStatusCard({ profile, onEnable, onDisable }) {
  const { t } = useTranslation();
  const status = getNotificationStatus(profile);

  const STATUS_META = {
    unsupported: { dot: "#dc2626", icon: AlertTriangle },
    install_required: { dot: "#d97706", icon: Smartphone },
    permission_required: { dot: "#2563eb", icon: Bell },
    enabled: { dot: "#16a34a", icon: CheckCircle2 },
    failed: { dot: "#dc2626", icon: RefreshCw },
  };
  const key = { unsupported: "unsupported", install_required: "installRequired", permission_required: "permissionRequired", enabled: "enabled", failed: "failed" }[status];
  const meta = STATUS_META[status];
  const Icon = meta.icon;

  return (
    <div style={S.catEditorCard}>
      <div style={S.catEditorHeader}><Bell size={15} color="#C9A24B" /><span>{t("settings.notifications")}</span></div>
      <p style={S.profileHint}>{t("settings.notifNote")}</p>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: meta.dot, marginTop: 4, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>
            <Icon size={14} color={meta.dot} />
            <span>{t(`settings.notifStatus.${key}.title`)}</span>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--muted2)", margin: "3px 0 0" }}>{t(`settings.notifStatus.${key}.desc`)}</p>
          {status === "install_required" && (
            <p style={{ fontSize: 11, color: "var(--muted2)", margin: "6px 0 0", lineHeight: 1.6 }}>{t("settings.notifStatus.installRequired.steps")}</p>
          )}
        </div>
      </div>
      {status === "permission_required" && (
        <button onClick={onEnable} style={{ ...S.saveBtn, marginTop: 12 }}><Bell size={14} /> {t("settings.enableNotif")}</button>
      )}
      {status === "failed" && (
        <button onClick={onEnable} style={{ ...S.saveBtn, marginTop: 12 }}><RefreshCw size={14} /> {t("settings.notifStatus.retry")}</button>
      )}
      {status === "enabled" && (
        <button onClick={onDisable} style={{ ...S.exportBtn, marginTop: 12, marginBottom: 0 }}><Bell size={14} /> {t("settings.notifOnTurnOff")}</button>
      )}
    </div>
  );
}

// TEMP: للاختبار اليدوي فقط - إزالة لاحقاً. تعرض معرّف حساب المستخدم
// الحالي (نفس user.id في Supabase، وهو owner المخزَّن فعلياً عبر
// getOwner()) لإضافته يدوياً إلى PRAYER_TEST_ALLOWLIST في Netlify - أُضيفت
// خصيصاً لأن المستخدم يعمل من الموبايل بلا وصول سهل لأدوات المطوّر
// (Developer Console) على حاسوب لقراءة القيمة من localStorage مباشرة.
function AccountIdDebugModal({ onClose, showToast, isEn }) {
  const ownerId = getOwner();
  async function copyId() {
    try {
      await navigator.clipboard.writeText(ownerId);
      showToast(isEn ? "Copied" : "تم النسخ");
    } catch {
      showToast(isEn ? "Couldn't copy - select and copy manually" : "تعذّر النسخ - حدّد النص وانسخه يدوياً");
    }
  }
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span>{isEn ? "My account ID" : "معرّف حسابي"}</span>
          <button onClick={onClose} style={S.iconBtn}><X size={18} /></button>
        </div>
        <div style={S.modalBody}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", wordBreak: "break-all", background: "var(--surface-raised)", border: "1px solid var(--border2)", borderRadius: 10, padding: "12px 14px", direction: "ltr", textAlign: "center" }}>
            {ownerId}
          </div>
          <button onClick={copyId} style={{ ...S.saveBtn, marginTop: 12 }}><Copy size={14} /> {isEn ? "Copy" : "نسخ"}</button>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ categories, setCategories, gamify, hasCloud, showToast, profile, setProfile, pointsLog, onStartTour, subscription, theme, toggleTheme, fontSize, changeFontSize, highContrast, toggleHighContrast, spacious, toggleSpacious }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const isSub = isActiveSubscriber(subscription);
  const [showModuleReplays, setShowModuleReplays] = useState(false);
  // TEMP: للاختبار اليدوي فقط - إزالة لاحقاً (انظر AccountIdDebugModal أعلاه).
  const [showAccountIdDebug, setShowAccountIdDebug] = useState(false);

  // إعادة تشغيل جولة سياقية واحدة (Onboarding - Phase E): يصفّر علم اكتمال
  // تلك الوحدة فقط في tour_progress.modules، بلا مساس بـtourSeen أو بقية
  // الوحدات - أول زيارة قادمة لذلك القسم فعلياً تُظهر جولته من جديد.
  function resetModuleTour(moduleId) {
    setProfile((p) => ({ ...p, tourProgress: { ...p.tourProgress, modules: { ...(p.tourProgress?.modules || {}), [moduleId]: { done: false } } } }));
    store.saveTourProgress({ modules: { [moduleId]: { done: false } } });
    showToast(t("settings.replayQueued"));
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission(i18n.language);
    // "مفعّلة" فعلياً تعني الآن: إذن + اشتراك push حقيقي + حفظه بنجاح في
    // Supabase معاً - إذن ممنوح وحده (granted/subscribed) بلا حفظ الاشتراك
    // (saved) لا يعني شيئاً عملياً، إذ لن يصل أي Push حقيقي لاحقاً بلا حفظه.
    const enabled = !!result.saved;
    setProfile((p) => ({ ...p, notificationsEnabled: enabled, notificationsAsked: true }));
    await store.saveNotificationsPreference(enabled, true);
    if (enabled) showToast(t("settings.notifEnabled"));
    else showToast(result.error ? t(`common.errors.${result.error}`) : t("settings.notifNotEnabled"));
  }
  async function handleDisableNotifications() {
    await disablePush();
    setProfile((p) => ({ ...p, notificationsEnabled: false, notificationsAsked: true }));
    await store.saveNotificationsPreference(false, true);
    showToast(t("settings.notifDisabled"));
  }
  async function toggleCustomColors() {
    const prev = profile.customColorsEnabled;
    const next = !prev;
    setProfile((p) => ({ ...p, customColorsEnabled: next }));
    const res = await store.saveCustomColorsEnabled(next);
    if (!res.ok) { setProfile((p) => ({ ...p, customColorsEnabled: prev })); showToast(t("settings.colorsSaveFailed")); }
  }
  async function setSectionColor(sectionId, color) {
    const prev = { ...(profile.sectionColors || {}) };
    const next = { ...prev };
    if (color === null) delete next[sectionId]; else next[sectionId] = color;
    setProfile((p) => ({ ...p, sectionColors: next }));
    const res = await store.saveSectionColors(next);
    if (!res.ok) { setProfile((p) => ({ ...p, sectionColors: prev })); showToast(t("settings.sectionColorSaveFailed")); }
  }
  async function toggleSoundEnabled() {
    const prev = profile.soundEnabled;
    const next = !prev;
    setProfile((p) => ({ ...p, soundEnabled: next }));
    const res = await store.saveSoundEnabled(next);
    if (!res.ok) { setProfile((p) => ({ ...p, soundEnabled: prev })); showToast(t("settings.soundSaveFailed")); }
  }

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>{t("settings.title")}</div>
      <ProfileCard profile={profile} setProfile={setProfile} showToast={showToast} />
      <div style={S.catEditorCard}>
        <div style={S.catEditorHeader}>{theme === "dark" ? <Moon size={15} color="#C9A24B" /> : <Sun size={15} color="#C9A24B" />}<span>{t("settings.appearance")}</span></div>
        <div style={S.rangeToggle}>
          <button onClick={() => theme !== "light" && toggleTheme()} style={{ ...S.rangeBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, ...(theme === "light" ? S.rangeBtnActive : {}) }}>
            <Sun size={14} /> {t("settings.light")}
          </button>
          <button onClick={() => theme !== "dark" && toggleTheme()} style={{ ...S.rangeBtn, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, ...(theme === "dark" ? S.rangeBtnActive : {}) }}>
            <Moon size={14} /> {t("settings.dark")}
          </button>
        </div>
      </div>
      <div style={S.catEditorCard}>
        <div style={S.catEditorHeader}><Accessibility size={15} color="#C9A24B" /><span>{t("settings.accessibility")}</span></div>
        <p style={S.profileHint}>{t("settings.accessibilityNote")}</p>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--muted2)", marginBottom: 8 }}>
          <ALargeSmall size={14} color="#C9A24B" /> {t("settings.fontSize")}
        </div>
        <div style={S.rangeToggle}>
          <button onClick={() => changeFontSize("normal")} style={{ ...S.rangeBtn, flex: 1, ...(fontSize === "normal" ? S.rangeBtnActive : {}) }}>{t("settings.fontNormal")}</button>
          <button onClick={() => changeFontSize("large")} style={{ ...S.rangeBtn, flex: 1, ...(fontSize === "large" ? S.rangeBtnActive : {}) }}>{t("settings.fontLarge")}</button>
          <button onClick={() => changeFontSize("xlarge")} style={{ ...S.rangeBtn, flex: 1, ...(fontSize === "xlarge" ? S.rangeBtnActive : {}) }}>{t("settings.fontXLarge")}</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--muted2)", margin: "14px 0 8px" }}>
          <Contrast size={14} color="#C9A24B" /> {t("settings.highContrast")}
        </div>
        <div style={S.rangeToggle}>
          <button onClick={() => highContrast && toggleHighContrast()} style={{ ...S.rangeBtn, flex: 1, ...(!highContrast ? S.rangeBtnActive : {}) }}>{t("settings.off")}</button>
          <button onClick={() => !highContrast && toggleHighContrast()} style={{ ...S.rangeBtn, flex: 1, ...(highContrast ? S.rangeBtnActive : {}) }}>{t("settings.on")}</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--muted2)", margin: "14px 0 8px" }}>
          <StretchHorizontal size={14} color="#C9A24B" /> {t("settings.moreSpacing")}
        </div>
        <div style={S.rangeToggle}>
          <button onClick={() => spacious && toggleSpacious()} style={{ ...S.rangeBtn, flex: 1, ...(!spacious ? S.rangeBtnActive : {}) }}>{t("settings.off")}</button>
          <button onClick={() => !spacious && toggleSpacious()} style={{ ...S.rangeBtn, flex: 1, ...(spacious ? S.rangeBtnActive : {}) }}>{t("settings.on")}</button>
        </div>
      </div>
      <div style={S.catEditorCard}>
        <div style={S.catEditorHeader}><Palette size={15} color="#C9A24B" /><span>{t("settings.sectionColors")}</span></div>
        <p style={S.profileHint}>{t("settings.sectionColorsNote")}</p>
        <div style={S.rangeToggle}>
          <button onClick={() => profile.customColorsEnabled && toggleCustomColors()} style={{ ...S.rangeBtn, flex: 1, ...(!profile.customColorsEnabled ? S.rangeBtnActive : {}) }}>{t("settings.off")}</button>
          <button onClick={() => !profile.customColorsEnabled && toggleCustomColors()} style={{ ...S.rangeBtn, flex: 1, ...(profile.customColorsEnabled ? S.rangeBtnActive : {}) }}>{t("settings.on")}</button>
        </div>
        {profile.customColorsEnabled && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {MENU_SECTIONS.flatMap((s) => s.items).filter((it) => !it.comingSoon).map((item) => {
              const current = profile.sectionColors?.[item.id];
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 12, color: "var(--ink-soft)", flex: 1 }}>{t(item.labelKey)}</span>
                  <button onClick={() => setSectionColor(item.id, null)} title={t("settings.defaultGold")} style={{ width: 20, height: 20, borderRadius: "50%", border: !current ? "2px solid var(--ink)" : "1px solid var(--border2)", background: "var(--gold)", cursor: "pointer", padding: 0, flexShrink: 0 }} />
                  {SECTION_COLOR_PALETTE.map((c) => (
                    <button key={c} onClick={() => setSectionColor(item.id, c)} title={c} style={{ width: 20, height: 20, borderRadius: "50%", border: current === c ? "2px solid var(--ink)" : "1px solid var(--border2)", background: c, cursor: "pointer", padding: 0, flexShrink: 0 }} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <NotificationStatusCard profile={profile} onEnable={handleEnableNotifications} onDisable={handleDisableNotifications} />
      <div style={S.catEditorCard}>
        <div style={S.catEditorHeader}><Volume2 size={15} color="#C9A24B" /><span>{t("settings.soundEffects")}</span></div>
        <p style={S.profileHint}>{t("settings.soundNote")}</p>
        <div style={S.rangeToggle}>
          <button onClick={() => profile.soundEnabled && toggleSoundEnabled()} style={{ ...S.rangeBtn, flex: 1, ...(!profile.soundEnabled ? S.rangeBtnActive : {}) }}>{t("settings.soundOff")}</button>
          <button onClick={() => !profile.soundEnabled && toggleSoundEnabled()} style={{ ...S.rangeBtn, flex: 1, ...(profile.soundEnabled ? S.rangeBtnActive : {}) }}>{t("settings.soundOn")}</button>
        </div>
      </div>
      <SubscriptionCard subscription={subscription} />
      <button onClick={onStartTour} style={S.exportBtn}><GraduationCap size={15} /> {t("settings.replayTour")}</button>
      <button onClick={() => setShowModuleReplays((v) => !v)} style={{ ...S.exportBtn, marginTop: -8 }}>
        <RefreshCw size={14} /> {t("settings.replaySectionTours")}
      </button>
      {showModuleReplays && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: -8, marginBottom: 16 }}>
          {MODULE_TOUR_LIST.map((m) => (
            <button key={m.id} onClick={() => resetModuleTour(m.id)} style={{ ...S.exportBtn, marginTop: 0, marginBottom: 0, justifyContent: "space-between" }}>
              <span>{t(`nav.${m.navKey}`)}</span>
              <span style={{ color: "var(--gold)" }}>{t("settings.replay")}</span>
            </button>
          ))}
        </div>
      )}
      {!hasCloud && (
        <div style={S.setupCard}>
          <Cloud size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={S.setupText}>{t("settings.localOnlyNote")}</div>
        </div>
      )}
      <div style={S.badgesCard}>
        <div style={S.chartTitle}>{t("settings.yourBadges")}</div>
        <div style={S.badgesGrid} className="stagger-in">
          {BADGES.map((b) => {
            const earned = gamify.badges.includes(b.id);
            return (
              <div key={b.id} style={{ ...S.badge, ...(earned ? S.badgeEarned : {}) }}>
                <div style={{ ...S.badgeIcon, ...(earned ? S.badgeIconEarned : {}) }}>{b.icon}</div>
                <div style={S.badgeName}>{isEn ? (b.nameEn || b.name) : b.name}</div>
                <div style={S.badgeDesc}>{earned ? (isEn ? (b.descEn || b.desc) : b.desc) : t("settings.locked")}</div>
              </div>
            );
          })}
        </div>
      </div>
      <CategoryManagerCard categories={categories} setCategories={setCategories} isSub={isSub} showToast={showToast} />
      {pointsLog && pointsLog.length > 0 && (
        <div style={S.catEditorCard}>
          <div style={S.catEditorHeader}><span style={{ fontSize: 14 }}>📋</span><span>{t("settings.pointsLog")}</span></div>
          <div>
            {pointsLog.slice(0, 20).map((entry) => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{entry.reason}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{entry.date}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: entry.amount >= 0 ? "#5FA8A0" : "#E05252", whiteSpace: "nowrap", marginInlineStart: 8 }}>
                  {entry.amount >= 0 ? "+" : ""}{entry.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <RoadmapCard />
      {/* TEMP: للاختبار اليدوي فقط - إزالة لاحقاً (هذه البطاقة كاملة + AccountIdDebugModal أعلاه). */}
      {hasCloud && (
        <div style={S.catEditorCard}>
          <div style={S.catEditorHeader}><span style={{ fontSize: 14 }}>🔧</span><span>{isEn ? "Technical info (temporary)" : "معلومات تقنية (مؤقت)"}</span></div>
          <button onClick={() => setShowAccountIdDebug(true)} style={{ ...S.exportBtn, marginBottom: 0 }}>{isEn ? "Show my account ID" : "عرض معرّف حسابي"}</button>
        </div>
      )}
      {showAccountIdDebug && <AccountIdDebugModal onClose={() => setShowAccountIdDebug(false)} showToast={showToast} isEn={isEn} />}
    </div>
  );
}

const SUBSCRIBE_INSTAGRAM_URL = "https://www.instagram.com/hjmasar";

// بطاقة تشجيع عامة تحلّ محل أي قسم/ميزة مدفوعة لغير المشترك. الرسالة
// تركّز دائماً على القيمة التي يفوّتها المستخدم، لا على "ادفع"، بأسلوب
// دعوة راقية غير مُلحّة — انظر تعليق SUB.upsellCard أعلاه لتبرير التصميم.
function UpsellCard({ icon: Icon = Crown, title, message, compact }) {
  const { t } = useTranslation();
  return (
    <div style={{ ...SUB.upsellCard, ...(compact ? SUB.upsellCardCompact : {}) }} data-tour="upsell-card">
      <div style={SUB.upsellIconBadge}><Icon size={compact ? 20 : 26} color="var(--on-accent)" /></div>
      <div style={SUB.upsellTitle}>{title}</div>
      <p style={SUB.upsellMessage}>{message}</p>
      <a href={SUBSCRIBE_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={SUB.upsellBtn}>
        <Send size={15} /> {t("common.buttons.subscribeInstagram")}
      </a>
    </div>
  );
}

function SubscriptionCard({ subscription }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const isVip = !!subscription?.isVip;
  const active = isActiveSubscriber(subscription);

  let endLabel = null;
  if (active && !isVip && subscription?.subscriptionEnd) {
    const [y, m, d] = subscription.subscriptionEnd.split("-").map(Number);
    endLabel = arabicDate(new Date(y, m - 1, d), { day: "numeric", month: "long", year: "numeric" }, language === "en" ? "en-US" : undefined);
  }

  return (
    <div style={SUB.card}>
      <div style={SUB.head}>
        <div style={SUB.iconBadge}>{isVip ? <Crown size={20} color="var(--on-accent)" /> : <Star size={20} color="var(--on-accent)" />}</div>
        <div>
          <div style={SUB.title}>{isVip ? t("subscription.vipTitle") : active ? t("subscription.activeTitle") : t("subscription.inactiveTitle")}</div>
          <div style={SUB.subtitle}>
            {isVip
              ? t("subscription.vipSub")
              : active
              ? t("subscription.activeSub", { plan: t(subscription.subscriptionType === "yearly" ? "subscription.planYearly" : "subscription.planMonthly") })
              : t("subscription.inactiveSub")}
          </div>
        </div>
      </div>

      {active && !isVip && endLabel && (
        <div style={SUB.statusRow}>
          <span style={SUB.statusLabel}>{t("subscription.endsOn")}</span>
          <span style={SUB.statusValue}>{endLabel}</span>
        </div>
      )}

      {!active && (
        <>
          <div style={SUB.plansRow}>
            <div style={SUB.planCard}>
              <div style={SUB.planLabel}>{t("subscription.monthly")}</div>
              <div style={SUB.planPrice}>{i18n.language === "en" ? "3 KWD" : "3 د.ك"}</div>
            </div>
            <div style={SUB.planCard}>
              <div style={SUB.planLabel}>{t("subscription.yearly")}</div>
              <div style={SUB.planPrice}>{i18n.language === "en" ? "25 KWD" : "25 د.ك"}</div>
            </div>
          </div>
          <a href={SUBSCRIBE_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" style={SUB.subscribeBtn}>
            <Send size={15} /> {t("common.buttons.subscribeInstagram")}
          </a>
        </>
      )}
    </div>
  );
}

// HEALTH_CONDITIONS/NO_CONDITION وbmiCategory() في lib/health.js يعيدون
// نصوصاً عربية خامًا مباشرة (لا حقل .key منفصل لكل شرط صحي أو فئة BMI،
// خلافاً لـACTIVITY_LEVELS التي تملك .key فعلاً) - هاتان الخريطتان تربطان
// كل نص عربي خام بمفتاح you.healthConditions.*/you.bmiCategories.* في ملفات
// الترجمة، دون أي تعديل على lib/health.js نفسه.
const CONDITION_KEY_MAP = {
  "سكري": "diabetes", "ضغط الدم": "blood_pressure", "أمراض الكلى": "kidney",
  "أمراض الكبد": "liver", "أمراض القلب": "heart", "ارتفاع الكولسترول": "cholesterol",
};
const BMI_CATEGORY_KEY_MAP = {
  "نقص وزن": "underweight", "وزن طبيعي": "normal", "زيادة وزن": "overweight", "سمنة": "obese",
};

function YouView({ healthProfile, setHealthProfile, showToast }) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const hasData = !!(healthProfile.heightCm && healthProfile.weightKg && healthProfile.age && healthProfile.gender && healthProfile.activityLevel);
  const [editing, setEditing] = useState(!hasData);
  const [draft, setDraft] = useState(() => ({
    heightCm: healthProfile.heightCm ?? "",
    weightKg: healthProfile.weightKg ?? "",
    age: healthProfile.age ?? "",
    gender: healthProfile.gender ?? "",
    activityLevel: healthProfile.activityLevel ?? "",
    conditions: healthProfile.conditions || [],
  }));

  useEffect(() => {
    setDraft({
      heightCm: healthProfile.heightCm ?? "",
      weightKg: healthProfile.weightKg ?? "",
      age: healthProfile.age ?? "",
      gender: healthProfile.gender ?? "",
      activityLevel: healthProfile.activityLevel ?? "",
      conditions: healthProfile.conditions || [],
    });
  }, [healthProfile]);

  function change(field, val) { setDraft((d) => ({ ...d, [field]: val })); }

  function toggleCondition(cond) {
    setDraft((d) => {
      if (cond === NO_CONDITION) {
        return { ...d, conditions: d.conditions.includes(NO_CONDITION) ? [] : [NO_CONDITION] };
      }
      const withoutNone = d.conditions.filter((c) => c !== NO_CONDITION);
      const has = withoutNone.includes(cond);
      return { ...d, conditions: has ? withoutNone.filter((c) => c !== cond) : [...withoutNone, cond] };
    });
  }

  async function save() {
    const heightCm = Number(draft.heightCm);
    const weightKg = Number(draft.weightKg);
    const age = Number(draft.age);
    if (!heightCm || !weightKg || !age || !draft.gender || !draft.activityLevel) {
      // "missing locale key": you.missingFieldsError
      showToast(language === "en" ? "Complete your height, weight, age, gender, and activity level" : "أكمل الطول والوزن والعمر والجنس ومستوى النشاط");
      return;
    }
    const metrics = computeHealthMetrics({ heightCm, weightKg, age, gender: draft.gender, activityLevel: draft.activityLevel });
    const next = {
      heightCm, weightKg, age, gender: draft.gender, activityLevel: draft.activityLevel, conditions: draft.conditions,
      bmi: metrics.bmi?.value ?? null, bmiCategory: metrics.bmi?.category ?? null,
      ibw: metrics.ibw, ree: metrics.ree, tee: metrics.tee,
    };
    const prevHealthProfile = healthProfile;
    setHealthProfile(next);
    const res = await store.saveHealthProfile(next);
    if (!res.ok) { setHealthProfile(prevHealthProfile); showToast(t("common.errors.saveFailed")); return; }
    setEditing(false);
    showToast(t("todayView.savedSuccess"));
  }

  const showDisclaimer = (healthProfile.conditions || []).some((c) => c !== NO_CONDITION);

  if (editing) {
    return (
      <div style={S.view}>
        <div style={YS.hero}>
          <div style={YS.heroIcon}><User size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={YS.heroTitle}>{t("nav.you")}</div>
            {/* "missing locale key": you.heroSubEdit */}
            <div style={YS.heroSub}>{language === "en" ? "Your basic data — the foundation the nutrition and fitness sections build on later." : "بياناتك الأساسية — أساس تُبنى عليه أقسام التغذية والرياضة لاحقاً."}</div>
          </div>
        </div>
        <div style={YS.formCard} data-tour="you-form-card">
          <div style={YS.row2}>
            <div style={YS.col}>
              <label style={S.label}>{language === "en" ? "Height (cm)" : "الطول (سم)"}</label>
              <input type="number" inputMode="decimal" value={draft.heightCm} onChange={(e) => change("heightCm", e.target.value)} placeholder={language === "en" ? "e.g. 170" : "مثال: 170"} style={S.input} />
            </div>
            <div style={YS.col}>
              <label style={S.label}>{language === "en" ? "Weight (kg)" : "الوزن (كغم)"}</label>
              <input type="number" inputMode="decimal" value={draft.weightKg} onChange={(e) => change("weightKg", e.target.value)} placeholder={language === "en" ? "e.g. 70" : "مثال: 70"} style={S.input} />
            </div>
          </div>
          <div style={YS.row2}>
            <div style={YS.col}>
              <label style={S.label}>{language === "en" ? "Age (years)" : "العمر (سنة)"}</label>
              <input type="number" inputMode="numeric" value={draft.age} onChange={(e) => change("age", e.target.value)} placeholder={language === "en" ? "e.g. 25" : "مثال: 25"} style={S.input} />
            </div>
            <div style={YS.col}>
              <label style={S.label}>{language === "en" ? "Gender" : "الجنس"}</label>
              <div style={PS.modeToggleRow}>
                <button onClick={() => change("gender", "male")} style={{ ...PS.modeToggleBtn, ...(draft.gender === "male" ? PS.modeToggleBtnActive : {}) }}>{language === "en" ? "Male" : "ذكر"}</button>
                <button onClick={() => change("gender", "female")} style={{ ...PS.modeToggleBtn, ...(draft.gender === "female" ? PS.modeToggleBtnActive : {}) }}>{language === "en" ? "Female" : "أنثى"}</button>
              </div>
            </div>
          </div>
          <label style={S.label}>{language === "en" ? "Physical activity level" : "مستوى النشاط البدني"}</label>
          <select value={draft.activityLevel} onChange={(e) => change("activityLevel", e.target.value)} style={S.input}>
            <option value="" disabled>{language === "en" ? "Choose your activity level" : "اختر مستوى نشاطك"}</option>
            {ACTIVITY_LEVELS.map((a) => <option key={a.key} value={a.key}>{t(`you.activityLevels.${a.key}`, a.label)}</option>)}
          </select>
          <label style={S.label}>{language === "en" ? "Health conditions (optional)" : "الحالات الصحية (اختياري)"}</label>
          <div style={YS.chipRow}>
            {HEALTH_CONDITIONS.map((c) => (
              <button key={c} onClick={() => toggleCondition(c)} style={{ ...YS.chip, ...(draft.conditions.includes(c) ? YS.chipActive : {}) }}>{t(`you.healthConditions.${CONDITION_KEY_MAP[c] || ""}`, c)}</button>
            ))}
            <button onClick={() => toggleCondition(NO_CONDITION)} style={{ ...YS.chip, ...(draft.conditions.includes(NO_CONDITION) ? YS.chipActive : {}) }}>{t("you.healthConditions.none", NO_CONDITION)}</button>
          </div>
          {/* "missing locale key": you.saveAndCalculate */}
          <button onClick={save} style={S.saveBtn} data-tour="you-save-btn">{language === "en" ? "Save and calculate" : "احفظ واحسب"}</button>
        </div>
      </div>
    );
  }

  const genderLabel = healthProfile.gender === "male" ? (language === "en" ? "Male" : "ذكر") : (language === "en" ? "Female" : "أنثى");
  const activityLabel = healthProfile.activityLevel ? t(`you.activityLevels.${healthProfile.activityLevel}`, ACTIVITY_LEVELS.find((a) => a.key === healthProfile.activityLevel)?.label) : "—";
  const bmiCategoryLabel = healthProfile.bmiCategory ? t(`you.bmiCategories.${BMI_CATEGORY_KEY_MAP[healthProfile.bmiCategory] || ""}`, healthProfile.bmiCategory) : null;

  return (
    <div style={S.view}>
      <div style={YS.hero}>
        <div style={YS.heroIcon}><User size={22} color="var(--on-accent)" /></div>
        <div>
          <div style={YS.heroTitle}>{t("nav.you")}</div>
          {/* "missing locale key": you.heroSubResults */}
          <div style={YS.heroSub}>{language === "en" ? "Your data and calculated health results." : "بياناتك ونتائجك الصحية المحسوبة."}</div>
        </div>
      </div>

      {showDisclaimer && (
        <div style={YS.warningCard}>
          <AlertTriangle size={20} color="#D17B5F" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={YS.warningText}>{t("you.medicalDisclaimer")}</p>
        </div>
      )}

      <div style={YS.summaryCard}>
        <div>
          {/* "missing locale key": you.yourData */}
          <div style={YS.summaryLabel}>{language === "en" ? "Your data" : "بياناتك"}</div>
          <div style={YS.summaryValue}>{healthProfile.heightCm} {language === "en" ? "cm" : "سم"} · {healthProfile.weightKg} {language === "en" ? "kg" : "كغم"} · {healthProfile.age} {language === "en" ? "yrs" : "سنة"} · {genderLabel}</div>
          <div style={{ ...YS.summaryLabel, marginTop: 4 }}>{activityLabel}</div>
        </div>
        {/* "missing locale key": you.updateMyData */}
        <button onClick={() => setEditing(true)} style={{ ...S.exportBtn, width: "auto", padding: "9px 14px", marginBottom: 0 }}><Edit3 size={14} /> {language === "en" ? "Update my data" : "تحديث بياناتي"}</button>
      </div>

      <div style={YS.resultsGrid}>
        <div style={YS.resultCard}>
          <div style={YS.resultLabel}>{language === "en" ? "BMI · Body Mass Index" : "BMI · مؤشر كتلة الجسم"}</div>
          <div style={YS.resultValue}>{healthProfile.bmi ?? "—"}</div>
          {bmiCategoryLabel && <div style={YS.resultCategory}>{bmiCategoryLabel}</div>}
          <div style={YS.resultHint}>{language === "en" ? "Your weight-to-height ratio — a general indicator that doesn't distinguish fat from muscle." : "نسبة وزنك إلى طولك — مؤشر عام لا يفرّق بين الدهون والعضلات."}</div>
        </div>
        <div style={YS.resultCard}>
          <div style={YS.resultLabel}>{language === "en" ? "IBW · Ideal Body Weight" : "IBW · الوزن المثالي"}</div>
          <div style={YS.resultValue}>{healthProfile.ibw ?? "—"}<span style={YS.resultUnit}>{language === "en" ? "kg" : "كغم"}</span></div>
          <div style={YS.resultHint}>{language === "en" ? "An estimated reference weight based on your height and gender." : "وزن تقديري مرجعي بحسب طولك وجنسك."}</div>
        </div>
        <div style={YS.resultCard}>
          <div style={YS.resultLabel}>{language === "en" ? "REE · Basal Metabolic Rate" : "REE · الأيض الأساسي"}</div>
          <div style={YS.resultValue}>{healthProfile.ree ?? "—"}<span style={YS.resultUnit}>{t("common.units.kcal")}</span></div>
          <div style={YS.resultHint}>{language === "en" ? "The energy your body burns at complete rest during the day." : "الطاقة التي يحرقها جسمك وأنت في راحة تامة خلال اليوم."}</div>
        </div>
        <div style={YS.resultCard}>
          <div style={YS.resultLabel}>{language === "en" ? "TEE · Total Daily Energy" : "TEE · إجمالي الطاقة اليومي"}</div>
          <div style={YS.resultValue}>{healthProfile.tee ?? "—"}<span style={YS.resultUnit}>{t("common.units.kcal")}</span></div>
          <div style={YS.resultHint}>{language === "en" ? "An estimate of your daily calories burned at your current activity level." : "تقدير سعراتك المستهلكة يومياً مع مستوى نشاطك الحالي."}</div>
        </div>
      </div>
    </div>
  );
}

// "missing locale key"s لهذا المكوّن كاملاً (لا مساحة أسماء مخصّصة له بعد
// في ملفات الترجمة): settings.identity.title/subtitle/nameLabel/
// namePlaceholder/aboutLabel/aboutPlaceholder/hobbiesLabel/
// hobbiesPlaceholder/fieldLabel/fieldPlaceholder/saveButton - استُخدم نص
// إنجليزي/عربي حرفي بديل مؤقتاً بدلاً منها.
function ProfileCard({ profile, setProfile, showToast }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [local, setLocal] = useState(profile);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setLocal(profile); }, [profile]);

  function change(field, val) { setLocal((p) => ({ ...p, [field]: val })); setDirty(true); }
  async function save() {
    setProfile(local); await store.saveProfile(local); setDirty(false); showToast(t("todayView.savedSuccess"));
  }

  return (
    <div style={S.profileCard} data-tour="settings-identity-card">
      <div style={S.catEditorHeader}><User size={15} color="#C9A24B" /><span>{isEn ? "My Identity" : "هويتي"}</span></div>
      <p style={S.profileHint}>{isEn ? "This data makes Achieve's suggestions and analysis personal to you." : "هذه البيانات تجعل اقتراحات أنجز والتحليل مرتبطة بك شخصياً."}</p>
      <label style={S.label}>{isEn ? "Your name" : "اسمك"}</label>
      <input value={local.name || ""} onChange={(e) => change("name", e.target.value)} placeholder={isEn ? "e.g. Ahmed" : "مثال: أحمد"} style={S.input} />
      <label style={S.label}>{isEn ? "About me" : "من أنا"}</label>
      <input value={local.about} onChange={(e) => change("about", e.target.value)} placeholder={isEn ? "e.g. Photographer, visual content designer, and university student" : "مثال: مصور ومصمم محتوى بصري وطالب جامعي"} style={S.input} />
      <label style={S.label}>{isEn ? "My hobbies" : "هواياتي"}</label>
      <input value={local.hobbies} onChange={(e) => change("hobbies", e.target.value)} placeholder={isEn ? "e.g. Photography, bodyweight exercise, design" : "مثال: التصوير، تمارين الجسم، التصميم"} style={S.input} />
      <label style={S.label}>{isEn ? "My field" : "تخصصي"}</label>
      <input value={local.field} onChange={(e) => change("field", e.target.value)} placeholder={isEn ? "e.g. Nutrition and food tech" : "مثال: التغذية والتطبيق الغذائي"} style={S.input} />
      {dirty && <button onClick={save} style={{ ...S.saveBtn, marginTop: 12 }}>{isEn ? "Save my identity" : "حفظ هويتي"}</button>}
    </div>
  );
}

// "missing locale key"s لهذا المكوّن أيضاً (settings.roadmap.*) - محتوى
// تسويقي/رؤية مستقبلية بحت، استُخدم نص إنجليزي حرفي بديل مؤقتاً.
function RoadmapCard() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const phases = isEn ? [
    { phase: "Current version", title: "Your daily tool", items: ["Time tracking with the interactive day wheel", "Task management", "AI analysis and daily progress", "Cloud storage with a local copy"] },
    { phase: "Next", title: "Deeper memory", items: ["Measurable weekly goals", "Smart reminders based on your pattern", "Comparing weeks against each other"] },
    { phase: "Later", title: "Connecting your life", items: ["Calendar import", "A voice summary of daily progress", "Exporting your PDF reports"] },
  ] : [
    { phase: "النسخة الحالية", title: "أداتك اليومية", items: ["تتبع الوقت بعجلة اليوم التفاعلية", "إدارة المهام", "تحليل AI وتطور يومي", "تخزين سحابي مع نسخة محلية"] },
    { phase: "التالي", title: "ذاكرة أعمق", items: ["أهداف أسبوعية قابلة للقياس", "تذكيرات ذكية حسب نمطك", "مقارنة الأسابيع ببعضها"] },
    { phase: "لاحقاً", title: "ربط حياتك", items: ["استيراد من التقويم", "ملخص صوتي للتطور اليومي", "تصدير تقاريرك PDF"] },
  ];
  return (
    <div style={S.roadmapCard}>
      <div style={S.chartTitle}>{isEn ? "How Masar evolves with you" : "كيف يتطوّر مسار معك"}</div>
      {phases.map((p, i) => (
        <div key={i} style={S.roadmapPhaseRow}>
          <div style={S.roadmapPhaseHead}><span style={S.roadmapPhaseTag}>{p.phase}</span><span style={S.roadmapPhaseTitle}>{p.title}</span></div>
          <div style={S.roadmapPhaseItems}>{p.items.map((it, j) => <div key={j} style={S.roadmapPhaseItem}><span style={S.reportDot}>•</span>{it}</div>)}</div>
        </div>
      ))}
    </div>
  );
}

function EntryModal({ entry, date, categories, onSave, onClose }) {
  const { t, i18n } = useTranslation();
  const initMins = entry ? diffMinutes(entry.start, entry.end) : 60;
  const [catId, setCatId] = useState(entry?.catId || categories[0]?.id);
  const [minutes, setMinutes] = useState(initMins);
  const [startTime, setStartTime] = useState(entry?.start || nowHHMM());
  const [note, setNote] = useState(entry?.note || "");
  // Once the user taps a category chip themselves, the note's auto-guess
  // must stop overriding it — otherwise typing after picking category #5
  // silently snaps the selection back to whatever autoClassify guesses.
  const [userPickedCat, setUserPickedCat] = useState(!!entry);

  function handleNoteChange(val) {
    setNote(val);
    if (userPickedCat) return;
    const guessedCat = autoClassify(val, categories);
    if (guessedCat) setCatId(guessedCat);
  }

  function selectCat(id) {
    setCatId(id);
    setUserPickedCat(true);
  }

  function handleSave() {
    const end = addMinutesToTime(startTime, Math.max(1, minutes));
    onSave({ id: entry?.id || uid(), date: entry?.date || date, catId, start: startTime, end, note: note.trim() });
  }

  return (
    <div style={S.modalOverlay} className="overlay-in" onClick={onClose}>
      <div style={S.modal} className="sheet-in" onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}><span>{entry ? t("todayView.entryModal.editActivity") : t("todayView.entryModal.newActivity")}</span><button onClick={onClose} style={S.iconBtn}><X size={18} /></button></div>
        <div style={S.modalBody}>
          <label style={S.label}>{t("todayView.entryModal.noteLabel")}</label>
          <input value={note} onChange={(e) => handleNoteChange(e.target.value)} placeholder={t("todayView.entryModal.notePlaceholder")} style={S.input} />
          <label style={S.label}>{t("todayView.entryModal.whenLabel")}</label>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <div style={{ ...S.input, display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
              <span>{to12h(startTime)}</span>
              <Clock size={15} color="var(--muted2)" />
            </div>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: "none", padding: 0, margin: 0, cursor: "pointer", colorScheme: "dark" }}
            />
          </div>
          <label style={S.label}>{t("todayView.entryModal.howManyMinutes")}</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setMinutes((m) => Math.max(5, m - 5))} style={{ ...PS.miniTimerBtn, flex: "none", width: 40, height: 40 }}>-5</button>
            <input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ ...S.input, width: 80, textAlign: "center", fontSize: 20, fontFamily: "'Amiri', serif", fontWeight: 700 }} />
            <button onClick={() => setMinutes((m) => Math.min(600, m + 5))} style={{ ...PS.miniTimerBtn, flex: "none", width: 40, height: 40 }}>+5</button>
            <span style={{ fontSize: 12, color: "var(--muted2)" }}>({fmtHM(minutes, i18n.language)})</span>
          </div>
          <label style={S.label}>{t("todayView.entryModal.categoryLabel")}</label>
          <div style={S.catGrid}>
            {categories.map((c) => (
              <button key={c.id} onClick={() => selectCat(c.id)} style={{ ...S.catChip, borderColor: catId === c.id ? c.color : "var(--border2)", background: catId === c.id ? `${c.color}22` : "transparent" }}>
                <span style={{ ...S.legendDot, background: c.color }} />{catDisplayName(c, i18n.language)}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} style={S.saveBtn}>{t("todayView.entryModal.saveActivity")}</button>
      </div>
    </div>
  );
}

