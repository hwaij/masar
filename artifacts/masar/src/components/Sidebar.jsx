import React from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { store } from "../lib/store";
import { MENU_SECTIONS } from "./SideMenu";

// نسخة ثابتة دائمة الظهور من نفس قوائم SideMenu (المصدر الوحيد للحقيقة
// MENU_SECTIONS مستورَد من هناك لا مكرَّر هنا) - تُعرض فقط على الشاشات
// العريضة (>=1024px عبر CSS في masar.css، هذا المكوّن لا يتحقّق من العرض
// بنفسه) بدل قائمة السحب المنبثقة (SideMenu) التي تبقى للجوال/التابلت.
// لا حركة/تراكب هنا لأنها ليست نافذة منبثقة - عمود ثابت ضمن تخطيط الصفحة.
const SBS = {
  // لا "display" هنا عمداً: CSS في masar.css (.masar-sidebar) هو من يقرر
  // إظهارها (flex) أو إخفاءها (none) حسب عرض الشاشة - أي display مضمَّن هنا
  // كان سيتغلّب دائماً على display:none في CSS (الأنماط المضمَّنة أعلى
  // أولوية من أي قاعدة CSS بلا !important)، فتظهر القائمة فوق الجوال أيضاً.
  wrap: { flexDirection: "column", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "12px 10px", gap: 2 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "14px 10px 6px", letterSpacing: 0.2 },
  item: { display: "flex", alignItems: "center", gap: 11, width: "100%", border: "none", background: "transparent", color: "var(--ink-soft)", borderRadius: 10, padding: "10px 10px", fontSize: 13.5, fontFamily: "inherit", fontWeight: 600, cursor: "pointer", textAlign: "start" },
  itemActive: { background: "rgba(201,162,75,0.12)", color: "var(--gold)" },
  itemIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 20, flexShrink: 0 },
  colorDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginInlineStart: "auto" },
  langRow: { display: "flex", alignItems: "center", gap: 8, padding: "12px 10px 4px" },
  langIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 20, flexShrink: 0, color: "var(--muted2)" },
  langToggle: { display: "flex", gap: 2, background: "var(--surface-sunken)", borderRadius: 10, padding: 3, marginInlineStart: "auto" },
  langPill: { border: "none", background: "transparent", borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, color: "var(--muted2)", cursor: "pointer", fontFamily: "inherit" },
  langPillActive: { background: "var(--gold)", color: "var(--on-accent)" },
};

export default function Sidebar({ view, setView, customColorsEnabled, sectionColors }) {
  const { t, i18n } = useTranslation();

  function setLanguage(lang) {
    if (lang === i18n.language) return;
    i18n.changeLanguage(lang);
    store.saveLanguage(lang);
  }

  return (
    <nav style={SBS.wrap} className="masar-sidebar" aria-label={t("nav.menu")}>
      {MENU_SECTIONS.map((section) => (
        <div key={section.titleKey}>
          <div style={SBS.sectionTitle}>{t(section.titleKey)}</div>
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            const customColor = customColorsEnabled ? sectionColors?.[item.id] : null;
            const activeStyle = customColor ? { background: `${customColor}20`, color: customColor } : SBS.itemActive;
            return (
              <button key={item.id} onClick={() => setView(item.id)} style={{ ...SBS.item, ...(active ? activeStyle : {}) }}>
                <span style={SBS.itemIcon}><Icon size={17} /></span>
                {t(item.labelKey)}
                {customColor && <span style={{ ...SBS.colorDot, background: customColor }} />}
              </button>
            );
          })}
        </div>
      ))}
      <div style={SBS.langRow}>
        <span style={SBS.langIcon}><Languages size={16} /></span>
        <div style={SBS.langToggle}>
          <button onClick={() => setLanguage("ar")} style={{ ...SBS.langPill, ...(i18n.language === "ar" ? SBS.langPillActive : {}) }}>{t("nav.arabic")}</button>
          <button onClick={() => setLanguage("en")} style={{ ...SBS.langPill, ...(i18n.language === "en" ? SBS.langPillActive : {}) }}>{t("nav.english")}</button>
        </div>
      </div>
    </nav>
  );
}
