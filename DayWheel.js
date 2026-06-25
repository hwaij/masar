"use client";
import React, { useState } from "react";
import { fmtHM, diffMinutes } from "@/lib/helpers";

// عجلة اليوم: ساعة دائرية ٢٤ ساعة، كل نشاط قوس في مكانه الحقيقي.
// تفاعلية: الضغط على قوس يعرض تفاصيله في المنتصف.
export default function DayWheel({ entries, catMap, size = 224, onSelect }) {
  const [active, setActive] = useState(null);
  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.455, rInner = size * 0.28;

  const timeToAngle = (hm) => {
    const [h, m] = hm.split(":").map(Number);
    return ((h * 60 + m) / 1440) * 360 - 90;
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

  const activeEntry = entries.find((e) => e.id === active);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#222226" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="#1A1A1D" strokeWidth={1} />
        {Array.from({ length: 24 }, (_, h) => h).map((h) => {
          const a = (h / 24) * 360 - 90, rad = (a * Math.PI) / 180, isMajor = h % 6 === 0;
          const r1 = isMajor ? rOuter + 4 : rOuter + 2, r2 = rOuter + (isMajor ? 10 : 6);
          return <line key={h} x1={cx + r1 * Math.cos(rad)} y1={cy + r1 * Math.sin(rad)} x2={cx + r2 * Math.cos(rad)} y2={cy + r2 * Math.sin(rad)} stroke={isMajor ? "#5A5650" : "#2A2A2D"} strokeWidth={isMajor ? 1.4 : 1} />;
        })}
        {[0, 6, 12, 18].map((h) => {
          const a = (h / 24) * 360 - 90, rad = (a * Math.PI) / 180, r = rOuter + 20;
          return <text key={h} x={cx + r * Math.cos(rad)} y={cy + r * Math.sin(rad)} fill="#6B6863" fontSize="9" textAnchor="middle" dominantBaseline="middle" fontFamily="Tajawal">{h.toString().padStart(2, "0")}</text>;
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
        <circle cx={cx} cy={cy} r={rInner - 2} fill="#101012" />
      </svg>
      {activeEntry && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", width: rInner * 1.6 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: catMap[activeEntry.catId]?.color || "#9A968F" }}>
            {catMap[activeEntry.catId]?.name || "غير محدد"}
          </div>
          <div style={{ fontSize: 11, color: "#8A8782", marginTop: 3 }}>{activeEntry.start} – {activeEntry.end}</div>
          <div style={{ fontSize: 11, color: "#C9A24B", marginTop: 2 }}>{fmtHM(diffMinutes(activeEntry.start, activeEntry.end))}</div>
        </div>
      )}
    </div>
  );
}
