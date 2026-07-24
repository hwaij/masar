import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, X, Trash2, Camera, Search, Loader2, Droplet, Flame, Check, Bell,
  Hash, Sparkles, ImagePlus, ClipboardList,
} from "lucide-react";
import { store } from "../lib/store";
import { todayKey, uid, analyze, parseJsonLoose } from "../lib/helpers";
import { isActiveSubscriber } from "../lib/subscription";
import {
  fetchProductByBarcode, searchProductsByName, scaleNutrients,
  sumNutritionEntries, waterGoalCups, servingPresets,
  isSecureContextForCamera, describeCameraError,
  normalizeSearchTerm, recognizeMealFromImage, readNutritionLabel,
  labelToPer100Product, DAILY_GUIDELINES,
  UNIT_OPTIONS, unitById, unitToGrams, unitServingSize,
  scaleMicronutrients, MICRONUTRIENT_META, personalizedRDI,
} from "../lib/nutrition";
import { requestNotificationPermission } from "../lib/push";
import { S } from "./styles";

const NS = {
  hero: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, background: "linear-gradient(140deg, #5FA8A0, #3E7E78)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroTitle: { fontFamily: "'Amiri', serif", fontSize: 22, fontWeight: 700 },
  heroSub: { fontSize: 12, color: "var(--muted2)", marginTop: 2, lineHeight: 1.5 },
  summaryCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 14px", marginBottom: 14 },
  summaryTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  summaryCalories: { fontFamily: "'Amiri', serif", fontSize: 26, fontWeight: 700, color: "var(--gold)" },
  summaryTee: { fontSize: 12, color: "var(--muted2)" },
  barTrack: { height: 8, borderRadius: 4, background: "var(--surface-sunken)", overflow: "hidden", marginBottom: 12 },
  barFill: { height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #5FA8A0, #C9A24B)", transition: "width 0.4s ease" },
  macrosRow: { display: "flex", gap: 8 },
  macroChip: { flex: 1, textAlign: "center", background: "var(--surface-sunken)", borderRadius: 10, padding: "8px 4px" },
  macroValue: { fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  macroLabel: { fontSize: 10.5, color: "var(--muted2)", marginTop: 2 },
  waterCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px 14px", marginBottom: 14 },
  waterHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  waterTitle: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "var(--muted2)" },
  waterCount: { fontSize: 13, color: "var(--ink)", fontWeight: 700 },
  waterAddBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "rgba(95,168,160,0.12)", border: "1px solid rgba(95,168,160,0.35)", color: "#5FA8A0", borderRadius: 12, padding: "10px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  addFoodBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 16 },
  logHead: { fontSize: 13, fontWeight: 700, color: "var(--muted2)", marginBottom: 10 },
  logItem: { display: "flex", alignItems: "center", gap: 10, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px", marginBottom: 8 },
  logItemName: { fontSize: 13.5, fontWeight: 700, color: "var(--ink)" },
  logItemMeta: { fontSize: 11, color: "var(--muted2)", marginTop: 2 },
  logItemCalories: { fontSize: 13, fontWeight: 700, color: "var(--gold)", whiteSpace: "nowrap" },
  deleteBtn: { background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", padding: 4, flexShrink: 0 },
  emptyHint: { fontSize: 12.5, color: "var(--muted2)", textAlign: "center", padding: "20px 0" },
  overlay: { position: "fixed", inset: 0, background: "rgba(6,6,7,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 },
  sheet: { width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", background: "var(--panel)", borderRadius: "20px 20px 0 0", padding: "16px 16px 24px", border: "1px solid var(--line)", borderBottom: "none" },
  sheetHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sheetTitle: { fontSize: 15.5, fontWeight: 700, color: "var(--ink)" },
  closeBtn: { background: "var(--surface-sunken)", border: "none", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted2)", cursor: "pointer" },
  chooserGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  chooserBtn: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", minHeight: 96, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 14, padding: "16px 10px", fontSize: 13, fontWeight: 700, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", textAlign: "center", lineHeight: 1.3 },
  chooserBtnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  chooserIcon: { width: 40, height: 40, borderRadius: 12, background: "rgba(201,162,75,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)", flexShrink: 0 },
  chooserBadge: { fontSize: 9.5, fontWeight: 700, color: "var(--gold)", background: "rgba(201,162,75,0.14)", borderRadius: 20, padding: "2px 8px" },
  scannerBox: { width: "100%", borderRadius: 14, overflow: "hidden", background: "#000", marginBottom: 12, minHeight: 220 },
  scanHint: { fontSize: 12, color: "var(--muted2)", textAlign: "center", marginBottom: 10 },
  errorText: { fontSize: 12.5, color: "#D17B5F", background: "rgba(209,123,95,0.1)", border: "1px solid rgba(209,123,95,0.3)", borderRadius: 10, padding: "9px 11px", marginBottom: 12, lineHeight: 1.6 },
  searchRow: { display: "flex", gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 10, padding: "10px 12px", color: "var(--ink)", fontSize: 14, fontFamily: "inherit" },
  searchBtn: { background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 10, width: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
  resultRow: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 12, padding: "10px 12px", marginBottom: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "right", color: "inherit" },
  resultImg: { width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "var(--surface-raised)" },
  resultName: { fontSize: 13, fontWeight: 700, color: "var(--ink)" },
  resultMeta: { fontSize: 11, color: "var(--muted2)", marginTop: 2 },
  productHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  productImg: { width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0, background: "var(--surface-sunken)" },
  productName: { fontSize: 15, fontWeight: 700, color: "var(--ink)" },
  productMeta: { fontSize: 12, color: "var(--muted2)", marginTop: 2 },
  presetRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6, marginBottom: 4 },
  presetChip: { border: "1px solid var(--border2)", borderRadius: 20, padding: "6px 12px", fontSize: 12, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "inherit", background: "transparent" },
  presetChipActive: { border: "1px solid var(--gold)", background: "rgba(201,162,75,0.12)", color: "var(--gold)", fontWeight: 700 },
  previewGrid: { display: "flex", gap: 8, margin: "12px 0" },
  previewChip: { flex: 1, textAlign: "center", background: "var(--surface-sunken)", borderRadius: 10, padding: "8px 4px" },
  notFoundNote: { fontSize: 12.5, color: "var(--muted2)", lineHeight: 1.7, marginBottom: 12 },
  notifBanner: { display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(201,162,75,0.08)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 14, padding: "12px 12px", marginBottom: 14 },
  notifText: { fontSize: 12.5, color: "var(--ink)", lineHeight: 1.7, marginBottom: 8 },
  notifRow: { display: "flex", gap: 8 },
  notifBtn: { flex: 1, background: "var(--gold)", color: "var(--bg)", border: "none", borderRadius: 10, padding: "8px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  notifDismissBtn: { flex: 1, background: "transparent", border: "1px solid var(--border2)", color: "var(--muted2)", borderRadius: 10, padding: "8px 0", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },

  servingLabel: { fontSize: 12.5, color: "var(--muted2)", marginBottom: 8 },
  multiplierRow: { display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  multiplierBtn: { minWidth: 44, minHeight: 44, borderRadius: 12, border: "1px solid var(--border2)", background: "var(--surface-sunken)", color: "var(--ink)", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  multiplierBtnActive: { border: "1px solid var(--gold)", background: "rgba(201,162,75,0.14)", color: "var(--gold)" },
  multiplierInput: { width: 60, minHeight: 44, borderRadius: 12, border: "1px solid var(--border2)", background: "var(--surface-sunken)", color: "var(--ink)", fontSize: 15, fontWeight: 700, textAlign: "center", fontFamily: "inherit" },

  guidelineRow: { marginBottom: 12 },
  guidelineHead: { display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted2)", marginBottom: 5 },
  guidelineName: { fontWeight: 700, color: "var(--ink-soft)" },
  microHead: { fontSize: 13, fontWeight: 700, color: "var(--muted2)", marginTop: 18, marginBottom: 10 },

  disclaimerBox: { display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(201,162,75,0.08)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 12, padding: "10px 11px", marginBottom: 12, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.7 },
  photoDropZone: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", minHeight: 140, background: "var(--surface-sunken)", border: "1.5px dashed var(--border2)", borderRadius: 14, cursor: "pointer", color: "var(--muted2)", fontSize: 13, fontWeight: 600, marginBottom: 12 },
  photoPreview: { width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 14, marginBottom: 12 },
  itemsChipsRow: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  itemChip: { fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 20, padding: "5px 12px" },
  editableGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 },

  aiAnalysisCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px 14px", marginBottom: 14 },
  aiAnalysisHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  aiAnalysisTitle: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "var(--muted2)" },
  aiAnalysisBtn: { display: "flex", alignItems: "center", gap: 6, background: "rgba(201,162,75,0.12)", border: "1px solid rgba(201,162,75,0.35)", color: "var(--gold)", borderRadius: 20, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 44 },
  aiAnalysisText: { fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.8 },

  compactUpsell: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, padding: "10px 6px" },
  compactUpsellTitle: { fontSize: 13, fontWeight: 700, color: "var(--ink)" },
  compactUpsellMsg: { fontSize: 11.5, color: "var(--muted2)", lineHeight: 1.6 },

  unitRow: { display: "flex", gap: 10, marginBottom: 10 },
  unitSelect: { flex: 1, minHeight: 44, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 10, padding: "0 10px", color: "var(--ink)", fontSize: 13.5, fontFamily: "inherit" },
  unitQtyInput: { width: 90, minHeight: 44, background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 10, padding: "0 10px", color: "var(--ink)", fontSize: 14, fontFamily: "inherit", textAlign: "center" },
  unitApproxNote: { fontSize: 11.5, color: "var(--muted2)", lineHeight: 1.6, marginTop: -4, marginBottom: 10 },

  ringsRow: { display: "flex", justifyContent: "space-between", gap: 6, marginTop: 16, marginBottom: 2 },
  ringItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 },
  ringSvgWrap: { position: "relative", width: 64, height: 64 },
  ringPercent: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" },
  ringLabel: { fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" },
  ringValueText: { fontSize: 9.5, color: "var(--muted2)" },
};

const SUBSCRIBE_URL = "https://www.instagram.com/hjmasar";

const BARCODE_FORMATS_SUPPORT_ID = "masar-barcode-scanner-region";

function BarcodeScannerModal({ onDetected, onClose }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  // html5-qrcode's success callback keeps firing every scanned frame while
  // the camera stays open (unmount + stop() happens asynchronously after
  // the first detection), so guard against handling the same/next barcode
  // twice before the component actually tears down.
  const firedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let instance = null;
    (async () => {
      if (!isSecureContextForCamera()) {
        setError("الكاميرا تحتاج اتصالاً آمناً (HTTPS) لتعمل. تأكد من فتح الموقع عبر رابط https:// وأعد المحاولة.");
        return;
      }
      // نطلب الإذن صراحةً هنا أولاً (بدل ترك html5-qrcode يطلبه ضمنياً)
      // حتى تظهر نافذة إذن الكاميرا الأصلية من المتصفح/النظام بوضوح
      // للمستخدم — الاعتماد على طلب المكتبة الداخلي كان يفشل بصمت أحياناً
      // في سياق تطبيق PWA مثبّت على الشاشة الرئيسية (خاصة على iOS)، فتظهر
      // رسالة فشل عامة دون أن يرى المستخدم أي طلب إذن أصلاً.
      let permissionStream;
      try {
        permissionStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch (err) {
        console.error("[nutrition] camera permission request failed:", err);
        if (!cancelled) setError(describeCameraError(err));
        return;
      }
      // الإذن مُنح فعلاً؛ نُطلق البث المؤقت فوراً لأن html5-qrcode سيفتح
      // بثّه المُدار الخاص به في السطر التالي.
      permissionStream.getTracks().forEach((t) => t.stop());
      if (cancelled) return;

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;
        instance = new Html5Qrcode(BARCODE_FORMATS_SUPPORT_ID, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decodedText) => {
            if (firedRef.current) return;
            firedRef.current = true;
            onDetected(decodedText);
          },
          () => {},
        );
      } catch (e) {
        console.error("[nutrition] camera start failed:", e);
        if (!cancelled) setError(describeCameraError(e));
      }
    })();
    return () => {
      cancelled = true;
      if (instance) {
        instance.stop().then(() => instance.clear()).catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div style={NS.overlay} className="overlay-in" onClick={onClose}>
      <div style={NS.sheet} className="sheet-in" onClick={(e) => e.stopPropagation()}>
        <div style={NS.sheetHead}>
          <span style={NS.sheetTitle}>مسح الباركود</span>
          <button onClick={onClose} style={NS.closeBtn}><X size={16} /></button>
        </div>
        {error ? (
          <div style={NS.errorText}>{error}</div>
        ) : (
          <p style={NS.scanHint}>وجّه الكاميرا نحو باركود المنتج</p>
        )}
        <div id={BARCODE_FORMATS_SUPPORT_ID} style={NS.scannerBox} />
      </div>
    </div>
  );
}

// بطاقة ترقية مصغّرة داخل قسم التغذية نفسه (لا يوجد UpsellCard مُصدَّرة
// من مكان مشترك بعد - هذا المكوّن يعيش هنا فقط ولا يُستخدم في أي قسم آخر).
function MiniUpsell({ title, message }) {
  return (
    <div style={NS.compactUpsell}>
      <Sparkles size={22} color="var(--gold)" />
      <div style={NS.compactUpsellTitle}>{title}</div>
      <p style={NS.compactUpsellMsg}>{message}</p>
      <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer" style={{ ...NS.notifBtn, flex: "none", padding: "9px 18px", textDecoration: "none" }}>اشترك الآن</a>
    </div>
  );
}

// إدخال الباركود يدوياً - بديل مباشر للمسح بالكاميرا، يستخدم نفس منطق
// البحث بالباركود الموجود (onSubmit هو نفس handleBarcodeDetected) دون أي
// تكرار للكود.
function ManualBarcodeEntry({ onSubmit }) {
  const [value, setValue] = useState("");
  return (
    <>
      <p style={NS.scanHint}>اكتب رقم الباركود المطبوع على المنتج</p>
      <div style={NS.searchRow}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter" && value) onSubmit(value); }}
          placeholder="مثال: 6291041500213"
          inputMode="numeric"
          style={NS.searchInput}
          autoFocus
        />
        <button onClick={() => value && onSubmit(value)} disabled={!value} style={NS.searchBtn}><Search size={16} /></button>
      </div>
    </>
  );
}

// دائرة تقدم واحدة (SVG). تبدأ الحيوية من صفر عند أول ظهور (useEffect +
// setTimeout قصير) ثم تتحرك بانتقال CSS سلس نحو النسبة الفعلية - وبما أن
// "percent" prop يتغيّر تلقائياً عند إضافة طعام جديد (يُعاد حساب المجاميع)،
// نفس آلية الحركة تعمل تلقائياً لأي تحديث لاحق أيضاً، لا فقط عند التحميل.
function ProgressRing({ percent, color, label, valueText, size = 64, strokeWidth = 7 }) {
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
    <div style={NS.ringItem}>
      <div style={NS.ringSvgWrap}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-sunken)" strokeWidth={strokeWidth} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div style={NS.ringPercent}>{displayPercent}%</div>
      </div>
      <div style={NS.ringLabel}>{label}</div>
      <div style={NS.ringValueText}>{valueText}</div>
    </div>
  );
}

// أربع دوائر ملونة (بروتين/كارب/دهون/صوديوم) بجانب بطاقة الاحتياج
// الخطية الموجودة أصلاً - عرض بصري إضافي مكمّل، لا بديل يحذف الأرقام
// الموجودة. ألوان مميّزة لكل ماكرو (الصوديوم بنفس لون شريطه الخطي أعلاه
// حتى يبقى "الصوديوم = أحمر" متسقاً في كل الواجهة).
function MacroRings({ totals, macroTargets }) {
  const rings = [
    { key: "protein", label: "بروتين", color: "#C9A24B", value: totals.protein, target: macroTargets?.protein, unit: "غ" },
    { key: "carbs", label: "كارب", color: "#4C8BF5", value: totals.carbs, target: macroTargets?.carbs, unit: "غ" },
    { key: "fat", label: "دهون", color: "#E8B93E", value: totals.fat, target: macroTargets?.fat, unit: "غ" },
    { key: "sodium", label: "صوديوم", color: "#D17B5F", value: totals.sodium, target: DAILY_GUIDELINES.sodiumMaxMg, unit: "مغ" },
  ];
  return (
    <div style={NS.ringsRow}>
      {rings.map((r) => {
        const percent = r.target ? (r.value / r.target) * 100 : 0;
        const valueText = r.target ? `${Math.round(r.value)}/${Math.round(r.target)}${r.unit}` : `${Math.round(r.value)}${r.unit}`;
        return <ProgressRing key={r.key} percent={percent} color={r.color} label={r.label} valueText={valueText} />;
      })}
    </div>
  );
}

// تنسيق عرض بسيط للكميات (حصة/كمية بأي وحدة): يزيل الكسور العشرية الزائدة
// (250 لا 250.00) بينما يحتفظ بمنزلتين عند الحاجة الفعلية (1.25 ملعقة).
function fmtQty(n) {
  const r = Math.round((n || 0) * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

function ConfirmQuantityCard({ product, source, onAdd, onCancel }) {
  const hasServing = !!product.servingGrams;
  const [unit, setUnit] = useState("g");
  const [multiplier, setMultiplier] = useState(1);
  const [grams, setGrams] = useState(hasServing ? Math.round(product.servingGrams) : 100);
  const [unitQty, setUnitQty] = useState(1);
  // تُطبَّق الحصص (×1/×2/...) على وضع "غرام" فقط عندما يملك المنتج حجم حصة
  // معروفاً (سلوك أصلي محفوظ كما هو). لكل الوحدات الأخرى (مل/لتر/كوب/ملعقة/
  // قطعة/حصة/كيلوغرام...)، "الحصة الواحدة" بهذه الوحدة تُحسب دائماً عبر
  // unitServingSize (حصة المنتج الحقيقية مُحوَّلة لهذه الوحدة إن عُرفت، أو
  // وحدة طبيعية واحدة كافتراض معقول خلاف ذلك) - فأزرار ×1..×5 تعمل بنفس
  // السهولة والمنطق في كل وحدة، لا الغرام فقط.
  useEffect(() => {
    if (unit === "g") {
      if (hasServing) setGrams(Math.round(product.servingGrams * multiplier));
    } else {
      setUnitQty(Math.round(unitServingSize(unit, product.servingGrams) * multiplier * 100) / 100);
    }
  }, [multiplier, hasServing, product.servingGrams, unit]);
  const presets = servingPresets(product.servingGrams);
  // أي وحدة غير الغرام تُحوَّل داخلياً لغرام/مليلتر مكافئ (تقدير تقريبي
  // لغير الأوزان المباشرة) قبل حساب القيم الغذائية، حتى يبقى scaleNutrients
  // بمعامل غرام/100 وحيد بغض النظر عن الوحدة التي اختارها المستخدم.
  const gramsEquivalent = unit === "g" ? grams : unitToGrams(unit, unitQty, product.servingGrams);
  const preview = scaleNutrients(product, gramsEquivalent || 0);
  const unitMeta = unitById(unit);
  const unitBaseQty = unitServingSize(unit, product.servingGrams);

  return (
    <>
      <div style={NS.productHead}>
        {product.imageUrl && <img src={product.imageUrl} alt="" style={NS.productImg} />}
        <div>
          <div style={NS.productName}>{product.name}</div>
          <div style={NS.productMeta}>{product.caloriesPer100g} سعرة / 100غم</div>
        </div>
      </div>
      <label style={S.label}>وحدة القياس</label>
      <div style={NS.unitRow}>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={NS.unitSelect}>
          {UNIT_OPTIONS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </div>
      {unit === "g" ? (
        <>
          {hasServing && (
            <>
              <label style={S.label}>عدد الحصص (كل حصة {Math.round(product.servingGrams)} غم)</label>
              <div style={NS.multiplierRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setMultiplier(n)} style={{ ...NS.multiplierBtn, ...(multiplier === n ? NS.multiplierBtnActive : {}) }}>×{n}</button>
                ))}
                <input
                  type="number" inputMode="decimal" value={multiplier}
                  onChange={(e) => setMultiplier(Math.max(0.25, Number(e.target.value) || 0))}
                  style={NS.multiplierInput}
                />
              </div>
            </>
          )}
          <label style={S.label}>{hasServing ? "أو عدّل الكمية بالغرام مباشرة" : "الكمية (غم)"}</label>
          <input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(Number(e.target.value))} style={S.input} />
          {!hasServing && (
            <div style={NS.presetRow}>
              {presets.map((p) => (
                <button key={p.label} onClick={() => setGrams(p.grams)} style={{ ...NS.presetChip, ...(grams === p.grams ? NS.presetChipActive : {}) }}>{p.label}</button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <label style={S.label}>عدد الحصص (كل حصة {fmtQty(unitBaseQty)} {unitMeta.label})</label>
          <div style={NS.multiplierRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setMultiplier(n)} style={{ ...NS.multiplierBtn, ...(multiplier === n ? NS.multiplierBtnActive : {}) }}>×{n}</button>
            ))}
            <input
              type="number" inputMode="decimal" value={multiplier}
              onChange={(e) => setMultiplier(Math.max(0.25, Number(e.target.value) || 0))}
              style={NS.multiplierInput}
            />
          </div>
          <label style={S.label}>أو عدّل الكمية بـ{unitMeta.label} مباشرة</label>
          <input type="number" inputMode="decimal" value={unitQty} onChange={(e) => setUnitQty(Number(e.target.value) || 0)} style={S.input} />
          {unitMeta.approx && <p style={NS.unitApproxNote}>تحويل تقريبي إلى غرام لحساب القيم الغذائية (وحدة غير وزنية).</p>}
        </>
      )}
      <div style={NS.previewGrid}>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.calories}</div><div style={NS.macroLabel}>سعرة</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.protein}غ</div><div style={NS.macroLabel}>بروتين</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.carbs}غ</div><div style={NS.macroLabel}>كارب</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.fat}غ</div><div style={NS.macroLabel}>دهون</div></div>
      </div>
      <div style={NS.previewGrid}>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.fiber}غ</div><div style={NS.macroLabel}>ألياف</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.sugar}غ</div><div style={NS.macroLabel}>سكر</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.sodium}مغ</div><div style={NS.macroLabel}>صوديوم</div></div>
      </div>
      <button
        onClick={() => onAdd({
          id: uid(), foodName: product.name, ...preview,
          unit,
          servingInfo: unit === "g"
            ? (hasServing ? `${multiplier} × ${Math.round(product.servingGrams)}غم` : `${grams} غم`)
            : `${fmtQty(unitQty)} ${unitMeta.label}`,
          source,
          micronutrients: scaleMicronutrients(product.micronutrientsPer100g, gramsEquivalent || 0),
        })}
        style={S.saveBtn}
        disabled={!gramsEquivalent || gramsEquivalent <= 0}
      >
        إضافة إلى سجل اليوم
      </button>
      <button onClick={onCancel} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>رجوع</button>
    </>
  );
}

function ManualEntryForm({ barcode, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    foodName: "", brand: "", country: "", servingSizeLabel: "", unit: "g", qty: "",
    calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", sodium: "", imageUrl: "",
  });
  const [multiplier, setMultiplier] = useState(1);
  function change(field, val) { setDraft((d) => ({ ...d, [field]: val })); }
  const valid = draft.foodName.trim() && Number(draft.calories) > 0;
  const unitMeta = unitById(draft.unit);
  // لا يوجد حجم حصة حقيقي معروف بعد لهذا الطعام الجديد (لم يُبنَ من باركود)،
  // فـ"الحصة الواحدة" هنا تعني وحدة طبيعية واحدة دائماً (1 كوب/ملعقة/قطعة/
  // غرام...) - نفس ما تُرجعه unitServingSize عند غياب servingGrams. أزرار
  // ×1..×5 تملأ خانة الكمية تلقائياً فقط عند الضغط عليها صراحة؛ التبديل بين
  // الوحدات وحده لا يغيّر رقماً كتبه المستخدم يدوياً بالفعل.
  function applyMultiplier(n) {
    setMultiplier(n);
    change("qty", String(fmtQty(n)));
  }

  return (
    <>
      {barcode && <p style={NS.notFoundNote}>لم يُعثر على هذا المنتج ({barcode}) في قاعدة بيانات الأطعمة. أضِفه يدوياً وسيتوفّر تلقائياً لأي مستخدم آخر يبحث بنفس الباركود لاحقاً.</p>}
      <label style={S.label}>اسم الطعام</label>
      <input value={draft.foodName} onChange={(e) => change("foodName", e.target.value)} placeholder="مثال: تمر سكري" style={S.input} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>العلامة التجارية</label>
          <input value={draft.brand} onChange={(e) => change("brand", e.target.value)} placeholder="اختياري" style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>الدولة</label>
          <input value={draft.country} onChange={(e) => change("country", e.target.value)} placeholder="اختياري" style={S.input} />
        </div>
      </div>
      <label style={S.label}>وصف حجم الحصة (اختياري)</label>
      <input value={draft.servingSizeLabel} onChange={(e) => change("servingSizeLabel", e.target.value)} placeholder="مثال: علبة 35غم" style={S.input} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>وحدة القياس</label>
          <select value={draft.unit} onChange={(e) => change("unit", e.target.value)} style={NS.unitSelect}>
            {UNIT_OPTIONS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>الكمية المُستهلكة الآن ({unitMeta.label})</label>
          <input type="number" inputMode="decimal" value={draft.qty} onChange={(e) => change("qty", e.target.value)} placeholder="35" style={S.input} />
        </div>
      </div>
      <label style={S.label}>عدد الحصص (كل حصة 1 {unitMeta.label})</label>
      <div style={NS.multiplierRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => applyMultiplier(n)} style={{ ...NS.multiplierBtn, ...(multiplier === n ? NS.multiplierBtnActive : {}) }}>×{n}</button>
        ))}
        <input
          type="number" inputMode="decimal" value={multiplier}
          onChange={(e) => applyMultiplier(Math.max(0.25, Number(e.target.value) || 0))}
          style={NS.multiplierInput}
        />
      </div>
      {unitMeta.approx && <p style={NS.unitApproxNote}>تحويل تقريبي إلى غرام (وحدة غير وزنية).</p>}
      <p style={{ ...S.label, marginTop: 16, marginBottom: 4 }}>القيم الغذائية (لكل 100غم)</p>
      <label style={S.label}>السعرات الحرارية</label>
      <input type="number" inputMode="decimal" value={draft.calories} onChange={(e) => change("calories", e.target.value)} placeholder="مثال: 250" style={S.input} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>بروتين (غ)</label>
          <input type="number" inputMode="decimal" value={draft.protein} onChange={(e) => change("protein", e.target.value)} placeholder="0" style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>كارب (غ)</label>
          <input type="number" inputMode="decimal" value={draft.carbs} onChange={(e) => change("carbs", e.target.value)} placeholder="0" style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>دهون (غ)</label>
          <input type="number" inputMode="decimal" value={draft.fat} onChange={(e) => change("fat", e.target.value)} placeholder="0" style={S.input} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>ألياف (غ)</label>
          <input type="number" inputMode="decimal" value={draft.fiber} onChange={(e) => change("fiber", e.target.value)} placeholder="0" style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>سكر (غ)</label>
          <input type="number" inputMode="decimal" value={draft.sugar} onChange={(e) => change("sugar", e.target.value)} placeholder="0" style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>صوديوم (مغم)</label>
          <input type="number" inputMode="decimal" value={draft.sodium} onChange={(e) => change("sodium", e.target.value)} placeholder="0" style={S.input} />
        </div>
      </div>
      <label style={S.label}>رابط صورة المنتج (اختياري)</label>
      <input value={draft.imageUrl} onChange={(e) => change("imageUrl", e.target.value)} placeholder="https://..." style={S.input} />
      <button
        onClick={() => {
          const per100 = {
            calories: Number(draft.calories) || 0, protein: Number(draft.protein) || 0,
            carbs: Number(draft.carbs) || 0, fat: Number(draft.fat) || 0,
            fiber: Number(draft.fiber) || 0, sugar: Number(draft.sugar) || 0, sodium: Number(draft.sodium) || 0,
          };
          // الكمية المُدخلة قد تكون بأي وحدة (ملعقة، كوب، قطعة...)؛ تُحوَّل هنا
          // إلى غرام مكافئ فقط لحساب القيم الغذائية والحفظ - القيم لكل 100غم
          // (productPer100) تبقى كما أدخلها المستخدم دائماً بالغرام (المعيار
          // المعروف لبطاقات التغذية)، بغض النظر عن وحدة "الكمية المُستهلكة".
          const grams = unitToGrams(draft.unit, draft.qty, null) || 100;
          const factor = grams / 100;
          onSave({
            id: uid(), foodName: draft.foodName.trim(),
            calories: Math.round(per100.calories * factor), protein: Math.round(per100.protein * factor * 10) / 10,
            carbs: Math.round(per100.carbs * factor * 10) / 10, fat: Math.round(per100.fat * factor * 10) / 10,
            fiber: Math.round(per100.fiber * factor * 10) / 10, sugar: Math.round(per100.sugar * factor * 10) / 10,
            sodium: Math.round(per100.sodium * factor),
            unit: draft.unit,
            servingInfo: draft.servingSizeLabel.trim() || `${draft.qty || grams} ${unitMeta.label}`, source: "manual", barcode,
            // بيانات المنتج الكاملة (لكل 100غم) - تُحفظ في custom_foods إن
            // كان هناك باركود، حتى تُستخدم صحيحة لأي كمية لاحقة، لا فقط
            // بنفس كمية هذه المرة. servingGrams يُحفظ دائماً بالغرام الحقيقي
            // (بعد التحويل) حتى يبقى مرجع المنتج المشترك متسقاً بغض النظر
            // عن الوحدة التي فكّر بها هذا المستخدم تحديداً.
            productPer100: per100, brand: draft.brand.trim(), country: draft.country.trim(),
            servingSizeLabel: draft.servingSizeLabel.trim(), servingGrams: grams || null,
            imageUrl: draft.imageUrl.trim(),
          });
        }}
        style={S.saveBtn}
        disabled={!valid}
      >
        حفظ وإضافة إلى سجل اليوم
      </button>
      <button onClick={onCancel} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>رجوع</button>
    </>
  );
}

function SearchPanel({ onPick, onManual }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  // يحرس ضد سباق حالات بين طلبات بحث متتالية: لو ضغط المستخدم بحث/Enter
  // أكثر من مرة بسرعة (مثلاً عدّل النص وبحث من جديد قبل عودة الرد الأول)،
  // كانت النتيجة القديمة قد تصل بعد الجديدة وتكتب فوقها فيبدو البحث وكأنه
  // يحتاج إعادة محاولة. كل نداء لـ runSearch يأخذ رقماً تسلسلياً، ولا يُطبَّق
  // أي رد لم يعد رقمه الأحدث المسجَّل وقت وصوله.
  const requestIdRef = useRef(0);

  // بحث "ذكي": يبحث مباشرة أولاً، وإن جاءت النتائج فارغة يبحث عن مرادف
  // (عربي أو إنجليزي) في جدول food_synonyms ويعيد المحاولة بالمصطلح
  // القانوني المقابل - هذا ما يجعل البحث بالعربي يعمل فعلياً حتى إن كان
  // اسم المنتج في Open Food Facts مخزَّناً بالإنجليزي (الغالب).
  async function runSearch() {
    const q = normalizeSearchTerm(query);
    if (!q) return;
    const requestId = ++requestIdRef.current;
    setLoading(true); setError(null); setSearched(true);
    const res = await searchProductsByName(q);
    if (requestId !== requestIdRef.current) return; // رد متأخر لطلب سابق، تجاهله
    if (!res.ok) { setLoading(false); setError(res.error); setResults([]); return; }
    if (res.products.length > 0) { setLoading(false); setResults(res.products); return; }
    const canonical = await store.lookupFoodSynonym(q);
    if (requestId !== requestIdRef.current) return;
    if (canonical && normalizeSearchTerm(canonical) !== q) {
      const retry = await searchProductsByName(canonical);
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      setResults(retry.ok ? retry.products : []);
      return;
    }
    setLoading(false);
    setResults([]);
  }

  return (
    <>
      <div style={NS.searchRow}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
          placeholder="اكتب اسم الطعام..."
          style={NS.searchInput}
        />
        <button onClick={runSearch} style={NS.searchBtn}>{loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}</button>
      </div>
      {error && <div style={NS.errorText}>{error}</div>}
      {!loading && searched && !error && results.length === 0 && (
        <p style={NS.notFoundNote}>لم يُعثر على نتائج. جرّب اسماً آخر أو أضف الطعام يدوياً.</p>
      )}
      {results.map((p) => (
        <button key={p.barcode + p.name} onClick={() => onPick(p)} style={NS.resultRow}>
          {p.imageUrl ? <img src={p.imageUrl} alt="" style={NS.resultImg} /> : <div style={NS.resultImg} />}
          <div>
            <div style={NS.resultName}>{p.name}</div>
            <div style={NS.resultMeta}>{p.caloriesPer100g} سعرة / 100غم</div>
          </div>
        </button>
      ))}
      <button onClick={onManual} style={{ ...S.exportBtn, marginTop: 4 }}>إضافة يدوية بدلاً من ذلك</button>
    </>
  );
}

// تصوير الوجبة بالذكاء الاصطناعي - يستدعي recognizeMealFromImage المعزولة
// (lib/nutrition.js) فقط، ولا يعرف شيئاً عن كون المزوّد الفعلي Gemini من
// عدمه. كل قيمة في النتيجة قابلة للتعديل يدوياً قبل الحفظ، والتنبيه أسفل
// الحقول ثابت لا يمكن إغلاقه.
function AIPhotoPanel({ onSave, onManual }) {
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { items, calories, protein, carbs, fat } - القيم المعروضة/القابلة للتعديل حالياً
  const [baseResult, setBaseResult] = useState(null); // نفس شكل result، لكن ثابت: تقدير الذكاء الاصطناعي الخام لحصة واحدة (١×) كما وصل، يُستخدم أساساً لإعادة حساب عدد الحصص دون تراكم أخطاء تقريب
  const [multiplier, setMultiplier] = useState(1);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setError(null);
    setResult(null);
    setBaseResult(null);
    setMultiplier(1);
    setAnalyzing(true);
    const res = await recognizeMealFromImage(file);
    setAnalyzing(false);
    if (!res.ok) { setError(res.error); return; }
    const initial = { items: res.items, calories: res.calories, protein: res.protein, carbs: res.carbs, fat: res.fat };
    setResult(initial);
    setBaseResult(initial);
  }

  function change(field, val) { setResult((r) => ({ ...r, [field]: val })); }
  // عدد الحصص هنا يعني "كم مرة مثل ما في الصورة" - لا وحدة فعلية (غم/مل/كوب)
  // معقولة لصورة وجبة مختلطة، فتُعامَل الصورة كاملة كـ"حصة واحدة" وتُضرب كل
  // قيمها الأربع بعدد الحصص المختار، بنفس سهولة أزرار ×1..×5 في باقي طرق
  // الإضافة. يُعاد الحساب دائماً من baseResult (تقدير الحصة الواحدة الأصلي)
  // لا من القيم المعروضة حالياً، تفادياً لتراكم أخطاء تقريب عبر ضغطات متكررة.
  function applyMultiplier(n) {
    setMultiplier(n);
    if (!baseResult) return;
    setResult({
      items: baseResult.items,
      calories: Math.round((baseResult.calories || 0) * n),
      protein: Math.round((baseResult.protein || 0) * n * 10) / 10,
      carbs: Math.round((baseResult.carbs || 0) * n * 10) / 10,
      fat: Math.round((baseResult.fat || 0) * n * 10) / 10,
    });
  }

  return (
    <>
      {/* حقلان منفصلان عمداً: capture="environment" على الأول يفتح الكاميرا
          مباشرة على أغلب متصفحات الجوال (لا يعرض خيار المعرض إطلاقاً رغم
          النص القديم الذي كان يَعِد به)، بينما الثاني بلا capture يفتح
          منتقي الملفات/المعرض فعلياً. */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      {!preview && (
        <div style={NS.chooserGrid}>
          <button onClick={() => cameraInputRef.current?.click()} style={NS.chooserBtn}>
            <span style={NS.chooserIcon}><Camera size={19} /></span>
            التقط صورة
          </button>
          <button onClick={() => galleryInputRef.current?.click()} style={NS.chooserBtn}>
            <span style={NS.chooserIcon}><ImagePlus size={19} /></span>
            اختر من المعرض
          </button>
        </div>
      )}
      {preview && <img src={preview} alt="" style={NS.photoPreview} />}

      {analyzing && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 10 }}>
          <Loader2 size={22} className="spin" color="var(--gold)" />
          <span style={{ fontSize: 13, color: "var(--muted2)" }}>نحلّل الصورة...</span>
        </div>
      )}

      {error && (
        <>
          <div style={NS.errorText}>{error}</div>
          <button onClick={() => { setPreview(null); setError(null); }} style={{ ...S.exportBtn, marginBottom: 8 }}>إعادة المحاولة بصورة أخرى</button>
        </>
      )}

      {result && (
        <>
          {result.items?.length > 0 && (
            <div style={NS.itemsChipsRow}>
              {result.items.map((it, i) => <span key={i} style={NS.itemChip}>{it}</span>)}
            </div>
          )}
          <div style={NS.disclaimerBox}>
            <Sparkles size={15} color="#C9A24B" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>هذه القيم تقديرية اعتماداً على تحليل الصورة، وقد تختلف عن القيم الفعلية. يمكنك تعديل الكميات يدوياً قبل الحفظ.</span>
          </div>
          <label style={S.label}>عدد الحصص (الصورة تمثّل حصة واحدة)</label>
          <div style={NS.multiplierRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => applyMultiplier(n)} style={{ ...NS.multiplierBtn, ...(multiplier === n ? NS.multiplierBtnActive : {}) }}>×{n}</button>
            ))}
            <input
              type="number" inputMode="decimal" value={multiplier}
              onChange={(e) => applyMultiplier(Math.max(0.25, Number(e.target.value) || 0))}
              style={NS.multiplierInput}
            />
          </div>
          <div style={NS.editableGrid}>
            <div>
              <label style={S.label}>السعرات</label>
              <input type="number" inputMode="decimal" value={result.calories} onChange={(e) => change("calories", Number(e.target.value))} style={S.input} />
            </div>
            <div>
              <label style={S.label}>بروتين (غ)</label>
              <input type="number" inputMode="decimal" value={result.protein} onChange={(e) => change("protein", Number(e.target.value))} style={S.input} />
            </div>
            <div>
              <label style={S.label}>كارب (غ)</label>
              <input type="number" inputMode="decimal" value={result.carbs} onChange={(e) => change("carbs", Number(e.target.value))} style={S.input} />
            </div>
            <div>
              <label style={S.label}>دهون (غ)</label>
              <input type="number" inputMode="decimal" value={result.fat} onChange={(e) => change("fat", Number(e.target.value))} style={S.input} />
            </div>
          </div>
          <button
            onClick={() => onSave({
              id: uid(),
              foodName: result.items?.length > 0 ? result.items.join("، ") : "وجبة (تصوير ذكي)",
              calories: Number(result.calories) || 0, protein: Number(result.protein) || 0,
              carbs: Number(result.carbs) || 0, fat: Number(result.fat) || 0,
              fiber: 0, sugar: 0, sodium: 0,
              servingInfo: multiplier !== 1 ? `تقدير بالذكاء الاصطناعي (×${fmtQty(multiplier)})` : "تقدير بالذكاء الاصطناعي", source: "ai_photo",
            })}
            style={S.saveBtn}
          >
            إضافة إلى سجل اليوم
          </button>
        </>
      )}

      <button onClick={onManual} style={{ ...S.exportBtn, marginTop: 8 }}>إضافة يدوية بدلاً من ذلك</button>
    </>
  );
}

// تصوير "جدول القيم الغذائية" المطبوع وقراءته بالذكاء الاصطناعي - نقطة
// تكامل معزولة (readNutritionLabel في lib/nutrition.js) منفصلة تماماً عن
// recognizeMealFromImage المستخدمة في AIPhotoPanel أعلاه: تلك تقدّر وجبة
// كاملة بصرياً، وهذه تقرأ أرقاماً مطبوعة صريحة (basis + قيمها) فتُحوَّل عبر
// labelToPer100Product إلى نفس شكل "منتج لكل 100g" الذي تستخدمه أيضاً
// ConfirmQuantityCard، فتُعاد الاستفادة من نفس دوال الحصص/الوحدات الموحّدة
// (unitServingSize/unitToGrams/scaleNutrients) بلا أي منطق حساب جديد.
function LabelPhotoPanel({ onSave, onManual }) {
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState(null); // نتيجة readNutritionLabel الخام (basis + servingGrams + قيم)
  const [basisValues, setBasisValues] = useState(null); // نفس قيم label القابلة للتعديل يدوياً قبل الحفظ
  const [unit, setUnit] = useState("g");
  const [multiplier, setMultiplier] = useState(1);
  const [grams, setGrams] = useState(100);
  const [unitQty, setUnitQty] = useState(1);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // نفس أثر تزامن "عدد الحصص" الموجود في ConfirmQuantityCard، معمَّم هنا
  // على أي وحدة - يعمل فقط بعد اكتمال قراءة الملصق (label غير null). يجب
  // أن يبقى هذا الاستدعاء غير مشروط في أعلى المكوّن (لا بعد أي return مبكر)
  // حتى لا يخالف "Rules of Hooks".
  useEffect(() => {
    if (!label || !basisValues) return;
    const per100Now = labelToPer100Product({ ...basisValues, basis: label.basis, servingGrams: label.servingGrams, micronutrients: label.micronutrients });
    if (unit === "g") {
      if (label.basis === "serving") setGrams(Math.round((per100Now.servingGrams || 100) * multiplier));
    } else {
      setUnitQty(Math.round(unitServingSize(unit, per100Now.servingGrams) * multiplier * 100) / 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiplier, unit, label]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setError(null);
    setLabel(null);
    setBasisValues(null);
    setAnalyzing(true);
    const res = await readNutritionLabel(file);
    setAnalyzing(false);
    if (!res.ok) { setError(res.error); return; }
    setLabel(res);
    setBasisValues({
      calories: res.calories, protein: res.protein, carbs: res.carbs, fat: res.fat,
      fiber: res.fiber, sugar: res.sugar, sodium: res.sodium,
    });
    // الوحدة الافتراضية تطابق طبيعة الأساس المرجعي المقروء: مل إن كانت
    // القيم لكل 100ml، وإلا غرام (المستخدم يقدر يبدّل لاحقاً لأي وحدة أخرى).
    const initialUnit = res.basis === "100ml" ? "ml" : "g";
    setUnit(initialUnit);
    setMultiplier(1);
    const hasServing = res.basis === "serving";
    setGrams(hasServing ? Math.round(res.servingGrams || 100) : 100);
    setUnitQty(1);
  }

  function changeBasis(field, val) { setBasisValues((b) => ({ ...b, [field]: Number(val) || 0 })); }

  if (!basisValues) {
    return (
      <>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {!preview && (
          <div style={NS.chooserGrid}>
            <button onClick={() => cameraInputRef.current?.click()} style={NS.chooserBtn}>
              <span style={NS.chooserIcon}><Camera size={19} /></span>
              التقط صورة
            </button>
            <button onClick={() => galleryInputRef.current?.click()} style={NS.chooserBtn}>
              <span style={NS.chooserIcon}><ImagePlus size={19} /></span>
              اختر من المعرض
            </button>
          </div>
        )}
        {preview && <img src={preview} alt="" style={NS.photoPreview} />}
        {analyzing && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 10 }}>
            <Loader2 size={22} className="spin" color="var(--gold)" />
            <span style={{ fontSize: 13, color: "var(--muted2)" }}>نقرأ الملصق...</span>
          </div>
        )}
        {error && (
          <>
            <div style={NS.errorText}>{error}</div>
            <button onClick={() => { setPreview(null); setError(null); }} style={{ ...S.exportBtn, marginBottom: 8 }}>إعادة المحاولة بصورة أخرى</button>
            <button onClick={onManual} style={{ ...S.exportBtn, marginBottom: 0 }}>إضافة يدوية بدلاً من ذلك</button>
          </>
        )}
        {!preview && !error && (
          <button onClick={onManual} style={{ ...S.exportBtn, marginTop: 8 }}>إضافة يدوية بدلاً من ذلك</button>
        )}
      </>
    );
  }

  const hasServing = label.basis === "serving";
  const basisSentence = label.basis === "100g" ? "هذه القيم لكل 100 غرام حسب الملصق."
    : label.basis === "100ml" ? "هذه القيم لكل 100 مليلتر حسب الملصق."
    : `هذه القيم لكل حصة واحدة (${Math.round(label.servingGrams || 100)} غرام) حسب الملصق.`;

  const per100 = labelToPer100Product({ ...basisValues, basis: label.basis, servingGrams: label.servingGrams, micronutrients: label.micronutrients });
  const unitMeta = unitById(unit);
  const unitBaseQty = unitServingSize(unit, per100.servingGrams);
  const gramsEquivalent = unit === "g" ? grams : unitToGrams(unit, unitQty, per100.servingGrams);
  const preview2 = scaleNutrients(per100, gramsEquivalent || 0);

  return (
    <>
      <img src={preview} alt="" style={NS.photoPreview} />
      <div style={NS.disclaimerBox}>
        <Sparkles size={15} color="#C9A24B" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>القيم مقروءة تلقائياً من صورة الملصق وقد تحتاج لمراجعة. تأكد من الأرقام قبل الحفظ.</span>
      </div>
      <p style={{ ...S.label, marginBottom: 4 }}>{basisSentence}</p>
      <div style={NS.editableGrid}>
        <div>
          <label style={S.label}>السعرات</label>
          <input type="number" inputMode="decimal" value={basisValues.calories} onChange={(e) => changeBasis("calories", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>بروتين (غ)</label>
          <input type="number" inputMode="decimal" value={basisValues.protein} onChange={(e) => changeBasis("protein", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>كارب (غ)</label>
          <input type="number" inputMode="decimal" value={basisValues.carbs} onChange={(e) => changeBasis("carbs", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>دهون (غ)</label>
          <input type="number" inputMode="decimal" value={basisValues.fat} onChange={(e) => changeBasis("fat", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>ألياف (غ)</label>
          <input type="number" inputMode="decimal" value={basisValues.fiber} onChange={(e) => changeBasis("fiber", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>سكر (غ)</label>
          <input type="number" inputMode="decimal" value={basisValues.sugar} onChange={(e) => changeBasis("sugar", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>صوديوم (مغم)</label>
          <input type="number" inputMode="decimal" value={basisValues.sodium} onChange={(e) => changeBasis("sodium", e.target.value)} style={S.input} />
        </div>
      </div>

      <p style={{ ...S.label, marginTop: 16, marginBottom: 4 }}>كم تناولت فعلياً؟</p>
      <label style={S.label}>وحدة القياس</label>
      <div style={NS.unitRow}>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={NS.unitSelect}>
          {UNIT_OPTIONS.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </div>
      {unit === "g" ? (
        <>
          {hasServing && (
            <>
              <label style={S.label}>عدد الحصص (كل حصة {Math.round(per100.servingGrams)} غم)</label>
              <div style={NS.multiplierRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setMultiplier(n)} style={{ ...NS.multiplierBtn, ...(multiplier === n ? NS.multiplierBtnActive : {}) }}>×{n}</button>
                ))}
                <input type="number" inputMode="decimal" value={multiplier} onChange={(e) => setMultiplier(Math.max(0.25, Number(e.target.value) || 0))} style={NS.multiplierInput} />
              </div>
            </>
          )}
          <label style={S.label}>{hasServing ? "أو عدّل الكمية بالغرام مباشرة" : "الكمية (غم)"}</label>
          <input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(Number(e.target.value))} style={S.input} />
        </>
      ) : (
        <>
          <label style={S.label}>عدد الحصص (كل حصة {fmtQty(unitBaseQty)} {unitMeta.label})</label>
          <div style={NS.multiplierRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setMultiplier(n)} style={{ ...NS.multiplierBtn, ...(multiplier === n ? NS.multiplierBtnActive : {}) }}>×{n}</button>
            ))}
            <input type="number" inputMode="decimal" value={multiplier} onChange={(e) => setMultiplier(Math.max(0.25, Number(e.target.value) || 0))} style={NS.multiplierInput} />
          </div>
          <label style={S.label}>أو عدّل الكمية بـ{unitMeta.label} مباشرة</label>
          <input type="number" inputMode="decimal" value={unitQty} onChange={(e) => setUnitQty(Number(e.target.value) || 0)} style={S.input} />
          {unitMeta.approx && <p style={NS.unitApproxNote}>تحويل تقريبي إلى غرام لحساب القيم الغذائية (وحدة غير وزنية).</p>}
        </>
      )}

      <div style={NS.previewGrid}>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview2.calories}</div><div style={NS.macroLabel}>سعرة</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview2.protein}غ</div><div style={NS.macroLabel}>بروتين</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview2.carbs}غ</div><div style={NS.macroLabel}>كارب</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview2.fat}غ</div><div style={NS.macroLabel}>دهون</div></div>
      </div>
      <div style={NS.previewGrid}>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview2.fiber}غ</div><div style={NS.macroLabel}>ألياف</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview2.sugar}غ</div><div style={NS.macroLabel}>سكر</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview2.sodium}مغ</div><div style={NS.macroLabel}>صوديوم</div></div>
      </div>
      <button
        onClick={() => onSave({
          id: uid(), foodName: "طعام (ملصق غذائي)", ...preview2,
          unit,
          servingInfo: unit === "g"
            ? (hasServing ? `${multiplier} × ${Math.round(per100.servingGrams)}غم` : `${grams} غم`)
            : `${fmtQty(unitQty)} ${unitMeta.label}`,
          source: "label",
          micronutrients: scaleMicronutrients(per100.micronutrientsPer100g, gramsEquivalent || 0),
        })}
        style={S.saveBtn}
        disabled={!gramsEquivalent || gramsEquivalent <= 0}
      >
        إضافة إلى سجل اليوم
      </button>
      <button onClick={onManual} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>إضافة يدوية بدلاً من ذلك</button>
    </>
  );
}

export default function NutritionView({ healthProfile, showToast, profile, setProfile, subscription }) {
  const [loaded, setLoaded] = useState(false);
  const [nutritionLog, setNutritionLog] = useState([]);
  const [waterLog, setWaterLog] = useState({});
  const [sheet, setSheet] = useState(null); // null | "choose" | "scan" | "search" | "manual" | "confirm"
  const [pendingProduct, setPendingProduct] = useState(null); // { product, source }
  const [pendingBarcode, setPendingBarcode] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  // مؤقت لأغراض التشخيص: نص خطأ Supabase الحقيقي الكامل لآخر محاولة حفظ
  // فاشلة - يُعرض داخل الشاشة المنبثقة نفسها (لا توست فقط، لأن التوست يختفي
  // بعد ثانيتين ولا يكفي لقراءة/نسخ رسالة خطأ تفصيلية).
  const [saveError, setSaveError] = useState(null);
  const [dailyAnalysis, setDailyAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const isSub = isActiveSubscriber(subscription);
  const today = todayKey();

  useEffect(() => {
    let active = true;
    Promise.all([store.loadNutritionLog(), store.loadWaterLog()]).then(([nl, wl]) => {
      if (!active) return;
      setNutritionLog(nl);
      setWaterLog(wl);
      setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const todayLog = nutritionLog.filter((e) => e.date === today);
  const totals = sumNutritionEntries(todayLog);
  // تُعرض العناصر التسعة كلها دائماً (حتى غير المُستهلَك اليوم يظهر بصفر
  // و0%) حتى يرى المستخدم ما ينقصه فعلياً، لا فقط ما أكله. الاحتياج (rdi)
  // يُخصَّص حسب العمر والجنس من health_profile عبر personalizedRDI إن
  // توفّرا (جداول RDA/AI معتمدة علمياً)، وإلا يُستخدم rdi العام الافتراضي.
  const hasAgeGender = !!(healthProfile?.age && healthProfile?.gender);
  const microRows = Object.keys(MICRONUTRIENT_META).map((key) => {
    const meta = MICRONUTRIENT_META[key];
    const value = Math.round((totals.micronutrients?.[key] || 0) * 100) / 100;
    const rdi = personalizedRDI(key, healthProfile?.age, healthProfile?.gender) ?? meta.rdi;
    return { key, label: meta.label, unit: meta.unit, rdi, value, pct: Math.min(100, Math.round((value / rdi) * 100)) };
  });
  const tee = healthProfile?.tee || null;
  const teePercent = tee ? Math.min(100, Math.round((totals.calories / tee) * 100)) : 0;
  // أهداف الماكروز لدوائر التقدم: نسبة عامة معروفة (بروتين 30%، كارب 40%،
  // دهون 30% من السعرات) وليست حساباً شخصياً دقيقاً - نفس مبدأ "تقديرية"
  // المستخدم فعلاً في إرشادات الألياف/السكر/الصوديوم أعلاه. تُحسب فقط إن
  // أكمل المستخدم بياناته في "أنت" (وإلا لا يوجد TEE أصلاً لتقسيمه).
  const macroTargets = tee ? {
    protein: Math.round((tee * 0.3) / 4),
    carbs: Math.round((tee * 0.4) / 4),
    fat: Math.round((tee * 0.3) / 9),
  } : null;
  const todayCups = waterLog[today] || 0;
  const cupsGoal = waterGoalCups(healthProfile?.weightKg);
  const waterPercent = cupsGoal ? Math.min(100, Math.round((todayCups / cupsGoal) * 100)) : 0;

  function closeSheet() {
    setSheet(null);
    setPendingProduct(null);
    setPendingBarcode(null);
    setLookupError(null);
    setSaveError(null);
  }

  // خلل حقيقي كان موجوداً وأُصلح: كانت هذه الدالة تُظهر "أُضيف بنجاح" دائماً
  // بمجرد استدعاء store.addNutritionEntry، بغض النظر عن نجاح الحفظ الفعلي
  // في Supabase من عدمه - فإن فشل الحفظ فعلياً (مثلاً عمود لم يُنفَّذ تعديله
  // بعد على القاعدة الحقيقية) كان يظهر السجل فوراً بسبب التحديث المتفائل
  // للحالة، ثم يختفي بصمت عند أول تحديث للصفحة لأن التحميل التالي يقرأ من
  // القاعدة التي لم تستلم الصف أصلاً. الآن تتحقق من نتيجة الحفظ الحقيقية،
  // وتتراجع عن التحديث المتفائل + تُظهر خطأً حقيقياً للمستخدم عند أي فشل.
  async function addEntry(entry) {
    setSaveError(null);
    const full = { ...entry, date: today };
    setNutritionLog((prev) => [full, ...prev]);
    const result = await store.addNutritionEntry(full);
    if (result.ok) {
      showToast("أُضيف إلى سجل اليوم");
      closeSheet();
    } else {
      setNutritionLog((prev) => prev.filter((e) => e.id !== full.id));
      // التفاصيل الكاملة (message/code/details/hint) إلى console المطوّر
      // فقط - المستخدم يرى رسالة عامة ودّية دائماً، لا أي نص خام من Supabase.
      console.error("[NutritionView] addNutritionEntry failed:", result);
      const friendly = "تعذّر حفظ الإدخال الآن، حاول مرة أخرى.";
      setSaveError(friendly);
      showToast(`فشل الحفظ - ${friendly}`);
    }
  }

  async function removeEntry(id) {
    setNutritionLog((prev) => prev.filter((e) => e.id !== id));
    await store.deleteNutritionEntry(id);
  }

  async function addWaterCup() {
    const prevCups = todayCups;
    const next = todayCups + 1;
    setWaterLog((prev) => ({ ...prev, [today]: next }));
    const res = await store.saveWaterCups(today, next);
    if (!res.ok) { setWaterLog((prev) => ({ ...prev, [today]: prevCups })); showToast("تعذّر حفظ كوب الماء، حاول مرة أخرى"); }
  }

  async function enableNotifications() {
    const result = await requestNotificationPermission();
    const enabled = !!(result.granted && result.subscribed);
    setProfile?.((p) => ({ ...p, notificationsEnabled: enabled, notificationsAsked: true }));
    await store.saveNotificationsPreference(enabled, true);
    showToast(enabled ? "تم تفعيل الإشعارات" : (result.error || "لم تُفعَّل الإشعارات"));
  }
  async function dismissNotificationBanner() {
    setProfile?.((p) => ({ ...p, notificationsAsked: true }));
    await store.saveNotificationsPreference(!!profile?.notificationsEnabled, true);
  }

  const handleBarcodeDetected = useCallback(async (barcode) => {
    setSheet("lookup");
    setLookupBusy(true);
    setLookupError(null);
    const cached = await store.findCustomFood(barcode);
    if (cached) {
      setLookupBusy(false);
      setPendingProduct({
        product: {
          name: cached.foodName, caloriesPer100g: cached.calories, proteinPer100g: cached.protein,
          carbsPer100g: cached.carbs, fatPer100g: cached.fat, fiberPer100g: cached.fiber,
          sugarPer100g: cached.sugar, sodiumPer100gMg: cached.sodium,
          imageUrl: cached.imageUrl || null, servingGrams: cached.servingGrams || null,
          micronutrientsPer100g: cached.micronutrients || {},
        },
        source: "barcode",
      });
      setSheet("confirm");
      return;
    }
    const res = await fetchProductByBarcode(barcode);
    setLookupBusy(false);
    if (res.found) {
      setPendingProduct({ product: res.product, source: "barcode" });
      setSheet("confirm");
    } else {
      if (res.error) setLookupError(res.error);
      setPendingBarcode(barcode);
      setSheet("manual");
    }
  }, []);

  // entry.productPer100 يحمل القيم الغذائية لكل 100غم كما أدخلها المستخدم
  // فعلاً (منفصلة عن قيم السجل النهائية المُحسوبة لحجم الحصة المُدخلة) -
  // هذا إصلاح لخلل كان موجوداً سابقاً: كانت القيم المُدخلة (لأي كمية أدخلها
  // المستخدم وقتها) تُحفظ كما هي في custom_foods وكأنها "لكل 100غم"، فتُنتج
  // حسابات خاطئة لأي عملية مسح لاحقة لنفس الباركود بكمية مختلفة.
  async function saveManualEntry(entry) {
    if (entry.barcode && entry.productPer100) {
      const cacheRes = await store.saveCustomFood({
        barcode: entry.barcode, foodName: entry.foodName, ...entry.productPer100,
        brand: entry.brand, country: entry.country, servingSizeLabel: entry.servingSizeLabel,
        servingGrams: entry.servingGrams, imageUrl: entry.imageUrl,
      });
      // فشل هذا الحفظ لا يفقد إدخال المستخدم فعلياً (يُحفظ منفصلاً أدناه عبر
      // addEntry) - فقط يعني عدم تذكّر هذا الباركود لعملية مسح لاحقة، لذا
      // toast تنبيهي غير حاجب بدل رسالة خطأ ملحّة.
      if (!cacheRes.ok) showToast("سُجِّلت الوجبة، لكن تعذّر حفظ بيانات المنتج للمرة القادمة");
    }
    const { productPer100, brand, country, servingSizeLabel, servingGrams, imageUrl, ...logEntry } = entry;
    await addEntry(logEntry);
  }

  // يستخدم نفس آلية "التقرير الذكي" المبنية مسبقاً (analyze + parseJsonLoose،
  // انظر DailyEvolution في MasarApp.jsx) - يبني الطلب من بيانات اليوم الفعلية
  // فقط (الأطعمة المسجَّلة والمجاميع الحقيقية)، ولا يفترض شيئاً لم يُسجَّل.
  async function generateDailyAnalysis() {
    if (todayLog.length === 0) { setDailyAnalysis({ error: "سجّل بعض الأطعمة اليوم أولاً حتى أقدر أحلّل نمط تغذيتك." }); return; }
    setAnalysisLoading(true);
    try {
      const foodsList = todayLog.map((e) => `${e.foodName} (${Math.round(e.calories)} سعرة)`).join("، ");
      const prompt = `أنت مدرّب تغذية يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. هذه بيانات تغذية المستخدم الفعلية لهذا اليوم فقط:
الأطعمة المسجَّلة: ${foodsList}
الإجمالي: ${Math.round(totals.calories)} سعرة${tee ? ` من أصل هدف ${Math.round(tee)} سعرة` : ""}، بروتين ${Math.round(totals.protein)}غ، كارب ${Math.round(totals.carbs)}غ، دهون ${Math.round(totals.fat)}غ، ألياف ${Math.round(totals.fiber)}غ، سكر ${Math.round(totals.sugar)}غ، صوديوم ${Math.round(totals.sodium)}مغم.
اكتب فقرة قصيرة (جملتان إلى ثلاث) تحلّل نمط تغذية اليوم بناءً على هذه الأرقام الفعلية فقط تحديداً (مثال: بروتين جيد لكن ألياف منخفضة اليوم) - لا تخترع نمطاً غير موجود في الأرقام أعلاه. أعد فقط JSON بدون أي نص أو markdown:
{"analysis":"الفقرة هنا"}`;
      const text = await analyze(prompt, 500);
      const parsed = parseJsonLoose(text);
      setDailyAnalysis({ text: parsed.analysis });
    } catch (err) {
      console.error("[NutritionView] generateDailyAnalysis failed:", err);
      setDailyAnalysis({ error: "تعذّر تحليل تغذية اليوم الآن، جرّب مرة أخرى بعد قليل." });
    } finally { setAnalysisLoading(false); }
  }

  return (
    <div style={S.view}>
      <div style={NS.hero}>
        <div style={NS.heroIcon}><Flame size={22} color="var(--on-accent)" /></div>
        <div>
          <div style={NS.heroTitle}>التغذية</div>
          <div style={NS.heroSub}>سجّل ما تأكله وتشربه اليوم وقارنه باحتياجك.</div>
        </div>
      </div>

      {profile && !profile.notificationsAsked && (
        <div style={NS.notifBanner}>
          <Bell size={18} color="#C9A24B" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={NS.notifText}>فعّل الإشعارات ليذكّرك مسار بشرب الماء وتسجيل وجباتك.</p>
            <div style={NS.notifRow}>
              <button onClick={enableNotifications} style={NS.notifBtn}>تفعيل</button>
              <button onClick={dismissNotificationBanner} style={NS.notifDismissBtn}>لاحقاً</button>
            </div>
          </div>
        </div>
      )}

      <div style={NS.summaryCard}>
        <div style={NS.summaryTop}>
          <span style={NS.summaryCalories}>{Math.round(totals.calories)} <span style={{ fontSize: 13, color: "var(--muted2)" }}>سعرة</span></span>
          {tee ? <span style={NS.summaryTee}>الهدف اليومي: {tee} سعرة</span> : <span style={NS.summaryTee}>أكمل بياناتك في "أنت" لمعرفة هدفك اليومي</span>}
        </div>
        {tee && (
          <>
            <div style={NS.barTrack}><div style={{ ...NS.barFill, width: `${teePercent}%` }} /></div>
            <div style={{ ...NS.summaryTee, marginBottom: 12 }}>
              {totals.calories <= tee ? `تبقّى لك ${Math.round(tee - totals.calories)} سعرة اليوم` : `تجاوزت هدفك بـ ${Math.round(totals.calories - tee)} سعرة`}
            </div>
          </>
        )}
        <div style={NS.macrosRow}>
          <div style={NS.macroChip}><div style={NS.macroValue}>{Math.round(totals.protein * 10) / 10}غ</div><div style={NS.macroLabel}>بروتين</div></div>
          <div style={NS.macroChip}><div style={NS.macroValue}>{Math.round(totals.carbs * 10) / 10}غ</div><div style={NS.macroLabel}>كارب</div></div>
          <div style={NS.macroChip}><div style={NS.macroValue}>{Math.round(totals.fat * 10) / 10}غ</div><div style={NS.macroLabel}>دهون</div></div>
        </div>

        <MacroRings totals={totals} macroTargets={macroTargets} />

        <div style={{ marginTop: 16 }}>
          {[
            { key: "fiber", label: "الألياف", value: totals.fiber, goal: DAILY_GUIDELINES.fiberMaxG, goalLabel: `${DAILY_GUIDELINES.fiberMinG}-${DAILY_GUIDELINES.fiberMaxG}غ (تقديري)`, unit: "غ", color: "#5FA8A0" },
            { key: "sugar", label: "السكر", value: totals.sugar, goal: DAILY_GUIDELINES.sugarMaxG, goalLabel: `أقل من ${DAILY_GUIDELINES.sugarMaxG}غ (تقديري)`, unit: "غ", color: "#C9A24B" },
            { key: "sodium", label: "الصوديوم", value: totals.sodium, goal: DAILY_GUIDELINES.sodiumMaxMg, goalLabel: `أقل من ${DAILY_GUIDELINES.sodiumMaxMg}مغ (تقديري)`, unit: "مغ", color: "#D17B5F" },
          ].map((g) => {
            const pct = Math.min(100, Math.round((g.value / g.goal) * 100));
            return (
              <div key={g.key} style={NS.guidelineRow}>
                <div style={NS.guidelineHead}>
                  <span><span style={NS.guidelineName}>{g.label}</span> — {Math.round(g.value * 10) / 10}{g.unit}</span>
                  <span>{g.goalLabel}</span>
                </div>
                <div style={NS.barTrack}><div style={{ ...NS.barFill, width: `${pct}%`, background: g.color }} /></div>
              </div>
            );
          })}
        </div>

        <div>
          <div style={NS.microHead}>الفيتامينات والمعادن اليوم</div>
          <div style={NS.disclaimerBox}>
            <Sparkles size={15} color="#C9A24B" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              هذه القيم تقديرية عامة (بناءً على مرجعية يومية شائعة)، وقد تختلف حسب عمرك وجنسك وحالتك الصحية. استشر مختصاً للاحتياج الدقيق.
              {!hasAgeGender && " أكمل بياناتك في قسم \"أنت\" لاحتياج أدق."}
            </span>
          </div>
          {microRows.map((m) => (
            <div key={m.key} style={NS.guidelineRow}>
              <div style={NS.guidelineHead}>
                <span><span style={NS.guidelineName}>{m.label}</span> — {m.value}{m.unit}</span>
                <span>{m.pct}% من {m.rdi}{m.unit} (تقديري)</span>
              </div>
              <div style={NS.barTrack}><div style={{ ...NS.barFill, width: `${m.pct}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div style={NS.waterCard}>
        <div style={NS.waterHead}>
          <span style={NS.waterTitle}><Droplet size={15} color="#5FA8A0" /> الماء</span>
          <span style={NS.waterCount}>{todayCups}{cupsGoal ? ` / ${cupsGoal}` : ""} كوب</span>
        </div>
        {cupsGoal && <div style={{ ...NS.barTrack, marginBottom: 10 }}><div style={{ ...NS.barFill, width: `${waterPercent}%`, background: "linear-gradient(90deg, #3E7E78, #5FA8A0)" }} /></div>}
        <button onClick={addWaterCup} style={NS.waterAddBtn}><Plus size={15} /> كوب ماء</button>
      </div>

      <div style={NS.aiAnalysisCard}>
        <div style={NS.aiAnalysisHead}>
          <span style={NS.aiAnalysisTitle}><Sparkles size={15} color="#C9A24B" /> تحليل تغذية اليوم</span>
          {isSub && (
            <button onClick={generateDailyAnalysis} disabled={analysisLoading} style={NS.aiAnalysisBtn}>
              {analysisLoading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
              {analysisLoading ? "..." : "تحليل"}
            </button>
          )}
        </div>
        {isSub ? (
          <>
            {!dailyAnalysis && <div style={NS.emptyHint}>اطلب تحليلاً ذكياً لنمط تغذيتك اليوم بناءً على ما سجّلته فعلياً.</div>}
            {dailyAnalysis?.error && <div style={NS.emptyHint}>{dailyAnalysis.error}</div>}
            {dailyAnalysis?.text && <p style={NS.aiAnalysisText}>{dailyAnalysis.text}</p>}
          </>
        ) : (
          <MiniUpsell title="تحليل تغذية ذكي" message="احصل على تحليل يومي لنمط تغذيتك بناءً على ما تسجّله فعلياً." />
        )}
      </div>

      <button onClick={() => setSheet("choose")} style={NS.addFoodBtn}><Plus size={16} /> أضف طعاماً</button>

      <div style={NS.logHead}>سجل اليوم</div>
      {loaded && todayLog.length === 0 && <div style={NS.emptyHint}>لم تُضِف أي طعام اليوم بعد.</div>}
      <div className="stagger-in">
      {todayLog.map((e) => (
        <div key={e.id} style={NS.logItem}>
          <div style={{ flex: 1 }}>
            <div style={NS.logItemName}>{e.foodName}</div>
            <div style={NS.logItemMeta}>{e.servingInfo} · بروتين {e.protein}غ · كارب {e.carbs}غ · دهون {e.fat}غ</div>
          </div>
          <div style={NS.logItemCalories}>{Math.round(e.calories)} سعرة</div>
          <button onClick={() => removeEntry(e.id)} style={NS.deleteBtn}><Trash2 size={15} /></button>
        </div>
      ))}
      </div>

      {sheet && sheet !== "scan" && (
        <div style={NS.overlay} className="overlay-in" onClick={closeSheet}>
          <div style={NS.sheet} className="sheet-in" onClick={(e) => e.stopPropagation()}>
            {sheet !== "scan" && (
              <div style={NS.sheetHead}>
                <span style={NS.sheetTitle}>
                  {sheet === "choose" && "أضف طعاماً"}
                  {sheet === "barcodeManual" && "إدخال الباركود"}
                  {sheet === "search" && "بحث بالاسم"}
                  {sheet === "aiPhoto" && "تصوير الوجبة"}
                  {sheet === "labelPhoto" && "تصوير الملصق الغذائي"}
                  {sheet === "manual" && "إضافة يدوية"}
                  {sheet === "confirm" && "تأكيد الكمية"}
                  {sheet === "lookup" && "جاري البحث..."}
                </span>
                <button onClick={closeSheet} style={NS.closeBtn}><X size={16} /></button>
              </div>
            )}

            {saveError && (
              <div
                ref={(el) => { if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }}
                style={{ ...NS.errorText, direction: "ltr", textAlign: "left", wordBreak: "break-word", userSelect: "text" }}
              >
                {saveError}
              </div>
            )}

            {sheet === "choose" && (
              <div style={NS.chooserGrid}>
                <button onClick={() => setSheet("scan")} style={NS.chooserBtn}>
                  <span style={NS.chooserIcon}><Camera size={19} /></span> مسح بالكاميرا
                </button>
                <button onClick={() => setSheet("barcodeManual")} style={NS.chooserBtn}>
                  <span style={NS.chooserIcon}><Hash size={19} /></span> إدخال الباركود يدوياً
                </button>
                <button onClick={() => setSheet("search")} style={NS.chooserBtn}>
                  <span style={NS.chooserIcon}><Search size={19} /></span> البحث بالاسم
                </button>
                <button
                  onClick={() => setSheet(isSub ? "aiPhoto" : "aiPhotoLocked")}
                  style={{ ...NS.chooserBtn, ...(!isSub ? NS.chooserBtnDisabled : {}) }}
                >
                  <span style={NS.chooserIcon}><ImagePlus size={19} /></span>
                  تصوير الوجبة بالذكاء الاصطناعي
                  {!isSub && <span style={NS.chooserBadge}>مسار الكامل</span>}
                </button>
                <button
                  onClick={() => setSheet(isSub ? "labelPhoto" : "labelPhotoLocked")}
                  style={{ ...NS.chooserBtn, ...(!isSub ? NS.chooserBtnDisabled : {}) }}
                >
                  <span style={NS.chooserIcon}><ClipboardList size={19} /></span>
                  تصوير الملصق الغذائي
                  {!isSub && <span style={NS.chooserBadge}>مسار الكامل</span>}
                </button>
              </div>
            )}

            {sheet === "barcodeManual" && (
              <ManualBarcodeEntry onSubmit={handleBarcodeDetected} />
            )}

            {sheet === "search" && (
              <SearchPanel
                onPick={(product) => { setPendingProduct({ product, source: "search" }); setSheet("confirm"); }}
                onManual={() => setSheet("manual")}
              />
            )}

            {sheet === "aiPhotoLocked" && (
              <MiniUpsell title="تصوير الوجبة بالذكاء الاصطناعي" message="صوّر وجبتك واحصل على تقدير فوري للسعرات والماكروز عبر الذكاء الاصطناعي." />
            )}

            {sheet === "aiPhoto" && (
              <AIPhotoPanel
                onSave={(entry) => addEntry(entry)}
                onManual={() => setSheet("manual")}
              />
            )}

            {sheet === "labelPhotoLocked" && (
              <MiniUpsell title="تصوير الملصق الغذائي" message="صوّر جدول القيم الغذائية المطبوع على المنتج، ويقرأ الذكاء الاصطناعي أرقامه مباشرة - أدق من التقدير البصري." />
            )}

            {sheet === "labelPhoto" && (
              <LabelPhotoPanel
                onSave={(entry) => addEntry(entry)}
                onManual={() => setSheet("manual")}
              />
            )}

            {sheet === "manual" && (
              <>
                {lookupError && <div style={NS.errorText}>{lookupError}</div>}
                <ManualEntryForm barcode={pendingBarcode} onSave={saveManualEntry} onCancel={closeSheet} />
              </>
            )}

            {sheet === "lookup" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: 10 }}>
                <Loader2 size={22} className="spin" color="var(--gold)" />
                <span style={{ fontSize: 13, color: "var(--muted2)" }}>نبحث عن المنتج...</span>
              </div>
            )}

            {sheet === "confirm" && pendingProduct && (
              <ConfirmQuantityCard
                product={pendingProduct.product}
                source={pendingProduct.source}
                onAdd={addEntry}
                onCancel={closeSheet}
              />
            )}
          </div>
        </div>
      )}

      {sheet === "scan" && (
        <BarcodeScannerModal onDetected={handleBarcodeDetected} onClose={closeSheet} />
      )}
    </div>
  );
}
