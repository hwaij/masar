import React from "react";
import { MUSCLE_SECONDARY } from "../lib/exercises-db";
import {
  FRONT_VIEWBOX, BACK_VIEWBOX, FRONT_REGIONS, FRONT_NEUTRAL, BACK_REGIONS, BACK_NEUTRAL,
  FRONT_VIEWBOX_FEMALE, BACK_VIEWBOX_FEMALE, FRONT_REGIONS_FEMALE, FRONT_NEUTRAL_FEMALE, BACK_REGIONS_FEMALE, BACK_NEUTRAL_FEMALE,
} from "../lib/muscleAnatomyPaths";

// مخطط جسم بشري تشريحي (لا 3D، ولا نسخ من أي تطبيق) - أشكال العضلات نفسها
// (مسارات SVG bezier) محوَّلة من مشروع MuscleMap مفتوح المصدر بترخيص MIT
// (Copyright (c) 2026 Melih Colpan، النص الكامل في THIRD_PARTY_NOTICES.md
// بجذر المشروع - راجع src/lib/muscleAnatomyPaths.js لتفاصيل ما استُخدِم
// بالضبط: بيانات الشكل الهندسي فقط، لا كود ولا تصميم واجهة). التلوين
// والتفاعل الديناميكي (أساسي/ثانوي حسب بيانات كل تمرين) من تصميم مسار
// الأصلي بالكامل، غير موجود في المصدر المفتوح.
//
// كل عضلة مربوطة بمشهد واحد (أمامي أو خلفي) حسب أين تُرى بوضوح أكبر -
// FRONT_MUSCLES تُعرَض على المخطط الأمامي، BACK_MUSCLES على الخلفي.
// full_body يُظلَّل بالكامل (كل الأشكال، عضلات ومحايدة) بشفافية أخف كإشارة
// "كل الجسم". cardio/mobility ليستا عضلة محدَّدة فلا مخطط تشريحي لهما -
// تُستخدَم أيقونة عامة بدلاً منه في مكان الاستدعاء (انظر FitnessView.jsx).
const FRONT_MUSCLES = new Set(["chest", "shoulders", "biceps", "quads", "abs"]);
const BACK_MUSCLES = new Set(["back", "triceps", "hamstrings", "glutes", "calves"]);

// أحمر للعضلة الأساسية (اتفاقية شائعة عامة في مخططات العضلات التوضيحية -
// "العضلة المستهدفة بالأحمر")، وذهبي (لون هوية مسار) للعضلة الثانوية -
// تمييز واضح بين الاثنتين بمجرد النظر.
const PRIMARY = "#E05252";
const PRIMARY_SOFT = "rgba(224,82,82,0.4)";
const SECONDARY = "#C9A24B";
const NEUTRAL_FILL = "var(--surface-sunken)";
const NEUTRAL_STROKE = "var(--border2)";

// secondaryMuscles: مصفوفة عضلات ثانوية خاصة بتمرين محدَّد (exercise.
// secondaryMuscles من exercises-db.js) - إن لم تُمرَّر، يُستخدَم احتياطياً
// المتوسط العام لكل مجموعة عضلية (MUSCLE_SECONDARY) حتى تبقى الدالة تعمل
// دون هذا الطرف الاختياري (توافق خلفي).
//
// gender: "male" (افتراضي) أو "female" - يُقرأ من healthProfile.gender في
// "أنت" (مصدر واحد للحقيقة، لا تكرار للسؤال) ويحدِّد أي من مجموعتَي بيانات
// MuscleMap (ذكر/أنثى، نفس المصدر والترخيص) تُستخدَم - التلوين والمنطق
// نفسه تماماً لكلتا المجموعتين.
export default function MuscleDiagram({ muscle, secondaryMuscles, gender = "male", size = 64 }) {
  const isFullBody = muscle === "full_body";
  const view = isFullBody || FRONT_MUSCLES.has(muscle) ? "front" : BACK_MUSCLES.has(muscle) ? "back" : null;
  if (!view) return null; // كارديو/مرونة: لا مخطط عضلة محدَّدة (تُعرَض أيقونة عامة بدلاً منه في مكان الاستدعاء)

  const isFemale = gender === "female";
  const viewBox = isFemale
    ? (view === "front" ? FRONT_VIEWBOX_FEMALE : BACK_VIEWBOX_FEMALE)
    : (view === "front" ? FRONT_VIEWBOX : BACK_VIEWBOX);
  const regions = isFemale
    ? (view === "front" ? FRONT_REGIONS_FEMALE : BACK_REGIONS_FEMALE)
    : (view === "front" ? FRONT_REGIONS : BACK_REGIONS);
  const neutralPaths = isFemale
    ? (view === "front" ? FRONT_NEUTRAL_FEMALE : BACK_NEUTRAL_FEMALE)
    : (view === "front" ? FRONT_NEUTRAL : BACK_NEUTRAL);
  const secondaryList = isFullBody ? [] : (secondaryMuscles && secondaryMuscles.length > 0 ? secondaryMuscles : MUSCLE_SECONDARY[muscle] || []);
  const secondary = new Set(secondaryList);
  const neutralFill = isFullBody ? PRIMARY_SOFT : NEUTRAL_FILL;

  return (
    <svg width={size} height={size * (viewBox.h / viewBox.w)} viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} fill="none">
      {neutralPaths.map((d, i) => (
        <path key={`n${i}`} d={d} fill={neutralFill} stroke={NEUTRAL_STROKE} strokeWidth={2.5} />
      ))}
      {Object.entries(regions).map(([key, paths]) => {
        let fill = NEUTRAL_FILL;
        if (isFullBody) fill = PRIMARY_SOFT;
        else if (key === muscle) fill = PRIMARY;
        else if (secondary.has(key)) fill = SECONDARY;
        return paths.map((d, i) => <path key={`${key}${i}`} d={d} fill={fill} stroke={NEUTRAL_STROKE} strokeWidth={2.5} />);
      })}
    </svg>
  );
}
