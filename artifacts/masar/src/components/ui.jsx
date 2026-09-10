// مكوّنات مشتركة (Button/Card) - مرحلة 1 من تحسين الجماليات (نظام تصميم
// موحّد). تعتمد بالكامل على design tokens المعرَّفة في masar.css (ألوان/
// تباعد/حواف/ظلال) بدل أي رقم حر جديد، حتى يبقى أي تعديل لاحق باللغة
// البصرية بمكان واحد. هذه مكوّنات جديدة تماماً معزولة عن S في styles.js —
// لا تُستبدَل بها أي أزرار/بطاقات قديمة تلقائياً؛ التبنّي شاشة بشاشة
// بمراحل لاحقة بعد الموافقة على الاتجاه العام.
//
// Button variants: primary (الإجراء الرئيسي، خلفية ذهبية/أساسية مصمتة)،
// secondary (إجراء ثانٍ بلون --secondary الجديد المستوحى من اللوقو)،
// outline (إجراء محايد منخفض التأكيد)، danger (حذف/إجراء مدمِّر).
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
