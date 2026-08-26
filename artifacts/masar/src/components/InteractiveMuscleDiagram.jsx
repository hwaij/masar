import React, { useLayoutEffect, useRef, useState } from "react";
import {
  FRONT_VIEWBOX, BACK_VIEWBOX, FRONT_REGIONS, FRONT_NEUTRAL, BACK_REGIONS, BACK_NEUTRAL,
  FRONT_VIEWBOX_FEMALE, BACK_VIEWBOX_FEMALE, FRONT_REGIONS_FEMALE, FRONT_NEUTRAL_FEMALE, BACK_REGIONS_FEMALE, BACK_NEUTRAL_FEMALE,
} from "../lib/muscleAnatomyPaths";

// نسخة تفاعلية من مخطط الجسم التشريحي (مصدر الأشكال نفسه المستخدَم في
// MuscleDiagram.jsx - انظر الترخيص والمصدر هناك) - هذا المكوّن منفصل عمداً
// عن MuscleDiagram.jsx (المستخدَم كأيقونة صغيرة غير تفاعلية في عشرات
// أماكن العرض عبر التطبيق) لتفادي أي مخاطرة تكسير لتلك الاستخدامات
// القائمة؛ هنا فقط لشاشة اختيار عضلة بالضغط المباشر (مسار جديد). عرض مشهد
// واحد (أمامي/خلفي) في كل مرة مع مفتاح تبديل - لا كلاهما جنباً إلى جنب -
// لإتاحة مساحة عرض أكبر لكل عضلة على شاشة جوال ضيقة (390px)، وهذا مهم
// فعلياً لدقة الضغط (انظر التعليق التالي).
//
// إتاحة الوصول: كل منطقة عضلة قابلة للضغط تحصل على منطقة لمس شفافة
// (overlay <rect>) بحجم لا يقل عن ~44px فعلية دائماً، حتى لو كان الشكل
// التشريحي الفعلي (مثال: الباي) أصغر بصرياً من ذلك - نحسب الصندوق المحيط
// الحقيقي لكل قطعة مسار عبر SVGGeometryElement.getBBox() (القياس الدقيق
// الوحيد الموثوق لمنحنيات bezier، لا استخراج تقريبي لأرقام الإحداثيات من
// نص المسار) ثم نوسّعه (padding) عند الحاجة فقط ليبلغ الحد الأدنى، بلا أي
// تغيير على الشكل المرسوم نفسه.
//
// خلل حقيقي وُجد ومُصلَح أثناء الاختبار المباشر: عند عرض المشهدين معاً بعرض
// صغير (130px)، توسعة صندوق عضلة صغيرة (كالأكتاف) لبلوغ 44px كانت تلتهم
// مساحة شاسعة تتجاوز حتى *مركز* شكل عضلة الصدر المجاورة - فالضغط على منتصف
// الصدر تماماً كان يُسجَّل كـ"الأكتاف" (منطقة اللمس الشفافة الخاصة بالأكتاف
// تُرسَم لاحقاً في DOM فتعلو بصرياً/تفاعلياً في تلك المساحة المشتركة). حُلّ
// جذرياً بطريقتين معاً: (1) عرض أكبر لكل مخطط (مشهد واحد فقط بدل اثنين معاً
// يتيح ذلك) يقلّل نسبة التوسعة المطلوبة لكل عضلة، (2) ترتيب رسم أهم: مناطق
// اللمس الشفافة تُرسَم *قبل* الأشكال الملوَّنة الحقيقية في DOM (لا بعدها)،
// فالشكل الحقيقي (المرسوم فوقها) يفوز دائماً بأي ضغطة داخل حدوده الفعلية
// (اختبار SVG الدقيق لنقطة داخل مسار bezier، لا صندوق تقريبي) بغض النظر عن
// أي تداخل توسعة - التوسعة الشفافة تُستخدَم فقط في المسافة الميتة الحقيقية
// بين عضلتين، لا كطبقة تتجاوز فوق شكل عضلة أخرى حقيقي.
const FRONT_MUSCLES = ["chest", "shoulders", "biceps", "quads", "abs", "neck"];
const BACK_MUSCLES = ["back", "triceps", "hamstrings", "glutes", "calves", "forearms", "grip"];

// الرقبة/الساعدين/قوة القبضة (فئات عضلية أُضيفت لاحقاً لقاعدة التمارين) لا
// تملك مسارات SVG تشريحية حقيقية في muscleAnatomyPaths.js (المصدر المفتوح
// المُستخدَم لا يوفّر تفصيلاً لهذه المناطق تحديداً) - بدل قائمة نصية منفصلة
// عن المخطط (كما كانت سابقاً)، نضيف علامة دائرية بسيطة فوق موضعها التشريحي
// التقريبي الصحيح على نفس مخطط الجسم مباشرة، بنفس منطق التلوين والاختيار
// المستخدَم لكل عضلة أخرى تماماً. الإحداثيات (بوحدات viewBox، لكل جنس على
// حدة لأن viewBox الأنثوي بأبعاد مختلفة تماماً) قِيست فعلياً عبر تحميل
// المسارات في متصفح حقيقي واستخدام getBBox() لتحديد أين تقع كتلة الرقبة/
// الساعد/اليد ضمن الأشكال المحايدة (neutral) - لا تخمين بصري تقريبي.
// الرقبة على المشهد الأمامي (أوضح رؤية)، والساعدين/القبضة على الخلفي معاً
// (نفس الذراع، ليقرأهما المستخدم كجزأين متتاليين من ذراع واحدة بديهياً).
const EXTRA_MARKERS = {
  front: {
    male: [{ key: "neck", cx: 364, cy: 280 }],
    female: [{ key: "neck", cx: 320, cy: 290 }],
  },
  back: {
    male: [
      { key: "forearms", cx: 838, cy: 700 },
      { key: "grip", cx: 812, cy: 796 },
    ],
    female: [
      { key: "forearms", cx: 865, cy: 665 },
      { key: "grip", cx: 861, cy: 745 },
    ],
  },
};
// نصف قطر أقصى للدائرة المرئية (لا لمنطقة اللمس - انظر markerRadius) -
// يُصغَّر تلقائياً عند الحاجة فقط حين تكون علامتان متقاربتين (الساعدين/
// القبضة) حتى لا تتلامسا بصرياً، عبر minPairwiseGap أدناه.
const EXTRA_MARKER_RADIUS = 42;

function minPairwiseGap(markers) {
  if (markers.length < 2) return Infinity;
  let min = Infinity;
  for (let i = 0; i < markers.length; i++) {
    for (let j = i + 1; j < markers.length; j++) {
      const dx = markers[i].cx - markers[j].cx;
      const dy = markers[i].cy - markers[j].cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < min) min = dist;
    }
  }
  return min;
}

const SELECTED_FILL = "#E05252";
const UNSELECTED_FILL = "var(--surface-sunken)";
const UNSELECTED_STROKE = "var(--border2)";
const SELECTED_STROKE = "var(--gold)";
const NEUTRAL_STROKE = "var(--border2)";
const MIN_TOUCH_PX = 44;

function View({ viewBox, regions, neutralPaths, markers = [], selected, onSelect, widthPx, muscleLabel }) {
  const pathElsRef = useRef({});
  const [overlays, setOverlays] = useState([]);
  const heightPx = widthPx * (viewBox.h / viewBox.w);
  const scalePxPerUnit = widthPx / viewBox.w;
  // منطقة اللمس (طبقة catch الشفافة) - تبلغ ≥44px فعلية دائماً بغض النظر عن
  // الازدحام، بنفس معيار كل عضلة أخرى (قد تتداخل مع علامة مجاورة في مسافة
  // ميتة بينهما فقط - انظر تعليق طبقة catch أدناه، تماماً كمنطق overlays).
  const markerRadius = (MIN_TOUCH_PX / 2) / scalePxPerUnit;
  // الدائرة المرئية - أصغر تلقائياً من طبقة اللمس عند وجود علامة قريبة
  // (الساعدين/القبضة) حتى لا تتلامسا بصرياً، بلا أي أثر على دقة الضغط
  // الفعلية (تلك من طبقة catch دائماً بحجمها الكامل).
  const visibleRadius = Math.min(EXTRA_MARKER_RADIUS, minPairwiseGap(markers) / 2 - 4);

  useLayoutEffect(() => {
    const scalePxPerUnit = widthPx / viewBox.w;
    const minUnits = MIN_TOUCH_PX / scalePxPerUnit;
    const next = [];
    for (const [key, el] of Object.entries(pathElsRef.current)) {
      if (!el) continue;
      const muscle = key.split("::")[0];
      let box;
      try {
        box = el.getBBox();
      } catch {
        continue; // العنصر غير متصل بعد بشجرة DOM بعد - يُعاد الحساب في التالي
      }
      const w = Math.max(box.width, minUnits);
      const h = Math.max(box.height, minUnits);
      next.push({
        key, muscle,
        x: box.x - (w - box.width) / 2,
        y: box.y - (h - box.height) / 2,
        w, h,
      });
    }
    setOverlays(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widthPx, regions]);

  return (
    <svg
      width={widthPx}
      height={heightPx}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      fill="none"
    >
      {neutralPaths.map((d, i) => (
        <path key={`n${i}`} d={d} fill={UNSELECTED_FILL} stroke={NEUTRAL_STROKE} strokeWidth={2.5} />
      ))}
      {/* مناطق اللمس الموسَّعة (≥44px) تُرسَم هنا أولاً (أسفل الأشكال
          الحقيقية) - تلتقط فقط الضغط في المسافة الميتة حول شكل عضلة صغيرة،
          لأن أي شكل عضلة حقيقي مرسوم فوقها لاحقاً يعلوها بصرياً وتفاعلياً
          داخل حدوده الخاصة (انظر تعليق الخلل أعلاه). */}
      {overlays.map((o) => (
        <rect
          key={`ov-${o.key}`}
          x={o.x} y={o.y} width={o.w} height={o.h}
          fill="transparent"
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          aria-label={muscleLabel(o.muscle)}
          aria-pressed={selected === o.muscle}
          onClick={() => onSelect(o.muscle)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(o.muscle); } }}
        />
      ))}
      {/* مناطق لمس دائرية موسَّعة (≥44px) للعلامات الجديدة - بنفس منطق
          overlays أعلاه (تُرسَم قبل الأشكال الحقيقية، تحتها في ترتيب DOM).
          الرقبة/الساعدين/القبضة أحياناً متقاربة جداً على الرسم (الساعد
          واليد طرف صغير من الذراع) فقد تتداخل توسعتاها ببعض - هذا مقبول
          هنا تماماً كتداخل overlays فيما بينها: لا ضرر لأن الدائرة
          الملوَّنة الحقيقية الصغيرة (أسفل) تُرسَم فوقها لاحقاً فتفوز دائماً
          بأي ضغطة داخل حدودها الخاصة، والتداخل يقع فقط في مسافة ميتة بين
          العلامتين لا داخل أي منهما. */}
      {markers.map((m) => (
        <circle
          key={`marker-catch-${m.key}`}
          cx={m.cx} cy={m.cy} r={markerRadius}
          fill="transparent"
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          aria-label={muscleLabel(m.key)}
          aria-pressed={selected === m.key}
          onClick={() => onSelect(m.key)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(m.key); } }}
        />
      ))}
      {Object.entries(regions).map(([key, paths]) => {
        const isSelected = selected === key;
        return paths.map((d, i) => (
          <path
            key={`${key}${i}`}
            ref={(el) => { pathElsRef.current[`${key}::${i}`] = el; }}
            d={d}
            fill={isSelected ? SELECTED_FILL : UNSELECTED_FILL}
            stroke={isSelected ? SELECTED_STROKE : NEUTRAL_STROKE}
            strokeWidth={isSelected ? 4 : 2.5}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(key)}
          />
        ));
      })}
      {/* الدائرة الملوَّنة الحقيقية الصغيرة (فوق كل شيء) - حجم مرئي ثابت
          معقول (لا يكبر تلقائياً كالتوسعة أعلاه) حتى لا تتلامس دائرتا
          الساعدين/القبضة بصرياً رغم قرب موضعيهما التشريحي؛ الدقة الفعلية
          للضغط تأتي من طبقة اللمس الموسَّعة أدناها، لا من حجم هذه الدائرة. */}
      {markers.map((m) => {
        const isSelected = selected === m.key;
        return (
          <circle
            key={`marker-${m.key}`}
            cx={m.cx} cy={m.cy} r={visibleRadius}
            fill={isSelected ? SELECTED_FILL : UNSELECTED_FILL}
            stroke={isSelected ? SELECTED_STROKE : NEUTRAL_STROKE}
            strokeWidth={isSelected ? 4 : 2.5}
            style={{ pointerEvents: "none" }}
          />
        );
      })}
    </svg>
  );
}

// muscleLabel(key): (muscleKey) => نص محلَّي معروض كـ aria-label - يُمرَّر
// من المستدعي (يملك t() فعلاً) بدل استيراد نظام الترجمة هنا مباشرة.
export default function InteractiveMuscleDiagram({ selected, onSelect, gender = "male", muscleLabel = (k) => k, width = 220, frontLabel = "Front", backLabel = "Back" }) {
  const isFemale = gender === "female";
  const isBackMuscleSelected = selected && BACK_MUSCLES.includes(selected);
  const [view, setView] = useState(isBackMuscleSelected ? "back" : "front");

  const viewBox = view === "front"
    ? (isFemale ? FRONT_VIEWBOX_FEMALE : FRONT_VIEWBOX)
    : (isFemale ? BACK_VIEWBOX_FEMALE : BACK_VIEWBOX);
  const regions = view === "front"
    ? (isFemale ? FRONT_REGIONS_FEMALE : FRONT_REGIONS)
    : (isFemale ? BACK_REGIONS_FEMALE : BACK_REGIONS);
  const neutralPaths = view === "front"
    ? (isFemale ? FRONT_NEUTRAL_FEMALE : FRONT_NEUTRAL)
    : (isFemale ? BACK_NEUTRAL_FEMALE : BACK_NEUTRAL);
  const markers = EXTRA_MARKERS[view][isFemale ? "female" : "male"];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <View viewBox={viewBox} regions={regions} neutralPaths={neutralPaths} markers={markers} selected={selected} onSelect={onSelect} widthPx={width} muscleLabel={muscleLabel} />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => setView("front")}
          style={{
            padding: "6px 16px", borderRadius: 999, fontSize: 13, cursor: "pointer",
            border: view === "front" ? "1px solid var(--gold)" : "1px solid var(--border2)",
            background: view === "front" ? "var(--gold)" : "transparent",
            color: view === "front" ? "var(--on-accent)" : "var(--muted2)",
          }}
        >
          {frontLabel}
        </button>
        <button
          type="button"
          onClick={() => setView("back")}
          style={{
            padding: "6px 16px", borderRadius: 999, fontSize: 13, cursor: "pointer",
            border: view === "back" ? "1px solid var(--gold)" : "1px solid var(--border2)",
            background: view === "back" ? "var(--gold)" : "transparent",
            color: view === "back" ? "var(--on-accent)" : "var(--muted2)",
          }}
        >
          {backLabel}
        </button>
      </div>
    </div>
  );
}

export { FRONT_MUSCLES, BACK_MUSCLES };
