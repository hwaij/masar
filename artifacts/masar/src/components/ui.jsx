// مكوّنات مشتركة (Button/Card/ProgressRing) - مرحلة 1 من تحسين الجماليات
// (نظام تصميم موحّد). تعتمد بالكامل على design tokens المعرَّفة في
// masar.css (ألوان/تباعد/حواف/ظلال) بدل أي رقم حر جديد، حتى يبقى أي تعديل
// لاحق باللغة البصرية بمكان واحد. هذه مكوّنات جديدة تماماً معزولة عن S في
// styles.js — لا تُستبدَل بها أي أزرار/بطاقات قديمة تلقائياً؛ التبنّي شاشة
// بشاشة بمراحل لاحقة بعد الموافقة على الاتجاه العام.
//
// Button variants: primary (الإجراء الرئيسي، خلفية ذهبية/أساسية مصمتة)،
// secondary (إجراء ثانٍ بلون --m-secondary الجديد المستوحى من اللوقو)،
// outline (إجراء محايد منخفض التأكيد)، danger (حذف/إجراء مدمِّر).
import { useState, useEffect } from "react";
import { isolateNumbers } from "../lib/bidi";
import NumericValue from "./NumericValue";

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon = null,
  disabled = false,
  type = "button",
  onClick,
  style,
  children,
  ...rest
}) {
  const className = [
    "ui-btn",
    `ui-btn-${variant}`,
    `ui-btn-${size}`,
    fullWidth ? "ui-btn-full" : "",
  ].filter(Boolean).join(" ");
  return (
    <button type={type} className={className} disabled={disabled} onClick={onClick} style={style} {...rest}>
      {icon}
      {children}
    </button>
  );
}

// Card: حاوية موحّدة لأي محتوى مجمَّع بصرياً (بطاقة وجبة، بطاقة هدف،
// إحصائية...). interactive تضيف تأثير رفع خفيف عند hover (لبطاقات قابلة
// للضغط)، بلا أي تغيير في حالة prefers-reduced-motion (مُعطَّل تلقائياً
// عبر masar.css).
export function Card({ padding = "md", interactive = false, onClick, style, children, ...rest }) {
  const className = [
    "ui-card",
    `ui-card-pad-${padding}`,
    interactive ? "ui-card-interactive" : "",
  ].filter(Boolean).join(" ");
  return (
    <div className={className} onClick={onClick} style={style} {...rest}>
      {children}
    </div>
  );
}

// دائرة تقدم واحدة (SVG) - مُستخرَجة من NutritionView.jsx (كانت مكوّناً
// محلياً هناك فقط، مُستخدَمة لحلقات الماكروز الصغيرة) لتصبح مكوّناً مشتركاً
// قابلاً لإعادة الاستخدام بأي شاشة أخرى (StepsView أول من يستخدمها هنا).
// الأنماط أصبحت مضمَّنة inline بدل الاعتماد على كائن NS.* الخاص بـ
// NutritionView سابقاً، بنفس القيم الحرفية بالضبط - صفر تغيير بصري بشاشة
// التغذية بعد الاستخراج.
// تبدأ الحيوية من صفر عند أول ظهور (useEffect + setTimeout قصير) ثم تتحرك
// بانتقال CSS سلس نحو النسبة الفعلية - وبما أن "percent" prop يتغيّر
// تلقائياً عند أي تحديث بالبيانات المصدر، نفس آلية الحركة تعمل تلقائياً
// لأي تحديث لاحق أيضاً، لا فقط عند التحميل.
// children: محتوى مخصَّص اختياري يُعرَض في مركز الحلقة بدل نص "النسبة%"
// الافتراضي (تستخدمه StepsView لعرض عدد الخطوات نفسه بدل نسبة مئوية) -
// عند تركه فارغاً يبقى السلوك الافتراضي (نص النسبة المئوية) كما كان
// بالضبط في NutritionView.
export function ProgressRing({ percent, color, label, valueText, size = 64, strokeWidth = 7, children }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(percent), 50);
    return () => clearTimeout(t);
  }, [percent]);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const ringFraction = Math.max(0, Math.min(100, animated)) / 100;
  const offset = c - ringFraction * c;
  const displayPercent = Math.max(0, Math.round(animated));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-sunken)" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>
          {children ?? <NumericValue value={displayPercent} unit="%" />}
        </div>
      </div>
      {label && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}>{label}</div>}
      {valueText && <div style={{ fontSize: 9.5, color: "var(--muted2)" }}>{isolateNumbers(valueText)}</div>}
    </div>
  );
}
