import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

// SpotlightTour: محرك جولة إرشادية تفاعلية قابل لإعادة الاستخدام بالكامل.
// لا يحمل أي نص أو منطق خاص بميزة بعينها - كل جولة (الأساسية، التغذية،
// الرياضة...) تمرّر خطواتها ونصوصها من الخارج فقط، حتى تبقى إضافة جولة
// جديدة مستقبلاً مجرد مصفوفة steps جديدة بلا أي تعديل هنا.
//
// شكل كل خطوة:
//   { target?: "[data-tour=\"id\"]", title, body, interactive?: bool, placement?: "top"|"bottom" }
// - target غائب = بطاقة معلوماتية في المنتصف بلا Spotlight (ترحيب/ختام).
// - interactive: true = تنتظر ضغطة حقيقية من المستخدم على العنصر نفسه
//   (بلا preventDefault/stopPropagation - الفعل الحقيقي يحدث كما هو) قبل
//   الانتقال التلقائي للخطوة التالية؛ لا زر "التالي" في هذه الحالة.

const GAP = 8;
const MARGIN = 14;

function getRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export default function SpotlightTour({ steps, stepIndex, onNext, onBack, onSkip, onFinish, labels }) {
  const reduceMotion = useReducedMotion();
  const [rect, setRect] = useState(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 300, height: 160 });
  const tooltipRef = useRef(null);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // تتبّع مستمر لموضع العنصر الهدف (فتح قائمة، تمرير، تغيير حجم) حتى تبقى
  // الحلقة/الـTooltip فوق العنصر الحقيقي بالضبط لا موضعه القديم.
  useEffect(() => {
    if (!step?.target) { setRect(null); return undefined; }
    let raf; let cancelled = false;
    let last = null;
    function update() {
      if (cancelled) return;
      const r = getRect(step.target);
      const changed = !last || !r || r.top !== last.top || r.left !== last.left || r.width !== last.width || r.height !== last.height;
      if (changed) { last = r; setRect(r); }
      raf = requestAnimationFrame(update);
    }
    update();
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); };
  }, [step?.target, stepIndex]);

  // خطوة تفاعلية: الانتقال يحدث فقط بضغطة حقيقية من المستخدم على الهدف
  // نفسه - لا نعترض الحدث، فقط نراقبه.
  useEffect(() => {
    if (!step?.interactive || !step?.target) return undefined;
    const el = document.querySelector(step.target);
    if (!el) return undefined;
    function handleRealClick() { window.setTimeout(() => onNext(), 250); }
    el.addEventListener("click", handleRealClick, { once: true });
    return () => el.removeEventListener("click", handleRealClick);
  }, [step?.target, step?.interactive, stepIndex, onNext]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onSkip(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const r = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ width: r.width, height: r.height });
    }
  }, [step, rect]);

  if (!step) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let tooltipPos = null;
  if (rect) {
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const placeBelow = step.placement === "bottom" || (step.placement !== "top" && spaceBelow >= tooltipSize.height + GAP + MARGIN) || spaceBelow >= spaceAbove;
    const top = placeBelow ? rect.bottom + GAP : Math.max(MARGIN, rect.top - GAP - tooltipSize.height);
    let left = rect.left + rect.width / 2 - tooltipSize.width / 2;
    left = Math.min(Math.max(left, MARGIN), vw - tooltipSize.width - MARGIN);
    tooltipPos = { top, left, maxWidth: Math.min(320, vw - MARGIN * 2) };
  }

  return (
    <div style={ST.root}>
      {rect ? (
        <>
          <div style={{ ...ST.dim, top: 0, left: 0, right: 0, height: Math.max(0, rect.top - GAP) }} />
          <div style={{ ...ST.dim, top: rect.bottom + GAP, left: 0, right: 0, bottom: 0 }} />
          <div style={{ ...ST.dim, top: Math.max(0, rect.top - GAP), left: 0, width: Math.max(0, rect.left - GAP), height: rect.height + GAP * 2 }} />
          <div style={{ ...ST.dim, top: Math.max(0, rect.top - GAP), left: rect.right + GAP, right: 0, height: rect.height + GAP * 2 }} />
          <div
            className={reduceMotion ? "" : "spotlight-pulse"}
            style={{ ...ST.highlightRing, top: rect.top - GAP, left: rect.left - GAP, width: rect.width + GAP * 2, height: rect.height + GAP * 2 }}
          />
        </>
      ) : (
        <div style={ST.fullDim} />
      )}

      {/* بطاقة معلوماتية بلا هدف (ترحيب/ختام): تُوسَّط عبر flex على حاوٍ
          خارجي منفصل بلا حركة، لأن framer-motion يفرض transform خاصاً به
          فوق أي عنصر يحرّكه (y هنا) - فيبتلع أي transform يدوي كـ
          translate(-50%,-50%) الموضوع على نفس العنصر المتحرك. */}
      {!rect ? (
        <div style={ST.centerWrap}>
          <motion.div
            ref={tooltipRef}
            key={stepIndex}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            style={ST.centeredCard}
          >
            {renderCardContent()}
          </motion.div>
        </div>
      ) : (
        <motion.div
          ref={tooltipRef}
          key={stepIndex}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          style={{ ...ST.tooltip, ...tooltipPos }}
        >
          {renderCardContent()}
        </motion.div>
      )}
    </div>
  );

  function renderCardContent() {
    return (
      <>
        <button onClick={onSkip} style={ST.closeBtn} aria-label={labels.skip}><X size={16} /></button>
        {!rect && step.Icon && (
          <div style={ST.iconBadge}><step.Icon size={24} color="var(--on-accent)" /></div>
        )}
        <div style={ST.title}>{step.title}</div>
        <p style={ST.body}>{step.body}</p>
        {steps.length > 1 && (
          <div style={ST.dots}>
            {steps.map((_, i) => <span key={i} style={{ ...ST.dot, ...(i === stepIndex ? ST.dotActive : {}) }} />)}
          </div>
        )}
        {step.interactive ? (
          <div style={ST.interactiveHint}>👆 {labels.tapHere}</div>
        ) : (
          <div style={ST.actions}>
            {stepIndex > 0 && onBack && <button onClick={onBack} style={ST.backBtn}>{labels.back}</button>}
            {!isLast && <button onClick={onSkip} style={ST.skipBtn}>{labels.skip}</button>}
            <button onClick={() => (isLast ? onFinish() : onNext())} style={{ ...ST.nextBtn, ...(isLast ? ST.nextBtnLast : {}) }}>
              {isLast ? labels.start : labels.next}
            </button>
          </div>
        )}
      </>
    );
  }
}

const ST = {
  // pointerEvents: "none" هنا أساسي - هذا الحاوي يغطي الشاشة كاملة
  // (inset: 0)، فلولا هذا لالتقط هو نفسه كل نقرة حتى فوق "الفتحة" حول
  // العنصر المُبرَز، رغم أن أياً من عناصره الفرعية لا يرسم شيئاً هناك.
  // كل عنصر فرعي يحتاج فعلياً اعتراض النقر (منطقة التعتيم، الـTooltip)
  // يعيد تفعيله صراحة بـ pointerEvents: "auto".
  root: { position: "fixed", inset: 0, zIndex: 500, pointerEvents: "none" },
  dim: { position: "fixed", background: "rgba(6,6,7,0.72)", pointerEvents: "auto" },
  fullDim: { position: "fixed", inset: 0, background: "rgba(6,6,7,0.78)", backdropFilter: "blur(4px)", pointerEvents: "auto" },
  highlightRing: { position: "fixed", border: "2px solid var(--gold)", borderRadius: 14, pointerEvents: "none" },
  tooltip: { position: "fixed", pointerEvents: "auto", background: "linear-gradient(165deg, var(--panel), var(--surface-sunken))", border: "1px solid var(--line)", borderRadius: 18, padding: "16px 16px 14px", boxShadow: "0 16px 44px rgba(0,0,0,0.45)" },
  // حاوٍ توسيط بلا حركة خاص به - flex بدل transform، حتى لا يتعارض مع
  // transform الذي يفرضه framer-motion على البطاقة المتحرِّكة بداخله (راجع
  // التعليق في JSX أعلاه).
  centerWrap: { position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, pointerEvents: "none" },
  centeredCard: { position: "relative", pointerEvents: "auto", width: "100%", maxWidth: 340, background: "linear-gradient(165deg, var(--panel), var(--surface-sunken))", border: "1px solid var(--line)", borderRadius: 22, padding: "28px 20px 20px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" },
  closeBtn: { position: "absolute", top: 10, insetInlineEnd: 10, background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", padding: 6, display: "flex", minWidth: 32, minHeight: 32, alignItems: "center", justifyContent: "center" },
  iconBadge: { width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(140deg, #E0B868, #C9A24B)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" },
  title: { fontFamily: "'Amiri', serif", fontSize: 16.5, fontWeight: 700, color: "var(--ink)", marginBottom: 6, paddingInlineEnd: 20 },
  body: { fontSize: 13, color: "var(--muted2)", lineHeight: 1.7, margin: "0 0 12px" },
  dots: { display: "flex", gap: 5, marginBottom: 12 },
  dot: { width: 5, height: 5, borderRadius: "50%", background: "var(--border2)" },
  dotActive: { background: "var(--gold)", width: 14 },
  interactiveHint: { fontSize: 12.5, fontWeight: 700, color: "var(--gold)", textAlign: "center", padding: "8px 0 2px" },
  actions: { display: "flex", alignItems: "center", gap: 8 },
  backBtn: { background: "none", border: "none", color: "var(--muted2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "10px 8px", minHeight: 40 },
  skipBtn: { background: "none", border: "none", color: "var(--muted2)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: "10px 8px", minHeight: 40 },
  nextBtn: { flex: 1, background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 40 },
  nextBtnLast: { flex: "1 0 auto" },
};
