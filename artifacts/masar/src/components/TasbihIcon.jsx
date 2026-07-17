import React from "react";

// A ring of prayer-bead dots, drawn with fill="currentColor" so it inherits
// the caller's active/inactive color exactly like lucide-react icons
// (emoji glyphs can't be recolored via CSS).
export default function TasbihIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="4.5" r="1.7" fill="currentColor" />
      <circle cx="17.2" cy="7" r="1.7" fill="currentColor" />
      <circle cx="19.5" cy="12.2" r="1.7" fill="currentColor" />
      <circle cx="17.2" cy="17.4" r="1.7" fill="currentColor" />
      <circle cx="12" cy="19.9" r="1.7" fill="currentColor" />
      <circle cx="6.8" cy="17.4" r="1.7" fill="currentColor" />
      <circle cx="4.5" cy="12.2" r="1.7" fill="currentColor" />
      <circle cx="6.8" cy="7" r="1.7" fill="currentColor" />
    </svg>
  );
}
