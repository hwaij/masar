import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Moon, Eye, User, Utensils, Dumbbell, HeartPulse,
  Timer, ListChecks, Target, Wallet, TrendingUp,
  MessageCircle, Rocket, Settings,
} from "lucide-react";
import TasbihIcon from "./TasbihIcon";

const MENU_SECTIONS = [
  {
    title: "العبادة",
    items: [
      { id: "prayer", label: "الصلاة", icon: Moon },
      { id: "adhkar", label: "أذكار", icon: TasbihIcon },
      { id: "tips", label: "بصيرة", icon: Eye },
    ],
  },
  {
    title: "الصحة",
    items: [
      { id: "you", label: "أنت", icon: User },
      { id: "nutrition", label: "التغذية", icon: Utensils },
      { id: "fitness", label: "الرياضة", icon: Dumbbell },
      { id: "mental", label: "الصحة النفسية", icon: HeartPulse, comingSoon: true },
    ],
  },
  {
    title: "الإنتاجية",
    items: [
      { id: "focus", label: "تركيز / الدراسة", icon: Timer },
      { id: "tasks", label: "المهام", icon: ListChecks },
      { id: "goals", label: "أهداف", icon: Target },
      { id: "vault", label: "خزنة", icon: Wallet },
      { id: "reports", label: "التقارير", icon: TrendingUp },
    ],
  },
  {
    title: "الذكاء الاصطناعي",
    items: [
      { id: "assistant", label: "مساعد", icon: MessageCircle },
      { id: "achieve", label: "أنجز", icon: Rocket },
    ],
  },
  {
    title: "الحساب",
    items: [
      { id: "settings", label: "التخصيص", icon: Settings },
    ],
  },
];

const MS = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300 },
  panel: { position: "fixed", top: 0, bottom: 0, insetInlineEnd: 0, width: "82%", maxWidth: 320, background: "var(--panel)", borderInlineStart: "1px solid var(--line)", zIndex: 301, display: "flex", flexDirection: "column", boxShadow: "-8px 0 24px rgba(0,0,0,0.25)" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid var(--line)", flexShrink: 0 },
  headTitle: { fontFamily: "'Amiri', serif", fontSize: 18, fontWeight: 700, color: "var(--ink)" },
  closeBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, background: "var(--surface-sunken)", border: "1px solid var(--line)", color: "var(--ink)", cursor: "pointer", flexShrink: 0, padding: 0 },
  body: { flex: 1, overflowY: "auto", padding: "8px 12px 24px" },
  sectionTitle: { fontSize: 11.5, fontWeight: 700, color: "var(--muted)", padding: "16px 8px 6px", letterSpacing: 0.2 },
  item: { display: "flex", alignItems: "center", gap: 12, width: "100%", border: "none", background: "transparent", color: "var(--ink-soft)", borderRadius: 12, padding: "12px 10px", fontSize: 14.5, fontFamily: "inherit", fontWeight: 600, cursor: "pointer", textAlign: "start", minHeight: 44 },
  itemActive: { background: "rgba(201,162,75,0.12)", color: "var(--gold)" },
  itemIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: 22, flexShrink: 0 },
  itemDisabled: { opacity: 0.45, cursor: "not-allowed" },
  soonBadge: { marginInlineStart: "auto", fontSize: 10, fontWeight: 700, color: "var(--muted2)", background: "var(--surface-sunken)", border: "1px solid var(--line)", borderRadius: 20, padding: "2px 8px", flexShrink: 0 },
};

export default function SideMenu({ open, onClose, view, setView }) {
  function go(id) {
    setView(id);
    onClose();
  }
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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
          >
            <div style={MS.head}>
              <span style={MS.headTitle}>القائمة</span>
              <button onClick={onClose} aria-label="إغلاق القائمة" style={MS.closeBtn}><X size={18} /></button>
            </div>
            <div style={MS.body}>
              {MENU_SECTIONS.map((section) => (
                <div key={section.title}>
                  <div style={MS.sectionTitle}>{section.title}</div>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = view === item.id;
                    if (item.comingSoon) {
                      return (
                        <div key={item.id} style={{ ...MS.item, ...MS.itemDisabled }}>
                          <span style={MS.itemIcon}><Icon size={18} /></span>
                          {item.label}
                          <span style={MS.soonBadge}>قريباً</span>
                        </div>
                      );
                    }
                    return (
                      <button key={item.id} onClick={() => go(item.id)} style={{ ...MS.item, ...(active ? MS.itemActive : {}) }}>
                        <span style={MS.itemIcon}><Icon size={18} /></span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
