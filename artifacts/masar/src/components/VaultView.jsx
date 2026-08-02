import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Wallet, Landmark, Plus, Trash2, ArrowDownCircle, ArrowUpCircle,
  Repeat, Sparkles, Download, X, Check, Loader2,
  Coffee, Car, HeartPulse, ShoppingBag, Popcorn, Receipt, ShoppingCart, GraduationCap,
  Home, MoreHorizontal, UtensilsCrossed, Tag, PiggyBank, AlertTriangle,
  Pause, Play,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { store, getOwner } from "../lib/store";
import { todayKey, uid, analyze, escapeHtml, COLOR_CHOICES, arabicDate } from "../lib/helpers";
import { localDayKey } from "../lib/tips";
import { pickDailyMoneyTip, MONEY_TIP_CATEGORY_LABELS } from "../lib/money-tips";
import {
  ACCOUNT_TYPES, VAULT_CURRENCIES, vaultCurrencySymbol, formatVaultAmount,
  DEFAULT_BUDGET_CATEGORIES, resolveCategory, monthKey, monthKeyFromDateKey, shiftMonthKey,
  NEEDS_CATEGORY_IDS, WANTS_CATEGORY_IDS, computeBudget503020, splitEqually,
  findDueRecurringTemplates,
} from "../lib/budget";
import {
  BILL_RECURRENCES, computeInitialNextDueDate, advanceDueDate, billStatus,
  computeMonthlyCommitment, computeBillTotals, upcomingBills,
} from "../lib/bills";
import { S } from "./styles";

const ICONS = {
  Wallet, Landmark, Coffee, Car, HeartPulse, ShoppingBag, Popcorn, Receipt, ShoppingCart,
  GraduationCap, Home, MoreHorizontal, UtensilsCrossed, Tag, PiggyBank,
};
function CatIcon({ name, size = 16, color }) {
  const Icon = ICONS[name] || Tag;
  return <Icon size={size} color={color} />;
}

const VS = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  heroIcon: { width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, #E7C378, #C9A24B 65%, #A9822F)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 1px rgba(201,162,75,0.25), 0 4px 14px rgba(201,162,75,0.25)" },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", lineHeight: 1.5, marginTop: 2 },

  wealthCard: { background: "linear-gradient(180deg, var(--panel), var(--surface-sunken))", border: "1px solid var(--line)", borderRadius: 22, padding: "24px 20px 20px", textAlign: "center", boxShadow: "0 6px 24px rgba(0,0,0,0.22)" },
  wealthLabel: { fontSize: 12.5, color: "var(--muted2)", fontWeight: 600 },
  wealthAmount: { fontFamily: "'Amiri', serif", fontSize: 32, fontWeight: 700, color: "#C9A24B", marginTop: 6, direction: "ltr" },
  wealthExtra: { fontSize: 12.5, color: "var(--muted2)", marginTop: 6, direction: "ltr" },
  actionRow: { display: "flex", gap: 10, marginTop: 16 },
  expenseBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(224,82,82,0.1)", border: "1px solid rgba(224,82,82,0.35)", color: "#E05252", borderRadius: 12, padding: "12px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  incomeBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(95,168,160,0.14)", border: "1px solid rgba(95,168,160,0.4)", color: "#5FA8A0", borderRadius: 12, padding: "12px 0", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },

  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "var(--muted2)" },
  addChipBtn: { display: "flex", alignItems: "center", gap: 4, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "var(--gold)", borderRadius: 20, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },

  accountsRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 },
  accountChip: { flexShrink: 0, minWidth: 130, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "10px 12px", cursor: "pointer" },
  accountChipHead: { display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted2)", marginBottom: 6 },
  accountChipName: { fontSize: 13, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 },
  accountChipBalance: { fontSize: 13.5, fontWeight: 700, color: "#C9A24B", direction: "ltr" },

  txForm: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px" },
  txFormTitle: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)", marginBottom: 4 },
  txFormRow: { display: "flex", gap: 10, marginTop: 14 },
  txCancelBtn: { background: "transparent", border: "1px solid var(--border2)", color: "var(--muted2)", borderRadius: 12, padding: "0 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)", marginTop: 12, cursor: "pointer" },

  tipCard: { position: "relative", background: "linear-gradient(180deg, var(--panel), var(--surface-sunken))", border: "1px solid var(--line)", borderRadius: 22, padding: "22px 18px 18px", boxShadow: "0 6px 24px rgba(0,0,0,0.22)" },
  ornament: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  ornamentLine: { flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,162,75,0.4))" },
  ornamentLineRev: { flex: 1, height: 1, background: "linear-gradient(270deg, transparent, rgba(201,162,75,0.4))" },
  ornamentDot: { color: "#C9A24B", fontSize: 11, flexShrink: 0 },
  quoteText: { fontFamily: "'Amiri', serif", fontSize: 18, lineHeight: 1.9, color: "var(--ink)", textAlign: "center", margin: 0 },
  footerRow: { display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16 },
  categoryPill: { fontSize: 11.5, fontWeight: 700, color: "#C9A24B", background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 20, padding: "5px 14px" },

  logList: { display: "flex", flexDirection: "column", gap: 8 },
  logItem: { display: "flex", alignItems: "center", gap: 10, background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px" },
  logIconWrap: { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  logInfo: { flex: 1, minWidth: 0 },
  logReason: { fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  logMeta: { fontSize: 11, color: "var(--muted2)", marginTop: 2 },
  logAmount: { fontSize: 13.5, fontWeight: 700, direction: "ltr", whiteSpace: "nowrap" },

  filterRow: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  filterSelect: { flex: "1 1 auto", minWidth: 90, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 10, padding: "9px 8px", color: "var(--ink)", fontSize: 12.5, fontFamily: "inherit" },
  searchRow: { display: "flex", gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 10, padding: "10px 12px", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" },

  splitCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px 12px", marginBottom: 16 },
  splitRow: { display: "flex", gap: 8, marginTop: 10 },
  splitChip: { flex: 1, background: "var(--surface-sunken)", borderRadius: 12, padding: "10px 6px", textAlign: "center" },
  splitChipLabel: { fontSize: 10.5, color: "var(--muted2)", marginBottom: 4 },
  splitChipValue: { fontSize: 13, fontWeight: 700, color: "var(--ink)", direction: "ltr" },
  disclaimerBox: { display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(201,162,75,0.08)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 12, padding: "10px 11px", marginTop: 12, fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.7 },
  aiBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "rgba(201,162,75,0.12)", border: "1px solid rgba(201,162,75,0.35)", color: "var(--gold)", borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 10 },
  aiResultBox: { background: "var(--surface-sunken)", borderRadius: 12, padding: "12px", marginTop: 10, fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.8, whiteSpace: "pre-wrap" },

  budgetRow: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 12px", marginBottom: 10 },
  budgetHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  budgetName: { flex: 1, fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  budgetInput: { width: 78, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 8, padding: "6px 8px", color: "var(--ink)", fontSize: 12.5, fontFamily: "inherit", textAlign: "center" },
  budgetBarWrap: { height: 8, background: "var(--surface-sunken)", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  budgetBarFill: { height: "100%", borderRadius: 4, transition: "width 0.3s" },
  budgetMeta: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted2)" },
  budgetAlert: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#E05252", fontWeight: 700, marginTop: 4 },

  goalCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 12px", marginBottom: 10 },
  goalHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  goalName: { flex: 1, fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  goalAmounts: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted2)", marginBottom: 6 },
  goalBarWrap: { height: 9, background: "var(--surface-sunken)", borderRadius: 5, overflow: "hidden", marginBottom: 10 },
  goalBarFill: { height: "100%", borderRadius: 5, background: "linear-gradient(90deg, #5FA8A0, #3E7E78)", transition: "width 0.3s" },
  goalRow: { display: "flex", gap: 8 },

  insightsCard: { background: "linear-gradient(160deg, var(--warm-tint), var(--panel))", border: "1px solid var(--warm-border)", borderRadius: 16, padding: "14px 12px", marginBottom: 16 },
  insightLine: { fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.9, margin: 0 },

  commitmentCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 14 },
  commitmentRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  commitmentValue: { fontSize: 20, fontWeight: 700, color: "var(--gold)", direction: "ltr" },
  totalsRow: { display: "flex", gap: 10, marginBottom: 16 },
  totalChip: { flex: 1, background: "var(--surface-sunken)", borderRadius: 12, padding: "10px 8px", textAlign: "center" },
  totalChipLabel: { fontSize: 10.5, color: "var(--muted2)", marginBottom: 4 },
  totalChipValue: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)", direction: "ltr" },
  billCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 12px", marginBottom: 10 },
  billHead: { display: "flex", alignItems: "center", gap: 8 },
  billIconWrap: { width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  billInfo: { flex: 1, minWidth: 0 },
  billName: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  billMeta: { fontSize: 11, color: "var(--muted2)", marginTop: 2 },
  billAmount: { fontSize: 13.5, fontWeight: 700, direction: "ltr", whiteSpace: "nowrap", color: "var(--ink)" },
  billBadgeRow: { display: "flex", gap: 6, alignItems: "center", marginTop: 8 },
  billBadge: { fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: "3px 10px" },
  billActionsRow: { display: "flex", gap: 8, marginTop: 10 },
  billPayBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(95,168,160,0.14)", border: "1px solid rgba(95,168,160,0.4)", color: "#5FA8A0", borderRadius: 10, padding: "9px 0", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" },
  billIconBtn: { display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-sunken)", border: "1px solid var(--border2)", color: "var(--muted2)", borderRadius: 10, width: 34, cursor: "pointer" },
  recurrenceRow: { display: "flex", gap: 8, marginTop: 6 },
  recurrenceChip: { flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: "1px solid var(--border2)", background: "var(--surface-sunken)", color: "var(--ink)", textAlign: "center" },
  recurrenceChipActive: { border: "1.5px solid var(--gold)", background: "rgba(201,162,75,0.12)", color: "var(--gold)" },
};

const BILL_STATUS_STYLE = {
  paid: { color: "#5FA8A0", background: "rgba(95,168,160,0.14)" },
  overdue: { color: "#E05252", background: "rgba(224,82,82,0.12)" },
  dueSoon: { color: "#D4A04C", background: "rgba(212,160,76,0.14)" },
  ok: { color: "var(--muted2)", background: "var(--surface-sunken)" },
  paused: { color: "var(--muted2)", background: "var(--surface-sunken)" },
};

// أول معاملة أُنشئت لكل قالب متكرر تصبح مرجع المقارنة - نفس أيقونة الفئة
// (أو أيقونة عامة Tag إن كان بلا تصنيف) تُستخدَم دائماً لتمثيل أي معاملة
// في القوائم بغضّ النظر عن مكان عرضها (سجل رئيسي، فلترة، إلخ).
function categoryOf(tx, customCategories) {
  return resolveCategory(tx.categoryId, customCategories);
}

// مبلغ SVG بسيط للأعمدة الشهرية داخل تقرير PDF - بلا أي اعتماد على
// recharts (لا يعمل خارج شجرة React) بنفس مبدأ buildReportBarSvg في
// ReportsView (MasarApp.jsx)، منسوخ هنا بمعزل تام حتى يبقى كل ملف مكتفياً
// بذاته (نفس فلسفة فصل NutritionView/FitnessView الحالية).
function buildFinanceBarSvg(data, { width = 620, height = 190 } = {}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length);
  const padding = 22;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2 - 18;
  const slot = chartW / n;
  const barW = Math.max(2, slot - 5);
  const showLabels = n <= 12;
  let bars = "";
  data.forEach((d, i) => {
    const x = padding + i * slot + (slot - barW) / 2;
    const h = Math.max(2, (d.value / max) * chartH);
    const y = padding + chartH - h;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="url(#financeBarGrad)" />`;
    if (showLabels) {
      bars += `<text x="${(x + barW / 2).toFixed(1)}" y="${(padding + chartH + 15).toFixed(1)}" font-size="10" fill="#8a6d28" text-anchor="middle" font-family="Tajawal, sans-serif">${escapeHtml(d.label)}</text>`;
    }
  });
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-width:${width}px">
    <defs><linearGradient id="financeBarGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E0B868" /><stop offset="100%" stop-color="#8a6d28" />
    </linearGradient></defs>
    <line x1="${padding}" y1="${padding + chartH}" x2="${width - padding}" y2="${padding + chartH}" stroke="#e4ddc9" stroke-width="1" />
    ${bars}
  </svg>`;
}

export default function VaultView({ showToast }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [loaded, setLoaded] = useState(false);
  const [subTab, setSubTab] = useState("overview"); // overview | transactions | budgets | goals | bills
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [hiddenDefaultIds, setHiddenDefaultIds] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [bills, setBills] = useState([]);
  const [billPayments, setBillPayments] = useState([]);

  const [addingBill, setAddingBill] = useState(false);
  const [billName, setBillName] = useState("");
  const [billAmountType, setBillAmountType] = useState("fixed"); // fixed | variable
  const [billAmount, setBillAmount] = useState("");
  const [billAccountId, setBillAccountId] = useState("");
  const [billCategoryId, setBillCategoryId] = useState("");
  const [billRecurrence, setBillRecurrence] = useState("monthly"); // monthly | yearly | custom
  const [billDueDay, setBillDueDay] = useState("1");
  const [billDueDate, setBillDueDate] = useState("");
  const [billCustomIntervalDays, setBillCustomIntervalDays] = useState("30");
  const [payingBill, setPayingBill] = useState(null);
  const [payAmountInput, setPayAmountInput] = useState("");

  const [txType, setTxType] = useState(null); // 'expense' | 'income' | null
  const [txAmount, setTxAmount] = useState("");
  const [txReason, setTxReason] = useState("");
  const [txAccountId, setTxAccountId] = useState("");
  const [txCategoryId, setTxCategoryId] = useState("");
  const [txRecurring, setTxRecurring] = useState(false);

  const [addingAccount, setAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("cash");
  const [newAccountBalance, setNewAccountBalance] = useState("");
  const [newAccountCurrency, setNewAccountCurrency] = useState("KWD");

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_CHOICES[0]);
  const [deletingCategory, setDeletingCategory] = useState(null); // تصنيف بانتظار اختيار بديل قبل حذفه (له معاملات سابقة)
  const [reassignTarget, setReassignTarget] = useState("");

  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [contributingGoal, setContributingGoal] = useState(null);
  const [contributeAmount, setContributeAmount] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const [chartRange, setChartRange] = useState("month"); // month | year
  const [incomeInput, setIncomeInput] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [today, setToday] = useState(() => localDayKey());
  useEffect(() => {
    function syncToday() { setToday((prev) => { const now = localDayKey(); return prev === now ? prev : now; }); }
    const interval = setInterval(syncToday, 60000);
    document.addEventListener("visibilitychange", syncToday);
    window.addEventListener("focus", syncToday);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", syncToday); window.removeEventListener("focus", syncToday); };
  }, []);
  const todayMoneyTip = useMemo(() => {
    try { return pickDailyMoneyTip(today, getOwner()); }
    catch (e) { console.error("[VaultView] tip fallback:", e); return pickDailyMoneyTip(today); }
  }, [today]);

  // تحميل كل شيء مرة واحدة عند فتح "الخزنة" - مستقل تماماً عن loadAll()
  // في MasarApp.jsx (نفس مبدأ NutritionView الذي يحمّل بياناته بمعزل تام).
  // يشمل الرصيد/السجل القديمين (legacy) فقط لغرض الهجرة التلقائية أدناه.
  useEffect(() => {
    let active = true;
    (async () => {
      const [legacyVault, legacyTx, acc, cats, hidden, bud, goals, billsData, billPaymentsData] = await Promise.all([
        store.loadVault(), store.loadVaultTransactions(), store.loadVaultAccounts(),
        store.loadBudgetCategories(), store.loadHiddenBudgetCategories(), store.loadBudgets(), store.loadSavingsGoals(),
        store.loadBills(), store.loadBillPayments(),
      ]);
      if (!active) return;

      let finalAccounts = acc;
      let finalTx = legacyTx;
      // هجرة تلقائية لمرة واحدة: مستخدم قديم لديه رصيد/سجل بالنظام السابق
      // (رصيد واحد بلا حسابات) لكن لم يُنشئ أي حساب في النظام الجديد بعد -
      // يُنشأ له حساب "كاش" تلقائياً بنفس رصيده وعملته القديمين، وتُربط كل
      // معاملاته السابقة به فوراً (account_id) حتى لا يفقد أي تاريخ مالي.
      if (acc.length === 0 && legacyVault) {
        const migratedAccount = { id: uid(), name: t("vault.migratedAccountName"), type: "cash", balance: legacyVault.balance, currency: legacyVault.currency };
        await store.saveVaultAccount(migratedAccount);
        finalAccounts = [migratedAccount];
        const txsNeedingAccount = legacyTx.filter((tx) => !tx.accountId);
        if (txsNeedingAccount.length > 0) {
          finalTx = legacyTx.map((tx) => (tx.accountId ? tx : { ...tx, accountId: migratedAccount.id }));
          await Promise.all(txsNeedingAccount.map((tx) => store.addVaultTransaction({ ...tx, accountId: migratedAccount.id })));
        }
      }

      // معاملات متكررة مستحقة لهذا الشهر (فواتير/رواتب ثابتة) - تُطبَّق
      // تلقائياً مرة واحدة فقط لكل شهر (انظر findDueRecurringTemplates).
      const due = findDueRecurringTemplates(finalTx, monthKey());
      if (due.length > 0) {
        const newInstances = [];
        let accountsAfterRecurring = finalAccounts;
        for (const tpl of due) {
          const instance = { ...tpl, id: uid(), date: todayKey(), createdAt: new Date().toISOString(), recurringSourceId: tpl.id };
          await store.addVaultTransaction(instance);
          newInstances.push(instance);
          if (instance.accountId) {
            accountsAfterRecurring = accountsAfterRecurring.map((a) => {
              if (a.id !== instance.accountId) return a;
              const nextBalance = instance.type === "expense" ? a.balance - instance.amount : a.balance + instance.amount;
              return { ...a, balance: nextBalance };
            });
            const acctToSave = accountsAfterRecurring.find((a) => a.id === instance.accountId);
            if (acctToSave) await store.saveVaultAccount(acctToSave);
          }
        }
        finalTx = [...newInstances, ...finalTx];
        finalAccounts = accountsAfterRecurring;
        showToast(t("vault.recurringApplied", { n: due.length }));
      }

      setAccounts(finalAccounts);
      setTransactions(finalTx);
      setCustomCategories(cats);
      setHiddenDefaultIds(hidden);
      setBudgets(bud);
      setSavingsGoals(goals);
      setBills(billsData);
      setBillPayments(billPaymentsData);
      setLoaded(true);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentMonth = monthKey();
  const prevMonth = shiftMonthKey(currentMonth, -1);

  // إجمالي الثروة مُجمَّعاً حسب العملة (لا يُفترَض أن كل حسابات المستخدم
  // بعملة واحدة - انظر تعليق vault_accounts في supabase-schema.sql).
  const wealthByCurrency = useMemo(() => {
    const map = {};
    for (const a of accounts) map[a.currency] = (map[a.currency] || 0) + a.balance;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [accounts]);

  const monthTx = useMemo(() => transactions.filter((tx) => monthKeyFromDateKey(tx.date) === currentMonth), [transactions, currentMonth]);
  const prevMonthTx = useMemo(() => transactions.filter((tx) => monthKeyFromDateKey(tx.date) === prevMonth), [transactions, prevMonth]);

  const monthIncome = useMemo(() => monthTx.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0), [monthTx]);
  const monthExpense = useMemo(() => monthTx.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0), [monthTx]);
  const prevMonthExpense = useMemo(() => prevMonthTx.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0), [prevMonthTx]);

  // توزيع المصروفات على التصنيفات لهذا الشهر - أساس الرسم الدائري وشريط
  // الميزانيات (نفس المجاميع تُستخدَم في الاثنين، لا حساب مكرَّر).
  const categorySpend = useMemo(() => {
    const map = {};
    for (const tx of monthTx) {
      if (tx.type !== "expense") continue;
      const key = tx.categoryId || "other";
      map[key] = (map[key] || 0) + tx.amount;
    }
    return map;
  }, [monthTx]);

  const prevCategorySpend = useMemo(() => {
    const map = {};
    for (const tx of prevMonthTx) {
      if (tx.type !== "expense") continue;
      const key = tx.categoryId || "other";
      map[key] = (map[key] || 0) + tx.amount;
    }
    return map;
  }, [prevMonthTx]);

  const pieData = useMemo(() => Object.entries(categorySpend).map(([catId, value]) => {
    const cat = resolveCategory(catId, customCategories);
    return { name: cat ? (isEn ? cat.nameEn : cat.name) : catId, value, color: cat?.color || "#8C8578" };
  }).sort((a, b) => b.value - a.value), [categorySpend, customCategories, isEn]);

  // بيانات الرسم الشهري/السنوي - "شهري" يعرض توزيع 30 يوماً الأخيرة (دخل/
  // مصروف) و"سنوي" يعرض آخر 12 شهراً - كلاهما يُشتق من transactions
  // المحمَّلة نفسها (بلا استعلام شبكة إضافي، مطابقةً لمبدأ "لا تحميل كامل
  // التاريخ دفعة واحدة" - التحميل الأصلي نفسه غير مقيَّد هنا عمداً لأن
  // الخزنة سجل مالي يتوقع المستخدم رؤية تاريخه الكامل، نفس قرار
  // vault_transactions/chat_messages/tips_log السابق).
  const trendData = useMemo(() => {
    if (chartRange === "month") {
      const days = {};
      for (const tx of monthTx) {
        const d = days[tx.date] || { income: 0, expense: 0 };
        if (tx.type === "income") d.income += tx.amount; else d.expense += tx.amount;
        days[tx.date] = d;
      }
      return Object.entries(days).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => {
        const day = Number(date.slice(8, 10));
        return { label: String(day), income: v.income, expense: v.expense };
      });
    }
    const months = {};
    for (const tx of transactions) {
      const mk = monthKeyFromDateKey(tx.date);
      const v = months[mk] || { income: 0, expense: 0 };
      if (tx.type === "income") v.income += tx.amount; else v.expense += tx.amount;
      months[mk] = v;
    }
    return Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-12).map(([mk, v]) => ({
      label: arabicDate(`${mk}-01`, { month: "short" }, isEn ? "en-US" : undefined),
      income: v.income, expense: v.expense,
    }));
  }, [chartRange, monthTx, transactions, isEn]);

  // كل التصنيفات المتاحة للميزانيات/الفلترة - الجاهزة (باستثناء ما حذفه هذا
  // المستخدم تحديداً منها - انظر hiddenDefaultIds) ثم المخصَّصة.
  const allCategories = useMemo(
    () => [...DEFAULT_BUDGET_CATEGORIES.filter((c) => !hiddenDefaultIds.includes(c.id)), ...customCategories.map((c) => ({ ...c, nameEn: c.name }))],
    [customCategories, hiddenDefaultIds],
  );

  const budgetRows = useMemo(() => allCategories.map((cat) => {
    const b = budgets.find((x) => x.categoryId === cat.id && x.month === currentMonth);
    const spent = categorySpend[cat.id] || 0;
    const amount = b?.amount || 0;
    const pct = amount > 0 ? Math.round((spent / amount) * 100) : 0;
    return { cat, amount, spent, pct };
  }).filter((r) => r.amount > 0 || r.spent > 0), [allCategories, budgets, currentMonth, categorySpend]);

  // "أعلى تصنيف صرفاً هذا الشهر" + مقارنة إجمالي المصروف بالشهر السابق +
  // اقتراح تصنيف واحد ازداد صرفه أكثر من غيره (نسبة مئوية) كمرشح أول
  // لتقليل الصرف - بيانات فعلية بحتة، بلا أي استدعاء ذكاء اصطناعي هنا.
  const insights = useMemo(() => {
    if (pieData.length === 0) return null;
    const top = pieData[0];
    const expenseChangePct = prevMonthExpense > 0 ? Math.round(((monthExpense - prevMonthExpense) / prevMonthExpense) * 100) : null;
    let biggestIncreaseCat = null;
    let biggestIncreasePct = 0;
    for (const [catId, value] of Object.entries(categorySpend)) {
      const prevValue = prevCategorySpend[catId] || 0;
      if (prevValue <= 0) continue;
      const pct = ((value - prevValue) / prevValue) * 100;
      if (pct > biggestIncreasePct) { biggestIncreasePct = pct; biggestIncreaseCat = catId; }
    }
    const cat = biggestIncreaseCat ? resolveCategory(biggestIncreaseCat, customCategories) : null;
    return { topName: top.name, topValue: top.value, expenseChangePct, suggestionCat: cat ? (isEn ? cat.nameEn : cat.name) : null, suggestionPct: Math.round(biggestIncreasePct) };
  }, [pieData, monthExpense, prevMonthExpense, categorySpend, prevCategorySpend, customCategories, isEn]);

  const primaryCurrency = accounts[0]?.currency || "KWD";

  function closeTxForm() { setTxType(null); setTxAmount(""); setTxReason(""); setTxAccountId(""); setTxCategoryId(""); setTxRecurring(false); }
  function openTxForm(type) {
    setTxType(type); setTxAmount(""); setTxReason(""); setTxRecurring(false);
    setTxAccountId(accounts[0]?.id || ""); setTxCategoryId("");
  }

  async function submitTransaction() {
    const amount = parseFloat(txAmount);
    const reason = txReason.trim();
    if (!Number.isFinite(amount) || amount <= 0) { showToast(t("vault.invalidAmount")); return; }
    if (!reason) { showToast(txType === "expense" ? t("vault.writeExpenseReason") : t("vault.writeDepositReason")); return; }
    const tx = {
      id: uid(), date: localDayKey(), amount, type: txType, reason, createdAt: new Date().toISOString(),
      accountId: txAccountId || null, categoryId: txType === "expense" ? (txCategoryId || null) : null,
      isRecurring: txRecurring, recurringFrequency: txRecurring ? "monthly" : null, recurringSourceId: null,
    };
    const prevAccounts = accounts;
    const prevTx = transactions;
    setTransactions((prev) => [tx, ...prev]);
    if (tx.accountId) {
      setAccounts((prev) => prev.map((a) => (a.id === tx.accountId ? { ...a, balance: txType === "expense" ? a.balance - amount : a.balance + amount } : a)));
    }
    const txResult = await store.addVaultTransaction(tx);
    let accResult = { ok: true };
    if (txResult.ok && tx.accountId) {
      const updatedAccount = (accounts.find((a) => a.id === tx.accountId));
      const nextBalance = txType === "expense" ? updatedAccount.balance - amount : updatedAccount.balance + amount;
      accResult = await store.saveVaultAccount({ ...updatedAccount, balance: nextBalance });
    }
    if (txResult.ok && accResult.ok) {
      closeTxForm();
      showToast(txType === "expense" ? t("vault.expenseRecorded") : t("vault.depositRecorded"));
    } else {
      setTransactions(prevTx);
      setAccounts(prevAccounts);
      console.error("[VaultView] submitTransaction failed:", txResult.error || accResult.error);
      showToast(t("common.errors.saveFailed"));
    }
  }

  async function removeTransaction(tx) {
    const prevAccounts = accounts;
    const prevTx = transactions;
    setTransactions((prev) => prev.filter((x) => x.id !== tx.id));
    if (tx.accountId) {
      setAccounts((prev) => prev.map((a) => (a.id === tx.accountId ? { ...a, balance: tx.type === "expense" ? a.balance + tx.amount : a.balance - tx.amount } : a)));
    }
    const delResult = await store.deleteVaultTransaction(tx.id);
    let accResult = { ok: true };
    if (delResult.ok && tx.accountId) {
      const acct = accounts.find((a) => a.id === tx.accountId);
      if (acct) {
        const revertedBalance = tx.type === "expense" ? acct.balance + tx.amount : acct.balance - tx.amount;
        accResult = await store.saveVaultAccount({ ...acct, balance: revertedBalance });
      }
    }
    if (!delResult.ok || !accResult.ok) {
      setTransactions(prevTx); setAccounts(prevAccounts);
      showToast(t("common.errors.deleteFailed"));
    }
  }

  async function submitNewAccount() {
    const balance = parseFloat(newAccountBalance) || 0;
    const name = newAccountName.trim();
    if (!name) { showToast(t("vault.invalidAccountName")); return; }
    const account = { id: uid(), name, type: newAccountType, balance, currency: newAccountCurrency };
    setAccounts((prev) => [...prev, account]);
    const res = await store.saveVaultAccount(account);
    if (res.ok) {
      setAddingAccount(false); setNewAccountName(""); setNewAccountBalance("");
      showToast(t("vault.accountAdded"));
    } else {
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      showToast(t("common.errors.saveFailed"));
    }
  }

  async function removeAccount(id) {
    const prev = accounts;
    setAccounts((list) => list.filter((a) => a.id !== id));
    const res = await store.deleteVaultAccount(id);
    if (!res.ok) { setAccounts(prev); showToast(t("common.errors.deleteFailed")); }
  }

  async function submitNewCategory() {
    const name = newCatName.trim();
    if (!name) return;
    const cat = { id: uid(), name, icon: "Tag", color: newCatColor };
    setCustomCategories((prev) => [...prev, cat]);
    const res = await store.saveBudgetCategory(cat);
    if (res.ok) { setAddingCategory(false); setNewCatName(""); showToast(t("vault.categoryAdded")); }
    else { setCustomCategories((prev) => prev.filter((c) => c.id !== cat.id)); showToast(t("common.errors.saveFailed")); }
  }

  // حذف ميزانية التصنيف (كل الأشهر) ثم حذف/إخفاء التصنيف نفسه - خطوة
  // مشتركة بين مسار الحذف المباشر (بلا معاملات) ومسار الحذف بعد إعادة
  // التصنيف (له معاملات، بعد اختيار المستخدم بديلاً لها).
  async function finalizeDeleteCategory(id) {
    const prevBudgets = budgets;
    const prevCustom = customCategories;
    const prevHidden = hiddenDefaultIds;

    setBudgets((list) => list.filter((b) => b.categoryId !== id));
    const budgetsRes = await store.deleteBudgetsForCategory(id);
    if (!budgetsRes.ok) { setBudgets(prevBudgets); showToast(t("common.errors.saveFailed")); return; }

    const isCustom = customCategories.some((c) => c.id === id);
    if (isCustom) {
      setCustomCategories((list) => list.filter((c) => c.id !== id));
      const res = await store.deleteBudgetCategory(id);
      if (!res.ok) { setCustomCategories(prevCustom); setBudgets(prevBudgets); showToast(t("common.errors.deleteFailed")); return; }
    } else {
      setHiddenDefaultIds((list) => [...list, id]);
      const res = await store.hideBudgetCategory(id);
      if (!res.ok) { setHiddenDefaultIds(prevHidden); setBudgets(prevBudgets); showToast(t("common.errors.deleteFailed")); return; }
    }
    showToast(t("vault.categoryDeleted"));
  }

  // نقطة دخول حذف أي تصنيف (جاهز أو مخصَّص). لا تصنيف "أخرى" ثابتاً بعد
  // الآن كملاذ إجباري - إن كان للتصنيف معاملات سابقة، يختار المستخدم بنفسه
  // تصنيفاً بديلاً حقيقياً من تصنيفاته الفعلية قبل تأكيد الحذف (عبر
  // confirmReassignAndDelete أدناه)؛ إن لم يكن له أي معاملات، يُحذف مباشرة
  // دون سؤال إضافي.
  async function removeCategory(id) {
    const hasTransactions = transactions.some((tx) => tx.categoryId === id);
    if (!hasTransactions) { await finalizeDeleteCategory(id); return; }

    const others = allCategories.filter((c) => c.id !== id);
    if (others.length === 0) { showToast(t("vault.needAnotherCategoryFirst")); return; }

    const cat = allCategories.find((c) => c.id === id);
    setDeletingCategory(cat);
    setReassignTarget(others[0].id);
  }

  // يُنقَل كل معاملات التصنيف المحذوف فعلياً إلى التصنيف البديل الذي اختاره
  // المستخدم أولاً (بلا فقدان بيانات)، قبل حذف الميزانية ثم حذف/إخفاء
  // التصنيف نفسه - بهذا الترتيب تحديداً حتى لا يبقى أي تعارض إن فشلت خطوة.
  async function confirmReassignAndDelete() {
    if (!deletingCategory || !reassignTarget) return;
    const id = deletingCategory.id;
    const targetId = reassignTarget;
    const prevTransactions = transactions;

    setTransactions((list) => list.map((tx) => (tx.categoryId === id ? { ...tx, categoryId: targetId } : tx)));
    const reassignRes = await store.reassignVaultTransactionsCategory(id, targetId);
    if (!reassignRes.ok) {
      setTransactions(prevTransactions);
      showToast(t("common.errors.saveFailed"));
      return;
    }

    setDeletingCategory(null);
    setReassignTarget("");
    await finalizeDeleteCategory(id);
  }

  async function updateBudgetAmount(categoryId, amount) {
    const value = parseFloat(amount) || 0;
    const budget = { categoryId, month: currentMonth, amount: value };
    const prev = budgets;
    setBudgets((list) => {
      const exists = list.some((b) => b.categoryId === categoryId && b.month === currentMonth);
      return exists ? list.map((b) => (b.categoryId === categoryId && b.month === currentMonth ? budget : b)) : [...list, budget];
    });
    const res = await store.saveBudget(budget);
    if (!res.ok) { setBudgets(prev); showToast(t("common.errors.saveFailed")); }
  }

  async function applyQuickSplit(split) {
    const needsPerCat = splitEqually(split.needs, NEEDS_CATEGORY_IDS);
    const wantsPerCat = splitEqually(split.wants, WANTS_CATEGORY_IDS);
    const combined = { ...needsPerCat, ...wantsPerCat };
    const prev = budgets;
    const nextBudgets = [...budgets];
    for (const [categoryId, amount] of Object.entries(combined)) {
      const idx = nextBudgets.findIndex((b) => b.categoryId === categoryId && b.month === currentMonth);
      const budget = { categoryId, month: currentMonth, amount };
      if (idx >= 0) nextBudgets[idx] = budget; else nextBudgets.push(budget);
    }
    setBudgets(nextBudgets);
    const results = await Promise.all(Object.entries(combined).map(([categoryId, amount]) => store.saveBudget({ categoryId, month: currentMonth, amount })));
    if (results.some((r) => !r.ok)) { setBudgets(prev); showToast(t("common.errors.saveFailed")); }
    else showToast(t("vault.splitApplied"));
  }

  // اقتراح ذكي بالذكاء الاصطناعي (Gemini الموجود أصلاً) - يُبنى فقط من
  // بيانات المستخدم الفعلية (الدخل المُدخَل، صرفه الحقيقي حسب التصنيف آخر
  // شهر، أهداف ادخاره الفعلية) - لا يخترع نمطاً غير موجود في هذه الأرقام،
  // ودائماً مصحوب بتنبيه أنه استرشادي فقط (نفس مبدأ التنبيهات في بقية
  // مسار: micronutrients في التغذية، roadmap في أنجز...).
  async function suggestSmartSplit() {
    const income = parseFloat(incomeInput);
    if (!Number.isFinite(income) || income <= 0) { showToast(t("vault.invalidIncome")); return; }
    setAiLoading(true); setAiSuggestion(null);
    try {
      const spendLines = Object.entries(categorySpend).map(([catId, value]) => {
        const cat = resolveCategory(catId, customCategories);
        const name = cat ? (isEn ? cat.nameEn : cat.name) : catId;
        return isEn ? `${name}: ${value.toFixed(2)}` : `${name}: ${value.toFixed(2)}`;
      }).join(isEn ? ", " : "، ");
      const goalsLines = savingsGoals.map((g) => `${g.name} (${g.currentAmount}/${g.targetAmount})`).join(isEn ? ", " : "، ");
      const prompt = isEn
        ? `You are a budgeting assistant. The user's actual monthly income is ${income}. Their real spending by category last month: ${spendLines || "no data yet"}. Their savings goals: ${goalsLines || "none"}. Suggest a practical monthly budget split (needs / wants / savings amounts and 2-3 category-level tips) based ONLY on these real numbers - don't invent patterns not shown here. Keep it short (5-8 lines), clear, no long dashes. This is general guidance, not professional financial advice - make that clear in one closing sentence.`
        : `أنت مساعد ميزانية. دخل المستخدم الشهري الفعلي ${income}. صرفه الحقيقي حسب التصنيف آخر شهر: ${spendLines || "لا بيانات بعد"}. أهداف ادخاره: ${goalsLines || "لا يوجد"}. اقترح تقسيماً عملياً للميزانية الشهرية (مبالغ احتياجات/رغبات/ادخار، و2-3 نصائح على مستوى التصنيفات) بناءً على هذه الأرقام الفعلية فقط - لا تخترع نمطاً غير موجود هنا. اجعله قصيراً (5-8 أسطر)، واضحاً، بلا شرطات طويلة. هذا إرشاد عام لا نصيحة مالية احترافية - وضّح ذلك بجملة أخيرة.`;
      const text = await analyze(prompt, 500);
      setAiSuggestion(text.trim());
    } catch (err) {
      console.error("[VaultView] suggestSmartSplit failed:", err);
      showToast(t("vault.aiSplitFailed"));
    } finally { setAiLoading(false); }
  }

  async function submitNewGoal() {
    const target = parseFloat(newGoalTarget);
    const name = newGoalName.trim();
    if (!name || !Number.isFinite(target) || target <= 0) { showToast(t("vault.invalidGoal")); return; }
    const goal = { id: uid(), name, targetAmount: target, currentAmount: 0, currency: primaryCurrency };
    setSavingsGoals((prev) => [...prev, goal]);
    const res = await store.saveSavingsGoal(goal);
    if (res.ok) { setAddingGoal(false); setNewGoalName(""); setNewGoalTarget(""); showToast(t("vault.goalAdded")); }
    else { setSavingsGoals((prev) => prev.filter((g) => g.id !== goal.id)); showToast(t("common.errors.saveFailed")); }
  }

  async function submitContribution(goal) {
    const amount = parseFloat(contributeAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const prev = savingsGoals;
    const updated = { ...goal, currentAmount: goal.currentAmount + amount };
    setSavingsGoals((list) => list.map((g) => (g.id === goal.id ? updated : g)));
    const res = await store.saveSavingsGoal(updated);
    if (res.ok) {
      setContributingGoal(null); setContributeAmount("");
      showToast(updated.currentAmount >= updated.targetAmount ? t("vault.goalReached") : t("vault.contributionSaved"));
    } else { setSavingsGoals(prev); showToast(t("common.errors.saveFailed")); }
  }

  async function removeGoal(id) {
    const prev = savingsGoals;
    setSavingsGoals((list) => list.filter((g) => g.id !== id));
    const res = await store.deleteSavingsGoal(id);
    if (!res.ok) { setSavingsGoals(prev); showToast(t("common.errors.deleteFailed")); }
  }

  // ===== "الفواتير الشهرية" =====
  const monthlyCommitment = useMemo(() => computeMonthlyCommitment(bills, billPayments, currentMonth), [bills, billPayments, currentMonth]);
  const billTotals = useMemo(() => computeBillTotals(bills), [bills]);
  const sortedUpcomingBills = useMemo(() => upcomingBills(bills, 50), [bills]);

  function resetBillForm() {
    setBillName(""); setBillAmountType("fixed"); setBillAmount(""); setBillCategoryId("");
    setBillAccountId(accounts[0]?.id || ""); setBillRecurrence("monthly"); setBillDueDay("1");
    setBillDueDate(localDayKey()); setBillCustomIntervalDays("30");
  }
  function openAddBillForm() {
    if (accounts.length === 0) { showToast(t("vault.bills.needAccountFirst")); return; }
    resetBillForm();
    setAddingBill(true);
  }

  async function submitNewBill() {
    const name = billName.trim();
    if (!name) { showToast(t("vault.bills.invalidName")); return; }
    if (!billAccountId) { showToast(t("vault.bills.needAccountFirst")); return; }
    let amount = null;
    if (billAmountType === "fixed") {
      amount = parseFloat(billAmount);
      if (!Number.isFinite(amount) || amount <= 0) { showToast(t("vault.invalidAmount")); return; }
    }
    const draft = {
      recurrence: billRecurrence,
      dueDay: billRecurrence === "monthly" ? (parseInt(billDueDay, 10) || 1) : null,
      dueDate: billRecurrence !== "monthly" ? billDueDate : null,
      customIntervalDays: billRecurrence === "custom" ? (parseInt(billCustomIntervalDays, 10) || 30) : null,
    };
    if (billRecurrence !== "monthly" && !billDueDate) { showToast(t("vault.bills.invalidDueDate")); return; }
    const nextDueDate = computeInitialNextDueDate(draft);
    const bill = {
      id: uid(), name, amountType: billAmountType, amount,
      accountId: billAccountId, categoryId: billCategoryId || null,
      recurrence: billRecurrence, dueDay: draft.dueDay, dueDate: draft.dueDate,
      customIntervalDays: draft.customIntervalDays, nextDueDate, isActive: true,
    };
    setBills((prev) => [...prev, bill]);
    const res = await store.saveBill(bill);
    if (res.ok) { setAddingBill(false); showToast(t("vault.bills.billAdded")); }
    else { setBills((prev) => prev.filter((b) => b.id !== bill.id)); showToast(t("common.errors.saveFailed")); }
  }

  async function removeBill(id) {
    if (!window.confirm(t("vault.bills.deleteBillConfirm"))) return;
    const prev = bills;
    setBills((list) => list.filter((b) => b.id !== id));
    const res = await store.deleteBill(id);
    if (!res.ok) { setBills(prev); showToast(t("common.errors.deleteFailed")); }
  }

  async function toggleBillActive(bill) {
    const prev = bills;
    const updated = { ...bill, isActive: !bill.isActive };
    setBills((list) => list.map((b) => (b.id === bill.id ? updated : b)));
    const res = await store.saveBill(updated);
    if (!res.ok) { setBills(prev); showToast(t("common.errors.saveFailed")); }
  }

  function openPayBill(bill) {
    setPayingBill(bill);
    setPayAmountInput(bill.amountType === "fixed" ? String(bill.amount) : "");
  }

  // زر "تم الدفع" - الترابط المالي الكامل المطلوب: يُنشئ معاملة مصروف فعلية
  // في سجل الخزنة (نفس store.addVaultTransaction المستخدَم لأي مصروف يدوي -
  // لا منطق مصروف مواز)، يخصم المبلغ من رصيد الحساب فعلياً (نفس
  // store.saveVaultAccount)، يسجّل دفعة الدورة الحالية (bill_payments)
  // بتاريخ استحقاقها الأصلي (bill.nextDueDate قبل أي تقدُّم)، ثم يقدّم
  // نفس next_due_date للدورة القادمة. أي فشل في أي خطوة يُرجع كل الحالات
  // المحلية لوضعها قبل الضغط (بلا نصف تحديث).
  async function submitPayBill() {
    if (!payingBill) return;
    const bill = payingBill;
    const amount = bill.amountType === "fixed" ? bill.amount : parseFloat(payAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) { showToast(t("vault.invalidAmount")); return; }

    const prevTransactions = transactions;
    const prevAccounts = accounts;
    const prevBillPayments = billPayments;
    const prevBills = bills;

    const account = accounts.find((a) => a.id === bill.accountId);
    const tx = {
      id: uid(), date: localDayKey(), amount, type: "expense", reason: bill.name, createdAt: new Date().toISOString(),
      accountId: bill.accountId || null, categoryId: bill.categoryId || null,
      isRecurring: false, recurringFrequency: null, recurringSourceId: null,
    };
    const dueDateForCycle = bill.nextDueDate;
    const payment = { id: uid(), billId: bill.id, dueDateForCycle, amount, paidDate: localDayKey(), transactionId: tx.id };
    const updatedBill = { ...bill, nextDueDate: advanceDueDate(dueDateForCycle, bill) };

    setTransactions((prev) => [tx, ...prev]);
    if (account) setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, balance: a.balance - amount } : a)));
    setBillPayments((prev) => [payment, ...prev]);
    setBills((list) => list.map((b) => (b.id === bill.id ? updatedBill : b)));

    const txResult = await store.addVaultTransaction(tx);
    let accResult = { ok: true };
    if (txResult.ok && account) accResult = await store.saveVaultAccount({ ...account, balance: account.balance - amount });
    const paymentResult = txResult.ok && accResult.ok ? await store.addBillPayment(payment) : { ok: false };
    const billResult = paymentResult.ok ? await store.saveBill(updatedBill) : { ok: false };

    if (txResult.ok && accResult.ok && paymentResult.ok && billResult.ok) {
      setPayingBill(null); setPayAmountInput("");
      showToast(t("vault.bills.billPaid"));
    } else {
      setTransactions(prevTransactions); setAccounts(prevAccounts);
      setBillPayments(prevBillPayments); setBills(prevBills);
      console.error("[VaultView] submitPayBill failed:", txResult.error || accResult.error || paymentResult.error || billResult.error);
      showToast(t("common.errors.saveFailed"));
    }
  }

  const filteredTx = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (q && !tx.reason.toLowerCase().includes(q)) return false;
      if (filterAccount !== "all" && tx.accountId !== filterAccount) return false;
      if (filterCategory !== "all" && (tx.categoryId || "other") !== filterCategory) return false;
      return true;
    });
  }, [transactions, searchQuery, filterAccount, filterCategory]);

  async function exportFinancePdf() {
    if (exporting) return;
    setExporting(true);
    const chartSvg = buildFinanceBarSvg(trendData.map((d) => ({ label: d.label, value: d.income + d.expense })));
    const catRows = pieData.map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${formatVaultAmount(c.value, primaryCurrency)}</td></tr>`).join("");
    const budgetRowsHtml = budgetRows.map((r) => `<tr><td>${escapeHtml(isEn ? r.cat.nameEn : r.cat.name)}</td><td>${formatVaultAmount(r.spent, primaryCurrency)}</td><td>${formatVaultAmount(r.amount, primaryCurrency)}</td></tr>`).join("");
    const appUrl = window.location.href;
    const logoUrl = `${window.location.origin}/logo-mark.png`;
    const periodLabel = arabicDate(`${currentMonth}-01`, { month: "long", year: "numeric" }, isEn ? "en-US" : undefined);
    const dir = isEn ? "ltr" : "rtl";
    const html = `<!doctype html><html dir="${dir}" lang="${isEn ? "en" : "ar"}"><head><meta charset="utf-8"><title>${t("vault.pdfTitle")}</title>
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
        .kpi .v{font-family:'Amiri',serif;font-size:20px;font-weight:700;color:#8a6d28}
        .kpi .l{font-size:12px;color:#6B6355;margin-top:4px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th,td{text-align:${isEn ? "left" : "right"};padding:8px 12px;border-bottom:1px solid #EDE4CE;font-size:14px}
        th{color:#8a6d28;font-size:12px}
        h2{font-family:'Amiri',serif;font-size:17px;margin-top:28px;color:#1B3A3A;border-${isEn ? "left" : "right"}:4px solid #C9A24B;padding-${isEn ? "left" : "right"}:10px}
        .chart-box{background:#fff;border:1px solid #E8D9B5;border-radius:12px;padding:14px;margin-bottom:10px;text-align:center}
        .footer{margin-top:40px;color:#9A8F78;font-size:11px;text-align:center;border-top:1px solid #EDE4CE;padding-top:14px}
        .back-btn{position:fixed;top:14px;${isEn ? "right" : "left"}:14px;z-index:999;display:flex;align-items:center;gap:6px;background:#8a6d28;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.2)}
        @media print{ body{padding-top:40px} .back-btn{display:none !important} }
      </style></head><body>
      <button class="back-btn" onclick="window.close(); setTimeout(function(){ window.location.href='${appUrl}'; }, 250);">${isEn ? "✕ Close" : "✕ إغلاق والعودة"}</button>
      <div class="brand"><img src="${logoUrl}" alt="مسار" /><span>${isEn ? "Masar" : "مسار"}</span></div>
      <h1>${t("vault.pdfTitle")}</h1>
      <div class="meta">${periodLabel}</div>
      <div class="kpis">
        <div class="kpi"><div class="v">${formatVaultAmount(monthIncome, primaryCurrency)}</div><div class="l">${t("vault.pdfIncome")}</div></div>
        <div class="kpi"><div class="v">${formatVaultAmount(monthExpense, primaryCurrency)}</div><div class="l">${t("vault.pdfExpense")}</div></div>
        <div class="kpi"><div class="v">${formatVaultAmount(monthIncome - monthExpense, primaryCurrency)}</div><div class="l">${t("vault.pdfSavings")}</div></div>
      </div>
      <h2>${t("vault.pdfTrend")}</h2>
      <div class="chart-box">${chartSvg}</div>
      <h2>${t("vault.spendByCategory")}</h2>
      <table><tr><th>${t("vault.category")}</th><th>${t("vault.amount")}</th></tr>${catRows || `<tr><td colspan=2>${t("common.states.noDataYet")}</td></tr>`}</table>
      ${budgetRows.length > 0 ? `<h2>${t("vault.budgetsTitle")}</h2><table><tr><th>${t("vault.category")}</th><th>${t("vault.pdfSpent")}</th><th>${t("vault.pdfBudget")}</th></tr>${budgetRowsHtml}</table>` : ""}
      <div class="footer">${isEn ? "Masar · Your personal tool for time and self-development" : "مسار · أداتك الشخصية للوقت وتطوير الذات"} · ${arabicDate(todayKey(), { day: "numeric", month: "long", year: "numeric" }, isEn ? "en-US" : undefined)}</div>
      </body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
    setExporting(false);
  }

  if (!loaded) {
    return <div style={{ ...S.view, display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={24} color="#C9A24B" className="spin" /></div>;
  }

  return (
    <div style={S.view}>
      <div style={VS.wrap}>
        <div style={VS.hero}>
          <div style={VS.heroIcon}><Wallet size={22} color="var(--on-accent)" /></div>
          <div>
            <div style={VS.heroTitle}>{t("vault.heroTitle")}</div>
            <div style={VS.heroSub}>{t("vault.heroSub")}</div>
          </div>
        </div>

        <div style={S.subTabRow}>
          {[
            { id: "overview", label: t("vault.tabs.overview") },
            { id: "transactions", label: t("vault.tabs.transactions") },
            { id: "budgets", label: t("vault.tabs.budgets") },
            { id: "goals", label: t("vault.tabs.goals") },
            { id: "bills", label: t("vault.tabs.bills") },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setSubTab(tab.id)} style={{ ...S.subTab, ...(subTab === tab.id ? S.subTabActive : {}) }}>{tab.label}</button>
          ))}
        </div>

        {subTab === "overview" && (
          <>
            <div style={VS.wealthCard}>
              <div style={VS.wealthLabel}>{t("vault.totalWealth")}</div>
              <div style={VS.wealthAmount}>{wealthByCurrency.length > 0 ? formatVaultAmount(wealthByCurrency[0][1], wealthByCurrency[0][0]) : formatVaultAmount(0, "KWD")}</div>
              {wealthByCurrency.slice(1).map(([code, amt]) => (
                <div key={code} style={VS.wealthExtra}>{formatVaultAmount(amt, code)}</div>
              ))}
              <div style={VS.actionRow}>
                <button onClick={() => openTxForm("expense")} style={VS.expenseBtn}><ArrowDownCircle size={16} /> {t("vault.recordExpense")}</button>
                <button onClick={() => openTxForm("income")} style={VS.incomeBtn}><ArrowUpCircle size={16} /> {t("vault.recordDeposit")}</button>
              </div>
            </div>

            {txType && (
              <div style={VS.txForm}>
                <div style={VS.txFormTitle}>{txType === "expense" ? t("vault.recordExpense") : t("vault.recordDeposit")}</div>
                <label style={S.label}>{t("vault.amount")}</label>
                <input type="number" step="0.01" inputMode="decimal" autoFocus value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" style={{ ...S.input, marginTop: 6 }} />
                <label style={S.label}>{txType === "expense" ? t("vault.expenseReason") : t("vault.depositReason")}</label>
                <input value={txReason} onChange={(e) => setTxReason(e.target.value)} placeholder={txType === "expense" ? t("vault.expensePlaceholder") : t("vault.depositPlaceholder")} style={{ ...S.input, marginTop: 6 }} />
                {accounts.length > 0 && (
                  <>
                    <label style={S.label}>{t("vault.account")}</label>
                    <select value={txAccountId} onChange={(e) => setTxAccountId(e.target.value)} style={{ ...S.input, marginTop: 6 }}>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </>
                )}
                {txType === "expense" && (
                  <>
                    <label style={S.label}>{t("vault.category")}</label>
                    <select value={txCategoryId} onChange={(e) => setTxCategoryId(e.target.value)} style={{ ...S.input, marginTop: 6 }}>
                      <option value="">{t("vault.noCategory")}</option>
                      {allCategories.map((c) => <option key={c.id} value={c.id}>{isEn ? c.nameEn : c.name}</option>)}
                    </select>
                  </>
                )}
                <label style={VS.checkboxRow}>
                  <input type="checkbox" checked={txRecurring} onChange={(e) => setTxRecurring(e.target.checked)} />
                  <Repeat size={14} /> {t("vault.recurringMonthly")}
                </label>
                <div style={VS.txFormRow}>
                  <button onClick={closeTxForm} style={VS.txCancelBtn}>{t("common.buttons.cancel")}</button>
                  <button onClick={submitTransaction} style={{ ...S.saveBtn, marginTop: 0, flex: 1 }}>{t("common.buttons.confirm")}</button>
                </div>
              </div>
            )}

            <div style={VS.sectionHead}>
              <span style={VS.sectionTitle}>{t("vault.accountsTitle")}</span>
              <button onClick={() => setAddingAccount(true)} style={VS.addChipBtn}><Plus size={13} /> {t("vault.addAccount")}</button>
            </div>
            {accounts.length === 0 && <div style={S.emptyHint}>{t("vault.noAccountsYet")}</div>}
            <div style={VS.accountsRow}>
              {accounts.map((a) => (
                <div key={a.id} style={VS.accountChip}>
                  <div style={VS.accountChipHead}>
                    <CatIcon name={ACCOUNT_TYPES.find((t2) => t2.id === a.type)?.icon || "Wallet"} size={13} color="var(--muted2)" />
                    <span style={VS.accountChipName}>{a.name}</span>
                    <button onClick={() => removeAccount(a.id)} style={{ ...S.deleteBtn, padding: 0, marginInlineStart: "auto" }}><Trash2 size={12} /></button>
                  </div>
                  <div style={VS.accountChipBalance}>{formatVaultAmount(a.balance, a.currency)}</div>
                </div>
              ))}
            </div>

            {addingAccount && (
              <div style={{ ...S.modalOverlay }} onClick={() => setAddingAccount(false)}>
                <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                  <div style={S.modalHeader}><span>{t("vault.addAccount")}</span><button onClick={() => setAddingAccount(false)} style={S.deleteBtn}><X size={18} /></button></div>
                  <label style={S.label}>{t("vault.accountName")}</label>
                  <input value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} style={{ ...S.input, marginTop: 6 }} placeholder={t("vault.accountName")} />
                  <label style={S.label}>{t("vault.accountType")}</label>
                  <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} style={{ ...S.input, marginTop: 6 }}>
                    {ACCOUNT_TYPES.map((tp) => <option key={tp.id} value={tp.id}>{isEn ? tp.nameEn : tp.name}</option>)}
                  </select>
                  <label style={S.label}>{t("vault.currentBalance")}</label>
                  <input type="number" step="0.01" inputMode="decimal" value={newAccountBalance} onChange={(e) => setNewAccountBalance(e.target.value)} placeholder="0.00" style={{ ...S.input, marginTop: 6 }} />
                  <label style={S.label}>{t("vault.currency")}</label>
                  <select value={newAccountCurrency} onChange={(e) => setNewAccountCurrency(e.target.value)} style={{ ...S.input, marginTop: 6 }}>
                    {VAULT_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{t(`vault.currencies.${c.code}`)} ({c.symbol})</option>)}
                  </select>
                  <button onClick={submitNewAccount} style={S.saveBtn}>{t("common.buttons.save")}</button>
                </div>
              </div>
            )}

            <div style={S.chartCard}>
              <div style={S.rangeToggle}>
                <button onClick={() => setChartRange("month")} style={{ ...S.rangeBtn, ...(chartRange === "month" ? S.rangeBtnActive : {}) }}>{t("vault.rangeMonth")}</button>
                <button onClick={() => setChartRange("year")} style={{ ...S.rangeBtn, ...(chartRange === "year" ? S.rangeBtnActive : {}) }}>{t("vault.rangeYear")}</button>
              </div>
              <div style={{ ...S.chartTitle, marginTop: 10 }}>{t("vault.monthlyTrend")}</div>
              {trendData.length === 0 ? <div style={S.emptyHint}>{t("common.states.noDataYet")}</div> : (
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={trendData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 10, fontFamily: "Tajawal" }} axisLine={{ stroke: "var(--border2)" }} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name={t("vault.pdfIncome")} fill="#5FA8A0" radius={[3, 3, 0, 0]} maxBarSize={16} />
                    <Bar dataKey="expense" name={t("vault.pdfExpense")} fill="#D17B5F" radius={[3, 3, 0, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={S.chartCard}>
              <div style={S.chartTitle}>{t("vault.spendByCategory")}</div>
              {pieData.length === 0 ? <div style={S.emptyHint}>{t("common.states.noDataYet")}</div> : (
                <div style={S.pieRow}>
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none">
                        {pieData.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--line)", border: "1px solid var(--border2)", borderRadius: 8, fontFamily: "Tajawal", fontSize: 12 }} formatter={(v, n) => [formatVaultAmount(v, primaryCurrency), n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={S.pieLegend}>
                    {pieData.map((c, i) => (
                      <div key={i} style={S.legendChip}><span style={{ ...S.legendDot, background: c.color }} /><span>{c.name}</span><span style={S.legendMins}>{formatVaultAmount(c.value, primaryCurrency)}</span></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {insights && (
              <div style={VS.insightsCard}>
                <p style={VS.insightLine}>{t("vault.insightTopCategory", { name: insights.topName, amount: formatVaultAmount(insights.topValue, primaryCurrency) })}</p>
                {insights.expenseChangePct !== null && (
                  <p style={VS.insightLine}>
                    {insights.expenseChangePct >= 0
                      ? t("vault.insightExpenseUp", { pct: insights.expenseChangePct })
                      : t("vault.insightExpenseDown", { pct: Math.abs(insights.expenseChangePct) })}
                  </p>
                )}
                {insights.suggestionCat && (
                  <p style={VS.insightLine}>{t("vault.insightSuggestion", { name: insights.suggestionCat, pct: insights.suggestionPct })}</p>
                )}
                <div style={{ ...VS.disclaimerBox, marginTop: 8 }}><Sparkles size={14} color="#C9A24B" style={{ flexShrink: 0, marginTop: 1 }} /><span>{t("vault.insightsDisclaimer")}</span></div>
              </div>
            )}

            <button onClick={exportFinancePdf} disabled={exporting} style={S.exportBtn}>
              {exporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />} {exporting ? t("vault.preparingReport") : t("vault.exportPdf")}
            </button>

            <div style={VS.tipCard}>
              <div style={VS.ornament}><span style={VS.ornamentLine} /><span style={VS.ornamentDot}>◆</span><span style={VS.ornamentLineRev} /></div>
              <p style={VS.quoteText}>{isEn ? (todayMoneyTip.textEn || todayMoneyTip.text) : todayMoneyTip.text}</p>
              <div style={VS.footerRow}><span style={VS.categoryPill}>{t(`tips.categories.${todayMoneyTip.category}`, MONEY_TIP_CATEGORY_LABELS[todayMoneyTip.category] || t("vault.financialTipFallback"))}</span></div>
            </div>
          </>
        )}

        {subTab === "transactions" && (
          <>
            <div style={VS.searchRow}>
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("vault.searchTransactions")} style={VS.searchInput} />
            </div>
            <div style={VS.filterRow}>
              <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} style={VS.filterSelect}>
                <option value="all">{t("vault.allAccounts")}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={VS.filterSelect}>
                <option value="all">{t("vault.allCategories")}</option>
                {allCategories.map((c) => <option key={c.id} value={c.id}>{isEn ? c.nameEn : c.name}</option>)}
              </select>
            </div>
            <div style={VS.logList} className="stagger-in responsive-card-list">
              {filteredTx.length === 0 && <div style={S.emptyHint}>{t("vault.noMatchingTransactions")}</div>}
              {filteredTx.map((tx) => {
                const cat = categoryOf(tx, customCategories);
                const account = accounts.find((a) => a.id === tx.accountId);
                const [y, m, d] = tx.date.split("-").map(Number);
                return (
                  <div key={tx.id} style={VS.logItem}>
                    <div style={{ ...VS.logIconWrap, background: cat ? `${cat.color}22` : "var(--surface-raised)" }}>
                      <CatIcon name={cat?.icon || "Tag"} size={16} color={cat?.color || "var(--muted2)"} />
                    </div>
                    <div style={VS.logInfo}>
                      <div style={VS.logReason}>{tx.reason}{tx.isRecurring && <Repeat size={11} style={{ marginInlineStart: 5, verticalAlign: "middle" }} color="var(--muted2)" />}</div>
                      <div style={VS.logMeta}>
                        {arabicDate(new Date(y, m - 1, d), { day: "numeric", month: "short" }, isEn ? "en-US" : undefined)}
                        {account ? ` · ${account.name}` : ""}{cat ? ` · ${isEn ? cat.nameEn : cat.name}` : ""}
                      </div>
                    </div>
                    <span style={{ ...VS.logAmount, color: tx.type === "expense" ? "#E05252" : "#5FA8A0" }}>{tx.type === "expense" ? "−" : "+"}{formatVaultAmount(tx.amount, account?.currency || primaryCurrency)}</span>
                    <button onClick={() => removeTransaction(tx)} style={S.deleteBtn}><Trash2 size={13} /></button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {subTab === "budgets" && (
          <>
            <div style={VS.splitCard}>
              <div style={VS.sectionTitle}>{t("vault.quickSplitTitle")}</div>
              <label style={S.label}>{t("vault.monthlyIncome")}</label>
              <input type="number" step="0.01" inputMode="decimal" value={incomeInput} onChange={(e) => setIncomeInput(e.target.value)} placeholder="0.00" style={{ ...S.input, marginTop: 6 }} />
              {(() => {
                const income = parseFloat(incomeInput);
                if (!Number.isFinite(income) || income <= 0) return null;
                const split = computeBudget503020(income);
                return (
                  <>
                    <div style={VS.splitRow}>
                      <div style={VS.splitChip}><div style={VS.splitChipLabel}>{t("vault.needs")}</div><div style={VS.splitChipValue}>{formatVaultAmount(split.needs, primaryCurrency)}</div></div>
                      <div style={VS.splitChip}><div style={VS.splitChipLabel}>{t("vault.wants")}</div><div style={VS.splitChipValue}>{formatVaultAmount(split.wants, primaryCurrency)}</div></div>
                      <div style={VS.splitChip}><div style={VS.splitChipLabel}>{t("vault.savings")}</div><div style={VS.splitChipValue}>{formatVaultAmount(split.savings, primaryCurrency)}</div></div>
                    </div>
                    <button onClick={() => applyQuickSplit(split)} style={{ ...S.saveBtn, marginTop: 10 }}>{t("vault.applySplit")}</button>
                    <button onClick={suggestSmartSplit} disabled={aiLoading} style={VS.aiBtn}>
                      {aiLoading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} {t("vault.aiSuggestSplit")}
                    </button>
                    {aiSuggestion && (
                      <>
                        <div style={VS.aiResultBox}>{aiSuggestion}</div>
                        <div style={VS.disclaimerBox}><Sparkles size={14} color="#C9A24B" style={{ flexShrink: 0, marginTop: 1 }} /><span>{t("vault.aiSplitDisclaimer")}</span></div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            <div style={VS.sectionHead}>
              <span style={VS.sectionTitle}>{t("vault.budgetsTitle")}</span>
              <button onClick={() => setAddingCategory(true)} style={VS.addChipBtn}><Plus size={13} /> {t("vault.addCustomCategory")}</button>
            </div>
            {allCategories.map((cat) => {
              const b = budgets.find((x) => x.categoryId === cat.id && x.month === currentMonth);
              const spent = categorySpend[cat.id] || 0;
              const amount = b?.amount || 0;
              const pct = amount > 0 ? Math.min(999, Math.round((spent / amount) * 100)) : 0;
              const barColor = pct >= 100 ? "#E05252" : pct >= 80 ? "#D4A04C" : "#5FA8A0";
              return (
                <div key={cat.id} style={VS.budgetRow}>
                  <div style={VS.budgetHead}>
                    <CatIcon name={cat.icon} size={16} color={cat.color} />
                    <span style={VS.budgetName}>{isEn ? cat.nameEn : cat.name}</span>
                    <input
                      type="number" inputMode="decimal" defaultValue={amount || ""} placeholder="0"
                      onBlur={(e) => updateBudgetAmount(cat.id, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                      style={VS.budgetInput}
                    />
                    <button onClick={() => removeCategory(cat.id)} style={{ ...S.deleteBtn, padding: 4 }}><Trash2 size={13} /></button>
                  </div>
                  {amount > 0 && (
                    <>
                      <div style={VS.budgetBarWrap}><div style={{ ...VS.budgetBarFill, width: `${Math.min(100, pct)}%`, background: barColor }} /></div>
                      <div style={VS.budgetMeta}><span>{formatVaultAmount(spent, primaryCurrency)} / {formatVaultAmount(amount, primaryCurrency)}</span><span>{pct}%</span></div>
                      {pct >= 100 && <div style={VS.budgetAlert}><AlertTriangle size={12} /> {t("vault.overBudget")}</div>}
                      {pct >= 80 && pct < 100 && <div style={{ ...VS.budgetAlert, color: "#D4A04C" }}><AlertTriangle size={12} /> {t("vault.nearBudget")}</div>}
                    </>
                  )}
                </div>
              );
            })}

            {addingCategory && (
              <div style={S.modalOverlay} onClick={() => setAddingCategory(false)}>
                <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                  <div style={S.modalHeader}><span>{t("vault.addCustomCategory")}</span><button onClick={() => setAddingCategory(false)} style={S.deleteBtn}><X size={18} /></button></div>
                  <label style={S.label}>{t("vault.categoryName")}</label>
                  <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitNewCategory()} style={{ ...S.input, marginTop: 6 }} autoFocus />
                  <div style={{ ...S.colorPickRow, marginTop: 10 }}>{COLOR_CHOICES.map((col) => <button key={col} onClick={() => setNewCatColor(col)} style={{ ...S.colorDot, background: col, outline: newCatColor === col ? "2px solid #fff" : "none" }} />)}</div>
                  <button onClick={submitNewCategory} style={S.saveBtn}>{t("common.buttons.save")}</button>
                </div>
              </div>
            )}

            {deletingCategory && (
              <div style={S.modalOverlay} onClick={() => { setDeletingCategory(null); setReassignTarget(""); }}>
                <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                  <div style={S.modalHeader}>
                    <span>{t("vault.reassignBeforeDeleteTitle")}</span>
                    <button onClick={() => { setDeletingCategory(null); setReassignTarget(""); }} style={S.deleteBtn}><X size={18} /></button>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--muted2)", lineHeight: 1.6, margin: "4px 0 12px" }}>
                    {t("vault.reassignBeforeDeleteMsg", { name: isEn ? deletingCategory.nameEn : deletingCategory.name })}
                  </p>
                  <label style={S.label}>{t("vault.moveTransactionsTo")}</label>
                  <select value={reassignTarget} onChange={(e) => setReassignTarget(e.target.value)} style={{ ...S.input, marginTop: 6 }}>
                    {allCategories.filter((c) => c.id !== deletingCategory.id).map((c) => (
                      <option key={c.id} value={c.id}>{isEn ? c.nameEn : c.name}</option>
                    ))}
                  </select>
                  <button onClick={confirmReassignAndDelete} style={{ ...S.saveBtn, background: "#E05252" }}>{t("vault.confirmMoveAndDelete")}</button>
                </div>
              </div>
            )}
          </>
        )}

        {subTab === "goals" && (
          <>
            <div style={VS.sectionHead}>
              <span style={VS.sectionTitle}>{t("vault.goalsTitle")}</span>
              <button onClick={() => setAddingGoal(true)} style={VS.addChipBtn}><Plus size={13} /> {t("vault.addGoal")}</button>
            </div>
            {savingsGoals.length === 0 && <div style={S.emptyHint}>{t("vault.noGoalsYet")}</div>}
            {savingsGoals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
              return (
                <div key={g.id} style={VS.goalCard}>
                  <div style={VS.goalHead}>
                    <PiggyBank size={18} color="#5FA8A0" />
                    <span style={VS.goalName}>{g.name}</span>
                    <button onClick={() => removeGoal(g.id)} style={S.deleteBtn}><Trash2 size={13} /></button>
                  </div>
                  <div style={VS.goalAmounts}><span>{formatVaultAmount(g.currentAmount, g.currency)}</span><span>{formatVaultAmount(g.targetAmount, g.currency)}</span></div>
                  <div style={VS.goalBarWrap}><div style={{ ...VS.goalBarFill, width: `${pct}%` }} /></div>
                  {pct >= 100 ? (
                    <div style={{ ...S.legendMins, color: "#5FA8A0", fontWeight: 700 }}>{t("vault.goalReached")}</div>
                  ) : contributingGoal === g.id ? (
                    <div style={VS.goalRow}>
                      <input type="number" step="0.01" inputMode="decimal" autoFocus value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} placeholder="0.00" style={{ ...S.input }} />
                      <button onClick={() => submitContribution(g)} style={{ ...S.saveBtn, marginTop: 0, width: "auto", padding: "0 16px" }}><Check size={15} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setContributingGoal(g.id); setContributeAmount(""); }} style={VS.txCancelBtn}>{t("vault.contribute")}</button>
                  )}
                </div>
              );
            })}

            {addingGoal && (
              <div style={S.modalOverlay} onClick={() => setAddingGoal(false)}>
                <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                  <div style={S.modalHeader}><span>{t("vault.addGoal")}</span><button onClick={() => setAddingGoal(false)} style={S.deleteBtn}><X size={18} /></button></div>
                  <label style={S.label}>{t("vault.goalName")}</label>
                  <input value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} style={{ ...S.input, marginTop: 6 }} autoFocus />
                  <label style={S.label}>{t("vault.targetAmount")}</label>
                  <input type="number" step="0.01" inputMode="decimal" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} placeholder="0.00" style={{ ...S.input, marginTop: 6 }} />
                  <button onClick={submitNewGoal} style={S.saveBtn}>{t("common.buttons.save")}</button>
                </div>
              </div>
            )}
          </>
        )}

        {subTab === "bills" && (
          <>
            <div style={VS.commitmentCard}>
              <div style={VS.commitmentRow}>
                <span style={VS.sectionTitle}>{t("vault.bills.commitmentTitle")}</span>
                <span style={VS.commitmentValue}>{monthlyCommitment.total > 0 ? `${monthlyCommitment.paid}/${monthlyCommitment.total}` : "—"}</span>
              </div>
              {monthlyCommitment.total > 0 && (
                <div style={{ ...VS.budgetBarWrap, marginTop: 10 }}>
                  <div style={{ ...VS.budgetBarFill, width: `${monthlyCommitment.pct}%`, background: monthlyCommitment.pct >= 100 ? "#5FA8A0" : "#D4A04C" }} />
                </div>
              )}
              {monthlyCommitment.total === 0 && <div style={{ ...S.emptyHint, padding: "8px 0 0" }}>{t("vault.bills.noBillsThisMonth")}</div>}
            </div>

            <div style={VS.totalsRow}>
              <div style={VS.totalChip}><div style={VS.totalChipLabel}>{t("vault.bills.totalMonthly")}</div><div style={VS.totalChipValue}>{formatVaultAmount(billTotals.monthlyFixed, primaryCurrency)}</div></div>
              <div style={VS.totalChip}><div style={VS.totalChipLabel}>{t("vault.bills.totalYearly")}</div><div style={VS.totalChipValue}>{formatVaultAmount(billTotals.yearlyFixed, primaryCurrency)}</div></div>
            </div>
            {billTotals.hasVariable && <div style={{ ...S.emptyHint, marginTop: -8, marginBottom: 12 }}>{t("vault.bills.variableNotIncludedNote")}</div>}

            <div style={VS.sectionHead}>
              <span style={VS.sectionTitle}>{t("vault.bills.upcomingTitle")}</span>
              <button onClick={openAddBillForm} style={VS.addChipBtn}><Plus size={13} /> {t("vault.bills.addBill")}</button>
            </div>

            {sortedUpcomingBills.length === 0 && <div style={S.emptyHint}>{t("vault.bills.noBillsYet")}</div>}
            <div className="stagger-in responsive-card-list">
              {sortedUpcomingBills.map((bill) => {
                const cat = bill.categoryId ? resolveCategory(bill.categoryId, customCategories) : null;
                const account = accounts.find((a) => a.id === bill.accountId);
                const status = billStatus(bill, billPayments, currentMonth);
                const statusStyle = BILL_STATUS_STYLE[status];
                const recurrenceLabel = BILL_RECURRENCES.find((r) => r.id === bill.recurrence);
                const [y, m, d] = bill.nextDueDate.split("-").map(Number);
                return (
                  <div key={bill.id} style={{ ...VS.billCard, opacity: bill.isActive ? 1 : 0.55 }}>
                    <div style={VS.billHead}>
                      <div style={{ ...VS.billIconWrap, background: cat ? `${cat.color}22` : "var(--surface-raised)" }}>
                        <CatIcon name={cat?.icon || "Receipt"} size={16} color={cat?.color || "var(--muted2)"} />
                      </div>
                      <div style={VS.billInfo}>
                        <div style={VS.billName}>{bill.name}</div>
                        <div style={VS.billMeta}>
                          {account ? account.name : ""}{cat ? ` · ${isEn ? cat.nameEn : cat.name}` : ""} · {isEn ? recurrenceLabel?.nameEn : recurrenceLabel?.name}
                        </div>
                      </div>
                      <span style={VS.billAmount}>{bill.amountType === "variable" ? t("vault.bills.variableAmount") : formatVaultAmount(bill.amount, account?.currency || primaryCurrency)}</span>
                    </div>
                    <div style={VS.billBadgeRow}>
                      <span style={{ ...VS.billBadge, ...statusStyle }}>
                        {status === "paused" ? t("vault.bills.statusPaused") : t(`vault.bills.status.${status}`, { date: arabicDate(new Date(y, m - 1, d), { day: "numeric", month: "short" }, isEn ? "en-US" : undefined) })}
                      </span>
                    </div>
                    <div style={VS.billActionsRow}>
                      {bill.isActive && status !== "paid" && (
                        <button onClick={() => openPayBill(bill)} style={VS.billPayBtn}><Check size={14} /> {t("vault.bills.markPaidBtn")}</button>
                      )}
                      <button onClick={() => toggleBillActive(bill)} style={VS.billIconBtn} title={bill.isActive ? t("vault.bills.pauseBtn") : t("vault.bills.resumeBtn")}>
                        {bill.isActive ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button onClick={() => removeBill(bill.id)} style={VS.billIconBtn}><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {addingBill && (
              <div style={S.modalOverlay} onClick={() => setAddingBill(false)}>
                <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                  <div style={S.modalHeader}><span>{t("vault.bills.addBill")}</span><button onClick={() => setAddingBill(false)} style={S.deleteBtn}><X size={18} /></button></div>

                  <label style={S.label}>{t("vault.bills.nameLabel")}</label>
                  <input value={billName} onChange={(e) => setBillName(e.target.value)} placeholder={t("vault.bills.namePlaceholder")} style={{ ...S.input, marginTop: 6 }} autoFocus />

                  <label style={S.label}>{t("vault.bills.amountTypeLabel")}</label>
                  <div style={VS.recurrenceRow}>
                    <button onClick={() => setBillAmountType("fixed")} style={{ ...VS.recurrenceChip, ...(billAmountType === "fixed" ? VS.recurrenceChipActive : {}) }}>{t("vault.bills.amountFixed")}</button>
                    <button onClick={() => setBillAmountType("variable")} style={{ ...VS.recurrenceChip, ...(billAmountType === "variable" ? VS.recurrenceChipActive : {}) }}>{t("vault.bills.amountVariable")}</button>
                  </div>
                  {billAmountType === "fixed" && (
                    <input type="number" step="0.01" inputMode="decimal" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} placeholder="0.00" style={{ ...S.input, marginTop: 10 }} />
                  )}

                  <label style={S.label}>{t("vault.account")}</label>
                  <select value={billAccountId} onChange={(e) => setBillAccountId(e.target.value)} style={{ ...S.input, marginTop: 6 }}>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>

                  <label style={S.label}>{t("vault.category")}</label>
                  <select value={billCategoryId} onChange={(e) => setBillCategoryId(e.target.value)} style={{ ...S.input, marginTop: 6 }}>
                    <option value="">{t("vault.noCategory")}</option>
                    {allCategories.map((c) => <option key={c.id} value={c.id}>{isEn ? c.nameEn : c.name}</option>)}
                  </select>

                  <label style={S.label}>{t("vault.bills.recurrenceLabel")}</label>
                  <div style={VS.recurrenceRow}>
                    {BILL_RECURRENCES.map((r) => (
                      <button key={r.id} onClick={() => setBillRecurrence(r.id)} style={{ ...VS.recurrenceChip, ...(billRecurrence === r.id ? VS.recurrenceChipActive : {}) }}>
                        {isEn ? r.nameEn : r.name}
                      </button>
                    ))}
                  </div>

                  {billRecurrence === "monthly" && (
                    <>
                      <label style={S.label}>{t("vault.bills.dueDayLabel")}</label>
                      <input type="number" min="1" max="31" value={billDueDay} onChange={(e) => setBillDueDay(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
                    </>
                  )}
                  {billRecurrence === "yearly" && (
                    <>
                      <label style={S.label}>{t("vault.bills.dueDateLabel")}</label>
                      <input type="date" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
                    </>
                  )}
                  {billRecurrence === "custom" && (
                    <>
                      <label style={S.label}>{t("vault.bills.dueDateLabel")}</label>
                      <input type="date" value={billDueDate} onChange={(e) => setBillDueDate(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
                      <label style={S.label}>{t("vault.bills.customIntervalLabel")}</label>
                      <input type="number" min="1" value={billCustomIntervalDays} onChange={(e) => setBillCustomIntervalDays(e.target.value)} style={{ ...S.input, marginTop: 6 }} />
                    </>
                  )}

                  <button onClick={submitNewBill} style={S.saveBtn}>{t("common.buttons.save")}</button>
                </div>
              </div>
            )}

            {payingBill && (
              <div style={S.modalOverlay} onClick={() => setPayingBill(null)}>
                <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                  <div style={S.modalHeader}><span>{t("vault.bills.markPaidBtn")}</span><button onClick={() => setPayingBill(null)} style={S.deleteBtn}><X size={18} /></button></div>
                  <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.6, margin: "4px 0 12px" }}>{payingBill.name}</p>
                  {payingBill.amountType === "variable" ? (
                    <>
                      <label style={S.label}>{t("vault.amount")}</label>
                      <input type="number" step="0.01" inputMode="decimal" autoFocus value={payAmountInput} onChange={(e) => setPayAmountInput(e.target.value)} placeholder="0.00" style={{ ...S.input, marginTop: 6 }} />
                    </>
                  ) : (
                    <div style={{ ...VS.wealthAmount, fontSize: 24 }}>{formatVaultAmount(payingBill.amount, accounts.find((a) => a.id === payingBill.accountId)?.currency || primaryCurrency)}</div>
                  )}
                  <button onClick={submitPayBill} style={S.saveBtn}>{t("vault.bills.confirmPayBtn")}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
