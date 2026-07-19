import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  X, Moon, Eye, User, Utensils, Dumbbell, HeartHandshake,
  Timer, ListChecks, Target, Wallet, TrendingUp,
  MessageCircle, Rocket, Settings, Languages, Users,
} from "lucide-react";
import { store } from "../lib/store";
import TasbihIcon from "./TasbihIcon";

// لمسة الألوان المخصصة (اختيارية بحتة، مُطفأة افتراضياً): ست ألوان محدودة
// منتقاة من ألوان مستخدمة أصلاً في هوية مسار البصرية في أماكن أخرى (التركيز
// الجماعي، الرياضة، بطاقات الخطر...)، وليست ألواناً حرة قد تكسر التناسق.
export const SECTION_COLOR_PALETTE = ["#5FA8A0", "#8A7BD1", "#D17B5F", "#6FA8DC", "#E0B868", "#7FAEEE"];

export const MENU_SECTIONS = [
  {
    titleKey: "nav.worship",
    items: [
      { id: "prayer", labelKey: "nav.prayer", icon: Moon },
      { id: "adhkar", labelKey: "nav.adhkar", icon: TasbihIcon },
      { id: "tips", labelKey: "nav.wisdom", icon: Eye },
    ],
  },
  {
    titleKey: "nav.health",
    items: [
      { id: "you", labelKey: "nav.you", icon: User },
      { id: "nutrition", labelKey: "nav.nutrition", icon: Utensils },
      { id: "fitness", labelKey: "nav.fitness", icon: Dumbbell },
      { id: "mental", labelKey: "nav.mentalHealth", icon: HeartHandshake },
    ],
  },
  {
    titleKey: "nav.productivity",
    items: [
      { id: "focus", labelKey: "nav.focusStudy", icon: Timer },
      { id: "tasks", labelKey: "nav.tasks", icon: ListChecks },
      { id: "goals", labelKey: "nav.goals", icon: Target },
      { id: "vault", labelKey: "nav.vault", icon: Wallet },
      { id: "reports", labelKey: "nav.reports", icon: TrendingUp },
    ],
  },
  {
    titleKey: "nav.community",
    items: [
      { id: "groups", labelKey: "nav.studyGroups", icon: Users },
    ],
  },
  {
    titleKey: "nav.ai",
    items: [
      { id: "assistant", labelKey: "nav.assistant", icon: MessageCircle },
      { id: "achieve", labelKey: "nav.achieve", icon: Rocket },
    ],
  },
  {
    titleKey: "nav.account",
    items: [
      { id: "settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

const MS = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300 },
  // مثبّتة على حافة "البداية" منطقياً (insetInlineStart) — أي اليمين في
  // RTL (كما طُلب أصلاً "من اليمين") واليسار تلقائياً في LTR، بنفس جانب زر
  // القائمة (☰) في الشريط العلوي. الظل محايد الاتجاه عمداً بدل قيمة أفقية
  // ثابتة، لأن جهة "الحافة المقابلة للمحتوى" تختلف فعلياً بين اللغتين.
  panel: { position: "fixed", top: 0, bottom: 0, insetInlineStart: 0, width: "82%", maxWidth: 320, background: "var(--panel)", borderInlineEnd: "1px solid var(--line)", zIndex: 301, display: "flex", flexDirection: "column", boxShadow: "0 0 24px rgba(0,0,0,0.35)" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid var(--line)", flexShrink: 0 },
  headTitle: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" },
  closeBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "var(--surface-sunken)", border: "1px solid var(--line)", color: "var(--ink)", cursor: "pointer", flexShrink: 0, padding: 0 },
  body: { flex: 1, overflowY: "auto", padding: "8px 12px 24px" },
  sectionTitle: { fontSize: 11.5, fontWeight: 700, color: "var(--muted)", padding: "16px 8px 6px", letterSpacing: 0.2 },
  item: { display: "flex", alignItems: "center", gap: 12, width: "100%", border: "none", background: "transparent", color: "var(--ink-soft)", borderRadius: 12, padding: "12px 10px", fontSize: 14.5, fontFamily: "inherit", fontWeight: 600, cursor: "pointer", textAlign: "start", minHeight: 44 },
  itemActive: { background: "rgba(201,162,75,0.12)", color: "var(--gold)" },
  itemIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 22, flexShrink: 0 },
  colorDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginInlineStart: "auto" },
  itemDisabled: { opacity: 0.45, cursor: "not-allowed" },
  soonBadge: { marginInlineStart: "auto", fontSize: 10, fontWeight: 700, color: "var(--muted2)", background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 20, padding: "2px 8px", flexShrink: 0 },
  langRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 10px 4px", minHeight: 44 },
  langIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 22, flexShrink: 0, color: "var(--muted2)" },
  langLabel: { fontSize: 14.5, fontWeight: 600, color: "var(--ink-soft)", flex: 1 },
  langToggle: { display: "flex", gap: 2, background: "var(--surface-sunken)", borderRadius: 10, padding: 3 },
  langPill: { border: "none", background: "transparent", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, color: "var(--muted2)", cursor: "pointer", fontFamily: "inherit" },
  langPillActive: { background: "var(--gold)", color: "var(--on-accent)" },
};

export default function SideMenu({ open, onClose, view, setView, customColorsEnabled, sectionColors }) {
  const { t, i18n } = useTranslation();

  function go(id) {
    setView(id);
    onClose();
  }

  function setLanguage(lang) {
    if (lang === i18n.language) return;
    i18n.changeLanguage(lang);
    store.saveLanguage(lang);
  }

  // اتجاه الانزلاق الفعلي (transform x) قيمة فيزيائية بحتة لا تتبع dir
  // تلقائياً كما تفعل خصائص CSS المنطقية — لذا يُحدَّد يدوياً هنا: من اليمين
  // في RTL (نفس جانب زر ☰)، ومن اليسار في LTR.
  const hiddenX = i18n.language === "en" ? "-100%" : "100%";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            style={MS.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            style={MS.panel}
            initial={{ x: hiddenX }}
            animate={{ x: 0 }}
            exit={{ x: hiddenX }}
            transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
          >
            <div style={MS.head}>
              <span style={MS.headTitle}>{t("nav.menu")}</span>
              <button onClick={onClose} aria-label={t("nav.closeMenu")} style={MS.closeBtn}><X size={18} /></button>
            </div>
            <div style={MS.body}>
              {MENU_SECTIONS.map((section) => (
                <div key={section.titleKey}>
                  <div style={MS.sectionTitle}>{t(section.titleKey)}</div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = view === item.id;
                    if (item.comingSoon) {
                      return (
                        <div key={item.id} style={{ ...MS.item, ...MS.itemDisabled }}>
                          <span style={MS.itemIcon}><Icon size={18} /></span>
                          {t(item.labelKey)}
                          <span style={MS.soonBadge}>{t("nav.comingSoon")}</span>
                        </div>
                      );
                    }
                    // اللون المخصص (إن فُعِّل هذا الخيار الاختياري ووُجد لون
                    // لهذا القسم تحديداً) يستبدل فقط لون التمييز عند التفعيل
                    // + نقطة صغيرة دائمة بجانب الاسم - لا يغيّر أي شيء آخر في
                    // تصميم العنصر نفسه.
                    const customColor = customColorsEnabled ? sectionColors?.[item.id] : null;
                    const activeStyle = customColor
                      ? { background: `${customColor}20`, color: customColor }
                      : MS.itemActive;
                    return (
                      <button key={item.id} onClick={() => go(item.id)} style={{ ...MS.item, ...(active ? activeStyle : {}) }}>
                        <span style={MS.itemIcon}><Icon size={18} /></span>
                        {t(item.labelKey)}
                        {customColor && <span style={{ ...MS.colorDot, background: customColor }} />}
                      </button>
                    );
                  })}
                  {section.titleKey === "nav.account" && (
                    <div style={MS.langRow}>
                      <span style={MS.langIcon}><Languages size={18} /></span>
                      <span style={MS.langLabel}>{t("nav.language")}</span>
                      <div style={MS.langToggle}>
                        <button onClick={() => setLanguage("ar")} style={{ ...MS.langPill, ...(i18n.language === "ar" ? MS.langPillActive : {}) }}>{t("nav.arabic")}</button>
                        <button onClick={() => setLanguage("en")} style={{ ...MS.langPill, ...(i18n.language === "en" ? MS.langPillActive : {}) }}>{t("nav.english")}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
