"use strict";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  Tooltip, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Sparkles, Clock, TrendingUp, ListChecks, Settings, ChevronLeft, ChevronRight,
  Loader2, Plus, X, Trash2, Check, Flame, Star, Edit3,
  Sun, Target, Palette, Cloud, CloudOff,
  Rocket, BookOpen, User, Trophy, ChevronDown, ExternalLink,
  Timer, Play, Pause, RotateCcw, Zap, Download, Save,
  Moon, Bell, BookMarked, CheckCircle2,
  MessageCircle, Send,
  LogIn, LogOut,
  Heart, GraduationCap, Eye, AlertTriangle,
  Wallet, ArrowDownCircle, ArrowUpCircle, Crown,
} from "lucide-react";
import { fivePrayers, nextPrayer, to12h } from "../lib/prayer";
import { ADHKAR_CATEGORIES, ADHKAR } from "../lib/adhkar";
import { store, setOwner, getOwner } from "../lib/store";
import { pickDailyTip, TIP_CATEGORY_LABELS, localDayKey, TIPS } from "../lib/tips";
import { pickDailyMoneyTip, MONEY_TIP_CATEGORY_LABELS } from "../lib/money-tips";
import { isActiveSubscriber } from "../lib/subscription";
import { createGoal, isReviewDue, GOAL_PERIODS, GOAL_POINTS_SUCCESS, GOAL_POINTS_FAILURE } from "../lib/goals";
import { getSession, onAuthChange, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, userFromSession, hasAuth } from "../lib/auth";
import {
  todayKey, fmtHM, uid, diffMinutes, arabicDate, computeStreak, escapeHtml,
  COLOR_CHOICES, BADGES, analyze, parseJsonLoose,
  localAchieveSuggestions, localCoachReply,
  getLevel, addMinutesToTime, nowHHMM, autoClassify,
  MANDATORY_TASKS, AZKAR_MORNING, AZKAR_EVENING, coachChat,
} from "../lib/helpers";
import { S } from "../components/styles";
import DayWheel from "../components/DayWheel";

// active session storage
const SESSION_KEY = "masar_active_session";
const activeSessionStore = {
  load: () => { try { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } },
  save: (s) => { try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch {} },
};
// Patch store to support loadActiveSession / saveActiveSession
store.loadActiveSession = async () => activeSessionStore.load();
store.saveActiveSession = async (s) => activeSessionStore.save(s);

// Extra prayer-view styles not in styles.js
const PS = {
  prayerHero: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  prayerHeroTitle: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700 },
  prayerHeroSub: { fontSize: 12, color: "#8A8782" },
  nextPrayerCard: { background: "linear-gradient(160deg, #15130E, #121214)", border: "1px solid rgba(201,162,75,0.35)", borderRadius: 16, padding: "18px 16px", textAlign: "center", marginBottom: 14 },
  nextLabel: { fontSize: 11, fontWeight: 700, color: "#8A8782", letterSpacing: 0.5, marginBottom: 6 },
  nextName: { fontFamily: "'Amiri', serif", fontSize: 26, fontWeight: 700, color: "#E8E6E1" },
  nextTime: { fontSize: 16, color: "#C9A24B", fontVariantNumeric: "tabular-nums", margin: "4px 0" },
  nextCountdown: { fontSize: 13, color: "#8A8782", fontVariantNumeric: "tabular-nums" },
  weeklyCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 14 },
  weeklyPercentText: { fontSize: 13.5, color: "var(--ink)", fontWeight: 700, lineHeight: 1.7 },
  weeklyBarTrack: { height: 8, borderRadius: 4, background: "#1F1F22", overflow: "hidden", marginTop: 10 },
  weeklyBarFill: { height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #5FA8A0, #C9A24B)" },
  weeklyMotivation: { fontSize: 12, color: "#8A8782", lineHeight: 1.7, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" },
  prayerTimingNote: { fontSize: 11.5, color: "#5FA8A0", marginTop: 4, fontWeight: 600 },
  notifBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", border: "1px solid rgba(201,162,75,0.3)", background: "rgba(201,162,75,0.07)", color: "var(--gold)", borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 14 },
  prayerList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  prayerRow: { display: "flex", alignItems: "center", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px" },
  prayerRowNext: { borderColor: "rgba(201,162,75,0.4)", background: "linear-gradient(160deg, #15130E, #121214)" },
  prayerRowDone: { opacity: 0.55 },
  prayerInfo: { flex: 1 },
  prayerName: { fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  prayerTime: { fontSize: 12.5, color: "#8A8782", marginTop: 2, fontVariantNumeric: "tabular-nums" },
  prayerBtn: { border: "1.5px solid rgba(201,162,75,0.4)", background: "transparent", color: "#C9A24B", borderRadius: 10, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 },
  prayerBtnDone: { background: "rgba(95,168,160,0.1)", borderColor: "rgba(95,168,160,0.4)", color: "#5FA8A0" },
  religiousCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 14 },
  religiousPresets: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 },
  presetAddBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(201,162,75,0.07)", border: "1px dashed rgba(201,162,75,0.3)", color: "#C9A24B", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  religiousList: { display: "flex", flexDirection: "column", gap: 8 },
  religiousItem: { background: "#0F0F11", border: "1px solid var(--line)", borderRadius: 12, padding: "12px" },
  religiousItemDone: { opacity: 0.6 },
  religiousTop: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  religiousTitle: { fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  religiousMeta: { fontSize: 11.5, color: "#8A8782", marginTop: 3, fontVariantNumeric: "tabular-nums" },
  timerControlsRow: { display: "flex", gap: 8 },
  miniTimerBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "#C9A24B", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  miniDoneBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(107,104,99,0.1)", border: "1px solid #2A2A2D", color: "#8A8782", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  miniDoneBtnReady: { background: "rgba(95,168,160,0.12)", borderColor: "rgba(95,168,160,0.4)", color: "#5FA8A0" },
  religiousDoneRow: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#5FA8A0", fontWeight: 600 },
  modeToggleRow: { display: "flex", gap: 6, marginBottom: 14, background: "#141416", borderRadius: 12, padding: 4 },
  modeToggleBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", borderRadius: 9, background: "transparent", color: "#8A8782", padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  modeToggleBtnActive: { background: "#1F1F22", color: "var(--gold)" },
  manualEntryRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14 },
  manualInput: { background: "#0F0F11", border: "1px solid #2A2A2D", borderRadius: 10, padding: "12px 16px", color: "var(--ink)", fontSize: 28, fontFamily: "'Amiri', serif", fontWeight: 700, width: 100, textAlign: "center" },
  manualUnit: { fontFamily: "'Amiri', serif", fontSize: 18, color: "#8A8782" },
};

// Assistant styles
const HS = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: { display: "flex", alignItems: "center", gap: 12 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #5FA8A0, #3E7E78)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "#8A8782", marginTop: 2, lineHeight: 1.5 },
  chatCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px", display: "flex", flexDirection: "column" },
  chatHead: { display: "flex", alignItems: "center", gap: 7, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--line)" },
  chatTitle: { fontSize: 13, fontWeight: 700, color: "#B8B5AF" },
  chatScroll: { display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto", marginBottom: 12 },
  msgUser: { alignSelf: "flex-start", maxWidth: "85%", background: "rgba(201,162,75,0.12)", border: "1px solid rgba(201,162,75,0.25)", borderRadius: "14px 4px 14px 14px", padding: "10px 12px", fontSize: 13.5, color: "#E8E6E1", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  msgBot: { alignSelf: "flex-end", maxWidth: "92%", background: "#0F0F11", border: "1px solid var(--line)", borderRadius: "4px 14px 14px 14px", padding: "10px 12px", fontSize: 13.5, color: "#D8D5CF", lineHeight: 1.8, whiteSpace: "pre-wrap" },
  suggestionRow: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  suggestionChip: { background: "rgba(201,162,75,0.07)", border: "1px solid rgba(201,162,75,0.25)", color: "#C9A24B", borderRadius: 20, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textAlign: "right" },
  chatInputRow: { display: "flex", gap: 8, alignItems: "center" },
  chatInput: { flex: 1, background: "#0F0F11", border: "1px solid #2A2A2D", borderRadius: 12, padding: "11px 14px", color: "var(--ink)", fontSize: 14, fontFamily: "inherit", outline: "none" },
  chatSend: { background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 12, width: 46, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
};

// شارة الاشتراك في الشريط العلوي، ونمط بطاقة الاشتراك في "التخصيص".
const SUB = {
  subBadge: { display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "var(--gold)", color: "#0A0A0B", flexShrink: 0 },
  vipBadge: { display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(140deg, #E7C378, #C9A24B 55%, #8B6914)", color: "#0A0A0B", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,162,75,0.4)" },
  card: { background: "linear-gradient(160deg, #17140C, #121214)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 16, padding: "16px 14px", marginBottom: 16 },
  head: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  iconBadge: { width: 42, height: 42, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "linear-gradient(140deg, #E7C378, #C9A24B 60%, #A9822F)", boxShadow: "0 0 0 1px rgba(201,162,75,0.25)" },
  title: { fontFamily: "'Amiri', serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" },
  subtitle: { fontSize: 12, color: "#B8B5AF", marginTop: 3, lineHeight: 1.6 },
  statusRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(201,162,75,0.08)", border: "1px solid rgba(201,162,75,0.25)", borderRadius: 10, padding: "10px 12px" },
  statusLabel: { fontSize: 12.5, color: "#8A8782" },
  statusValue: { fontSize: 13, fontWeight: 700, color: "#C9A24B" },
  plansRow: { display: "flex", gap: 10, marginBottom: 14 },
  planCard: { flex: 1, background: "#0F0F11", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 8px", textAlign: "center" },
  planLabel: { fontSize: 12, color: "#8A8782", fontWeight: 600 },
  planPrice: { fontFamily: "'Amiri', serif", fontSize: 19, fontWeight: 700, color: "#C9A24B", marginTop: 4 },
  subscribeBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", boxSizing: "border-box" },
  // بطاقة "التشجيع للاشتراك" التي تحلّ محل أي قسم/ميزة مدفوعة لغير
  // المشتركين — تدرّج كحلي داكن (بدل التدرّج الدافئ المعتاد للبطاقات
  // الأخرى) بحدود وأيقونة ذهبية، لتُقرأ كدعوة مميّزة لا كخطأ أو رسالة منع.
  upsellCard: { background: "linear-gradient(160deg, #10131F, #0A0A0B)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 18, padding: "30px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  upsellCardCompact: { padding: "20px 16px", borderRadius: 14, gap: 8 },
  upsellIconBadge: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "linear-gradient(140deg, #E7C378, #C9A24B 60%, #A9822F)", boxShadow: "0 0 0 1px rgba(201,162,75,0.25), 0 4px 18px rgba(201,162,75,0.2)" },
  upsellTitle: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" },
  upsellMessage: { fontSize: 13, color: "#B8B5AF", lineHeight: 1.8, maxWidth: 320, margin: 0 },
  upsellBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 12, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "none", marginTop: 6 },
};

export default function MasarApp() {
  const [loaded, setLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("masar_splash_done"));
  const [view, setView] = useState("today");
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [gamify, setGamify] = useState({ points: 0, badges: [] });
  const [profile, setProfile] = useState({ about: "", hobbies: "", field: "", tourSeen: false });
  const [tourOpen, setTourOpen] = useState(false);
  const [achieve, setAchieve] = useState([]);
  const [focus, setFocus] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [prayerLog, setPrayerLog] = useState([]);
  const [religious, setReligious] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [toast, setToast] = useState(null);
  const [mandatoryLog, setMandatoryLog] = useState({});
  const [pointsLog, setPointsLog] = useState([]);
  const [tipsLog, setTipsLog] = useState({});
  const [goals, setGoals] = useState([]);
  const [vault, setVault] = useState(null);
  const [vaultTx, setVaultTx] = useState([]);
  const [sleepLog, setSleepLog] = useState([]);
  const [subscription, setSubscription] = useState({ isSubscriber: false, subscriptionEnd: null, isVip: false, subscriptionType: null });
  const isSub = isActiveSubscriber(subscription);
  const [user, setUser] = useState(null);
  const userIdRef = useRef(undefined);
  const loadVersionRef = useRef(0);

  const loadAll = useCallback(async () => {
      const myVersion = ++loadVersionRef.current;
      const [c, e, t, r, g, p, a, f, cm, pl, rel, ml, plog, tl, gl, vlt, vtx, sl, sub] = await Promise.all([
        store.loadCategories(), store.loadEntries(), store.loadTasks(),
        store.loadReports(), store.loadGamify(), store.loadProfile(), store.loadAchieve(),
        store.loadFocus(), store.loadCommitments(), store.loadPrayerLog(), store.loadReligious(),
        store.loadMandatoryLog(), store.loadPointsLog(), store.loadTipsLog(), store.loadGoals(),
        store.loadVault(), store.loadVaultTransactions(), store.loadSleepLog(), store.loadSubscription(),
      ]);
      if (loadVersionRef.current !== myVersion) return;
      setCategories(c); setEntries(e); setTasks(t); setReports(r); setGamify(g);
      setProfile(p); setAchieve(a); setFocus(f); setCommitments(cm);
      setPrayerLog(pl); setReligious(rel);
      setMandatoryLog(ml); setPointsLog(plog); setTipsLog(tl); setGoals(gl);
      setVault(vlt); setVaultTx(vtx); setSleepLog(sl); setSubscription(sub);

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
          if (!yLog[task.key]) { deduction += task.penalty; reasons.push(task.label); }
        }
        const PRAYER_IDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
        const yPrayers = (pl || []).filter((p) => p.date === yesterday);
        const missedPrayers = PRAYER_IDS.filter((pid) => !yPrayers.some((p) => p.prayerId === pid)).length;
        if (missedPrayers > 0) { deduction += missedPrayers * 5; reasons.push(`${missedPrayers} صلوات فائتة`); }
        if (deduction > 0) {
          const next = { ...g, points: Math.max(0, g.points - deduction) };
          setGamify(next);
          await store.saveGamify(next);
          const logEntry = { id: uid(), date: today, amount: -deduction, reason: `خصم فائتات (${yesterday}): ${[...new Set(reasons)].join("، ")}` };
          setPointsLog((prev) => [logEntry, ...prev]);
          await store.addPointsLog(logEntry);
        }
      }
      localStorage.setItem("masar_last_open", today);
      setLoaded(true);
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

  const closeTour = useCallback(() => {
    setTourOpen(false);
    setProfile((p) => ({ ...p, tourSeen: true }));
    store.saveTourSeen(true);
  }, []);

  const startTour = useCallback(() => setTourOpen(true), []);

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
    store.saveTipsLog(today, tip.id);
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
      const next = { ...gamify, badges: [...gamify.badges, ...newOnes] };
      setGamify(next); store.saveGamify(next);
      showToast(`شارة جديدة: ${BADGES.find((b) => b.id === newOnes[0]).name}`);
    }
  }, [stats, loaded]);

  const addPoints = useCallback((n, reason = "") => {
    setGamify((g) => { const next = { ...g, points: Math.max(0, g.points + n) }; store.saveGamify(next); return next; });
    const logReason = reason || (n >= 0 ? "نقاط مكتسبة" : "خصم نقاط");
    const logEntry = { id: uid(), date: todayKey(), amount: n, reason: logReason };
    setPointsLog((prev) => [logEntry, ...prev].slice(0, 200));
    store.addPointsLog(logEntry);
  }, []);

  const handleSignIn = useCallback(async () => {
    try { await signInWithGoogle(); } catch { showToast("تعذّر تسجيل الدخول الآن"); }
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
    showToast("تم تسجيل الخروج");
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
      <Header view={view} setView={setView} gamify={gamify} stats={stats} hasCloud={store.hasCloud} user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} subscription={subscription} />
      <div style={S.body} key={view} className="view-fade masar-body">
        {view === "today" && (
          <TodayView
            date={selectedDate} setDate={setSelectedDate}
            entries={entries} setEntries={setEntries}
            categories={categories} tasks={tasks} setTasks={setTasks}
            reports={reports} setReports={setReports}
            aiHistory={aiHistory}
            mandatoryLog={mandatoryLog} setMandatoryLog={setMandatoryLog}
            focus={focus}
            addPoints={addPoints} showToast={showToast}
            subscription={subscription}
          />
        )}
        {view === "prayer" && <PrayerView prayerLog={prayerLog} setPrayerLog={setPrayerLog} religious={religious} setReligious={setReligious} addPoints={addPoints} showToast={showToast} />}
        {view === "adhkar" && <AdhkarView showToast={showToast} />}
        {view === "tips" && <TipsView tipsLog={tipsLog} setTipsLog={setTipsLog} showToast={showToast} subscription={subscription} />}
        {view === "goals" && (isSub ? <GoalsView goals={goals} setGoals={setGoals} addPoints={addPoints} showToast={showToast} /> : (
          <div style={S.view}><UpsellCard icon={Target} title="خطّط لأهدافك مع مسار الكامل" message="حدّد أهدافك الأسبوعية والشهرية والسنوية، وتابع إنجازك على تقويم بصري مع مراجعات دورية ومحاسبة بالنقاط." /></div>
        ))}
        {view === "vault" && (isSub ? <VaultView vault={vault} setVault={setVault} vaultTx={vaultTx} setVaultTx={setVaultTx} showToast={showToast} /> : (
          <div style={S.view}><UpsellCard icon={Wallet} title="تتبّع أموالك مع مسار الكامل" message="سجّل رصيدك ومصروفاتك بعملتك، واعرف أين تذهب أموالك بالضبط، مع نصيحة مالية جديدة كل يوم." /></div>
        ))}
        {view === "tasks" && <TasksView tasks={tasks} setTasks={setTasks} categories={categories} addPoints={addPoints} showToast={showToast} subscription={subscription} />}
        {view === "focus" && <FocusView focus={focus} setFocus={setFocus} commitments={commitments} setCommitments={setCommitments} categories={categories} entries={entries} addPoints={addPoints} showToast={showToast} subscription={subscription} />}
        {view === "achieve" && (isSub ? <AchieveView achieve={achieve} setAchieve={setAchieve} profile={profile} focus={focus} tasks={tasks} prayerLog={prayerLog} religious={religious} addPoints={addPoints} showToast={showToast} setView={setView} /> : (
          <div style={S.view}><UpsellCard icon={Rocket} title="أنجز ينتظرك في مسار الكامل" message="أنجز يعرف هواياتك ويقترح لك تحديات ومشاريع ومسارات تعلّم تناسبك أنت تحديداً." /></div>
        ))}
        {view === "reports" && (isSub ? <ReportsView entries={entries} categories={categories} focus={focus} profile={profile} sleepLog={sleepLog} setSleepLog={setSleepLog} showToast={showToast} /> : (
          <div style={S.view}><UpsellCard icon={TrendingUp} title="تقاريرك التفصيلية في مسار الكامل" message="شاهد تقدّمك بأرقام وتحليلات واضحة، وتتبّع نومك ونمط راحتك عبر الأيام." /></div>
        ))}
        {view === "assistant" && (isSub ? <AssistantView entries={entries} tasks={tasks} categories={categories} focus={focus} prayerLog={prayerLog} religious={religious} profile={profile} stats={stats} setView={setView} /> : (
          <div style={S.view}><UpsellCard icon={MessageCircle} title="مساعدك الذكي في مسار الكامل" message="مدرّب شخصي يحلّل يومك وعاداتك ويقترح خطوات عملية بناءً على بياناتك الفعلية." /></div>
        ))}
        {view === "settings" && <SettingsView categories={categories} setCategories={setCategories} gamify={gamify} hasCloud={store.hasCloud} showToast={showToast} profile={profile} setProfile={setProfile} pointsLog={pointsLog} onStartTour={startTour} subscription={subscription} />}
      </div>
      {toast && <div style={S.toast}>{toast}</div>}
      {tourOpen && <OnboardingTour onClose={closeTour} />}
      {dailyTip && <DailyTipModal tip={dailyTip} onClose={() => setDailyTip(null)} />}
    </div>
  );
}

const TOUR_STEPS = [
  {
    icon: "◐",
    title: "أهلاً بك في مسار",
    body: "مساحتك الشخصية للإنتاجية والعبادة. جولة قصيرة لتتعرف على أهم أقسام التطبيق.",
  },
  {
    Icon: User,
    title: "ابدأ بالتخصيص أولاً",
    body: "اكتب هواياتك ونبذتك في \"التخصيص\"، فهذه الخطوة مهمة جداً. بدونها لن يعمل المساعد الذكي في \"أنجز\" و\"مساعد\" بشكل مخصّص لك، وستبدو اقتراحاته عامة وغير مرتبطة بك.",
    emphasize: true,
  },
  {
    Icon: Clock,
    title: "اليوم",
    body: "سجّل أنشطتك اليومية وشاهدها في دائرة الوقت التفاعلية، إلى جانب مهامك الأساسية اليومية.",
  },
  {
    Icon: Moon,
    title: "عباداتك اليومية",
    body: "تابع صلواتك ومهامك الدينية اليومية كالاستغفار وقراءة القرآن في \"الصلاة\"، وأذكارك في \"أذكار\".",
  },
  {
    Icon: Eye,
    title: "بصيرة",
    body: "نصيحة جديدة تنتظرك كل يوم في \"بصيرة\"، تجمع بين حكمة دينية ودنيوية، ولا تتكرر لفترة طويلة. تقدر أيضاً تتصفح أرشيف كل النصائح السابقة في نفس الصفحة.",
  },
  {
    Icon: Timer,
    title: "أدوات إنتاجيتك",
    body: "شغّل جلسات تركيز ودراسة في \"تركيز\"، ونظّم مهامك اليومية في \"المهام\".",
  },
  {
    Icon: Target,
    title: "أهداف",
    body: "اكتب أهدافك الأسبوعية أو الشهرية أو السنوية في \"أهداف\"، وتابعها على تقويم بصري يذكّرك بمواعيد المراجعة، مع محاسبة بالنقاط عند التحقيق أو التقصير.",
  },
  {
    Icon: Wallet,
    title: "خزنة",
    body: "تتبّع رصيدك المالي بعملتك في \"خزنة\"، وسجّل كل مصروف أو إضافة مع سببه لتعرف أين تذهب أموالك بالضبط، مع نصيحة مالية جديدة كل يوم.",
  },
  {
    Icon: TrendingUp,
    title: "التقارير",
    body: "شاهد تقدّمك الأسبوعي بأرقام وتحليلات واضحة في \"التقارير\"، لتعرف أين تتحسّن وأين تحتاج مجهوداً أكبر.",
  },
  {
    Icon: Sparkles,
    title: "الذكاء الاصطناعي",
    body: "\"أنجز\" يقترح لك تحديات ومشاريع تناسبك، و\"مساعد\" مدرّبك الشخصي للمحادثة. كلاهما يعتمد على هواياتك ونبذتك في التخصيص لتكون النصائح مخصّصة فعلاً.",
  },
  {
    Icon: Heart,
    title: "جاهز؟",
    body: "ابدأ رحلتك الآن 🤍",
    isLast: true,
  },
];

function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const s = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const Icon = s.Icon;

  return (
    <div style={OT.overlay} onClick={onClose}>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={OT.card}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} style={OT.skipX}><X size={18} /></button>
        <div style={{ ...OT.iconBadge, ...(s.emphasize ? OT.iconBadgeEmphasize : {}) }}>
          {Icon ? <Icon size={26} color="#0A0A0B" /> : <span style={{ fontSize: 30 }}>{s.icon}</span>}
        </div>
        <div style={OT.title}>{s.title}</div>
        <p style={{ ...OT.body, ...(s.emphasize ? OT.bodyEmphasize : {}) }}>{s.body}</p>
        <div style={OT.dots}>
          {TOUR_STEPS.map((_, i) => (
            <span key={i} style={{ ...OT.dot, ...(i === step ? OT.dotActive : {}) }} />
          ))}
        </div>
        <div style={OT.actions}>
          {!isLast && <button onClick={onClose} style={OT.skipBtn}>تخطّي</button>}
          <button
            onClick={() => (isLast ? onClose() : setStep((n) => n + 1))}
            style={{ ...OT.nextBtn, ...(isLast ? OT.nextBtnLast : {}) }}
          >
            {isLast ? "ابدأ رحلتك الآن 🤍" : "التالي"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const OT = {
  overlay: { position: "fixed", inset: 0, background: "rgba(6,6,7,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 },
  card: { position: "relative", width: "100%", maxWidth: 360, background: "linear-gradient(165deg, #17171a, #101012)", border: "1px solid var(--line)", borderRadius: 24, padding: "32px 22px 22px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  skipX: { position: "absolute", top: 14, left: 14, background: "none", border: "none", color: "#5A5650", cursor: "pointer", padding: 6, display: "flex" },
  iconBadge: { width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(140deg, #E0B868, #C9A24B)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" },
  iconBadgeEmphasize: { background: "linear-gradient(140deg, #6FC4B8, #3E7E78)" },
  title: { fontFamily: "'Amiri', serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 10 },
  body: { fontSize: 13.5, color: "#B8B5AF", lineHeight: 1.9, marginBottom: 22 },
  bodyEmphasize: { color: "#BFD8D4" },
  dots: { display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#2A2A2D" },
  dotActive: { background: "#C9A24B", width: 18 },
  actions: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  skipBtn: { background: "none", border: "none", color: "#8A8782", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "13px 14px" },
  nextBtn: { flex: 1, background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  nextBtnLast: { flex: "1 0 auto" },
};

function SplashScreen({ onDone }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHiding(true), 1700);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      animate={{ opacity: hiding ? 0 : 1 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      onAnimationComplete={() => { if (hiding) onDone?.(); }}
      style={{ minHeight: "100vh", background: "#0A0A0B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0, overflow: "hidden", direction: "rtl" }}
    >
      <motion.img
        src="/logo-mark.png"
        alt=""
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ width: 110, height: 110, marginBottom: 20, filter: "drop-shadow(0 0 28px rgba(201,162,75,0.4))" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
        style={{ fontFamily: "'Amiri', serif", fontSize: 42, fontWeight: 700, color: "#E8E6E1", letterSpacing: 2 }}
      >مسار</motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        style={{ fontSize: 14, color: "#6B6863", marginTop: 8, letterSpacing: 1 }}
      >تتبّع وقتك · ارتقِ بيومك</motion.div>
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.6, ease: "easeInOut" }}
        style={{ marginTop: 36, width: 100, height: 2, background: "linear-gradient(90deg, transparent, #C9A24B, transparent)", borderRadius: 2, transformOrigin: "center" }}
      />
    </motion.div>
  );
}

const FEATURES = [
  { icon: "🕌", title: "تتبّع الصلوات", desc: "سجّل الصلوات الخمس يومياً وابنِ عادة ثابتة" },
  { icon: "⏱️", title: "مؤقت التركيز", desc: "جلسات تركيز مع إحصاءات ومنافسة الروبوتات" },
  { icon: "📿", title: "الأذكار والقرآن", desc: "تتبّع أذكارك وتقدّمك في حفظ وقراءة القرآن" },
  { icon: "✅", title: "المهام اليومية", desc: "نظّم مهامك واحتفل بكل إنجاز صغير" },
  { icon: "📊", title: "تقارير وتحليل", desc: "شاهد تقدّمك الأسبوعي بأرقام واضحة" },
  { icon: "🤖", title: "مساعد ذكي", desc: "مستشار شخصي يعرف عاداتك ويقترح تحسينات" },
];

function translateAuthError(err) {
  const msg = String(err?.message || err || "");
  if (msg.includes("Invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  if (msg.includes("User already registered")) return "هذا البريد مسجّل بالفعل، جرّب تسجيل الدخول";
  if (msg.includes("Password should be at least")) return "كلمة المرور لازم تكون 6 أحرف على الأقل";
  if (msg.includes("Unable to validate email address") || msg.includes("invalid")) return "البريد الإلكتروني غير صحيح";
  if (msg.includes("Email not confirmed")) return "لازم تأكّد بريدك الإلكتروني أولاً، راجع رسالة التأكيد";
  if (msg.includes("no-supabase")) return "الحساب غير مفعّل بهذا الموقع حالياً";
  return "تعذّر تسجيل الدخول الآن، حاول مرة أخرى";
}

function EmailAuthForm({ onEmailSignIn, onEmailSignUp }) {
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
          setNotice("أنشأنا حسابك! افتح بريدك الإلكتروني وأكّد الحساب حتى تقدر تسجّل دخولك.");
        }
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
      <input
        type="email" required autoComplete="email" dir="ltr"
        value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="بريدك الإلكتروني"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#E8E6E1", fontSize: 14, fontFamily: "inherit", outline: "none", textAlign: "right" }}
      />
      <input
        type="password" required autoComplete={mode === "signin" ? "current-password" : "new-password"} dir="ltr"
        value={password} onChange={(e) => setPassword(e.target.value)}
        placeholder="كلمة المرور"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "12px 14px", color: "#E8E6E1", fontSize: 14, fontFamily: "inherit", outline: "none", textAlign: "right" }}
      />
      {error && <div style={{ color: "#E07A6B", fontSize: 12.5, textAlign: "center" }}>{error}</div>}
      {notice && <div style={{ color: "#5FA8A0", fontSize: 12.5, textAlign: "center", lineHeight: 1.6 }}>{notice}</div>}
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        type="submit" disabled={submitting}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(201,162,75,0.14)", border: "1px solid rgba(201,162,75,0.4)", color: "#C9A24B", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit" }}
      >
        {submitting ? <Loader2 size={16} className="spin" /> : null}
        {mode === "signin" ? "تسجيل الدخول بالبريد" : "إنشاء حساب جديد"}
      </motion.button>
      <button
        type="button"
        onClick={() => { setMode((m) => (m === "signin" ? "signup" : "signin")); setError(""); setNotice(""); }}
        style={{ background: "none", border: "none", color: "#8A8782", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}
      >
        {mode === "signin" ? "ما عندك حساب؟ أنشئ واحد" : "عندك حساب؟ سجّل دخولك"}
      </button>
    </form>
  );
}

function LandingPage({ onSignIn, onEmailSignIn, onEmailSignUp }) {
  const [signing, setSigning] = useState(false);
  async function handleClick() {
    setSigning(true);
    try { await onSignIn(); } finally { setSigning(false); }
  }
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0B", color: "#E8E6E1", direction: "rtl", fontFamily: "inherit", overflowX: "hidden" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px 60px" }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 64, paddingBottom: 40, textAlign: "center" }}>
          <div style={{ fontSize: 64, color: "#C9A24B", marginBottom: 16, filter: "drop-shadow(0 0 24px rgba(201,162,75,0.4))" }}>◐</div>
          <h1 style={{ fontFamily: "'Amiri', serif", fontSize: 42, fontWeight: 700, margin: 0, letterSpacing: 2 }}>مسار</h1>
          <p style={{ fontSize: 16, color: "#8A8782", marginTop: 12, lineHeight: 1.8, maxWidth: 300 }}>
            رفيقك اليومي لتنظيم وقتك وتعزيز عاداتك الإسلامية
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleClick} disabled={signing}
            style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 12, background: "#fff", color: "#1a1a1a", border: "none", borderRadius: 14, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: signing ? "wait" : "pointer", fontFamily: "inherit", boxShadow: "0 4px 24px rgba(0,0,0,0.4)", minWidth: 220, justifyContent: "center" }}
          >
            {signing ? <Loader2 size={18} className="spin" /> : (
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2c-7.7 0-14.4 4.3-17.7 10.7z"/><path fill="#FBBC05" d="M24 46c5.8 0 10.7-1.9 14.3-5.2l-6.6-5.4C29.7 37 27 38 24 38c-5.9 0-10.9-3.8-12.7-9.1l-7 5.4C7.9 41.7 15.4 46 24 46z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1 2.9-2.9 5.2-5.3 6.9l6.6 5.4C41.3 37.4 45 31.2 45 24c0-1.3-.2-2.7-.5-4z"/></svg>
            )}
            {signing ? "جارٍ التحميل..." : "ابدأ مع Google"}
          </motion.button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 22 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontSize: 12, color: "#6B6863" }}>أو</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>
          <EmailAuthForm onEmailSignIn={onEmailSignIn} onEmailSignUp={onEmailSignUp} />
          <p style={{ marginTop: 14, fontSize: 12, color: "#4A4845" }}>بياناتك محفوظة لديك فقط · لا إعلانات</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8E6E1", marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 11.5, color: "#6B6863", lineHeight: 1.6 }}>{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ marginTop: 40, textAlign: "center", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.06)" }} />
          <div style={{ display: "flex", gap: 24, justifyContent: "center", fontSize: 13, color: "#6B6863" }}>
            <span>🔒 بدون إعلانات</span>
            <span>☁️ مزامنة سحابية</span>
            <span>📱 يشتغل أوفلاين</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleClick} disabled={signing}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.35)", color: "#C9A24B", borderRadius: 14, padding: "13px 32px", fontSize: 15, fontWeight: 700, cursor: signing ? "wait" : "pointer", fontFamily: "inherit" }}>
            <LogIn size={18} />
            سجّل دخولك الآن
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

function TasbihIcon({ size = 15 }) {
  // A ring of prayer-bead dots, drawn with fill="currentColor" so it
  // inherits the tab's active/inactive color exactly like the lucide-react
  // icons used by every other tab (emoji glyphs can't be recolored via CSS).
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="4.5" r="1.7" fill="currentColor" />
      <circle cx="17.2" cy="7" r="1.7" fill="currentColor" />
      <circle cx="19.5" cy="12.2" r="1.7" fill="currentColor" />
      <circle cx="17.2" cy="17.4" r="1.7" fill="currentColor" />
      <circle cx="12" cy="19.9" r="1.7" fill="currentColor" />
      <circle cx="6.8" cy="17.4" r="1.7" fill="currentColor" />
      <circle cx="4.5" cy="12.2" r="1.7" fill="currentColor" />
      <circle cx="6.8" cy="7" r="1.7" fill="currentColor" />
    </svg>
  );
}

function Header({ view, setView, gamify, stats, hasCloud, user, onSignIn, onSignOut, subscription }) {
  const isVip = !!subscription?.isVip;
  const isSub = isActiveSubscriber(subscription);
  const tabs = [
    { id: "today", label: "اليوم", icon: Clock },
    { id: "prayer", label: "الصلاة", icon: Moon },
    { id: "adhkar", label: "أذكار", icon: TasbihIcon },
    { id: "tips", label: "بصيرة", icon: Eye },
    { id: "focus", label: "تركيز", icon: Timer },
    { id: "tasks", label: "المهام", icon: ListChecks },
    { id: "goals", label: "أهداف", icon: Target },
    { id: "vault", label: "خزنة", icon: Wallet },
    { id: "reports", label: "التقارير", icon: TrendingUp },
    { id: "achieve", label: "أنجز", icon: Rocket },
    { id: "assistant", label: "مساعد", icon: MessageCircle },
    { id: "settings", label: "التخصيص", icon: Settings },
  ];
  const lv = getLevel(gamify.points);
  const lvProgress = lv.next ? (gamify.points - lv.current) / (lv.next - lv.current) : 1;
  return (
    <div style={S.header} className="masar-header">
      <div style={S.headerTop}>
        <div style={S.brand}>
          <img src="/logo-mark.png" alt="" style={S.brandLogo} />
          <span style={S.brandText}>مسار</span>
          {isVip ? (
            <span title="عضو VIP دائم" style={SUB.vipBadge}><Crown size={11} /></span>
          ) : isSub ? (
            <span title="مشترك في مسار" style={SUB.subBadge}><Star size={11} fill="#0A0A0B" /></span>
          ) : null}
        </div>
        <div style={S.headerStats}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.25)", borderRadius: 10, padding: "3px 8px", fontSize: 11.5, color: "#C9A24B", fontWeight: 700 }}>
            <Star size={11} color="#C9A24B" /> {lv.label} {lv.level}
            <span style={{ width: 36, height: 4, borderRadius: 2, background: "#1F1F22", overflow: "hidden", marginRight: 2 }}>
              <span style={{ display: "block", height: "100%", width: `${Math.round(lvProgress * 100)}%`, background: "#C9A24B", borderRadius: 2 }} />
            </span>
          </span>
          <span title={hasCloud ? "متصل بالسحابة" : "تخزين محلي"} style={{ ...S.cloudDot, background: hasCloud ? "rgba(95,168,160,0.15)" : "rgba(107,104,99,0.15)", color: hasCloud ? "#5FA8A0" : "#8A8782", display: "flex", alignItems: "center", gap: 4 }}>
            {hasCloud ? <Cloud size={11} /> : <CloudOff size={11} />}
          </span>
          <span style={S.hStat}><Flame size={13} color="#D17B5F" /> {stats.streak}</span>
          <span style={S.hStat}><Star size={13} color="#C9A24B" /> {gamify.points}</span>
          {hasAuth && (user ? (
            <button onClick={onSignOut} title={`${user.name || user.email} · تسجيل الخروج`} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(95,168,160,0.12)", border: "1px solid rgba(95,168,160,0.3)", color: "#5FA8A0", borderRadius: 10, padding: "3px 7px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {user.avatar ? <img src={user.avatar} alt="" style={{ width: 16, height: 16, borderRadius: "50%" }} /> : <User size={12} />}
              <LogOut size={11} />
            </button>
          ) : (
            <button onClick={onSignIn} title="تسجيل الدخول بحساب Google" style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "#C9A24B", borderRadius: 10, padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <LogIn size={11} /> دخول
            </button>
          ))}
        </div>
      </div>
      <div style={S.tabs}>
        {tabs.map((t) => {
          const Icon = t.icon; const active = view === t.id;
          return (
            <button key={t.id} onClick={() => setView(t.id)} style={{ ...S.tabBtn, ...(active ? S.tabBtnActive : {}) }}>
              <Icon size={15} strokeWidth={2} /><span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TodayView({ date, setDate, entries, setEntries, categories, tasks, setTasks, reports, setReports, aiHistory, mandatoryLog, setMandatoryLog, focus, addPoints, showToast, subscription }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [manualPeriod, setManualPeriod] = useState(null);
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
  const periodLabel = period === "morning" ? "الصباح" : "المساء";
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
    const newLog = { ...(mandatoryLog || {}), [today]: { ...todayMandatory, [task.key]: done } };
    if (setMandatoryLog) setMandatoryLog(newLog);
    await store.saveMandatoryItem(today, task.key, done);
    if (done) { addPoints(task.points, task.label); showToast(`+${task.points} نقطة`); }
    else addPoints(-task.points, `التراجع عن ${task.label}`);
  }

  async function saveEntry(entry) {
    setEntries((prev) => prev.some((e) => e.id === entry.id) ? prev.map((e) => (e.id === entry.id ? entry : e)) : [...prev, entry]);
    await store.saveEntry(entry);
    if (!editingEntry) addPoints(15);
    setModalOpen(false); setEditingEntry(null); showToast("تم حفظ بياناتك بنجاح");
  }
  async function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await store.deleteEntry(id);
    addPoints(-15, "حذف نشاط");
    showToast("تم الحذف");
  }
  async function toggleTask(t) {
    const updated = { ...t, done: !t.done };
    setTasks((prev) => prev.map((x) => x.id === t.id ? updated : x));
    await store.saveTask(updated);
    if (!t.done) addPoints(10);
    else addPoints(-10, "التراجع عن مهمة");
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
        <button onClick={() => shiftDay(-1)} style={S.iconBtn}><ChevronRight size={18} /></button>
        <div style={S.dateLabel}>{arabicDate(date, { weekday: "long", day: "numeric", month: "long" })}{isToday && <span style={S.todayPill}>اليوم</span>}</div>
        <button onClick={() => shiftDay(1)} style={S.iconBtn}><ChevronLeft size={18} /></button>
      </div>

      {mandatoryVisible.length > 0 && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>المهام الأساسية اليومية</span>
            <span style={{ fontSize: 11, color: mandatoryDoneCount === mandatoryVisible.length ? "#5FA8A0" : "#8A8782" }}>{mandatoryDoneCount}/{mandatoryVisible.length}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {mandatoryVisible.map((task) => {
              const done = !!todayMandatory[task.key];
              return (
                <button key={task.key} onClick={() => toggleMandatoryToday(task)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 20, border: done ? "1px solid rgba(95,168,160,0.5)" : "1px solid var(--line)", background: done ? "rgba(95,168,160,0.1)" : "transparent", color: done ? "#5FA8A0" : "#8A8782", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: done ? "line-through" : "none" }}>
                  <span>{task.icon}</span><span>{task.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={S.wheelSection}>
        <DayWheel
          entries={halfEntries}
          focusSessions={halfFocusSessions}
          catMap={catMap}
          size={224}
          glow={periodGlow}
          period={period}
          centerLabel={(halfEntries.length === 0 && halfFocusSessions.length === 0) ? "ابدأ يومك" : periodLabel}
          centerValue={fmtHM(halfTrackedMinutes)}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, marginTop: -4 }}>
        <button onClick={togglePeriod} style={{ ...S.periodToggle, ...(period === "morning" ? S.periodToggleMorning : S.periodToggleEvening) }}>
          {period === "morning" ? "☀️" : "🌙"} {periodLabel}
        </button>
      </div>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>اضغط أي قوس في العجلة لتفاصيل ذلك النشاط</span>
      </div>
      {!isFutureDay && unrecordedMinutes > 30 && (
        <div style={{ background: "rgba(201,162,75,0.08)", border: "1px solid rgba(201,162,75,0.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 14, textAlign: "center" }}>
          <span style={{ fontSize: 12.5, color: "#C9A24B", lineHeight: 1.7 }}>
            لديك {fmtHM(unrecordedMinutes)} غير مسجّلة {date === todayKey() ? "اليوم" : "في هذا اليوم"} — سجّل أنشطتك لتعرف أين يذهب وقتك.
          </span>
        </div>
      )}

      <div style={S.legendRow}>
        {byCategory.map((c) => (
          <div key={c.catId} style={S.legendChip}><span style={{ ...S.legendDot, background: c.color }} /><span>{c.name}</span><span style={S.legendMins}>{fmtHM(c.mins)}</span></div>
        ))}
        {byCategory.length === 0 && <div style={S.emptyHint}>لا أنشطة مسجلة لهذا اليوم</div>}
      </div>

      <DailyEvolution
        date={date} dayEntries={dayEntries} catMap={catMap}
        report={dailyReport?.payload} aiHistory={aiHistory}
        subscription={subscription}
        onSave={async (payload, gist) => {
          const rep = { id: uid(), kind: "daily", date, payload, gist };
          setReports((prev) => [rep, ...prev.filter((r) => !(r.kind === "daily" && r.date === date))]);
          await store.saveReport(rep);
        }}
      />

      <div style={S.entryListHeader}>
        <span>السجل</span>
        <button onClick={() => { setEditingEntry(null); setModalOpen(true); }} style={S.addBtn}><Plus size={16} /><span>إضافة نشاط</span></button>
      </div>
      <div style={S.entryList} className="stagger-in">
        {dayEntries.length === 0 && <div style={S.emptyState}><div style={S.emptyStateTitle}>ابدأ يومك</div><div style={S.emptyStateSub}>سجّل أول نشاط لترى عجلة يومك تنبض</div></div>}
        {dayEntries.map((e) => {
          const cat = catMap[e.catId] || { name: "غير محدد", color: "#9A968F" };
          async function adjustMins(delta) {
            const currentDur = diffMinutes(e.start, e.end);
            const newDur = Math.max(1, currentDur + delta);
            const newEnd = addMinutesToTime(e.start, newDur);
            const updated = { ...e, end: newEnd };
            setEntries((prev) => prev.map((x) => x.id === e.id ? updated : x));
            await store.saveEntry(updated);
          }
          return (
            <div key={e.id} style={S.entryRow} onClick={() => { setEditingEntry(e); setModalOpen(true); }}>
              <span style={{ ...S.entryBar, background: cat.color }} />
              <div style={S.entryInfo}><div style={S.entryName}>{cat.name}</div>{e.note && <div style={S.entryNote}>{e.note}</div>}</div>
              <div style={S.entryTime}><div style={S.entryDuration}>{fmtHM(diffMinutes(e.start, e.end))}</div></div>
              <div style={{ display: "flex", gap: 3, alignItems: "center" }} onClick={(ev) => ev.stopPropagation()}>
                <button onClick={() => adjustMins(-2)} style={{ ...S.deleteBtn, fontSize: 12, color: "#8A8782" }}>-2</button>
                <button onClick={() => adjustMins(2)} style={{ ...S.deleteBtn, fontSize: 12, color: "#C9A24B" }}>+2</button>
                <button onClick={(ev) => { ev.stopPropagation(); deleteEntry(e.id); }} style={S.deleteBtn}><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {dayTasks.length > 0 && (
        <div style={S.quickTasks}>
          <div style={S.quickTasksTitle}>مهام اليوم</div>
          {dayTasks.map((t) => (
            <div key={t.id} style={S.quickTaskRow} onClick={() => toggleTask(t)}>
              <span style={{ ...S.checkbox, ...(t.done ? S.checkboxDone : {}) }}>{t.done && <Check size={12} />}</span>
              <span style={{ ...S.quickTaskText, ...(t.done ? S.quickTaskTextDone : {}) }}>{t.title}</span>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <EntryModal entry={editingEntry} date={date} categories={categories} onSave={saveEntry} onClose={() => { setModalOpen(false); setEditingEntry(null); }} />}
    </div>
  );
}

function DailyEvolution({ date, dayEntries, catMap, report, aiHistory, onSave, subscription }) {
  const [loading, setLoading] = useState(false);
  const [local, setLocal] = useState(report || null);
  useEffect(() => { setLocal(report || null); }, [report, date]);

  if (!isActiveSubscriber(subscription)) {
    return <UpsellCard icon={Sun} title="تطوّرك اليوم في مسار الكامل" message="يلخّص مسار يومك ويقترح لك خطوة عملية واحدة للغد، بناءً على أنشطتك الفعلية." compact />;
  }

  async function generate() {
    if (dayEntries.length === 0) { setLocal({ error: "سجّل بعض الأنشطة أولاً حتى أقدر ألخّص يومك." }); return; }
    setLoading(true);
    try {
      const summary = dayEntries.map((e) => `${catMap[e.catId]?.name || "غير محدد"} | ${e.start}-${e.end} | ${e.note || ""}`).join("\n");
      const prevGists = aiHistory.slice(0, 3).map((h) => h.gist).join(" / ");
      const prompt = `أنت مرشد تطوير ذاتي يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. هذا سجل أنشطة المستخدم ليوم واحد:\n${summary}\n\n${prevGists ? `ملخصات أيام سابقة لا تكررها بل تبني عليها: ${prevGists}` : ""}\n\nاكتب ملخصاً ملهماً قصيراً عن أداء اليوم مع نصيحة عملية للغد. أعد فقط JSON بدون أي نص أو markdown:\n{"summary":"جملتان عن أداء اليوم","tip":"نصيحة واحدة قصيرة للغد","mood":"كلمة واحدة تصف اليوم","gist":"ملخص 6 كلمات"}`;
      const text = await analyze(prompt, 800);
      const parsed = parseJsonLoose(text);
      setLocal(parsed); onSave(parsed, parsed.gist);
    } catch (err) {
      console.error("[DailyEvolution] analyze failed:", err, err?.debug);
      setLocal({ error: `تعذّر التحليل الآن، جرّب مرة أخرى.${err?.debug ? ` [DEBUG: ${JSON.stringify(err.debug)}]` : ""}` });
    }
    finally { setLoading(false); }
  }

  return (
    <div style={S.evolutionCard}>
      <div style={S.evolutionHeader}>
        <div style={S.evolutionTitleRow}><Sun size={16} color="#C9A24B" /><span style={S.evolutionTitle}>تطوّرك اليوم</span></div>
        <button onClick={generate} disabled={loading} style={S.evolutionBtn}>
          {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
          {loading ? "..." : local && !local.error ? "تحديث" : "لخّص يومي"}
        </button>
      </div>
      {!local && <div style={S.evolutionEmpty}>اطلب من مسار أن يلخّص يومك ويقترح خطوة للغد.</div>}
      {local?.error && <div style={S.evolutionEmpty}>{local.error}</div>}
      {local && !local.error && (
        <div>
          {local.mood && <span style={S.moodPill}>{local.mood}</span>}
          <p style={S.evolutionSummary}>{local.summary}</p>
          {local.tip && <div style={S.tipBox}><Target size={13} color="#5FA8A0" /><span>{local.tip}</span></div>}
        </div>
      )}
    </div>
  );
}

// Sunday first so the week reads naturally right-to-left in RTL: Sunday
// renders rightmost (start of week), Saturday renders leftmost (end).
const WEEKDAY_SHORT = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

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

function TasksView({ tasks, setTasks, categories, addPoints, showToast, subscription }) {
  const isSub = isActiveSubscriber(subscription);
  const [title, setTitle] = useState("");
  const [catId, setCatId] = useState(categories[0]?.id);
  const [weekStart, setWeekStart] = useState(() => startOfWeekKey(todayKey()));
  const [selectedDay, setSelectedDay] = useState(() => todayKey());
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const today = todayKey();
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i)), [weekStart]);

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
      showToast("أنشئ مهامك بلا حدود مع مسار الكامل");
      return;
    }
    const t = { id: uid(), title: title.trim(), catId, due: selectedDay, done: false, created: todayKey() };
    setTasks((prev) => [...prev, t]); await store.saveTask(t); setTitle(""); showToast("تمت إضافة المهمة");
  }
  async function toggle(t) {
    const updated = { ...t, done: !t.done };
    setTasks((prev) => prev.map((x) => x.id === t.id ? updated : x));
    await store.saveTask(updated);
    if (!t.done) {
      addPoints(10);
      const after = tasksForDay(t.due).map((x) => (x.id === t.id ? updated : x));
      if (after.length > 0 && after.every((x) => x.done)) showToast("🎉 أكملت كل مهام هذا اليوم!");
    } else {
      addPoints(-10, "التراجع عن مهمة");
    }
  }
  async function remove(id) {
    const removed = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await store.deleteTask(id);
    if (removed?.done) addPoints(-10, "حذف مهمة منجزة");
    showToast("تم الحذف");
  }

  const selectedList = tasksForDay(selectedDay);
  const selectedStats = dayStats(selectedDay);
  const selectedIdx = Math.max(0, weekDays.indexOf(selectedDay));

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>دفترك الذكي</div>

      <div style={S.dateRow}>
        <button onClick={() => shiftWeek(-1)} style={S.iconBtn}><ChevronRight size={18} /></button>
        <div style={S.dateLabel}>{arabicDate(weekDays[0], { day: "numeric", month: "short" })} – {arabicDate(weekDays[6], { day: "numeric", month: "short" })}</div>
        <button onClick={() => shiftWeek(1)} style={S.iconBtn}><ChevronLeft size={18} /></button>
      </div>

      <div style={S.weekStrip}>
        {weekDays.map((d, i) => {
          const stats = dayStats(d);
          const isSelected = d === selectedDay;
          const isToday = d === today;
          return (
            <button key={d} onClick={() => setSelectedDay(d)} style={{ ...S.dayChip, ...(isSelected ? S.dayChipActive : {}) }}>
              <span style={S.dayChipWeekday}>{WEEKDAY_SHORT[i]}</span>
              <span style={S.dayChipNum}>{new Date(d).getDate()}</span>
              {stats.complete ? <Check size={11} color="#5FA8A0" /> : isToday ? <span style={S.dayChipTodayDot} /> : <span style={{ height: 11 }} />}
            </button>
          );
        })}
      </div>

      <div style={S.taskComposer}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder={`أضف مهمة ليوم ${WEEKDAY_SHORT[selectedIdx]}...`} style={S.taskInput} />
        <button onClick={addTask} style={S.taskAddBtn}><Plus size={18} /></button>
      </div>
      <div style={S.taskMeta}>
        <div style={S.catScroll}>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setCatId(c.id)} style={{ ...S.catMini, borderColor: catId === c.id ? c.color : "#2A2A2D", background: catId === c.id ? `${c.color}22` : "transparent" }}>
              <span style={{ ...S.legendDot, background: c.color }} />{c.name}
            </button>
          ))}
        </div>
      </div>

      {!isSub && tasks.length >= FREE_TASK_LIMIT && (
        <UpsellCard icon={ListChecks} title="مهام بلا حدود مع مسار الكامل" message="نظّم كل مهامك بلا سقف، واحصل على تذكيرات ومتابعة كاملة لكل يوم." compact />
      )}

      <div style={S.taskList} className="stagger-in">
        {selectedList.length === 0 && <div style={S.emptyState}><div style={S.emptyStateTitle}>لا مهام هذا اليوم</div><div style={S.emptyStateSub}>أضف مهمة لتبدأ التخطيط</div></div>}
        {selectedList.map((t) => {
          const cat = catMap[t.catId];
          return (
            <div key={t.id} style={S.taskRow}>
              <span onClick={() => toggle(t)} style={{ ...S.checkbox, ...(t.done ? S.checkboxDone : {}) }}>{t.done && <Check size={12} />}</span>
              <div style={S.taskInfo}>
                <div style={{ ...S.taskTitle, ...(t.done ? S.taskTitleDone : {}) }}>{t.title}</div>
                {cat && <div style={S.taskTags}><span style={S.taskTag}><span style={{ ...S.legendDot, background: cat.color, width: 6, height: 6 }} />{cat.name}</span></div>}
              </div>
              <button onClick={() => remove(t.id)} style={S.deleteBtn}><Trash2 size={14} /></button>
            </div>
          );
        })}
        {selectedStats.complete && <div style={S.dayCompleteBanner}>🎉 أكملت كل مهام هذا اليوم! أحسنت.</div>}
      </div>
    </div>
  );
}

function ReportsView({ entries, categories, focus, profile, sleepLog, setSleepLog, showToast }) {
  const [range, setRange] = useState("week");
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const span = range === "week" ? 7 : 30;
  const days = useMemo(() => {
    const arr = []; const today = new Date();
    for (let i = span - 1; i >= 0; i--) { const d = new Date(today); d.setDate(d.getDate() - i); arr.push(todayKey(d)); }
    return arr;
  }, [span]);
  const barData = days.map((day) => ({
    day, label: range === "week" ? arabicDate(day, { weekday: "short" }) : arabicDate(day, { day: "numeric" }),
    hours: +(entries.filter((e) => e.date === day).reduce((s, e) => s + diffMinutes(e.start, e.end), 0) / 60).toFixed(1),
  }));
  const totalMin = entries.filter((e) => days.includes(e.date)).reduce((s, e) => s + diffMinutes(e.start, e.end), 0);
  const activeDays = new Set(entries.filter((e) => days.includes(e.date)).map((e) => e.date)).size;
  const avgPerActiveDay = activeDays ? totalMin / activeDays : 0;
  const focusMin = (focus || []).filter((f) => days.includes(f.date)).reduce((s, f) => s + f.minutes, 0);
  const catTotals = useMemo(() => {
    const m = {};
    entries.filter((e) => days.includes(e.date)).forEach((e) => { m[e.catId] = (m[e.catId] || 0) + diffMinutes(e.start, e.end); });
    return Object.entries(m).map(([catId, mins]) => ({ name: catMap[catId]?.name || "غير محدد", value: mins, color: catMap[catId]?.color || "#9A968F" })).sort((a, b) => b.value - a.value);
  }, [entries, days, catMap]);

  function exportPdf() {
    const rangeLabel = range === "week" ? "الأسبوعي" : "الشهري";
    const rows = catTotals.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${fmtHM(c.value)}</td></tr>`).join("");
    const dayRows = barData.filter((d) => d.hours > 0).map((d) => `<tr><td>${d.label}</td><td>${d.hours} ساعة</td></tr>`).join("");
    const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير مسار ${rangeLabel}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Amiri:wght@700&display=swap');
        body{font-family:'Tajawal',sans-serif;color:#1a1a1a;padding:40px;max-width:700px;margin:auto}
        h1{font-family:'Amiri',serif;color:#8a6d28;border-bottom:2px solid #C9A24B;padding-bottom:10px}
        .meta{color:#666;font-size:13px;margin-bottom:24px}
        .kpis{display:flex;gap:16px;margin-bottom:24px}
        .kpi{flex:1;border:1px solid #ddd;border-radius:10px;padding:14px;text-align:center}
        .kpi .v{font-family:'Amiri',serif;font-size:22px;font-weight:700;color:#8a6d28}
        .kpi .l{font-size:12px;color:#666;margin-top:4px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th,td{text-align:right;padding:8px 12px;border-bottom:1px solid #eee;font-size:14px}
        th{color:#8a6d28;font-size:12px}
        h2{font-size:16px;margin-top:24px}
        .footer{margin-top:40px;color:#999;font-size:11px;text-align:center}
      </style></head><body>
      <h1>◐ تقرير مسار ${rangeLabel}</h1>
      <div class="meta">${profile?.about ? escapeHtml(profile.about) + " · " : ""}صدر بتاريخ ${arabicDate(todayKey(), { day: "numeric", month: "long", year: "numeric" })}</div>
      <div class="kpis">
        <div class="kpi"><div class="v">${fmtHM(totalMin)}</div><div class="l">إجمالي الوقت المسجّل</div></div>
        <div class="kpi"><div class="v">${activeDays}</div><div class="l">أيام نشطة</div></div>
        <div class="kpi"><div class="v">${fmtHM(focusMin)}</div><div class="l">وقت التركيز</div></div>
      </div>
      <h2>توزيع الأنشطة</h2>
      <table><tr><th>الفئة</th><th>الوقت</th></tr>${rows || '<tr><td colspan=2>لا بيانات</td></tr>'}</table>
      <h2>الساعات اليومية</h2>
      <table><tr><th>اليوم</th><th>الساعات</th></tr>${dayRows || '<tr><td colspan=2>لا بيانات</td></tr>'}</table>
      <div class="footer">مسار · أداتك الشخصية للوقت وتطوير الذات</div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { showToast("اسمح بالنوافذ المنبثقة للتصدير"); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
  }

  return (
    <div style={S.view}>
      <div style={S.reportsHead}>
        <div style={S.sectionTitle}>تقاريرك</div>
        <div style={S.rangeToggle}>
          <button onClick={() => setRange("week")} style={{ ...S.rangeBtn, ...(range === "week" ? S.rangeBtnActive : {}) }}>أسبوع</button>
          <button onClick={() => setRange("month")} style={{ ...S.rangeBtn, ...(range === "month" ? S.rangeBtnActive : {}) }}>شهر</button>
        </div>
      </div>

      <button onClick={exportPdf} style={S.exportBtn}><Download size={15} /> تصدير التقرير PDF</button>

      <div style={S.kpiRow}>
        <div style={S.kpiCard}><div style={S.kpiValue}>{fmtHM(totalMin)}</div><div style={S.kpiLabel}>الإجمالي</div></div>
        <div style={S.kpiCard}><div style={S.kpiValue}>{activeDays}</div><div style={S.kpiLabel}>أيام نشطة</div></div>
        <div style={S.kpiCard}><div style={S.kpiValue}>{fmtHM(avgPerActiveDay)}</div><div style={S.kpiLabel}>معدل اليوم</div></div>
      </div>
      <div style={S.chartCard}>
        <div style={S.chartTitle}>الساعات {range === "week" ? "اليومية" : "خلال الشهر"}</div>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={barData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1F1F22" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#6B6863", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "#2A2A2D" }} tickLine={false} interval={range === "week" ? 0 : 3} />
            <YAxis tick={{ fill: "#6B6863", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#1A1A1D", border: "1px solid #2A2A2D", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ساعة`, ""]} />
            <Bar dataKey="hours" radius={[3, 3, 3, 3]} fill="#C9A24B" maxBarSize={range === "week" ? 28 : 12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={S.chartCard}>
        <div style={S.chartTitle}>توزيع الأنشطة</div>
        {catTotals.length === 0 ? <div style={S.emptyHint}>لا بيانات كافية بعد</div> : (
          <div style={S.pieRow}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={catTotals} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none">
                  {catTotals.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1A1A1D", border: "1px solid #2A2A2D", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v, n) => [fmtHM(v), n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={S.pieLegend}>
              {catTotals.map((c, i) => (
                <div key={i} style={S.legendChip}><span style={{ ...S.legendDot, background: c.color }} /><span>{c.name}</span><span style={S.legendMins}>{fmtHM(c.value)}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={S.chartCard}>
        <div style={S.chartTitle}>اتجاه الإنتاجية</div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={barData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1F1F22" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#6B6863", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "#2A2A2D" }} tickLine={false} interval={range === "week" ? 0 : 3} />
            <YAxis tick={{ fill: "#6B6863", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#1A1A1D", border: "1px solid #2A2A2D", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ساعة`, ""]} />
            <Line type="monotone" dataKey="hours" stroke="#C9A24B" strokeWidth={2} dot={{ fill: "#C9A24B", r: range === "week" ? 3 : 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SleepSection sleepLog={sleepLog} setSleepLog={setSleepLog} days={days} range={range} showToast={showToast} />
    </div>
  );
}

function SleepSection({ sleepLog, setSleepLog, days, range, showToast }) {
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
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) { showToast("أدخل عدد ساعات نوم صحيح"); return; }
    const existing = sleepLog.find((s) => s.date === today);
    const entry = { id: existing ? existing.id : uid(), date: today, sleepTime: sTime, wakeTime: wTime, hours };
    const prevLog = sleepLog;
    setSleepLog((prev) => existing ? prev.map((s) => (s.date === today ? entry : s)) : [entry, ...prev]);
    const ok = await store.saveSleepEntry(entry);
    if (ok) showToast("سُجِّل نومك، نتمنى لك راحة جيدة 🌙");
    else { setSleepLog(prevLog); showToast("تعذّر الحفظ، حاول مرة أخرى"); }
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
    : (avgHours >= 7 && avgHours <= 9) ? { label: "نوم ممتاز", emoji: "👏" }
    : { label: "حاول الاقتراب من 7-9 ساعات لنوم أفضل", emoji: "🌙" };

  const chartData = days.map((day) => {
    const e = sleepLog.find((s) => s.date === day);
    return {
      day,
      label: range === "week" ? arabicDate(day, { weekday: "short" }) : arabicDate(day, { day: "numeric" }),
      hours: e ? e.hours : 0,
    };
  });

  return (
    <div style={S.chartCard}>
      <div style={S.chartTitle}>النوم</div>

      <div style={S.rangeToggle}>
        <button onClick={() => setMode("hours")} style={{ ...S.rangeBtn, flex: 1, ...(mode === "hours" ? S.rangeBtnActive : {}) }}>عدد الساعات</button>
        <button onClick={() => setMode("times")} style={{ ...S.rangeBtn, flex: 1, ...(mode === "times" ? S.rangeBtnActive : {}) }}>وقت النوم والاستيقاظ</button>
      </div>

      {mode === "hours" ? (
        <>
          <label style={S.label}>كم ساعة نمت؟</label>
          <input type="number" step="0.25" min="0" max="24" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
        </>
      ) : (
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>وقت النوم</label>
            <input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>وقت الاستيقاظ</label>
            <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
          </div>
        </div>
      )}
      <button onClick={submitEntry} style={{ ...S.saveBtn, marginTop: 12 }}>{todayEntry ? "تحديث نوم الليلة الماضية" : "تسجيل نوم الليلة الماضية"}</button>

      <div style={{ ...S.kpiRow, marginTop: 16 }}>
        <div style={S.kpiCard}>
          <div style={S.kpiValue}>{avgHours === null ? "—" : `${avgHours.toFixed(1)} س`}</div>
          <div style={S.kpiLabel}>متوسط النوم</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiValue}>{typicalBedtime ? to12h(typicalBedtime) : "—"}</div>
          <div style={S.kpiLabel}>وقت النوم المعتاد</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiValue}>{rating ? rating.emoji : "—"}</div>
          <div style={S.kpiLabel}>{rating ? rating.label : "سجّل نومك لتظهر النتيجة"}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1F1F22" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#6B6863", fontSize: range === "week" ? 11 : 8, fontFamily: "Tajawal" }} axisLine={{ stroke: "#2A2A2D" }} tickLine={false} interval={range === "week" ? 0 : 3} />
          <YAxis tick={{ fill: "#6B6863", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#1A1A1D", border: "1px solid #2A2A2D", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} ساعة`, ""]} />
          <Bar dataKey="hours" radius={[3, 3, 3, 3]} fill="#5FA8A0" maxBarSize={range === "week" ? 28 : 12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AssistantView({ entries, tasks, categories, focus, prayerLog, religious, profile, stats, setView }) {
  const today = todayKey();
  const hasIdentity = !!(profile?.hobbies?.trim() || profile?.about?.trim());

  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

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
    const catMap = Object.fromEntries((categories || []).map((c) => [c.id, c.name]));
    const todayEntries = (entries || []).filter((e) => e.date === today);
    const entryLines = todayEntries.map((e) => `${catMap[e.catId] || "نشاط"} ${e.start}-${e.end}`).join("، ") || "لا يوجد";
    const tasksToday = (tasks || []).filter((t) => t.due === today);
    const doneTasks = tasksToday.filter((t) => t.done).length;
    const focusToday = (focus || []).filter((f) => f.date === today).reduce((s, f) => s + f.minutes, 0);
    const prayersToday = (prayerLog || []).filter((p) => p.date === today).length;
    const religiousDone = (religious || []).filter((r) => r.date === today && r.done).length;
    return [
      `التاريخ: ${arabicDate(today)}`,
      `أنشطة اليوم: ${entryLines}`,
      `المهام: ${doneTasks} من ${tasksToday.length} مكتملة`,
      `دقائق التركيز اليوم: ${focusToday}`,
      `الصلوات المسجلة اليوم: ${prayersToday} من 5`,
      `الأعمال الروحية المنجزة اليوم: ${religiousDone}`,
      `سلسلة الالتزام: ${stats?.streak || 0} يوم`,
      profile?.field ? `مجال المستخدم: ${profile.field}` : "",
      profile?.hobbies ? `هوايات المستخدم: ${profile.hobbies}` : "",
      profile?.about ? `عن المستخدم: ${profile.about}` : "",
    ].filter(Boolean).join("\n");
  }, [entries, tasks, categories, focus, prayerLog, religious, stats, profile, today]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || sending || !hasIdentity) return;
    const userMsg = { id: uid(), role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setSending(true);
    store.saveChatMessage(userMsg);
    try {
      const reply = await coachChat(next, buildContext());
      const botMsg = { id: uid(), role: "assistant", content: reply };
      setMessages([...next, botMsg]);
      store.saveChatMessage(botMsg);
    } catch (err) {
      // Transient failures aren't saved — retrying shouldn't clutter the
      // permanent conversation history with dead-end error bubbles.
      console.error("[AssistantView] coachChat failed:", err, err?.debug);
      const debugSuffix = err?.debug ? ` [DEBUG: ${JSON.stringify(err.debug)}]` : "";
      setMessages([...next, { id: uid(), role: "assistant", content: `تعذّر الاتصال بالمساعد الآن. تأكد من اتصالك وحاول مرة أخرى.${debugSuffix}` }]);
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    setMessages([]);
    await store.clearChatMessages();
  }

  const suggestions = ["كيف أحسّن يومي؟", "خطط لي يومي", "اقترح نشاطاً يناسب هواياتي", "كيف أنظّم وقتي؟"];

  return (
    <div style={S.view}>
      <div style={HS.wrap}>
        <div style={HS.hero}>
          <div style={HS.heroIcon}><MessageCircle size={22} color="#0A0A0B" /></div>
          <div>
            <div style={HS.heroTitle}>مساعد أنجز</div>
            <div style={HS.heroSub}>مدرّبك الشخصي. يرى يومك ويساعدك تتطور.</div>
          </div>
        </div>

        {!hasIdentity && (
          <div style={S.setupCard}>
            <User size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={S.setupText}>
              اكتب هواياتك ونبذتك في التخصيص أولاً ليساعدك أنجز بشكل مخصّص.
              <div>
                <button onClick={() => setView("settings")} style={{ ...S.linkBtn, marginTop: 8 }}>الذهاب إلى التخصيص</button>
              </div>
            </div>
          </div>
        )}

        {hasIdentity && (
        <div style={HS.chatCard}>
          <div style={{ ...HS.chatHead, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Sparkles size={15} color="#C9A24B" /><span style={HS.chatTitle}>تحدّث مع أنجز</span>
            </div>
            {messages.length > 0 && (
              <button onClick={clearChat} style={{ background: "none", border: "none", color: "#6B6863", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                <Trash2 size={12} /> مسح المحادثة
              </button>
            )}
          </div>
          <div style={HS.chatScroll} ref={scrollRef}>
            {loadingHistory && (
              <div style={{ ...HS.msgBot, color: "#8A8782", display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="spin" /> يحمّل المحادثة...
              </div>
            )}
            {!loadingHistory && messages.length === 0 && (
              <div style={HS.msgBot}>أهلاً بك. أنا أنجز، مدرّبك الشخصي. اسألني كيف تحسّن يومك أو إنتاجيتك، أو دعني أخطط لك يومك.</div>
            )}
            {messages.map((m) => (
              <div key={m.id} style={m.role === "user" ? HS.msgUser : HS.msgBot}>{m.content}</div>
            ))}
            {sending && (
              <div style={{ ...HS.msgBot, color: "#8A8782", display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="spin" /> أنجز يكتب...
              </div>
            )}
          </div>
          {!loadingHistory && messages.length === 0 && (
            <div style={HS.suggestionRow}>
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} style={HS.suggestionChip}>{s}</button>
              ))}
            </div>
          )}
          <div style={HS.chatInputRow}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="اكتب رسالتك..."
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
    </div>
  );
}

const RELIGIOUS_PRESETS = [
  { key: "istighfar", title: "الاستغفار 1000 مرة", targetCount: 1000, targetMinutes: null },
  { key: "quran", title: "قراءة القرآن 30 دقيقة", targetCount: null, targetMinutes: 30 },
];

// أول الوقت يُحتسب خلال أول ربع ساعة من الأذان — عتبة تحفيزية فقط، لا
// علاقة لها بأي حكم شرعي، تُستخدم لصياغة رسالة مشجّعة عند التبكير.
const PRAYER_ON_TIME_MINUTES = 15;

// صياغات إيجابية فقط بلا أي لوم أو تخويف، سواء صلّى المستخدم في أول
// وقته أو تأخّر قليلاً أو كثيراً — الاحتفاء دائماً بأصل الفعل نفسه.
function prayerTimingMessage(prayerName, minutesAfterAdhan) {
  if (minutesAfterAdhan <= PRAYER_ON_TIME_MINUTES) return `ما شاء الله، صليت ${prayerName} في أول الوقت 👏`;
  return `صليت ${prayerName} بعد ${minutesAfterAdhan} دقيقة من الأذان`;
}
function prayerTimingNote(minutesAfterAdhan) {
  return minutesAfterAdhan <= PRAYER_ON_TIME_MINUTES ? "صليت في أول الوقت 👏" : `صليت بعد ${minutesAfterAdhan} دقيقة من الأذان`;
}

function PrayerView({ prayerLog, setPrayerLog, religious, setReligious, addPoints, showToast }) {
  const [now, setNow] = useState(new Date());
  const [notifEnabled, setNotifEnabled] = useState(false);
  const notifiedRef = useRef({});

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
        try { new Notification("حان وقت الصلاة", { body: `${p.name}: لا تنسَ أن تتوضأ وتصلّي` }); } catch {}
      }
    }
  }, [now, notifEnabled, prayers, today]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") { showToast("متصفحك لا يدعم الإشعارات"); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") { setNotifEnabled(true); showToast("تم تفعيل إشعارات الصلاة"); }
    else showToast("لم يُسمح بالإشعارات");
  }

  async function togglePrayer(p) {
    if (isDone(p.id)) {
      setPrayerLog((prev) => prev.filter((x) => !(x.date === today && x.prayerId === p.id)));
      await store.removePrayer(today, p.id);
      addPoints(-20, `التراجع عن ${p.name}`);
    } else {
      const [adhanH, adhanM] = p.time.split(":").map(Number);
      const minutesAfterAdhan = Math.max(0, (now.getHours() * 60 + now.getMinutes()) - (adhanH * 60 + adhanM));
      const entry = { id: uid(), date: today, prayerId: p.id, minutesAfterAdhan };
      setPrayerLog((prev) => [entry, ...prev]);
      await store.savePrayer(entry);
      addPoints(20);
      showToast(prayerTimingMessage(p.name, minutesAfterAdhan));
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
    if (todayReligious.some((r) => r.taskKey === preset.key)) { showToast("مضافة بالفعل اليوم"); return; }
    const t = { id: uid(), date: today, taskKey: preset.key, title: preset.title, targetCount: preset.targetCount, targetMinutes: preset.targetMinutes, minutesSpent: 0, done: false };
    setReligious((prev) => [t, ...prev]); await store.saveReligious(t); showToast("أضيفت المهمة");
  }
  async function updateReligious(t) {
    setReligious((prev) => prev.map((x) => x.id === t.id ? t : x)); await store.saveReligious(t);
  }
  async function removeReligious(id) {
    setReligious((prev) => prev.filter((x) => x.id !== id)); await store.deleteReligious(id);
  }

  const hh = String(next.minutesUntil ? Math.floor(next.minutesUntil / 60) : 0).padStart(2, "0");
  const mm = String(next.minutesUntil ? next.minutesUntil % 60 : 0).padStart(2, "0");

  return (
    <div style={S.view}>
      <div style={PS.prayerHero}>
        <Moon size={18} color="#C9A24B" />
        <div>
          <div style={PS.prayerHeroTitle}>أوقات الصلاة · الكويت</div>
          <div style={PS.prayerHeroSub}>{arabicDate(today, { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
      </div>
      <div style={PS.nextPrayerCard}>
        <div style={PS.nextLabel}>الصلاة القادمة</div>
        <div style={PS.nextName}>{next.name}{next.tomorrow ? " (غداً)" : ""}</div>
        <div style={PS.nextTime}>{to12h(next.time)}</div>
        <div style={PS.nextCountdown}>بعد {hh}:{mm}</div>
      </div>
      <div style={PS.weeklyCard}>
        <div style={S.catEditorHeader}><Star size={14} color="#C9A24B" /><span>إنجازك هذا الأسبوع</span></div>
        {weekOnTimePercent === null ? (
          <div style={S.emptyHint}>سجّل صلواتك لتظهر إحصائيتك الأسبوعية هنا.</div>
        ) : (
          <>
            <div style={PS.weeklyPercentText}>{weekOnTimePercent}% من صلواتك هذا الأسبوع في أول وقتها 👏</div>
            <div style={PS.weeklyBarTrack}><div style={{ ...PS.weeklyBarFill, width: `${weekOnTimePercent}%` }} /></div>
          </>
        )}
        <div style={PS.weeklyMotivation}>الصلاة في أول وقتها من أحب الأعمال إلى الله</div>
      </div>
      {!notifEnabled && (
        <button onClick={enableNotifications} style={PS.notifBtn}><Bell size={15} /> فعّل إشعار الأذان</button>
      )}
      <div style={PS.prayerList}>
        {prayers.map((p) => {
          const done = isDone(p.id);
          const isNext = p.id === next.id && !next.tomorrow;
          const entry = done ? todayLog.find((x) => x.prayerId === p.id) : null;
          return (
            <div key={p.id} style={{ ...PS.prayerRow, ...(isNext ? PS.prayerRowNext : {}), ...(done ? PS.prayerRowDone : {}) }}>
              <div style={PS.prayerInfo}>
                <div style={PS.prayerName}>{p.name}</div>
                <div style={PS.prayerTime}>{to12h(p.time)}</div>
                {entry && typeof entry.minutesAfterAdhan === "number" && (
                  <div style={PS.prayerTimingNote}>{prayerTimingNote(entry.minutesAfterAdhan)}</div>
                )}
              </div>
              <button onClick={() => togglePrayer(p)} style={{ ...PS.prayerBtn, ...(done ? PS.prayerBtnDone : {}) }}>
                {done ? <><CheckCircle2 size={15} /> تمت</> : "تمت الصلاة"}
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ ...PS.religiousCard }}>
        <div style={S.catEditorHeader}><BookMarked size={15} color="#C9A24B" /><span>المهام الدينية اليومية</span></div>
        <p style={S.profileHint}>كل مهمة تسجّل الدقائق التي استغرقتها قبل أن تكتمل.</p>
        {todayReligious.length === 0 && (
          <div style={PS.religiousPresets}>
            {RELIGIOUS_PRESETS.map((p) => (
              <button key={p.key} onClick={() => addReligiousPreset(p)} style={PS.presetAddBtn}><Plus size={14} /> {p.title}</button>
            ))}
          </div>
        )}
        <div style={PS.religiousList}>
          {todayReligious.map((t) => (
            <ReligiousTask key={t.id} task={t} onUpdate={updateReligious} onRemove={removeReligious} addPoints={addPoints} showToast={showToast} />
          ))}
        </div>
        {todayReligious.length > 0 && todayReligious.length < RELIGIOUS_PRESETS.length && (
          <div style={PS.religiousPresets}>
            {RELIGIOUS_PRESETS.filter((p) => !todayReligious.some((r) => r.taskKey === p.key)).map((p) => (
              <button key={p.key} onClick={() => addReligiousPreset(p)} style={PS.presetAddBtn}><Plus size={14} /> {p.title}</button>
            ))}
          </div>
        )}
      </div>
      <div style={S.memoryNote}><Save size={13} color="#5FA8A0" /><span>صلواتك ومهامك الدينية تُحفظ بشكل دائم ولا تُحذف.</span></div>
    </div>
  );
}

function ReligiousTask({ task, onUpdate, onRemove, addPoints, showToast }) {
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
    showToast(`${task.title}: ${mins} min · تم`);
  }

  return (
    <div style={{ ...PS.religiousItem, ...(task.done ? PS.religiousItemDone : {}) }}>
      <div style={PS.religiousTop}>
        <div style={{ flex: 1 }}>
          <div style={PS.religiousTitle}>{task.title}</div>
          <div style={PS.religiousMeta}>
            {task.done ? `أُنجزت في ${task.minutesSpent} min` : `الوقت: ${secStr}${task.targetMinutes ? ` / ${task.targetMinutes} min` : ""}`}
          </div>
        </div>
        {!task.done && <button onClick={() => onRemove(task.id)} style={S.deleteBtn}><Trash2 size={14} /></button>}
      </div>
      {!task.done && (
        <div style={PS.timerControlsRow}>
          <button onClick={() => setRunning((r) => !r)} style={PS.miniTimerBtn}>
            {running ? <><Pause size={14} /> إيقاف</> : <><Play size={14} /> {seconds > 0 ? "متابعة" : "ابدأ العدّاد"}</>}
          </button>
          <button onClick={finish} disabled={seconds === 0} style={{ ...PS.miniDoneBtn, ...(metTarget && seconds > 0 ? PS.miniDoneBtnReady : {}) }}>
            <CheckCircle2 size={14} /> تم
          </button>
        </div>
      )}
      {task.done && <div style={PS.religiousDoneRow}><CheckCircle2 size={15} color="#5FA8A0" /> مكتملة</div>}
    </div>
  );
}

const AS = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  heroIcon: { width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,162,75,0.25), 0 4px 14px rgba(201,162,75,0.25)" },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "#8A8782", lineHeight: 1.5, marginTop: 2 },
  grid: { display: "flex", flexDirection: "column", gap: 12 },
  catCard: { display: "flex", alignItems: "center", gap: 14, background: "linear-gradient(165deg, var(--panel), #141416)", border: "1px solid var(--line)", borderRadius: 20, padding: "18px 16px", cursor: "pointer", textAlign: "right", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(0,0,0,0.18)" },
  catIcon: { fontSize: 26, width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 35% 30%, rgba(201,162,75,0.24), rgba(201,162,75,0.05))", border: "1px solid rgba(201,162,75,0.25)", flexShrink: 0 },
  catInfo: { flex: 1, minWidth: 0 },
  catTitle: { fontFamily: "'Amiri', serif", fontSize: 17, fontWeight: 700, color: "var(--ink)" },
  catSub: { fontSize: 11.5, color: "#8A8782", marginTop: 3 },
  catBadge: { fontSize: 12, fontWeight: 700, color: "#5FA8A0", background: "rgba(95,168,160,0.1)", border: "1px solid rgba(95,168,160,0.3)", borderRadius: 20, padding: "5px 12px", flexShrink: 0, fontVariantNumeric: "tabular-nums" },
  backRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  backBtn: { display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#8A8782", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" },
  progressWrap: { marginBottom: 6 },
  progressTop: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8A8782", marginBottom: 6 },
  progressBar: { height: 8, background: "#1F1F22", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, transition: "width 0.4s ease" },
  itemCard: { position: "relative", background: "linear-gradient(180deg, var(--panel), #131315)", border: "1px solid var(--line)", borderRadius: 20, padding: "24px 20px", boxShadow: "0 6px 20px rgba(0,0,0,0.2)", transition: "opacity 0.3s ease, transform 0.3s ease" },
  itemCardDone: { opacity: 0.55 },
  itemOrnament: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  itemOrnamentLine: { flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,162,75,0.4))" },
  itemOrnamentLineRev: { flex: 1, height: 1, background: "linear-gradient(270deg, transparent, rgba(201,162,75,0.4))" },
  itemOrnamentDot: { color: "#C9A24B", fontSize: 11, flexShrink: 0 },
  itemText: { fontFamily: "'Amiri', 'Scheherazade New', serif", fontSize: 21, lineHeight: 2.3, letterSpacing: 0.2, color: "var(--ink)", whiteSpace: "pre-line", textAlign: "center" },
  itemTextQuran: { fontSize: 25, lineHeight: 2.6 },
  itemNote: { fontFamily: "'Amiri', serif", fontSize: 13, color: "#8A8782", textAlign: "center", marginTop: 12, lineHeight: 1.9 },
  itemFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 10 },
  itemLabel: { fontFamily: "'Amiri', serif", fontSize: 14, color: "#8A8782" },
  counterBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 96, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.35)", color: "#C9A24B", borderRadius: 14, padding: "10px 18px", fontSize: 19, fontWeight: 700, cursor: "pointer", fontFamily: "'Amiri', serif", fontVariantNumeric: "tabular-nums" },
  counterBtnDone: { background: "rgba(95,168,160,0.12)", borderColor: "rgba(95,168,160,0.4)", color: "#5FA8A0" },
  doneMsg: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", background: "linear-gradient(160deg, #15130E, #121214)", border: "1px solid rgba(201,162,75,0.35)", borderRadius: 18, padding: "28px 16px" },
  doneMsgIcon: { fontSize: 34 },
  doneMsgText: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700, color: "#C9A24B" },
};

function AdhkarView({ showToast }) {
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
    await store.saveAdhkarProgressItem(today, catId, item.id, nextRemaining, done);
    if (done) showToast("أُتمّ الذكر ✓");
  }

  function categoryStats(catId) {
    const items = ADHKAR[catId] || [];
    const doneCount = items.filter((it) => stateFor(catId, it).done).length;
    return { done: doneCount, total: items.length };
  }

  if (!loaded) {
    return <div style={S.view}><div style={{ color: "#8A8782", textAlign: "center", marginTop: 40 }}><Loader2 size={20} className="spin" /></div></div>;
  }

  if (!selected) {
    return (
      <div style={S.view}>
        <div style={AS.wrap}>
          <div style={AS.hero}>
            <div style={{ ...AS.heroIcon, color: "#0A0A0B" }}><TasbihIcon size={22} /></div>
            <div>
              <div style={AS.heroTitle}>أذكار</div>
              <div style={AS.heroSub}>اختر فئة لتبدأ، وعدّاد كل ذكر يحفظ تقدّمك تلقائياً طوال اليوم.</div>
            </div>
          </div>
          <div style={AS.grid}>
            {ADHKAR_CATEGORIES.map((cat) => {
              const stats = categoryStats(cat.id);
              return (
                <button key={cat.id} onClick={() => setSelected(cat.id)} style={AS.catCard}>
                  <span style={AS.catIcon}>{cat.icon}</span>
                  <div style={AS.catInfo}>
                    <div style={AS.catTitle}>{cat.title}</div>
                    <div style={AS.catSub}>{cat.subtitle} · {(ADHKAR[cat.id] || []).length} ذكرًا</div>
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
  const items = ADHKAR[selected] || [];
  const stats = categoryStats(selected);
  const allDone = stats.total > 0 && stats.done === stats.total;
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div style={S.view}>
      <div style={AS.wrap}>
        <div style={AS.backRow}>
          <button onClick={() => setSelected(null)} style={AS.backBtn}><ChevronRight size={16} /> الفئات</button>
        </div>
        <div style={AS.hero}>
          <div style={AS.heroTitle}>{cat.icon} {cat.title}</div>
          <div style={AS.heroSub}>{cat.subtitle}</div>
        </div>
        <div style={AS.progressWrap}>
          <div style={AS.progressTop}><span>{stats.done} من {stats.total}</span><span>{pct}%</span></div>
          <div style={AS.progressBar}><div style={{ ...AS.progressFill, width: `${pct}%`, background: allDone ? "#5FA8A0" : "#C9A24B" }} /></div>
        </div>

        {allDone && (
          <div style={AS.doneMsg}>
            <span style={AS.doneMsgIcon}>🤍</span>
            <span style={AS.doneMsgText}>تقبل الله</span>
          </div>
        )}

        {items.map((item) => {
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
                <button onClick={() => decrement(selected, item)} disabled={st.done} style={{ ...AS.counterBtn, ...(st.done ? AS.counterBtnDone : {}) }}>
                  {st.done ? <><Check size={18} /> تم</> : st.remaining}
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
  heroSub: { fontSize: 12, color: "#8A8782", lineHeight: 1.5, marginTop: 2 },
  dateLabel: { fontSize: 12.5, color: "#8A8782", textAlign: "center" },
  card: { position: "relative", background: "linear-gradient(180deg, var(--panel), #131315)", border: "1px solid var(--line)", borderRadius: 22, padding: "30px 22px 24px", boxShadow: "0 6px 24px rgba(0,0,0,0.22)" },
  ornament: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  ornamentLine: { flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,162,75,0.4))" },
  ornamentLineRev: { flex: 1, height: 1, background: "linear-gradient(270deg, transparent, rgba(201,162,75,0.4))" },
  ornamentDot: { color: "#C9A24B", fontSize: 11, flexShrink: 0 },
  quoteText: { fontFamily: "'Amiri', serif", fontSize: 21, lineHeight: 2.1, letterSpacing: 0.2, color: "var(--ink)", textAlign: "center", margin: 0 },
  footerRow: { display: "flex", alignItems: "center", justifyContent: "center", marginTop: 20 },
  categoryPill: { fontSize: 11.5, fontWeight: 700, color: "#C9A24B", background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 20, padding: "5px 14px" },
  footerNote: { fontSize: 11.5, color: "#6B6863", textAlign: "center", marginTop: 4 },
  archiveHeader: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "#8A8782" },
  archiveHeaderLine: { flex: 1, height: 1, background: "var(--line)" },
  archiveList: { display: "flex", flexDirection: "column", gap: 8 },
  archiveItem: { background: "#0F0F11", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 },
  archiveTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  archiveDate: { fontSize: 11, color: "#7A776F", whiteSpace: "nowrap" },
  archiveText: { fontFamily: "'Amiri', serif", fontSize: 14.5, lineHeight: 1.8, color: "#C9C6C0" },
};

function TipsView({ tipsLog, setTipsLog, showToast, subscription }) {
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
      store.saveTipsLog(today, todayTip.id).catch((e) => console.warn("[TipsView] tips_log save failed:", e));
    } catch (e) {
      console.warn("[TipsView] could not record today's tip in the log:", e);
    }
  }, [today, todayTip.id, canSeeTodayTip]);

  const archive = useMemo(
    () => Object.entries(tipsLog || {})
      .filter(([date]) => date !== today)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, tipId]) => ({ date, tip: TIPS.find((t) => t.id === tipId) }))
      .filter((entry) => entry.tip),
    [tipsLog, today]
  );

  return (
    <div style={S.view}>
      <div style={TS.wrap}>
        <div style={TS.hero}>
          <div style={TS.heroIcon}><Eye size={22} color="#0A0A0B" /></div>
          <div>
            <div style={TS.heroTitle}>بصيرة</div>
            <div style={TS.heroSub}>نصيحة جديدة كل يوم، بين الدنيا والدين.</div>
          </div>
        </div>
        {canSeeTodayTip ? (
          <>
            <div style={TS.dateLabel}>{arabicDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</div>
            <div style={TS.card}>
              <div style={TS.ornament}>
                <span style={TS.ornamentLine} /><span style={TS.ornamentDot}>◆</span><span style={TS.ornamentLineRev} />
              </div>
              <p style={TS.quoteText}>{todayTip.text}</p>
              <div style={TS.footerRow}>
                <span style={TS.categoryPill}>{TIP_CATEGORY_LABELS[todayTip.category] || "حكمة"}</span>
              </div>
            </div>
            <div style={TS.footerNote}>عد غداً لتجد نصيحة جديدة بانتظارك</div>
          </>
        ) : (
          <UpsellCard icon={Eye} title="نصيحة يومية متجددة في مسار الكامل" message="استمتعت بنصيحة يومك الأول. احصل على حكمة جديدة كل يوم بين الدنيا والدين مع مشتركي مسار الكامل." />
        )}

        {archive.length > 0 && (
          <>
            <div style={TS.archiveHeader}><span style={TS.archiveHeaderLine} /><span>أرشيف النصائح</span><span style={TS.archiveHeaderLine} /></div>
            <div style={TS.archiveList}>
              {archive.map(({ date, tip }) => {
                // arabicDate(dateString) would parse "YYYY-MM-DD" as UTC
                // midnight, shifting the shown day back by one for anyone
                // west of UTC — build the Date from local components instead.
                const [y, m, d] = date.split("-").map(Number);
                return (
                  <div key={date} style={TS.archiveItem}>
                    <div style={TS.archiveTop}>
                      <span style={TS.categoryPill}>{TIP_CATEGORY_LABELS[tip.category] || "حكمة"}</span>
                      <span style={TS.archiveDate}>{arabicDate(new Date(y, m - 1, d), { weekday: "long", day: "numeric", month: "long" })}</span>
                    </div>
                    <p style={TS.archiveText}>{tip.text}</p>
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
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={{ ...S.modal, borderRadius: 20, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}><span>نصيحة اليوم</span><button onClick={onClose} style={S.iconBtn}><X size={18} /></button></div>
        <div style={TS.card}>
          <div style={TS.ornament}>
            <span style={TS.ornamentLine} /><span style={TS.ornamentDot}>◆</span><span style={TS.ornamentLineRev} />
          </div>
          <p style={TS.quoteText}>{tip.text}</p>
          <div style={TS.footerRow}>
            <span style={TS.categoryPill}>{TIP_CATEGORY_LABELS[tip.category] || "حكمة"}</span>
          </div>
        </div>
        <button onClick={onClose} style={S.saveBtn}>حسناً</button>
      </div>
    </div>
  );
}

const GS = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  heroIcon: { width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,162,75,0.25), 0 4px 14px rgba(201,162,75,0.25)" },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "#8A8782", lineHeight: 1.5, marginTop: 2 },
  addCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px" },
  periodRow: { display: "flex", gap: 8, marginTop: 10, marginBottom: 12 },
  periodChip: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "transparent", border: "1px solid #2A2A2D", borderRadius: 10, padding: "9px 0", fontSize: 12.5, color: "#8A8782", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 },
  periodChipActive: { background: "rgba(201,162,75,0.1)", borderColor: "rgba(201,162,75,0.4)", color: "#C9A24B" },
  goalsList: { display: "flex", flexDirection: "column", gap: 12 },
  goalCard: { background: "#0F0F11", border: "1px solid var(--line)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 10 },
  goalTop: { display: "flex", alignItems: "flex-start", gap: 8 },
  goalTitle: { fontSize: 14, fontWeight: 700, color: "var(--ink)", flex: 1 },
  goalMeta: { fontSize: 11, color: "#7A776F", marginTop: 3 },
  statusBadge: { fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, height: "fit-content", flexShrink: 0 },
  statusDone: { color: "#5FA8A0", background: "rgba(95,168,160,0.12)" },
  statusFailed: { color: "#E05252", background: "rgba(224,82,82,0.1)" },
  calendarRow: { display: "flex", flexWrap: "wrap", gap: 5 },
  cell: { width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, border: "1px solid #2A2A2D", color: "#5A5650", flexShrink: 0 },
  cellMonth: { width: "auto", minWidth: 40, height: 22, padding: "0 6px", borderRadius: 8, fontSize: 9 },
  cellPast: { background: "rgba(201,162,75,0.16)", borderColor: "rgba(201,162,75,0.3)", color: "#C9A24B" },
  cellToday: { background: "#C9A24B", borderColor: "#C9A24B", color: "#0A0A0B", boxShadow: "0 0 0 2px rgba(201,162,75,0.3)" },
  reviewCard: { background: "linear-gradient(160deg, rgba(201,162,75,0.12), rgba(201,162,75,0.03))", border: "1px solid rgba(201,162,75,0.35)", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 10 },
  reviewTitle: { fontSize: 13.5, fontWeight: 700, color: "#C9A24B" },
  reviewQuestion: { fontSize: 13, color: "var(--ink)", lineHeight: 1.6 },
  reviewBtnRow: { display: "flex", gap: 10 },
  reviewYesBtn: { flex: 1, background: "rgba(95,168,160,0.14)", border: "1px solid rgba(95,168,160,0.4)", color: "#5FA8A0", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  reviewNoBtn: { flex: 1, background: "rgba(224,82,82,0.1)", border: "1px solid rgba(224,82,82,0.35)", color: "#E05252", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  reasonBox: { display: "flex", flexDirection: "column", gap: 8 },
  reasonInput: { width: "100%", background: "#0F0F11", border: "1px solid #2A2A2D", borderRadius: 10, padding: "10px 12px", color: "var(--ink)", fontSize: 13, fontFamily: "inherit", minHeight: 70, resize: "vertical" },
  reasonConfirmBtn: { background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  reasonConfirmBtnDisabled: { opacity: 0.5, cursor: "default" },
  failuresCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px" },
  failuresList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 10 },
  failureItem: { background: "#0F0F11", border: "1px solid var(--line)", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 4 },
  failureTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  failureTitle: { fontSize: 13, fontWeight: 700, color: "var(--ink)" },
  failureDate: { fontSize: 10.5, color: "#7A776F", whiteSpace: "nowrap" },
  failureReason: { fontSize: 12, color: "#B8B5AF", lineHeight: 1.6 },
  pendingNote: { fontSize: 11.5, color: "#E05252", textAlign: "center" },
};

function GoalCalendar({ goal, today }) {
  const isMonthUnit = goal.unit === "month";
  const todayMonthKey = today.slice(0, 7);
  return (
    <div style={GS.calendarRow}>
      {goal.cells.map((cell, i) => {
        const isPast = isMonthUnit ? cell.slice(0, 7) < todayMonthKey : cell < today;
        const isToday = isMonthUnit ? cell.slice(0, 7) === todayMonthKey : cell === today;
        const label = isMonthUnit ? arabicDate(cell, { month: "short" }) : String(Number(cell.slice(8, 10)));
        return (
          <div key={i} style={{ ...GS.cell, ...(isMonthUnit ? GS.cellMonth : {}), ...(isPast ? GS.cellPast : {}), ...(isToday ? GS.cellToday : {}) }}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

function GoalsView({ goals, setGoals, addPoints, showToast }) {
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("weekly");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const today = localDayKey();

  const hasPendingReason = Object.values(reviewDrafts).some((d) => d?.active);

  async function addGoal() {
    if (!title.trim()) return;
    if (hasPendingReason) { showToast("أكمل كتابة سبب عدم التحقيق أولاً قبل إضافة هدف جديد"); return; }
    const goal = createGoal({ id: uid(), title: title.trim(), period });
    setGoals((prev) => [goal, ...prev]);
    const ok = await store.saveGoal(goal);
    if (ok) { setTitle(""); showToast("أضفت هدفاً جديداً"); }
    else { setGoals((prev) => prev.filter((g) => g.id !== goal.id)); showToast("تعذّر حفظ الهدف، حاول مرة أخرى"); }
  }

  async function confirmSuccess(goal) {
    const updated = { ...goal, status: "done" };
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    const ok = await store.saveGoal(updated);
    if (ok) { addPoints(GOAL_POINTS_SUCCESS, `تحقيق هدف: ${goal.title}`); showToast(`أحسنت! تحقّق هدفك. +${GOAL_POINTS_SUCCESS} نقطة`); }
    else { setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g))); showToast("تعذّر الحفظ، حاول مرة أخرى"); }
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
      addPoints(-GOAL_POINTS_FAILURE, `لم يتحقق هدف: ${goal.title}`);
      setReviewDrafts((prev) => { const next = { ...prev }; delete next[goal.id]; return next; });
      showToast(`سُجِّل. -${GOAL_POINTS_FAILURE} نقطة`);
    } else {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
      showToast("تعذّر الحفظ، حاول مرة أخرى");
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
          <div style={GS.heroIcon}><Target size={22} color="#0A0A0B" /></div>
          <div>
            <div style={GS.heroTitle}>أهداف</div>
            <div style={GS.heroSub}>حدّد هدفك، وتابعه حتى تراجعه في وقته.</div>
          </div>
        </div>

        <div style={GS.addCard}>
          <label style={S.label}>هدف جديد</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGoal()} placeholder="مثال: قراءة كتاب كامل" style={{ ...S.input, marginTop: 6 }} />
          <div style={GS.periodRow}>
            {Object.entries(GOAL_PERIODS).map(([key, p]) => (
              <button key={key} onClick={() => setPeriod(key)} style={{ ...GS.periodChip, ...(period === key ? GS.periodChipActive : {}) }}>{p.label}</button>
            ))}
          </div>
          {hasPendingReason && <div style={GS.pendingNote}>أكمل سبب عدم تحقيق الهدف المعلَّق أولاً قبل إضافة هدف جديد</div>}
          <button onClick={addGoal} disabled={hasPendingReason} style={{ ...S.saveBtn, marginTop: hasPendingReason ? 8 : 0, ...(hasPendingReason ? { opacity: 0.5, cursor: "default" } : {}) }}>
            <Plus size={16} style={{ display: "inline", verticalAlign: "-3px" }} /> إضافة الهدف
          </button>
        </div>

        <div style={GS.goalsList}>
          {activeGoals.length === 0 && <div style={S.emptyHint}>لا أهداف بعد. أضف هدفك الأول أعلاه.</div>}
          {activeGoals.map((goal) => {
            const due = isReviewDue(goal, today);
            const draft = reviewDrafts[goal.id];
            return (
              <div key={goal.id} style={GS.goalCard}>
                <div style={GS.goalTop}>
                  <div>
                    <div style={GS.goalTitle}>{goal.title}</div>
                    <div style={GS.goalMeta}>{GOAL_PERIODS[goal.period].label} · {GOAL_PERIODS[goal.period].reviewLabel}</div>
                  </div>
                  {goal.status === "done" && <span style={{ ...GS.statusBadge, ...GS.statusDone }}><Check size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> تحقّق</span>}
                  <button onClick={() => removeGoal(goal.id)} style={S.deleteBtn}><Trash2 size={14} /></button>
                </div>
                <GoalCalendar goal={goal} today={today} />
                {due && !draft?.active && (
                  <div style={GS.reviewCard}>
                    <div style={GS.reviewTitle}>حان وقت المراجعة</div>
                    <div style={GS.reviewQuestion}>هل حققت هدفك "{goal.title}"؟</div>
                    <div style={GS.reviewBtnRow}>
                      <button onClick={() => confirmSuccess(goal)} style={GS.reviewYesBtn}>نعم</button>
                      <button onClick={() => setReviewDrafts((prev) => ({ ...prev, [goal.id]: { active: true, reason: "" } }))} style={GS.reviewNoBtn}>لا</button>
                    </div>
                  </div>
                )}
                {due && draft?.active && (
                  <div style={GS.reviewCard}>
                    <div style={GS.reviewTitle}>ما سبب عدم تحقيق الهدف؟</div>
                    <div style={GS.reasonBox}>
                      <textarea
                        value={draft.reason}
                        onChange={(e) => setReviewDrafts((prev) => ({ ...prev, [goal.id]: { active: true, reason: e.target.value } }))}
                        placeholder="اكتب السبب هنا (إلزامي)..."
                        style={GS.reasonInput}
                      />
                      <button
                        onClick={() => confirmFailure(goal)}
                        disabled={!draft.reason.trim()}
                        style={{ ...GS.reasonConfirmBtn, ...(!draft.reason.trim() ? GS.reasonConfirmBtnDisabled : {}) }}
                      >تأكيد</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={GS.failuresCard}>
          <div style={S.catEditorHeader}><AlertTriangle size={15} color="#E05252" /><span>أهداف لم تتحقق</span></div>
          <div style={GS.failuresList}>
            {allFailures.length === 0 && <div style={S.emptyHint}>لا يوجد أهداف غير محققة — استمر هكذا.</div>}
            {allFailures.map((f, i) => (
              <div key={i} style={GS.failureItem}>
                <div style={GS.failureTop}>
                  <span style={GS.failureTitle}>{f.goalTitle}</span>
                  <span style={GS.failureDate}>{arabicDate(f.checkpointDate, { day: "numeric", month: "short" })}</span>
                </div>
                <span style={GS.failureReason}>{f.reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const VAULT_CURRENCIES = [
  { code: "KWD", label: "دينار كويتي", symbol: "د.ك" },
  { code: "SAR", label: "ريال سعودي", symbol: "ر.س" },
  { code: "AED", label: "درهم إماراتي", symbol: "د.إ" },
  { code: "QAR", label: "ريال قطري", symbol: "ر.ق" },
  { code: "BHD", label: "دينار بحريني", symbol: "د.ب" },
  { code: "OMR", label: "ريال عماني", symbol: "ر.ع" },
  { code: "EGP", label: "جنيه مصري", symbol: "ج.م" },
  { code: "JOD", label: "دينار أردني", symbol: "د.أ" },
  { code: "USD", label: "دولار أمريكي", symbol: "$" },
  { code: "EUR", label: "يورو", symbol: "€" },
  { code: "GBP", label: "جنيه إسترليني", symbol: "£" },
];

function vaultCurrencySymbol(code) {
  return (VAULT_CURRENCIES.find((c) => c.code === code) || VAULT_CURRENCIES[0]).symbol;
}

function formatVaultAmount(amount, code) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${vaultCurrencySymbol(code)}`;
}

function VaultView({ vault, setVault, vaultTx, setVaultTx, showToast }) {
  const [setupBalance, setSetupBalance] = useState("");
  const [setupCurrency, setSetupCurrency] = useState("KWD");
  const [editingSetup, setEditingSetup] = useState(false);
  const [txType, setTxType] = useState(null); // 'expense' | 'income' | null
  const [txAmount, setTxAmount] = useState("");
  const [txReason, setTxReason] = useState("");

  // نفس نمط تجدّد نصيحة "بصيرة" اليومية (TipsView): تاريخ محلي يُعاد
  // فحصه دورياً وعند عودة التبويب للواجهة، فلا تبقى نصيحة الأمس ظاهرة إن
  // تُرك التبويب مفتوحاً عبر منتصف الليل المحلي.
  const [today, setToday] = useState(() => localDayKey());
  useEffect(() => {
    function syncToday() {
      setToday((prev) => { const now = localDayKey(); return prev === now ? prev : now; });
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
  const todayMoneyTip = useMemo(() => {
    try { return pickDailyMoneyTip(today, getOwner()); }
    catch (e) { console.error("[VaultView] falling back after error:", e); return pickDailyMoneyTip(today); }
  }, [today]);

  async function submitSetup() {
    const balance = parseFloat(setupBalance);
    if (!Number.isFinite(balance) || balance < 0) { showToast("أدخل رصيداً صحيحاً"); return; }
    const next = { balance, currency: setupCurrency };
    const prev = vault;
    setVault(next);
    setEditingSetup(false);
    const ok = await store.saveVault(next);
    if (ok) showToast("تم حفظ رصيدك");
    else { setVault(prev); showToast("تعذّر الحفظ، حاول مرة أخرى"); }
  }

  function startEditSetup() {
    setSetupBalance(vault ? String(vault.balance) : "");
    setSetupCurrency(vault ? vault.currency : "KWD");
    setEditingSetup(true);
  }

  async function submitTransaction() {
    const amount = parseFloat(txAmount);
    const reason = txReason.trim();
    if (!Number.isFinite(amount) || amount <= 0) { showToast("أدخل مبلغاً صحيحاً"); return; }
    if (!reason) { showToast(txType === "expense" ? "اكتب سبب الصرف" : "اكتب سبب الإضافة"); return; }
    const tx = { id: uid(), date: localDayKey(), amount, type: txType, reason, createdAt: new Date().toISOString() };
    const prevVault = vault;
    const newBalance = txType === "expense" ? vault.balance - amount : vault.balance + amount;
    setVaultTx((prevTx) => [tx, ...prevTx]);
    setVault({ ...vault, balance: newBalance });
    const txOk = await store.addVaultTransaction(tx);
    const balOk = await store.saveVault({ balance: newBalance, currency: vault.currency });
    if (txOk && balOk) {
      setTxType(null); setTxAmount(""); setTxReason("");
      showToast(txType === "expense" ? "سُجِّل المصروف" : "سُجِّلت الإضافة");
    } else {
      setVaultTx((prevTx) => prevTx.filter((t) => t.id !== tx.id));
      setVault(prevVault);
      showToast("تعذّر الحفظ، حاول مرة أخرى");
    }
  }

  async function removeTransaction(tx) {
    const prevVault = vault;
    const prevTx = vaultTx;
    const revertedBalance = tx.type === "expense" ? vault.balance + tx.amount : vault.balance - tx.amount;
    setVaultTx((list) => list.filter((t) => t.id !== tx.id));
    setVault({ ...vault, balance: revertedBalance });
    const delOk = await store.deleteVaultTransaction(tx.id);
    const balOk = await store.saveVault({ balance: revertedBalance, currency: vault.currency });
    if (!delOk || !balOk) { setVaultTx(prevTx); setVault(prevVault); showToast("تعذّر الحذف، حاول مرة أخرى"); }
  }

  const sortedTx = useMemo(
    () => [...vaultTx].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [vaultTx]
  );

  if (!vault || editingSetup) {
    return (
      <div style={S.view}>
        <div style={VS.wrap}>
          <div style={VS.hero}>
            <div style={VS.heroIcon}><Wallet size={22} color="#0A0A0B" /></div>
            <div>
              <div style={VS.heroTitle}>خزنة</div>
              <div style={VS.heroSub}>تتبّع رصيدك ونفقاتك بوضوح.</div>
            </div>
          </div>
          <div style={VS.setupCard}>
            <label style={S.label}>رصيدك الحالي</label>
            <input
              type="number" step="0.01" inputMode="decimal"
              value={setupBalance} onChange={(e) => setSetupBalance(e.target.value)}
              placeholder="0.00" style={{ ...S.input, marginTop: 6 }}
            />
            <label style={S.label}>العملة</label>
            <select value={setupCurrency} onChange={(e) => setSetupCurrency(e.target.value)} style={{ ...S.input, marginTop: 6 }}>
              {VAULT_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label} ({c.symbol})</option>)}
            </select>
            <button onClick={submitSetup} style={{ ...S.saveBtn, marginTop: 14 }}>حفظ الرصيد</button>
            {vault && editingSetup && (
              <button onClick={() => setEditingSetup(false)} style={{ ...S.saveBtn, marginTop: 8, background: "transparent", border: "1px solid #2A2A2D", color: "#8A8782" }}>إلغاء</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.view}>
      <div style={VS.wrap}>
        <div style={VS.hero}>
          <div style={VS.heroIcon}><Wallet size={22} color="#0A0A0B" /></div>
          <div>
            <div style={VS.heroTitle}>خزنة</div>
            <div style={VS.heroSub}>اعرف أين تذهب أموالك بالضبط.</div>
          </div>
        </div>

        <div style={VS.balanceCard}>
          <div style={VS.balanceLabel}>رصيدك الحالي</div>
          <div style={VS.balanceAmount}>{formatVaultAmount(vault.balance, vault.currency)}</div>
          <button onClick={startEditSetup} style={VS.editBalanceBtn}><Edit3 size={12} /> تعديل الرصيد أو العملة</button>
          <div style={VS.actionRow}>
            <button onClick={() => { setTxType("expense"); setTxAmount(""); setTxReason(""); }} style={VS.expenseBtn}>
              <ArrowDownCircle size={16} /> تسجيل مصروف
            </button>
            <button onClick={() => { setTxType("income"); setTxAmount(""); setTxReason(""); }} style={VS.incomeBtn}>
              <ArrowUpCircle size={16} /> تسجيل إضافة
            </button>
          </div>
        </div>

        {txType && (
          <div style={VS.txForm}>
            <div style={VS.txFormTitle}>{txType === "expense" ? "تسجيل مصروف" : "تسجيل إضافة"}</div>
            <label style={S.label}>المبلغ</label>
            <input
              type="number" step="0.01" inputMode="decimal" autoFocus
              value={txAmount} onChange={(e) => setTxAmount(e.target.value)}
              placeholder="0.00" style={{ ...S.input, marginTop: 6 }}
            />
            <label style={S.label}>{txType === "expense" ? "سبب الصرف" : "سبب الإضافة"}</label>
            <input
              value={txReason} onChange={(e) => setTxReason(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTransaction()}
              placeholder={txType === "expense" ? "مثال: فاتورة كهرباء" : "مثال: راتب"}
              style={{ ...S.input, marginTop: 6 }}
            />
            <div style={VS.txFormRow}>
              <button onClick={() => setTxType(null)} style={VS.txCancelBtn}>إلغاء</button>
              <button onClick={submitTransaction} style={{ ...S.saveBtn, marginTop: 0, flex: 1 }}>تأكيد</button>
            </div>
          </div>
        )}

        <div style={VS.tipCard}>
          <div style={TS.ornament}>
            <span style={TS.ornamentLine} /><span style={TS.ornamentDot}>◆</span><span style={TS.ornamentLineRev} />
          </div>
          <p style={TS.quoteText}>{todayMoneyTip.text}</p>
          <div style={TS.footerRow}>
            <span style={TS.categoryPill}>{MONEY_TIP_CATEGORY_LABELS[todayMoneyTip.category] || "نصيحة مالية"}</span>
          </div>
        </div>

        <div style={VS.logHeader}><span style={VS.logHeaderLine} /><span>سجل الحركات</span><span style={VS.logHeaderLine} /></div>
        <div style={VS.logList}>
          {sortedTx.length === 0 && <div style={S.emptyHint}>لا حركات بعد. سجّل أول مصروف أو إضافة أعلاه.</div>}
          {sortedTx.map((tx) => {
            const [y, m, d] = tx.date.split("-").map(Number);
            return (
              <div key={tx.id} style={VS.logItem}>
                <div style={VS.logTop}>
                  <span style={{ ...VS.logAmount, color: tx.type === "expense" ? "#E05252" : "#5FA8A0" }}>
                    {tx.type === "expense" ? "−" : "+"}{formatVaultAmount(tx.amount, vault.currency)}
                  </span>
                  <span style={VS.logDate}>{arabicDate(new Date(y, m - 1, d), { day: "numeric", month: "short" })}</span>
                  <button onClick={() => removeTransaction(tx)} style={S.deleteBtn}><Trash2 size={13} /></button>
                </div>
                <span style={VS.logReason}>{tx.reason}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const VS = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  heroIcon: { width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,162,75,0.25), 0 4px 14px rgba(201,162,75,0.25)" },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "#8A8782", lineHeight: 1.5, marginTop: 2 },
  setupCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px" },
  balanceCard: { background: "linear-gradient(180deg, var(--panel), #131315)", border: "1px solid var(--line)", borderRadius: 22, padding: "26px 20px 20px", textAlign: "center", boxShadow: "0 6px 24px rgba(0,0,0,0.22)" },
  balanceLabel: { fontSize: 12.5, color: "#8A8782", fontWeight: 600 },
  balanceAmount: { fontFamily: "'Amiri', serif", fontSize: 36, fontWeight: 700, color: "#C9A24B", marginTop: 8, direction: "ltr" },
  editBalanceBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#7A776F", fontSize: 11.5, cursor: "pointer", fontFamily: "inherit", marginTop: 8, padding: 4 },
  actionRow: { display: "flex", gap: 10, marginTop: 16 },
  expenseBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(224,82,82,0.1)", border: "1px solid rgba(224,82,82,0.35)", color: "#E05252", borderRadius: 12, padding: "12px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  incomeBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(95,168,160,0.14)", border: "1px solid rgba(95,168,160,0.4)", color: "#5FA8A0", borderRadius: 12, padding: "12px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  txForm: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px" },
  txFormTitle: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 4 },
  txFormRow: { display: "flex", gap: 10, marginTop: 14 },
  txCancelBtn: { background: "transparent", border: "1px solid #2A2A2D", color: "#8A8782", borderRadius: 12, padding: "0 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  tipCard: { position: "relative", background: "linear-gradient(180deg, var(--panel), #131315)", border: "1px solid var(--line)", borderRadius: 22, padding: "26px 20px 20px", boxShadow: "0 6px 24px rgba(0,0,0,0.22)" },
  logHeader: { display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 12.5, fontWeight: 700, color: "#8A8782" },
  logHeaderLine: { flex: 1, height: 1, background: "var(--line)" },
  logList: { display: "flex", flexDirection: "column", gap: 8 },
  logItem: { background: "#0F0F11", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 },
  logTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  logAmount: { fontSize: 14, fontWeight: 700, direction: "ltr" },
  logDate: { fontSize: 11, color: "#7A776F", whiteSpace: "nowrap", flex: 1, textAlign: "center" },
  logReason: { fontSize: 12.5, color: "#C9C6C0", lineHeight: 1.6 },
};

function FocusView({ focus, setFocus, commitments, setCommitments, categories, entries, addPoints, showToast, subscription }) {
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
  const intervalRef = useRef(null);
  const sessionRef = useRef(null);

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
            showToast("استمرنا في حساب وقتك أثناء غيابك");
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

  function toggle() {
    if (running) pauseTimer();
    else if (sessionRef.current) resumeTimer();
    else startTimer();
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
    await store.saveFocus(session);
    await store.saveActiveSession(null);
    addPoints(minutesDone);
    showToast(wasAway ? `أكملت ${minutesDone} دقيقة أثناء غيابك! +${minutesDone} نقطة` : `أكملت ${minutesDone} دقيقة! +${minutesDone} نقطة`);
    setRemaining(targetMin * 60);
    setCommitments((prev) => prev.map((c) => {
      const updated = { ...c, log: { ...c.log, [todayKey()]: (c.log[todayKey()] || 0) + minutesDone } };
      store.saveCommitment(updated);
      return updated;
    }));
  }

  function finishSession() {
    setRunning(false);
    setCustomEndTime(nowHHMM());
    setPendingCompletion({ sess: sessionRef.current, minutesDone: targetMin });
    sessionRef.current = null;
  }

  function logManual() {
    const mins = Math.max(1, Math.min(600, parseInt(manualMinutes, 10) || 0));
    if (!mins) { showToast("أدخل عدد دقائق صحيح"); return; }
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
    { id: "timer", label: "المؤقت", icon: Timer },
    { id: "study", label: "تقرير الدراسة", icon: BookOpen },
    { id: "general", label: "تقرير عام", icon: TrendingUp },
    { id: "bots", label: "التحدي", icon: Zap },
  ];

  const studyEntries = useMemo(() => {
    const studyCat = (categories || []).find((c) => c.name.includes("دراس"));
    if (!studyCat || !entries) return [];
    return entries.filter((e) => e.catId === studyCat.id);
  }, [entries, categories]);

  if (!loaded) return <div style={S.view}><div style={{ color: "#8A8782", textAlign: "center", marginTop: 40 }}><Loader2 size={20} className="spin" /></div></div>;

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>تركيز</div>
      <div style={S.subTabRow}>
        {subTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setSubTab(t.id)} style={{ ...S.subTab, ...(subTab === t.id ? S.subTabActive : {}) }}>
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>
      {subTab === "timer" && (
        <>
          <div style={PS.modeToggleRow}>
            <button onClick={() => setManualMode(false)} style={{ ...PS.modeToggleBtn, ...(!manualMode ? PS.modeToggleBtnActive : {}) }}><Timer size={13} /> عدّاد تلقائي</button>
            <button onClick={() => setManualMode(true)} style={{ ...PS.modeToggleBtn, ...(manualMode ? PS.modeToggleBtnActive : {}) }}><Edit3 size={13} /> إدخال يدوي</button>
          </div>
          {!manualMode ? (
            <div style={S.timerCard}>
              <FocusRing progress={progress} size={224}>
                <div style={S.timerTime}>{mm}:{ss}</div>
                <div style={S.timerTargetLabel}>{running ? "ركّز الآن" : `${targetMin} دقيقة`}</div>
              </FocusRing>
              <div style={S.adjustRow}>
                <button onClick={() => adjust(-5)} disabled={running} style={S.adjustBtn}>−5</button>
                <button onClick={() => adjust(-1)} disabled={running} style={S.adjustBtnSmall}>−1</button>
                <span style={S.adjustValue}>{targetMin} د</span>
                <button onClick={() => adjust(1)} disabled={running} style={S.adjustBtnSmall}>+1</button>
                <button onClick={() => adjust(5)} disabled={running} style={S.adjustBtn}>+5</button>
              </div>
              <div style={S.studyToggleRow}>
                <button onClick={() => setIsStudy(true)} disabled={running} style={{ ...S.studyToggle, ...(isStudy ? S.studyToggleActive : {}) }}><BookOpen size={13} /> دراسة</button>
                <button onClick={() => setIsStudy(false)} disabled={running} style={{ ...S.studyToggle, ...(!isStudy ? S.studyToggleActive : {}) }}><Zap size={13} /> نشاط عام</button>
              </div>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="على ماذا تركّز؟ (اختياري)" style={{ ...S.input, marginTop: 12 }} />
              <div style={S.timerControls}>
                <button onClick={reset} style={S.timerSecondary}><RotateCcw size={18} /></button>
                <button onClick={toggle} style={S.timerPrimary}>
                  {running ? <Pause size={20} /> : <Play size={20} />}
                  {running ? "إيقاف مؤقت" : sessionRef.current ? "متابعة" : "ابدأ"}
                </button>
              </div>
            </div>
          ) : (
            <div style={S.timerCard}>
              <div style={PS.manualEntryRow}>
                <input type="number" inputMode="numeric" value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} style={PS.manualInput} placeholder="25" />
                <span style={PS.manualUnit}>دقيقة</span>
              </div>
              <div style={S.studyToggleRow}>
                <button onClick={() => setIsStudy(true)} style={{ ...S.studyToggle, ...(isStudy ? S.studyToggleActive : {}) }}><BookOpen size={13} /> دراسة</button>
                <button onClick={() => setIsStudy(false)} style={{ ...S.studyToggle, ...(!isStudy ? S.studyToggleActive : {}) }}><Zap size={13} /> نشاط عام</button>
              </div>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="على ماذا ركّزت؟ (اختياري)" style={{ ...S.input, marginTop: 12 }} />
              <button onClick={logManual} style={{ ...S.timerPrimary, marginTop: 14, width: "100%" }}>
                <Check size={18} /> سجّل الوقت
              </button>
            </div>
          )}
          <div style={S.memoryNote}><Save size={13} color="#5FA8A0" /><span>كل جلسة تُحفظ بشكل دائم، وتستمر بالعد حتى لو غادرت الصفحة أو أغلقت الجهاز وعدت لاحقاً.</span></div>
          <CommitmentsSection commitments={commitments} setCommitments={setCommitments} categories={categories} focus={focus} showToast={showToast} />
        </>
      )}
      {subTab === "study" && (isSub ? <FocusReport focus={focus.filter((f) => f.isStudy)} studyEntries={studyEntries} title="تقرير الدراسة" color="#5FA8A0" emptyMsg="لا جلسات دراسة بعد. شغّل المؤقت بوضع دراسة." /> : (
        <UpsellCard icon={BookOpen} title="تقرير الدراسة في مسار الكامل" message="تتبّع تفاصيل جلسات دراستك وتقدّمك فيها بشكل منظّم عبر الأيام." compact />
      ))}
      {subTab === "general" && (isSub ? <FocusReport focus={focus.filter((f) => !f.isStudy)} title="التقرير العام" color="#C9A24B" emptyMsg="لا جلسات عامة بعد. شغّل المؤقت بوضع نشاط عام." /> : (
        <UpsellCard icon={BookOpen} title="التقرير العام في مسار الكامل" message="شاهد تفاصيل كل جلسات تركيزك العامة وتوزيعها عبر الأيام." compact />
      ))}
      {subTab === "bots" && (isSub ? <BotsChallenge focus={focus} entries={entries} categories={categories} /> : (
        <UpsellCard icon={Zap} title="التحدي في مسار الكامل" message="نافس شخصيات تحدٍّ واقعية بوقت تركيزك اليومي، وشاهد ترتيبك بينها." compact />
      ))}
      {pendingCompletion && (
        <div style={S.modalOverlay} onClick={() => { setPendingCompletion(null); setPickingTime(false); }}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>أحسنت! 🎉</div>
            <div style={{ fontSize: 13.5, color: "#C9C6C0", lineHeight: 1.7, marginBottom: 16 }}>
              هل نسجّلها بوقت انتهائها الآن، أم تريد تحديد وقت آخر؟
            </div>
            {!pickingTime ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={confirmCompletionNow} style={{ ...S.saveBtn, marginTop: 0, flex: 1 }}>الآن</button>
                <button onClick={() => setPickingTime(true)} style={{ ...S.saveBtn, marginTop: 0, flex: 1, background: "#1F1F22", color: "var(--ink)", border: "1px solid #2A2A2D" }}>وقت آخر</button>
              </div>
            ) : (
              <>
                <label style={S.label}>متى انتهت؟</label>
                <input type="time" value={customEndTime} onChange={(e) => setCustomEndTime(e.target.value)} style={{ ...S.input, marginBottom: 4 }} />
                <button onClick={confirmCompletionCustomTime} style={S.saveBtn}>تأكيد</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FocusReport({ focus, title, color, emptyMsg, studyEntries }) {
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
      arr.push({ label: arabicDate(k, { day: "numeric" }), mins: focusMins + entryMins });
    }
    return arr;
  }, [focus, studyEntries]);
  const hasAny = focus.length > 0 || (studyEntries || []).length > 0;

  return (
    <div>
      <div style={{ ...S.sectionTitle, fontSize: 17, color }}>{title}</div>
      <div style={S.focusStatsRow}>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{fmtHM(totalMin)}</div><div style={S.kpiLabel}>الإجمالي</div></div>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{fmtHM(todayMin)}</div><div style={S.kpiLabel}>اليوم</div></div>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{streak}</div><div style={S.kpiLabel}>سلسلة الأيام</div></div>
        <div style={S.kpiCard}><div style={{ ...S.kpiValue, color }}>{focus.length + (studyEntries || []).length}</div><div style={S.kpiLabel}>جلسات</div></div>
      </div>
      <div style={S.chartCard}>
        <div style={S.chartTitle}>آخر 14 يوماً</div>
        {!hasAny ? <div style={S.emptyHint}>{emptyMsg}</div> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={last14} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#1F1F22" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#6B6863", fontSize: 9, fontFamily: "Tajawal" }} axisLine={{ stroke: "#2A2A2D" }} tickLine={false} interval={1} />
              <YAxis tick={{ fill: "#6B6863", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1A1A1D", border: "1px solid #2A2A2D", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v) => [`${v} دقيقة`, ""]} />
              <Bar dataKey="mins" radius={[3, 3, 3, 3]} fill={color} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {hasAny && (
        <div style={S.chartCard}>
          <div style={S.chartTitle}>سجل الجلسات المحفوظة</div>
          <div style={S.sessionLog}>
            {focus.slice(0, 12).map((f) => (
              <div key={f.id} style={S.sessionRow}>
                <span style={{ ...S.legendDot, background: color }} />
                <span style={S.sessionLabel}>{f.label || "جلسة تركيز"}</span>
                <span style={S.sessionMins}>{fmtHM(f.minutes)}</span>
                <span style={S.sessionDate}>{arabicDate(f.date, { day: "numeric", month: "short" })}</span>
              </div>
            ))}
            {(studyEntries || []).slice(0, 12).map((e) => (
              <div key={e.id} style={S.sessionRow}>
                <span style={{ ...S.legendDot, background: color }} />
                <span style={S.sessionLabel}>{e.note || "نشاط دراسة (من اليوم)"}</span>
                <span style={S.sessionMins}>{fmtHM(diffMinutes(e.start, e.end))}</span>
                <span style={S.sessionDate}>{arabicDate(e.date, { day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ROBOT_DATA = [
  { id: "ahmed",  name: "Ahmed",  flag: "🇸🇦", country: "Saudi Arabia", specialty: "Web Dev",      trait: "ناشط ومثابر",      persona: "veryActive" },
  { id: "fatima", name: "Fatima", flag: "🇪🇬", country: "Egypt",        specialty: "Design",       trait: "مبدعة وملهمة",     persona: "moderate"   },
  { id: "omar",   name: "Omar",   flag: "🇦🇪", country: "UAE",          specialty: "Marketing",    trait: "استراتيجي وذكي",   persona: "moderate"   },
  { id: "layla",  name: "Layla",  flag: "🇯🇴", country: "Jordan",       specialty: "UX",           trait: "دقيقة ومتأنية",    persona: "sporadic"   },
  { id: "karim",  name: "Karim",  flag: "🇲🇦", country: "Morocco",      specialty: "Data Science", trait: "تحليلي وعميق",     persona: "veryActive" },
  { id: "noor",   name: "Noor",   flag: "🇰🇼", country: "Kuwait",       specialty: "Content",      trait: "رشيقة وسريعة",    persona: "sporadic"   },
  { id: "hassan", name: "Hassan", flag: "🇶🇦", country: "Qatar",        specialty: "Backend",      trait: "صامت وفعّال",      persona: "veryActive" },
  { id: "amira",  name: "Amira",  flag: "🇧🇭", country: "Bahrain",      specialty: "Branding",     trait: "أنيقة ومتجددة",    persona: "evening"    },
  { id: "rashid", name: "Rashid", flag: "🇹🇳", country: "Tunisia",      specialty: "iOS Dev",      trait: "شغوف ومتطور",      persona: "veryActive" },
  { id: "sara",   name: "Sara",   flag: "🇱🇧", country: "Lebanon",      specialty: "Photography",  trait: "حساسة وفنية",      persona: "evening"    },
  { id: "zain",   name: "Zain",   flag: "🇮🇶", country: "Iraq",         specialty: "AI",           trait: "فضولي ومتعمق",     persona: "veryActive" },
  { id: "dina",   name: "Dina",   flag: "🇾🇪", country: "Yemen",        specialty: "Writing",      trait: "شاعرية وعذبة",     persona: "absentish"  },
  { id: "malik",  name: "Malik",  flag: "🇵🇸", country: "Palestine",    specialty: "SEO",          trait: "صبور ومنهجي",      persona: "moderate"   },
  { id: "maya",   name: "Maya",   flag: "🇴🇲", country: "Oman",         specialty: "Video",        trait: "حيوية ومبتكرة",    persona: "absentish"  },
  { id: "carlos", name: "Carlos", flag: "🇪🇸", country: "Spain",        specialty: "Music",        trait: "إيقاعي ومتدفق",    persona: "evening"    },
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
    const me = { id: "me", name: "أنت", flag: "⭐", country: "", specialty: "", trait: "تقدمك الحقيقي اليوم", mins: myToday, color: "#E8E6E1", isMe: true };
    return [...list, me].sort((a, b) => b.mins - a.mins);
  }, [tick, myToday]);

  const maxMins = Math.max(60, ...bots.map((b) => b.mins));
  const myRank = bots.findIndex((b) => b.isMe) + 1;

  return (
    <div>
      <div style={{ ...S.sectionTitle, fontSize: 17 }}>تحدي الروبوتات</div>
      <p style={S.profileHint}>15 منافس من دول مختلفة، لكل واحد عادات يومه الخاصة. ركّز أكثر لتتقدم عليهم.</p>
      <div style={S.rankBanner}>
        <Trophy size={16} color={myRank === 1 ? "#C9A24B" : "#8A8782"} />
        <span>ترتيبك الآن: <strong style={{ color: myRank === 1 ? "#C9A24B" : "#E8E6E1" }}>{myRank} من 16</strong></span>
        {myRank === 1 && <span style={S.leadPill}>متصدّر</span>}
      </div>
      <div style={S.botsList}>
        {bots.map((b, i) => (
          <div key={b.id} style={{ ...S.botRow, ...(b.isMe ? S.botRowMe : {}) }}>
            <span style={S.botRank}>{i + 1}</span>
            <span style={S.botEmoji}>{b.flag}</span>
            <div style={S.botInfo}>
              <div style={S.botName}>
                {b.name}
                {b.isMe && <span style={S.botYou}>أنت</span>}
                {!b.isMe && <span style={{ fontSize: 11, color: "#8A8782", marginRight: 6 }}>{b.specialty}</span>}
              </div>
              <div style={S.botTrait}>{!b.isMe && <span style={{ marginLeft: 4 }}>{b.country}</span>}{b.trait}</div>
              <div style={S.botBarWrap}><div style={{ ...S.botBarFill, width: `${(b.mins / maxMins) * 100}%`, background: b.isMe ? "#E8E6E1" : b.color }} /></div>
            </div>
            <span style={S.botMins}>{fmtHM(b.mins)}</span>
          </div>
        ))}
      </div>
      <div style={S.memoryNote}><Zap size={13} color="#C9A24B" /><span>تتحرك أوقات المنافسين تدريجياً مع مرور ساعات يومك الحقيقية، كل واحد بعادات يومه الخاصة.</span></div>
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
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1F1F22" strokeWidth={stroke} />
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
  const [title, setTitle] = useState("");
  const [mins, setMins] = useState(60);

  async function add() {
    if (!title.trim()) return;
    const c = { id: uid(), title: title.trim(), targetMinutes: mins, catId: categories[0]?.id, log: {} };
    setCommitments((prev) => [...prev, c]); await store.saveCommitment(c); setTitle(""); showToast("أضفت تحدي التزام");
  }
  async function remove(id) {
    setCommitments((prev) => prev.filter((c) => c.id !== id)); await store.deleteCommitment(id);
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
      <div style={S.catEditorHeader}><Zap size={15} color="#C9A24B" /><span>تحديات الالتزام اليومية</span></div>
      <p style={S.profileHint}>التزم بوقت يومي ثابت وشاهد سلسلتك تكبر.</p>
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
                  <div style={S.commitMeta}>الهدف {c.targetMinutes} دقيقة يومياً · سلسلة {streak} {streak === 1 ? "يوم" : "أيام"}</div>
                </div>
                {done && <span style={S.commitDoneBadge}><Check size={12} /> اليوم</span>}
                <button onClick={() => remove(c.id)} style={S.deleteBtn}><Trash2 size={14} /></button>
              </div>
              <div style={S.commitBarWrap}><div style={{ ...S.commitBarFill, width: `${pct}%`, background: done ? "#5FA8A0" : "#C9A24B" }} /></div>
              <div style={S.commitProgress}>{fmtHM(todayMin)} من {fmtHM(c.targetMinutes)} · جلسات التركيز تُحتسب تلقائياً</div>
            </div>
          );
        })}
        {commitments.length === 0 && <div style={S.emptyHint}>لا تحديات بعد. أضف واحداً لتبدأ.</div>}
      </div>
      <div style={S.commitAdd}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="مثال: ساعة دراسة يومياً" style={S.catEditInput} />
        <select value={mins} onChange={(e) => setMins(Number(e.target.value))} style={S.commitSelect}>
          <option value={30}>30 د</option>
          <option value={60}>60 د</option>
          <option value={90}>90 د</option>
          <option value={120}>120 د</option>
        </select>
        <button onClick={add} style={S.taskAddBtn}><Plus size={16} /></button>
      </div>
    </div>
  );
}

function AchieveView({ achieve, setAchieve, profile, focus, tasks, prayerLog, religious, addPoints, showToast, setView }) {
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("challenges");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachReply, setCoachReply] = useState(null);
  const [smartUnavailable, setSmartUnavailable] = useState(false);
  const [debugMsg, setDebugMsg] = useState("");
  const [promptText, setPromptText] = useState("");
  const hasIdentity = !!(profile?.hobbies?.trim() || profile?.about?.trim());
  const IDENTITY_NUDGE = "اكتب هواياتك ونبذتك في التخصيص أولاً ليساعدك أنجز بشكل مخصّص";

  async function askCoach(mood) {
    if (!hasIdentity) { showToast(IDENTITY_NUDGE); return; }
    setCoachLoading(true); setCoachReply(null);
    try {
      const who = `نبذة: ${profile.about || "غير محدد"}. الهوايات: ${profile.hobbies || "غير محدد"}. التخصص: ${profile.field || "غير محدد"}.`;
      const todayFocus = (focus || []).filter((f) => f.date === todayKey()).reduce((s, f) => s + f.minutes, 0);
      const doneToday = (tasks || []).filter((t) => t.done && t.due === todayKey()).length;
      const prompt = `أنت "أنجز"، مدرب شخصي ذكي ودود يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. المستخدم: ${who}\nمزاجه الآن: ${mood}. ركّز اليوم ${todayFocus} دقيقة وأنجز ${doneToday} مهمة.\n\nتحدّث معه بجملة تتفهّم مزاجه، ثم اقترح له نشاطاً واحداً محدداً وقصيراً يحسّن مزاجه أو إنتاجيته الآن، مرتبطاً بهواياته أو تخصصه إن أمكن. أعد فقط JSON بدون أي نص أو markdown:\n{"message":"جملة تتفهم مزاجه","activity":"نشاط واحد محدد مقترح الآن","why":"سبب قصير لماذا هذا النشاط"}`;
      const text = await analyze(prompt, 800);
      setCoachReply(parseJsonLoose(text));
      setSmartUnavailable(false);
    } catch (err) {
      console.error("[AchieveView] askCoach failed:", err, err?.debug);
      setDebugMsg(err?.debug ? `${err.message} [DEBUG: ${JSON.stringify(err.debug)}]` : err?.message || "");
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
    try {
      const who = `نبذة: ${profile.about || "غير محدد"}. الهوايات: ${profile.hobbies || "غير محدد"}. التخصص: ${profile.field || "غير محدد"}.`;
      const existing = achieve.slice(0, 8).map((a) => a.title).join(" / ");
      const kindAr = kind === "challenge" ? "تحديات أسبوعية عملية" : kind === "project" ? "مشاريع صغيرة قابلة للتنفيذ" : "مسارات تعلّم متدرجة";
      const prompt = `أنت مدرب تطوير مهارات يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. طلب المستخدم بالضبط: "${userRequest}"\n\nسياق إضافي عن المستخدم، استخدمه لتخصيص الاقتراحات إن كان مناسباً: ${who}\n\nبناءً على طلب المستخدم أعلاه بالدرجة الأولى، اقترح 3 ${kindAr} تلبي طلبه بدقة.\n\n${existing ? `لا تكرر هذه العناصر الموجودة: ${existing}` : ""}\n\nأعد فقط JSON بدون أي نص أو markdown:\n{"items":[{"title":"عنوان قصير","detail":"وصف من جملتين","steps":["خطوة 1","خطوة 2","خطوة 3"],"topic":"الهواية أو التخصص المرتبط"}]}`;
      const text = await analyze(prompt, 2048);
      const parsed = parseJsonLoose(text);
      const newItems = (parsed.items || []).map((it) => ({ id: uid(), kind, title: it.title, detail: it.detail, steps: it.steps || [], topic: it.topic || "", done: false }));
      for (const it of newItems) await store.saveAchieve(it);
      setAchieve((prev) => [...newItems, ...prev]);
      setSmartUnavailable(false);
      setPromptText("");
      showToast(`أضفت ${newItems.length} عناصر جديدة`);
    } catch (err) {
      console.error("[AchieveView] generate failed:", err, err?.debug);
      setDebugMsg("");
      setSmartUnavailable(true);
      const existing = achieve.slice(0, 8).map((a) => a.title);
      const localItems = localAchieveSuggestions(profile, kind, existing);
      const newItems = localItems.map((it) => ({ id: uid(), kind, title: it.title, detail: it.detail, steps: it.steps || [], topic: it.topic || "", done: false }));
      for (const it of newItems) await store.saveAchieve(it);
      setAchieve((prev) => [...newItems, ...prev]);
      showToast(`أضفت ${newItems.length} مهام جاهزة`);
    }
    finally { setLoading(false); }
  }

  function handleGenerate() {
    if (!hasIdentity) { showToast(IDENTITY_NUDGE); return; }
    if (!promptText.trim()) { showToast("اكتب ما تريد أولاً"); return; }
    generate(kindForTab, promptText.trim());
  }

  async function toggleDone(item) {
    const updated = { ...item, done: !item.done };
    setAchieve((prev) => prev.map((a) => a.id === item.id ? updated : a));
    await store.saveAchieve(updated);
    if (!item.done) { addPoints(25); showToast("أحسنت! +25 نقطة"); }
    else addPoints(-25, "التراجع عن إنجاز");
  }
  async function remove(id) {
    const removed = achieve.find((a) => a.id === id);
    setAchieve((prev) => prev.filter((a) => a.id !== id));
    await store.deleteAchieve(id);
    if (removed?.done) addPoints(-25, "حذف إنجاز مكتمل");
    showToast("تم الحذف");
  }

  useEffect(() => { setPromptText(""); }, [tab]);

  const kindMap = { challenge: "تحدي", project: "مشروع", path: "مسار تعلّم" };
  const promptPlaceholder = tab === "challenges" ? "مثال: أبي تحدي رياضة خفيف" : tab === "projects" ? "مثال: مشروع تصوير بسيط لنهاية الأسبوع" : "مثال: أبي أتعلم أساسيات التصميم";

  return (
    <div style={S.view}>
      <div style={S.achieveHero}>
        <div style={S.achieveHeroIcon}><Rocket size={20} color="#0A0A0B" /></div>
        <div>
          <div style={S.achieveHeroTitle}>أنجز</div>
          <div style={S.achieveHeroSub}>تحديات ومشاريع ومسارات مصممة لهواياتك وتخصصك</div>
        </div>
      </div>
      {smartUnavailable && (
        <div style={S.smartBanner}><Zap size={14} color="#C9A24B" /><span>الوضع الذكي غير متاح الآن، نعرض لك مهام جاهزة.{debugMsg ? ` [DEBUG: ${debugMsg}]` : ""}</span></div>
      )}
      {!hasIdentity && (
        <div style={S.setupCard}>
          <User size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={S.setupText}>
            {IDENTITY_NUDGE}.
            <div>
              <button onClick={() => setView("settings")} style={{ ...S.linkBtn, marginTop: 8 }}>الذهاب إلى التخصيص</button>
            </div>
          </div>
        </div>
      )}
      {hasIdentity && (
      <div style={S.coachCard}>
        <div style={S.coachTitleRow}><Sparkles size={15} color="#C9A24B" /><span style={S.coachTitle}>كيف يومك؟</span></div>
        <p style={S.profileHint}>أخبر أنجز بمزاجك ليقترح لك نشاطاً يحسّنه الآن.</p>
        <div style={S.moodRow}>
          {["متحمّس", "عادي", "متعب", "مشتّت"].map((m) => (
            <button key={m} onClick={() => askCoach(m)} disabled={coachLoading} style={S.moodBtn}>{m}</button>
          ))}
        </div>
        {coachLoading && <div style={S.coachLoading}><Loader2 size={15} className="spin" /> أنجز يفكّر...</div>}
        {coachReply && !coachReply.error && (
          <div style={S.coachReply}>
            <div style={S.coachMessage}>{coachReply.message}</div>
            <div style={S.coachActivity}><Rocket size={14} color="#C9A24B" /> {coachReply.activity}</div>
            {coachReply.why && <div style={S.coachWhy}>{coachReply.why}</div>}
          </div>
        )}
      </div>
      )}
      <div style={S.achieveTabs}>
        {[{ id: "challenges", label: "تحديات", icon: Trophy }, { id: "projects", label: "مشاريع", icon: Target }, { id: "paths", label: "مسارات", icon: BookOpen }].map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...S.achieveTab, ...(tab === t.id ? S.achieveTabActive : {}) }}>
              <Icon size={14} /> {t.label}
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
      <div style={S.achieveList} className="stagger-in">
        {filtered.length === 0 && !loading && <div style={S.emptyState}><div style={S.emptyStateTitle}>لا شيء بعد</div><div style={S.emptyStateSub}>اكتب طلبك في الأعلى ثم اضغط إرسال</div></div>}
        {filtered.map((item) => <AchieveCard key={item.id} item={item} kindLabel={kindMap[item.kind]} onToggle={() => toggleDone(item)} onRemove={() => remove(item.id)} />)}
      </div>
    </div>
  );
}

function AchieveCard({ item, kindLabel, onToggle, onRemove }) {
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
            {open ? "إخفاء الخطوات" : `الخطوات (${item.steps.length})`}
          </button>
          {open && (
            <div style={S.achieveSteps}>
              {item.steps.map((s, i) => <div key={i} style={S.achieveStep}><span style={S.achieveStepNum}>{i + 1}</span>{s}</div>)}
            </div>
          )}
        </>
      )}
      <a href={searchUrl} target="_blank" rel="noopener noreferrer" style={S.achieveLink}>
        <ExternalLink size={12} /> فيديوهات تعليمية عن هذا
      </a>
    </div>
  );
}

const FREE_CATEGORY_LIMIT = 5;

function SettingsView({ categories, setCategories, gamify, hasCloud, showToast, profile, setProfile, pointsLog, onStartTour, subscription }) {
  const isSub = isActiveSubscriber(subscription);
  const [editing, setEditing] = useState(null);
  // While a category is being renamed, edits live here only — nothing is
  // persisted per keystroke. Firing a save on every character raced N
  // concurrent upserts against each other with no ordering guarantee, so a
  // stale, shorter keystroke could land in the database *after* the final
  // one and silently overwrite it — the exact "dropped/scrambled letters
  // after refresh" bug. Now there's a single save on explicit confirm.
  const [editDraft, setEditDraft] = useState({ name: "", color: "" });
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_CHOICES[0]);

  async function addCategory() {
    const name = newName.trim();
    if (!name) return;
    if (!isSub && categories.length >= FREE_CATEGORY_LIMIT) {
      showToast("أنشئ فئاتك بلا حدود مع مسار الكامل");
      return;
    }
    const cat = { id: uid(), name, color: newColor };
    setCategories((prev) => [...prev, cat]);
    const ok = await store.saveCategory(cat);
    if (ok) { setNewName(""); showToast("تمت إضافة الفئة"); }
    else {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showToast("تعذّر حفظ الفئة، حاول مرة أخرى");
    }
  }
  function startEditing(c) {
    setEditing(c.id);
    setEditDraft({ name: c.name, color: c.color });
  }
  async function confirmEditing(id) {
    const name = editDraft.name.trim();
    if (!name) { showToast("اسم الفئة لا يمكن أن يكون فارغاً"); return; }
    let updated;
    setCategories((prev) => prev.map((c) => { if (c.id === id) { updated = { ...c, name, color: editDraft.color }; return updated; } return c; }));
    const ok = updated ? await store.saveCategory(updated) : true;
    if (ok) setEditing(null);
    else showToast("تعذّر حفظ التعديل، حاول مرة أخرى");
  }
  async function removeCategory(id) {
    const removed = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    const ok = await store.deleteCategory(id);
    if (ok) showToast("تم حذف الفئة");
    else {
      if (removed) setCategories((prev) => [...prev, removed]);
      showToast("تعذّر حذف الفئة، حاول مرة أخرى");
    }
  }

  return (
    <div style={S.view}>
      <div style={S.sectionTitle}>التخصيص</div>
      <ProfileCard profile={profile} setProfile={setProfile} showToast={showToast} />
      <SubscriptionCard subscription={subscription} />
      <button onClick={onStartTour} style={S.exportBtn}><GraduationCap size={15} /> إعادة الجولة التعريفية</button>
      {!hasCloud && (
        <div style={S.setupCard}>
          <Cloud size={16} color="#5FA8A0" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={S.setupText}>أنت تعمل الآن بالتخزين المحلي فقط. لتفعيل المزامنة السحابية، أضف مفاتيح Supabase في ملف البيئة.</div>
        </div>
      )}
      <div style={S.badgesCard}>
        <div style={S.chartTitle}>شاراتك</div>
        <div style={S.badgesGrid} className="stagger-in">
          {BADGES.map((b) => {
            const earned = gamify.badges.includes(b.id);
            return (
              <div key={b.id} style={{ ...S.badge, ...(earned ? S.badgeEarned : {}) }}>
                <div style={{ ...S.badgeIcon, ...(earned ? S.badgeIconEarned : {}) }}>{b.icon}</div>
                <div style={S.badgeName}>{b.name}</div>
                <div style={S.badgeDesc}>{earned ? b.desc : "مقفلة"}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={S.catEditorCard}>
        <div style={S.catEditorHeader}><Palette size={15} color="#C9A24B" /><span>فئاتك</span></div>
        <div style={S.catEditList}>
          {categories.map((c) => (
            <div key={c.id} style={S.catEditRow}>
              {editing === c.id ? (
                <>
                  <div style={S.colorPickRow}>{COLOR_CHOICES.map((col) => <button key={col} onClick={() => setEditDraft((d) => ({ ...d, color: col }))} style={{ ...S.colorDot, background: col, outline: editDraft.color === col ? "2px solid #fff" : "none" }} />)}</div>
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
                  <span style={S.catEditName}>{c.name}</span>
                  <button onClick={() => startEditing(c)} style={S.catIconBtn}><Edit3 size={13} /></button>
                  <button onClick={() => removeCategory(c.id)} style={S.catIconBtn}><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={S.catAddRow}>
          <div style={S.colorPickRow}>{COLOR_CHOICES.map((col) => <button key={col} onClick={() => setNewColor(col)} style={{ ...S.colorDot, background: col, outline: newColor === col ? "2px solid #fff" : "none" }} />)}</div>
          <div style={S.catAddInputRow}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="اسم فئة جديدة..." style={S.catEditInput} />
            <button onClick={addCategory} style={S.taskAddBtn}><Plus size={16} /></button>
          </div>
        </div>
      </div>
      {!isSub && categories.length >= FREE_CATEGORY_LIMIT && (
        <UpsellCard icon={Palette} title="فئات بلا حدود مع مسار الكامل" message="نظّم أنشطتك بأي عدد من الفئات الملوّنة التي تناسب حياتك." compact />
      )}
      {pointsLog && pointsLog.length > 0 && (
        <div style={S.catEditorCard}>
          <div style={S.catEditorHeader}><span style={{ fontSize: 14 }}>📋</span><span>سجل النقاط</span></div>
          <div>
            {pointsLog.slice(0, 20).map((entry) => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div style={{ fontSize: 13, color: "var(--ink)" }}>{entry.reason}</div>
                  <div style={{ fontSize: 11, color: "#6B6863", marginTop: 2 }}>{entry.date}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: entry.amount >= 0 ? "#5FA8A0" : "#E05252", whiteSpace: "nowrap", marginRight: 8 }}>
                  {entry.amount >= 0 ? "+" : ""}{entry.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <RoadmapCard />
    </div>
  );
}

const SUBSCRIBE_WHATSAPP_URL = "https://wa.me/96555765553";

// بطاقة تشجيع عامة تحلّ محل أي قسم/ميزة مدفوعة لغير المشترك. الرسالة
// تركّز دائماً على القيمة التي يفوّتها المستخدم، لا على "ادفع"، بأسلوب
// دعوة راقية غير مُلحّة — انظر تعليق SUB.upsellCard أعلاه لتبرير التصميم.
function UpsellCard({ icon: Icon = Crown, title, message, compact }) {
  return (
    <div style={{ ...SUB.upsellCard, ...(compact ? SUB.upsellCardCompact : {}) }}>
      <div style={SUB.upsellIconBadge}><Icon size={compact ? 20 : 26} color="#0A0A0B" /></div>
      <div style={SUB.upsellTitle}>{title}</div>
      <p style={SUB.upsellMessage}>{message}</p>
      <a href={SUBSCRIBE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={SUB.upsellBtn}>
        <Send size={15} /> اشترك الآن
      </a>
    </div>
  );
}

function SubscriptionCard({ subscription }) {
  const isVip = !!subscription?.isVip;
  const active = isActiveSubscriber(subscription);

  let endLabel = null;
  if (active && !isVip && subscription?.subscriptionEnd) {
    const [y, m, d] = subscription.subscriptionEnd.split("-").map(Number);
    endLabel = arabicDate(new Date(y, m - 1, d), { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div style={SUB.card}>
      <div style={SUB.head}>
        <div style={SUB.iconBadge}>{isVip ? <Crown size={20} color="#0A0A0B" /> : <Star size={20} color="#0A0A0B" />}</div>
        <div>
          <div style={SUB.title}>{isVip ? "عضويتك VIP" : active ? "اشتراكك في مسار" : "اشترك في مسار"}</div>
          <div style={SUB.subtitle}>
            {isVip
              ? "عضوية دائمة مميزة، بلا أي تاريخ انتهاء 👑"
              : active
              ? `اشتراك ${subscription.subscriptionType === "yearly" ? "سنوي" : "شهري"} فعّال`
              : "افتح كل إمكانيات مسار بأقل تكلفة"}
          </div>
        </div>
      </div>

      {active && !isVip && endLabel && (
        <div style={SUB.statusRow}>
          <span style={SUB.statusLabel}>ينتهي في</span>
          <span style={SUB.statusValue}>{endLabel}</span>
        </div>
      )}

      {!active && (
        <>
          <div style={SUB.plansRow}>
            <div style={SUB.planCard}>
              <div style={SUB.planLabel}>شهري</div>
              <div style={SUB.planPrice}>3 د.ك</div>
            </div>
            <div style={SUB.planCard}>
              <div style={SUB.planLabel}>سنوي</div>
              <div style={SUB.planPrice}>25 د.ك</div>
            </div>
          </div>
          <a href={SUBSCRIBE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={SUB.subscribeBtn}>
            <Send size={15} /> اشترك الآن عبر واتساب
          </a>
        </>
      )}
    </div>
  );
}

function ProfileCard({ profile, setProfile, showToast }) {
  const [local, setLocal] = useState(profile);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setLocal(profile); }, [profile]);

  function change(field, val) { setLocal((p) => ({ ...p, [field]: val })); setDirty(true); }
  async function save() {
    setProfile(local); await store.saveProfile(local); setDirty(false); showToast("تم حفظ بياناتك بنجاح");
  }

  return (
    <div style={S.profileCard}>
      <div style={S.catEditorHeader}><User size={15} color="#C9A24B" /><span>هويتي</span></div>
      <p style={S.profileHint}>هذه البيانات تجعل اقتراحات أنجز والتحليل مرتبطة بك شخصياً.</p>
      <label style={S.label}>من أنا</label>
      <input value={local.about} onChange={(e) => change("about", e.target.value)} placeholder="مثال: مصور ومصمم محتوى بصري وطالب جامعي" style={S.input} />
      <label style={S.label}>هواياتي</label>
      <input value={local.hobbies} onChange={(e) => change("hobbies", e.target.value)} placeholder="مثال: التصوير، تمارين الجسم، التصميم" style={S.input} />
      <label style={S.label}>تخصصي</label>
      <input value={local.field} onChange={(e) => change("field", e.target.value)} placeholder="مثال: التغذية والتطبيق الغذائي" style={S.input} />
      {dirty && <button onClick={save} style={{ ...S.saveBtn, marginTop: 12 }}>حفظ هويتي</button>}
    </div>
  );
}

function RoadmapCard() {
  const phases = [
    { phase: "النسخة الحالية", title: "أداتك اليومية", items: ["تتبع الوقت بعجلة اليوم التفاعلية", "إدارة المهام", "تحليل AI وتطور يومي", "تخزين سحابي مع نسخة محلية"] },
    { phase: "التالي", title: "ذاكرة أعمق", items: ["أهداف أسبوعية قابلة للقياس", "تذكيرات ذكية حسب نمطك", "مقارنة الأسابيع ببعضها"] },
    { phase: "لاحقاً", title: "ربط حياتك", items: ["استيراد من التقويم", "ملخص صوتي للتطور اليومي", "تصدير تقاريرك PDF"] },
  ];
  return (
    <div style={S.roadmapCard}>
      <div style={S.chartTitle}>كيف يتطوّر مسار معك</div>
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
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}><span>{entry ? "تعديل النشاط" : "نشاط جديد"}</span><button onClick={onClose} style={S.iconBtn}><X size={18} /></button></div>
        <div style={S.modalBody}>
          <label style={S.label}>ملاحظة</label>
          <input value={note} onChange={(e) => handleNoteChange(e.target.value)} placeholder="مثال: تصوير جلسة تخرج، دراسة..." style={S.input} />
          <label style={S.label}>متى؟</label>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <div style={{ ...S.input, display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
              <span>{to12h(startTime)}</span>
              <Clock size={15} color="#8A8782" />
            </div>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: "none", padding: 0, margin: 0, cursor: "pointer", colorScheme: "dark" }}
            />
          </div>
          <label style={S.label}>كم دقيقة؟</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button onClick={() => setMinutes((m) => Math.max(5, m - 5))} style={{ ...PS.miniTimerBtn, flex: "none", width: 40, height: 40 }}>-5</button>
            <input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ ...S.input, width: 80, textAlign: "center", fontSize: 20, fontFamily: "'Amiri', serif", fontWeight: 700 }} />
            <button onClick={() => setMinutes((m) => Math.min(600, m + 5))} style={{ ...PS.miniTimerBtn, flex: "none", width: 40, height: 40 }}>+5</button>
            <span style={{ fontSize: 12, color: "#8A8782" }}>({fmtHM(minutes)})</span>
          </div>
          <label style={S.label}>الفئة</label>
          <div style={S.catGrid}>
            {categories.map((c) => (
              <button key={c.id} onClick={() => selectCat(c.id)} style={{ ...S.catChip, borderColor: catId === c.id ? c.color : "#2A2A2D", background: catId === c.id ? `${c.color}22` : "transparent" }}>
                <span style={{ ...S.legendDot, background: c.color }} />{c.name}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} style={S.saveBtn}>حفظ النشاط</button>
      </div>
    </div>
  );
}

