import React, { useState } from "react";
import { fmtHM, diffMinutes } from "../lib/helpers";

const THEME = {
  morning: { strong: "#E0B868", soft: "#C9A24B", tint: "rgba(224,184,104,0.05)" },
  evening: { strong: "#7FB0EE", soft: "#5E96E0", tint: "rgba(94,150,224,0.06)" },
};

export default function DayWheel({ entries, catMap, size = 224, onSelect, glow, centerLabel, centerValue, focusSessions = [], period = "morning" }) {
  const [active, setActive] = useState(null);
  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.455, rInner = size * 0.28;
  const theme = THEME[period] || THEME.morning;

  // Standard 12-hour analog face: "12" sits at the top, hours run clockwise.
  const timeToAngle = (hm) => {
    const [h, m] = hm.split(":").map(Number);
    const hourFloat = (h % 12) + m / 60;
    return hourFloat * 30 - 90;
  };
  function arcPath(a1, a2, rO, rI) {
    const toRad = (a) => (a * Math.PI) / 180;
    const p = (r, a) => [cx + r * Math.cos(toRad(a)), cy + r * Math.sin(toRad(a))];
    const [x1, y1] = p(rO, a1), [x2, y2] = p(rO, a2), [x3, y3] = p(rI, a2), [x4, y4] = p(rI, a1);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rO} ${rO} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rI} ${rI} 0 ${large} 0 ${x4} ${y4} Z`;
  }

  function handleClick(e) {
    setActive(e.id === active ? null : e.id);
    if (onSelect) onSelect(e);
  }

  const activeEntry = entries.find((e) => e.id === active) || focusSessions.find((f) => f.id === active);
  const activeIsSession = !entries.find((e) => e.id === active) && !!focusSessions.find((f) => f.id === active);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        boxShadow: glow ? `0 0 28px 2px ${glow}` : "none",
        transition: "box-shadow 0.6s ease",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={rOuter} fill={theme.tint} style={{ transition: "fill 0.6s ease" }} />
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke={theme.soft} strokeOpacity={0.35} strokeWidth={1.4} style={{ transition: "stroke 0.6s ease" }} />
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="var(--line)" strokeWidth={1} />
        {Array.from({ length: 60 }, (_, i) => i).map((i) => {
          const isMajor = i % 5 === 0;
          const a = i * 6 - 90, rad = (a * Math.PI) / 180;
          const r1 = isMajor ? rOuter + 3 : rOuter + 1, r2 = rOuter + (isMajor ? 9 : 4);
          return (
            <line
              key={i}
              x1={cx + r1 * Math.cos(rad)} y1={cy + r1 * Math.sin(rad)}
              x2={cx + r2 * Math.cos(rad)} y2={cy + r2 * Math.sin(rad)}
              stroke={isMajor ? theme.soft : "var(--border2)"}
              strokeWidth={isMajor ? 1.6 : 1}
              style={{ transition: "stroke 0.5s ease" }}
            />
          );
        })}
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
          const a = (n % 12) * 30 - 90, rad = (a * Math.PI) / 180, r = rOuter + 19;
          return (
            <text
              key={n}
              x={cx + r * Math.cos(rad)} y={cy + r * Math.sin(rad)}
              fill={theme.strong}
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="Tajawal"
              style={{ transition: "fill 0.5s ease" }}
            >
              {n}
            </text>
          );
        })}
        {entries.map((e) => {
          const a1 = timeToAngle(e.start); let a2 = timeToAngle(e.end); if (a2 <= a1) a2 += 360;
          const cat = catMap[e.catId];
          const isActive = e.id === active;
          return (
            <path
              key={e.id}
              d={arcPath(a1, a2, rOuter, rInner)}
              fill={cat ? cat.color : "#9A968F"}
              opacity={active && !isActive ? 0.4 : 0.92}
              stroke="#0A0A0B"
              strokeWidth={isActive ? 2 : 1}
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              onClick={() => handleClick(e)}
            />
          );
        })}
        {focusSessions.map((f) => {
          const a1 = timeToAngle(f.start); let a2 = timeToAngle(f.end); if (a2 <= a1) a2 += 360;
          const color = f.isStudy ? "#5FA8A0" : "#C9A24B";
          const isActive = f.id === active;
          return (
            <path
              key={f.id}
              d={arcPath(a1, a2, rOuter, rInner)}
              fill={color}
              opacity={active && !isActive ? 0.35 : 0.85}
              stroke="#0A0A0B"
              strokeWidth={isActive ? 2 : 1}
              style={{ cursor: "pointer", transition: "opacity 0.15s" }}
              onClick={() => handleClick(f)}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={rInner - 2} fill="#101012" />
      </svg>
      {activeEntry ? (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", width: rInner * 1.6 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: activeIsSession ? (activeEntry.isStudy ? "#5FA8A0" : "#C9A24B") : (catMap[activeEntry.catId]?.color || "#9A968F") }}>
            {activeIsSession ? (activeEntry.label || (activeEntry.isStudy ? "جلسة دراسة" : "جلسة تركيز")) : (catMap[activeEntry.catId]?.name || "غير محدد")}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 3 }}>{activeEntry.start} {"–"} {activeEntry.end}</div>
          <div style={{ fontSize: 11, color: "#C9A24B", marginTop: 2 }}>{fmtHM(diffMinutes(activeEntry.start, activeEntry.end))}</div>
        </div>
      ) : (centerLabel || centerValue) ? (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", transition: "opacity 0.4s ease" }}>
          {centerLabel && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted2)", letterSpacing: 0.5 }}>{centerLabel}</div>}
          {centerValue && <div style={{ fontFamily: "'Amiri', serif", fontSize: 26, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>{centerValue}</div>}
        </div>
      ) : null}
    </div>
  );
}
