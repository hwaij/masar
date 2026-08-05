import React from "react";
import { MUSCLE_SECONDARY } from "../lib/exercises-db";

// مخطط جسم بشري مبسّط (تخطيطي بحت، غير واقعي) مُنشَأ بالكامل بالكود عبر
// SVG - لا صورة ولا رسم منسوخ من أي مصدر خارجي. كل منطقة عضلة هي شكل هندسي
// بسيط (مستطيل/دائرة/بيضاوي) فوق مخطط جسم عام واحد، بنفس أسلوب الرسوم
// التخطيطية الشائعة في المراجع الطبية/الرياضية العامة (مفهوم عام غير قابل
// للحماية، لا تصميم شركة بعينه).
//
// كل عضلة مربوطة بمشهد واحد (أمامي أو خلفي) حسب أين تُرى بوضوح أكبر -
// FRONT_MUSCLES تُعرَض على المخطط الأمامي، BACK_MUSCLES على الخلفي.
// full_body يُظلَّل بالكامل على المخطط الأمامي بشفافية أخف كإشارة "كل
// الجسم". cardio/mobility ليستا عضلة محدَّدة فلا مخطط تشريحي لهما - يُستخدَم
// أيقونة عامة بدلاً منه في مكان الاستدعاء (انظر FitnessView.jsx).
const FRONT_MUSCLES = new Set(["chest", "shoulders", "biceps", "quads", "abs"]);
const BACK_MUSCLES = new Set(["back", "triceps", "hamstrings", "glutes", "calves"]);

const GOLD = "#C9A24B";
const GOLD_SOFT = "rgba(201,162,75,0.38)";
const NEUTRAL_FILL = "var(--surface-sunken)";
const NEUTRAL_STROKE = "var(--border2)";

function Body({ children }) {
  return (
    <>
      {/* الرأس والرقبة */}
      <circle cx="30" cy="8" r="6" fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <rect x="27" y="13" width="6" height="6" fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      {/* الساعدان (محايدان دائماً - غير مصنَّفين كعضلة مستهدفة هنا) */}
      <rect x="8" y="40" width="6" height="16" rx="3" fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <rect x="46" y="40" width="6" height="16" rx="3" fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      {/* أسفل الساقين (محايد) */}
      <rect x="21" y="82" width="7" height="19" rx="3.5" fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <rect x="32" y="82" width="7" height="19" rx="3.5" fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      {/* القدمان */}
      <ellipse cx="24.5" cy="104" rx="5" ry="3" fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <ellipse cx="35.5" cy="104" rx="5" ry="3" fill={NEUTRAL_FILL} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      {children}
    </>
  );
}

// مناطق قابلة للتظليل - كل منطقة دالة تُرجع عنصر SVG بلون مُعطى، حتى تُستخدَم
// نفس الهندسة سواء بلون محايد (غير مستهدفة) أو ذهبي (أساسية) أو ذهبي فاتح
// (ثانوية).
const REGION_SHAPE = {
  chest: (fill) => <rect x="19" y="18" width="22" height="16" rx="6" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />,
  abs: (fill) => <rect x="19.5" y="33" width="21" height="16" rx="6" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />,
  back: (fill) => <rect x="19" y="18" width="22" height="31" rx="7" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />,
  shoulders: (fill) => (
    <>
      <circle cx="15.5" cy="21" r="5.2" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <circle cx="44.5" cy="21" r="5.2" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
    </>
  ),
  biceps: (fill) => (
    <>
      <rect x="8.5" y="24" width="7" height="15" rx="3.5" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <rect x="44.5" y="24" width="7" height="15" rx="3.5" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
    </>
  ),
  triceps: (fill) => (
    <>
      <rect x="8.5" y="24" width="7" height="15" rx="3.5" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <rect x="44.5" y="24" width="7" height="15" rx="3.5" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
    </>
  ),
  glutes: (fill) => <ellipse cx="30" cy="52" rx="13" ry="7" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />,
  quads: (fill) => (
    <>
      <rect x="20.5" y="56" width="8.5" height="24" rx="4" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <rect x="31" y="56" width="8.5" height="24" rx="4" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
    </>
  ),
  hamstrings: (fill) => (
    <>
      <rect x="20.5" y="56" width="8.5" height="24" rx="4" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <rect x="31" y="56" width="8.5" height="24" rx="4" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
    </>
  ),
  calves: (fill) => (
    <>
      <rect x="21" y="82" width="7" height="19" rx="3.5" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
      <rect x="32" y="82" width="7" height="19" rx="3.5" fill={fill} stroke={NEUTRAL_STROKE} strokeWidth="1" />
    </>
  ),
};

const FRONT_REGIONS = ["chest", "abs", "shoulders", "biceps", "quads"];
const BACK_REGIONS = ["back", "triceps", "glutes", "hamstrings", "calves"];

export default function MuscleDiagram({ muscle, size = 64 }) {
  const isFullBody = muscle === "full_body";
  const view = isFullBody || FRONT_MUSCLES.has(muscle) ? "front" : BACK_MUSCLES.has(muscle) ? "back" : null;
  if (!view) return null; // كارديو/مرونة: لا مخطط عضلة محدَّدة (تُعرَض أيقونة عامة بدلاً منه في مكان الاستدعاء)

  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const secondary = new Set(isFullBody ? [] : MUSCLE_SECONDARY[muscle] || []);

  return (
    <svg width={size} height={size * (110 / 60)} viewBox="0 0 60 110" fill="none">
      <Body>
        {regions.map((region) => {
          let fill = NEUTRAL_FILL;
          if (isFullBody) fill = GOLD_SOFT;
          else if (region === muscle) fill = GOLD;
          else if (secondary.has(region)) fill = GOLD_SOFT;
          return <React.Fragment key={region}>{REGION_SHAPE[region](fill)}</React.Fragment>;
        })}
      </Body>
    </svg>
  );
}
