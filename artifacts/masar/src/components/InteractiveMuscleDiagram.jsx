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
//
// الرقبة/الساعدين/قوة القبضة: كانت هذه الثلاث تُعرَض سابقاً كدوائر مُضافة
// فوق الرسم (حل مؤقت ظنّاً أن المصدر لا يوفّر مسارات تشريحية حقيقية لها).
// تبيّن أن مصدر MuscleMap يوفّر فعلياً مسارات SVG كاملة لهذه الثلاث كمجموعات
// عضلية مستقلة (neck/forearm/hands في Muscle.swift الأصلي) - في كل من
// muscleAnatomyPaths.js (FRONT_REGIONS/BACK_REGIONS) الآن، بنفس مسارات
// bezier الأصلية تماماً دون أي تعديل هندسي. لذلك أُزيلت الدوائر بالكامل:
// هذه الثلاث تُعامَل الآن تماماً كأي عضلة أخرى - جزء حقيقي من `regions`
// يُرسَم ويُلوَّن ويُحسَب له منطقة لمس عبر نفس آلية overlays أدناه، بلا أي
// كود أو مسار خاص بها إطلاقاً. ولأنها تظهر تشريحياً من الأمام والخلف معاً
// (خلافاً للباي/الترايسبس التي تظهر من جهة واحدة فقط)، فهي موجودة في كل
// من FRONT_REGIONS و BACK_REGIONS فعلياً، فتصبح قابلة للضغط في المشهدين.
const FRONT_MUSCLES = ["chest", "shoulders", "biceps", "quads", "abs", "neck", "forearms", "grip", "knee", "foot"];
const BACK_MUSCLES = ["back", "triceps", "hamstrings", "glutes", "calves", "neck", "forearms", "grip", "foot"];

// "الركبة" و"القدم" (تمارين تأهيلية - انظر joint-exercises.js) ليستا
// مجموعتين عضليتين حقيقيتين في مصدر MuscleMap (لا FRONT_REGIONS/BACK_REGIONS
// أعلاه تحويان مفتاحاً لهما)، لكن المصدر نفسه يرسم فعلاً أشكال ركبة/كاحل/
// قدم تشريحية حقيقية كأجزاء "محايدة" (FRONT_NEUTRAL/BACK_NEUTRAL - جزء من
// تكوين الجسم الكامل حول العضلات الملوَّنة، لا مجرد خط تخطيطي عام). بدل
// اختراع دائرة/شكل جديد غير موثّق، نلتقط هنا فهرس كل قطعة مسار تخص الركبة/
// القدم فعلياً من نفس مصفوفات NEUTRAL (بلا أي تعديل هندسي على المسار نفسه)
// ونرفعها لمستوى region قابل للضغط والتلوين - تماماً بنفس مبدأ ترقية
// الرقبة/الساعد/القبضة أعلاه من حل مؤقت (دوائر) لمسار تشريحي حقيقي، فرقٌ
// وحيد أن المصدر هنا سمّى هذي القطع "محايدة" أصلاً بدل تصنيفها group مستقل،
// فنقوم نحن بهذا التصنيف بأنفسنا محلياً هنا فقط (بلا لمس muscleAnatomyPaths.js
// نفسه - يبقى بلا تغيير حتى لا يتأثر أي استخدام آخر مشترك مثل MuscleDiagram.jsx
// المستخدَم كأيقونة صغيرة بعشرات الأماكن). الفهارس ثابتة يدوياً بعد قياس فعلي
// لصندوق كل قطعة مسار (getBBox) على المصدر الحقيقي - راجع الشكل المرئي للتأكد
// عند أي تحديث مستقبلي لمصدر MuscleMap.
//
// الركبة: قطعتا "غمازة" الركبة لكل رِجل (شكل صغير مباشرة أسفل نهاية الفخذ
// الأمامي quads) - موجودة في FRONT_NEUTRAL فقط (لا BACK_NEUTRAL - منطقة
// الركبة خلفياً تتداخل فعلياً مع نهاية hamstrings وبداية calves الملوَّنتين
// أصلاً، فلا فجوة محايدة متاحة هناك لإضافة ركبة منفصلة، ويبقى الضغط هناك
// يختار العضلة الحقيقية كما هو).
// القدم: قطع الكاحل/أصابع القدم لكل رِجل - موجودة في كلا NEUTRAL (أمامي
// وخلفي)، فالقدم قابلة للضغط من المشهدين معاً.
const KNEE_FOOT_NEUTRAL_INDICES = {
  front: {
    male: { knee: [0, 1, 2, 3], foot: [6, 7, 8, 9, 10, 11, 12, 13] },
    female: { knee: [0, 1, 2, 3, 4, 5], foot: [8, 9, 10, 11, 12, 13, 14, 15] },
  },
  back: {
    male: { foot: [0, 1, 2, 3] },
    female: { foot: [0, 1] },
  },
};

// يفصل مصفوفة NEUTRAL إلى (1) القطع المطلوبة مجمَّعة حسب مفتاحها الجديد
// (لدمجها في regions القابلة للضغط) و(2) الباقي (يبقى محايداً كما هو -
// مثال: الساق نفسها بين الركبة والقدم، والرأس).
function splitNeutral(neutralPaths, indexMap) {
  const claimed = new Set();
  const extracted = {};
  for (const [key, indices] of Object.entries(indexMap)) {
    extracted[key] = indices.map((i) => neutralPaths[i]);
    indices.forEach((i) => claimed.add(i));
  }
  const remaining = neutralPaths.filter((_, i) => !claimed.has(i));
  return { extracted, remaining };
}

const SELECTED_FILL = "#E05252";
const UNSELECTED_FILL = "var(--surface-sunken)";
const UNSELECTED_STROKE = "var(--border2)";
const SELECTED_STROKE = "var(--gold)";
const NEUTRAL_STROKE = "var(--border2)";
const MIN_TOUCH_PX = 44;

function View({ viewBox, regions, neutralPaths, selected, onSelect, widthPx, muscleLabel }) {
  const pathElsRef = useRef({});
  const [overlays, setOverlays] = useState([]);
  const heightPx = widthPx * (viewBox.h / viewBox.w);

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
          داخل حدوده الخاصة (انظر تعليق الخلل أعلاه). تشمل الآن الرقبة/
          الساعدين/القبضة بنفس المعالجة تماماً - لا فرق عن أي عضلة أخرى. */}
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
    </svg>
  );
}

// muscleLabel(key): (muscleKey) => نص محلَّي معروض كـ aria-label - يُمرَّر
// من المستدعي (يملك t() فعلاً) بدل استيراد نظام الترجمة هنا مباشرة.
export default function InteractiveMuscleDiagram({ selected, onSelect, gender = "male", muscleLabel = (k) => k, width = 220, frontLabel = "Front", backLabel = "Back" }) {
  const isFemale = gender === "female";
  const isBackMuscleSelected = selected && BACK_MUSCLES.includes(selected) && !FRONT_MUSCLES.includes(selected);
  const [view, setView] = useState(isBackMuscleSelected ? "back" : "front");

  const viewBox = view === "front"
    ? (isFemale ? FRONT_VIEWBOX_FEMALE : FRONT_VIEWBOX)
    : (isFemale ? BACK_VIEWBOX_FEMALE : BACK_VIEWBOX);
  const baseRegions = view === "front"
    ? (isFemale ? FRONT_REGIONS_FEMALE : FRONT_REGIONS)
    : (isFemale ? BACK_REGIONS_FEMALE : BACK_REGIONS);
  const baseNeutral = view === "front"
    ? (isFemale ? FRONT_NEUTRAL_FEMALE : FRONT_NEUTRAL)
    : (isFemale ? BACK_NEUTRAL_FEMALE : BACK_NEUTRAL);
  const genderKey = isFemale ? "female" : "male";
  const { extracted: jointRegions, remaining: neutralPaths } = splitNeutral(baseNeutral, KNEE_FOOT_NEUTRAL_INDICES[view][genderKey]);
  const regions = { ...baseRegions, ...jointRegions };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <View viewBox={viewBox} regions={regions} neutralPaths={neutralPaths} selected={selected} onSelect={onSelect} widthPx={width} muscleLabel={muscleLabel} />
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
