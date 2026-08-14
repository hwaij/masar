import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus, X, Trash2, Camera, Search, Loader2, Droplet, Flame, Check, Bell, Info,
  Hash, Sparkles, ImagePlus, ClipboardList, Edit3, ChevronLeft, ChevronRight, SkipForward,
  Egg, Drumstick, Beef, Fish, Wheat, Carrot, Apple, Bean, Milk, Nut, Coffee, Cookie, Salad,
} from "lucide-react";
import { store } from "../lib/store";
import SpotlightTour from "./SpotlightTour";
import { todayKey, uid, analyze, parseJsonLoose, arabicDate } from "../lib/helpers";
import { isActiveSubscriber } from "../lib/subscription";
import {
  fetchProductByBarcode, searchProductsByName, searchUSDAFoods, scaleNutrients,
  sumNutritionEntries, waterGoalCups, servingPresets,
  isSecureContextForCamera, describeCameraError,
  normalizeSearchTerm, recognizeMealFromImage, readNutritionLabel,
  labelToPer100Product, DAILY_GUIDELINES,
  UNIT_OPTIONS, unitById, unitToGrams, unitServingSize,
  scaleMicronutrients, MICRONUTRIENT_META, personalizedRDI, compressImageToBlob,
  MEAL_TYPES, guessMealType,
} from "../lib/nutrition";
import { getDailyNutritionSummary } from "../lib/nutrition-plan";
import { requestNotificationPermission } from "../lib/push";
import { searchGenericFoods, genericFoodToProduct } from "../lib/generic-foods";
import { isolateNumbers } from "../lib/bidi";
import NumericValue from "./NumericValue";
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
  resultRow: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 12, padding: "10px 12px", marginBottom: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "start", color: "inherit" },
  resultImg: { width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: "var(--surface-raised)" },
  resultName: { fontSize: 13, fontWeight: 700, color: "var(--ink)" },
  resultMeta: { fontSize: 11, color: "var(--muted2)", marginTop: 2 },
  productHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 },
  productImg: { width: 56, height: 56, borderRadius: 12, objectFit: "cover", flexShrink: 0, background: "var(--surface-sunken)" },
  productName: { fontSize: 15, fontWeight: 700, color: "var(--ink)" },
  productMeta: { fontSize: 12, color: "var(--muted2)", marginTop: 2 },
  editDataBtn: { display: "flex", alignItems: "center", gap: 5, flexShrink: 0, background: "var(--surface-sunken)", border: "1px solid var(--border2)", color: "var(--muted2)", borderRadius: 20, padding: "6px 11px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
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

  pastDayBanner: { display: "flex", alignItems: "center", gap: 8, background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", borderRadius: 12, padding: "9px 12px", marginBottom: 14, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6 },

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

  wizardProgress: { marginBottom: 14 },
  wizardProgressLabel: { fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 },
  wizardNavRow: { display: "flex", gap: 8, marginTop: 16 },
  wizardBackBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flex: 1, background: "var(--surface-sunken)", border: "1px solid var(--border2)", color: "var(--ink-soft)", borderRadius: 12, padding: "12px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 44 },
  wizardNextBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flex: 1, background: "var(--gold)", border: "none", color: "var(--bg)", borderRadius: 12, padding: "12px 0", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", minHeight: 44 },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--ink)", margin: "12px 0", cursor: "pointer" },

  ringsRow: { display: "flex", justifyContent: "space-between", gap: 6, marginTop: 16, marginBottom: 2 },
  ringItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flex: 1 },
  ringSvgWrap: { position: "relative", width: 64, height: 64 },
  ringPercent: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, color: "var(--ink)" },
  ringLabel: { fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" },
  ringValueText: { fontSize: 9.5, color: "var(--muted2)" },

  mealTypeRow: { display: "flex", gap: 8, marginBottom: 12 },
  mealTypeBtn: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, flex: 1, minHeight: 56, borderRadius: 12, border: "1px solid var(--border2)", background: "var(--surface-sunken)", color: "var(--ink-soft)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  mealTypeBtnActive: { border: "1px solid var(--gold)", background: "rgba(201,162,75,0.14)", color: "var(--gold)" },
  mealGroupHead: { display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", margin: "14px 0 8px" },
  mealGroupCalories: { fontSize: 12, fontWeight: 700, color: "var(--gold)" },
  approxBadge: { color: "var(--gold)", cursor: "help", fontWeight: 700 },

  // ===== Priority 5: بطاقة وجبة (Meal Card) =====
  mealCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, padding: "14px 14px", marginBottom: 12 },
  mealCardCurrent: { border: "1.5px solid var(--gold)" },
  mealCardHeaderTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  mealCardTitle: { fontSize: 14, fontWeight: 700, color: "var(--ink)" },
  mealCardCalories: { fontSize: 14, fontWeight: 700, color: "var(--gold)" },
  mealCardUsualTime: { fontSize: 11, color: "var(--muted2)", marginTop: 2 },
  mealCardBarTrack: { height: 5, borderRadius: 4, background: "var(--surface-sunken)", overflow: "hidden", marginTop: 9 },
  mealCardBarFill: { height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #5FA8A0, #C9A24B)" },
  mealCardEmpty: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 0 4px", opacity: 0.6 },
  mealCardEmptyIcon: { fontSize: 22, filter: "grayscale(60%)" },
  mealCardEmptyText: { fontSize: 12, color: "var(--muted2)", textAlign: "center", margin: 0 },
  mealCardItems: { marginTop: 10 },
  mealItemRow: { borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 8 },
  mealItemMain: { display: "flex", alignItems: "center", gap: 8, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", color: "inherit", textAlign: "start" },
  mealItemDetail: { background: "var(--surface-sunken)", borderRadius: 10, padding: "10px 10px", marginTop: 8 },
  mealItemDetailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, color: "var(--ink-soft)" },
  mealItemActionsRow: { display: "flex", gap: 8, marginTop: 10 },
  mealItemActionBtn: { display: "flex", alignItems: "center", gap: 5, flex: 1, justifyContent: "center", background: "var(--panel)", border: "1px solid var(--border2)", color: "var(--ink-soft)", borderRadius: 9, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  mealItemConfirmRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 11.5, color: "var(--muted2)" },
  mealItemConfirmDeleteBtn: { background: "#E05252", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  mealItemConfirmCancelBtn: { background: "transparent", border: "1px solid var(--border2)", color: "var(--muted2)", borderRadius: 8, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  mealCardAddBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "rgba(201,162,75,0.1)", border: "1px solid rgba(201,162,75,0.3)", color: "var(--gold)", borderRadius: 10, padding: "9px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 10 },
  // "حد إرشادي" (كوليسترول/صوديوم) - تمييز بصري متعمَّد عن بطاقات الماكروز
  // الأساسية المحسوبة شخصياً (بروتين/كارب/دهون): لون رمادي محايد بدل الذهبي/
  // الألوان المميِّزة، وأيقونة تنبيه صغيرة، حتى لا يظن المستخدم أن هذا رقم
  // مخصَّص له شخصياً (Priority 6/7).
  guidelineCard: { background: "var(--surface-sunken)", border: "1px dashed var(--border2)", borderRadius: 12, padding: "10px 12px", marginTop: 16 },
  guidelineCardNote: { fontSize: 10.5, color: "var(--muted2)", marginTop: 8, lineHeight: 1.5 },
};

const SOURCE_ICONS = { barcode: Hash, search: Search, manual: Edit3, ai_photo: Sparkles, label: Camera, common: ClipboardList };

const SUBSCRIBE_URL = "https://www.instagram.com/hjmasar";

const BARCODE_FORMATS_SUPPORT_ID = "masar-barcode-scanner-region";

function BarcodeScannerModal({ onDetected, onClose }) {
  const { t } = useTranslation();
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
        setError(t("nutrition.cameraHttpsRequired"));
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
          <span style={NS.sheetTitle}>{t("nutrition.scanBarcode")}</span>
          <button onClick={onClose} style={NS.closeBtn}><X size={16} /></button>
        </div>
        {error ? (
          <div style={NS.errorText}>{error}</div>
        ) : (
          <p style={NS.scanHint}>{t("nutrition.pointCameraAtBarcode")}</p>
        )}
        <div id={BARCODE_FORMATS_SUPPORT_ID} style={NS.scannerBox} />
      </div>
    </div>
  );
}

// بطاقة ترقية مصغّرة داخل قسم التغذية نفسه (لا يوجد UpsellCard مُصدَّرة
// من مكان مشترك بعد - هذا المكوّن يعيش هنا فقط ولا يُستخدم في أي قسم آخر).
function MiniUpsell({ title, message }) {
  const { t } = useTranslation();
  return (
    <div style={NS.compactUpsell}>
      <Sparkles size={22} color="var(--gold)" />
      <div style={NS.compactUpsellTitle}>{title}</div>
      <p style={NS.compactUpsellMsg}>{message}</p>
      <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer" style={{ ...NS.notifBtn, flex: "none", padding: "9px 18px", textDecoration: "none" }}>{t("nutrition.subscribeNow")}</a>
    </div>
  );
}

// إدخال الباركود يدوياً - بديل مباشر للمسح بالكاميرا، يستخدم نفس منطق
// البحث بالباركود الموجود (onSubmit هو نفس handleBarcodeDetected) دون أي
// تكرار للكود.
function ManualBarcodeEntry({ onSubmit }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  return (
    <>
      <p style={NS.scanHint}>{t("nutrition.enterBarcode")}</p>
      <div style={NS.searchRow}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter" && value) onSubmit(value); }}
          placeholder={t("nutrition.barcodePlaceholder")}
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
        <div style={NS.ringPercent}><NumericValue value={displayPercent} unit="%" /></div>
      </div>
      <div style={NS.ringLabel}>{label}</div>
      <div style={NS.ringValueText}>{isolateNumbers(valueText)}</div>
    </div>
  );
}

// أربع دوائر ملونة (بروتين/كارب/دهون/صوديوم) بجانب بطاقة الاحتياج
// الخطية الموجودة أصلاً - عرض بصري إضافي مكمّل، لا بديل يحذف الأرقام
// الموجودة. ألوان مميّزة لكل ماكرو (الصوديوم بنفس لون شريطه الخطي أعلاه
// حتى يبقى "الصوديوم = أحمر" متسقاً في كل الواجهة).
function MacroRings({ totals, macroTargets }) {
  const { t } = useTranslation();
  const rings = [
    { key: "protein", label: t("common.units.protein"), color: "#C9A24B", value: totals.protein, target: macroTargets?.protein, unit: t("common.units.g") },
    { key: "carbs", label: t("common.units.carbs"), color: "#4C8BF5", value: totals.carbs, target: macroTargets?.carbs, unit: t("common.units.g") },
    { key: "fat", label: t("common.units.fat"), color: "#E8B93E", value: totals.fat, target: macroTargets?.fat, unit: t("common.units.g") },
    { key: "sodium", label: t("common.units.sodium"), color: "#D17B5F", value: totals.sodium, target: DAILY_GUIDELINES.sodiumMaxMg, unit: t("common.units.mg") },
  ];
  return (
    <div style={NS.ringsRow} className="masar-hero-graphic">
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

// نموذج تصحيح بيانات منتج قادم من custom_foods (مساهمة مستخدم سابقة، لا
// بيانات Open Food Facts الخام) - يُعرض فقط عبر زر "تعديل البيانات" الذي
// يظهر حصراً لمنتجات origin="custom_foods" (انظر handleBarcodeDetected).
// الحفظ يمرّ عبر store.saveCustomFood بنفس owner المستخدم الحالي دائماً؛
// بما أن المفتاح الأساسي (owner, barcode) مركّب، هذا لا يمكن أن يكتب فوق
// صف مستخدم آخر مهما كان - إما يُحدّث صف المستخدم الحالي إن كان يملك واحداً
// لهذا الباركود، أو يُنشئ صفاً جديداً منفصلاً باسمه (تصحيح لا استبدال).
function ProductEditForm({ product, onSaved, onCancel, showToast }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    foodName: product.name || "",
    calories: product.caloriesPer100g || 0, protein: product.proteinPer100g || 0,
    carbs: product.carbsPer100g || 0, fat: product.fatPer100g || 0,
    fiber: product.fiberPer100g || 0, sugar: product.sugarPer100g || 0, sodium: product.sodiumPer100gMg || 0,
    cholesterol: product.cholesterolPer100gMg || 0,
  });
  const [micro, setMicro] = useState({ ...(product.micronutrientsPer100g || {}) });
  const [saving, setSaving] = useState(false);
  function change(field, val) { setDraft((d) => ({ ...d, [field]: val })); }
  function changeMicro(key, val) { setMicro((m) => ({ ...m, [key]: val === "" ? undefined : Number(val) })); }
  const valid = draft.foodName.trim() && Number(draft.calories) >= 0;

  async function save() {
    setSaving(true);
    const cleanMicro = {};
    for (const key of Object.keys(MICRONUTRIENT_META)) {
      const v = micro[key];
      if (v != null && !Number.isNaN(Number(v)) && Number(v) > 0) cleanMicro[key] = Number(v);
    }
    const res = await store.saveCustomFood({
      barcode: product.barcode, foodName: draft.foodName.trim(),
      calories: Number(draft.calories) || 0, protein: Number(draft.protein) || 0,
      carbs: Number(draft.carbs) || 0, fat: Number(draft.fat) || 0,
      fiber: Number(draft.fiber) || 0, sugar: Number(draft.sugar) || 0, sodium: Number(draft.sodium) || 0,
      cholesterol: Number(draft.cholesterol) || 0,
      brand: product.brand || "", country: product.country || "", servingSizeLabel: product.servingSizeLabel || "",
      servingGrams: product.servingGrams || null, imageUrl: product.imageUrl || "",
      micronutrients: cleanMicro,
    });
    setSaving(false);
    if (!res.ok) { showToast(t("nutrition.correctionSaveFailed")); return; }
    showToast(t("nutrition.correctionSaved"));
    onSaved({
      name: draft.foodName.trim(),
      caloriesPer100g: Number(draft.calories) || 0, proteinPer100g: Number(draft.protein) || 0,
      carbsPer100g: Number(draft.carbs) || 0, fatPer100g: Number(draft.fat) || 0,
      fiberPer100g: Number(draft.fiber) || 0, sugarPer100g: Number(draft.sugar) || 0,
      sodiumPer100gMg: Number(draft.sodium) || 0, cholesterolPer100gMg: Number(draft.cholesterol) || 0,
      micronutrientsPer100g: cleanMicro,
    });
  }

  return (
    <>
      <p style={{ ...S.label, marginBottom: 8 }}>{t("nutrition.correctProductData")}</p>
      <label style={S.label}>{t("nutrition.foodName")}</label>
      <input value={draft.foodName} onChange={(e) => change("foodName", e.target.value)} style={S.input} />
      <div style={NS.editableGrid}>
        <div>
          <label style={S.label}>{t("nutrition.calories")}</label>
          <input type="number" inputMode="decimal" value={draft.calories} onChange={(e) => change("calories", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.protein")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.protein} onChange={(e) => change("protein", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.carbs")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.carbs} onChange={(e) => change("carbs", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.fat")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.fat} onChange={(e) => change("fat", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.fiber")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.fiber} onChange={(e) => change("fiber", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.sugar")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.sugar} onChange={(e) => change("sugar", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.sodium")} ({t("common.units.mg")})</label>
          <input type="number" inputMode="decimal" value={draft.sodium} onChange={(e) => change("sodium", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.cholesterol")} ({t("common.units.mg")})</label>
          <input type="number" inputMode="decimal" value={draft.cholesterol} onChange={(e) => change("cholesterol", e.target.value)} style={S.input} />
        </div>
      </div>
      <p style={{ ...S.label, marginTop: 14, marginBottom: 4 }}>{t("nutrition.vitaminsMineralsOptional")}</p>
      <div style={NS.editableGrid}>
        {Object.entries(MICRONUTRIENT_META).map(([key, meta]) => (
          <div key={key}>
            <label style={S.label}>{t(`nutrition.micronutrients.${key}`)} ({meta.unit})</label>
            <input
              type="number" inputMode="decimal" value={micro[key] ?? ""}
              onChange={(e) => changeMicro(key, e.target.value)}
              placeholder="0" style={S.input}
            />
          </div>
        ))}
      </div>
      <button onClick={save} style={S.saveBtn} disabled={!valid || saving}>
        {saving ? <Loader2 size={16} className="spin" /> : t("nutrition.saveCorrection")}
      </button>
      <button onClick={onCancel} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>{t("common.buttons.cancel")}</button>
    </>
  );
}

const MEAL_TYPE_EMOJI = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" };

// ===== Priority 5: بطاقة وجبة (Meal Card) =====
// بطاقة واحدة لكل نوع وجبة (فطور/غداء/عشاء/سناك) - تُعرض دائماً حتى بلا
// أصناف (حالة فارغة أنيقة بدل إخفاء البطاقة كلياً)، بخلاف السلوك القديم
// الذي كان يُخفي المجموعة تماماً إن لم تحتوِ أي صنف. التوسّع السطري
// (accordion) والتعديل السريع حالة محلية لكل بطاقة - لا حاجة لرفعها لأعلى
// المكوّن لأنها لا تؤثر إلا على عرض هذه البطاقة نفسها.
function MealCard({ mealType, items, dayTotalCalories, usualTimeLabel, isCurrent, isEn, t, onAddFood, onDeleteItem, onEditSave }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const groupCalories = Math.round(sumNutritionEntries(items).calories);
  const contributionPct = dayTotalCalories > 0 ? Math.min(100, Math.round((groupCalories / dayTotalCalories) * 100)) : 0;

  function toggleExpand(id) {
    setConfirmDeleteId(null);
    if (editingId === id) return;
    setExpandedId((cur) => (cur === id ? null : id));
  }

  function startEdit(item) {
    setEditingId(item.id);
    setExpandedId(item.id);
    setConfirmDeleteId(null);
    setEditDraft({
      calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat,
      fiber: item.fiber || 0, sugar: item.sugar || 0, sodium: item.sodium || 0, cholesterol: item.cholesterol || 0,
    });
  }
  function changeDraft(field, val) { setEditDraft((d) => ({ ...d, [field]: val })); }
  function saveEdit(item) {
    onEditSave({
      ...item,
      calories: Number(editDraft.calories) || 0, protein: Number(editDraft.protein) || 0,
      carbs: Number(editDraft.carbs) || 0, fat: Number(editDraft.fat) || 0,
      fiber: Number(editDraft.fiber) || 0, sugar: Number(editDraft.sugar) || 0,
      sodium: Number(editDraft.sodium) || 0, cholesterol: Number(editDraft.cholesterol) || 0,
    });
    setEditingId(null);
    setEditDraft(null);
  }

  return (
    <div style={{ ...NS.mealCard, ...(isCurrent ? NS.mealCardCurrent : {}) }} data-tour={mealType === "breakfast" ? "meal-card-breakfast" : undefined}>
      <div style={NS.mealCardHeaderTop}>
        <span style={NS.mealCardTitle}>{MEAL_TYPE_EMOJI[mealType]} {t(`nutrition.mealTypes.${mealType}`)}</span>
        <span style={NS.mealCardCalories}><NumericValue value={groupCalories} unit={t("common.units.kcal")} /></span>
      </div>
      {usualTimeLabel && <div style={NS.mealCardUsualTime}>{usualTimeLabel}</div>}
      {items.length > 0 && (
        <div style={NS.mealCardBarTrack}><div style={{ ...NS.mealCardBarFill, width: `${contributionPct}%` }} /></div>
      )}

      {items.length === 0 ? (
        <div style={NS.mealCardEmpty}>
          <span style={NS.mealCardEmptyIcon}>{MEAL_TYPE_EMOJI[mealType]}</span>
          <p style={NS.mealCardEmptyText}>{t("nutrition.mealCardEmpty", { meal: t(`nutrition.mealTypes.${mealType}`) })}</p>
        </div>
      ) : (
        <div style={NS.mealCardItems}>
          {items.map((item) => {
            const isExpanded = expandedId === item.id;
            const isEditing = editingId === item.id;
            const SourceIcon = SOURCE_ICONS[item.source] || Hash;
            return (
              <div key={item.id} style={NS.mealItemRow}>
                <button onClick={() => toggleExpand(item.id)} style={NS.mealItemMain}>
                  <SourceIcon size={13} color="var(--muted2)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={NS.logItemName}>{item.foodName}</div>
                    <div style={NS.logItemMeta}>{item.servingInfo}</div>
                  </div>
                  <div style={NS.logItemCalories}><NumericValue value={Math.round(item.calories)} unit={t("common.units.kcal")} /></div>
                </button>

                {isExpanded && !isEditing && (
                  <div style={NS.mealItemDetail}>
                    <div style={NS.mealItemDetailGrid}>
                      <span>{t("common.units.protein")}: <NumericValue value={item.protein} unit={t("common.units.g")} /></span>
                      <span>{t("common.units.carbs")}: <NumericValue value={item.carbs} unit={t("common.units.g")} /></span>
                      <span>{t("common.units.fat")}: <NumericValue value={item.fat} unit={t("common.units.g")} /></span>
                      <span>{t("common.units.fiber")}: <NumericValue value={item.fiber || 0} unit={t("common.units.g")} /></span>
                      <span>{t("common.units.sodium")}: <NumericValue value={item.sodium || 0} unit={t("common.units.mg")} /></span>
                      <span>{t("common.units.cholesterol")}: <NumericValue value={item.cholesterol || 0} unit={t("common.units.mg")} /></span>
                    </div>
                    <div style={NS.mealItemActionsRow}>
                      <button onClick={() => startEdit(item)} style={NS.mealItemActionBtn}><Edit3 size={13} /> {t("common.buttons.edit")}</button>
                      <button onClick={() => setConfirmDeleteId(item.id)} style={{ ...NS.mealItemActionBtn, color: "#E05252" }}><Trash2 size={13} /> {t("common.buttons.delete")}</button>
                    </div>
                    {confirmDeleteId === item.id && (
                      <div style={NS.mealItemConfirmRow}>
                        <span>{t("nutrition.confirmDeleteItem")}</span>
                        <button onClick={() => { onDeleteItem(item.id); setConfirmDeleteId(null); setExpandedId(null); }} style={NS.mealItemConfirmDeleteBtn}>{t("common.buttons.delete")}</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={NS.mealItemConfirmCancelBtn}>{t("common.buttons.cancel")}</button>
                      </div>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div style={NS.mealItemDetail}>
                    <div style={NS.editableGrid}>
                      <div><label style={S.label}>{t("nutrition.calories")}</label><input type="number" inputMode="decimal" value={editDraft.calories} onChange={(e) => changeDraft("calories", e.target.value)} style={S.input} /></div>
                      <div><label style={S.label}>{t("common.units.protein")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={editDraft.protein} onChange={(e) => changeDraft("protein", e.target.value)} style={S.input} /></div>
                      <div><label style={S.label}>{t("common.units.carbs")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={editDraft.carbs} onChange={(e) => changeDraft("carbs", e.target.value)} style={S.input} /></div>
                      <div><label style={S.label}>{t("common.units.fat")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={editDraft.fat} onChange={(e) => changeDraft("fat", e.target.value)} style={S.input} /></div>
                      <div><label style={S.label}>{t("common.units.fiber")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={editDraft.fiber} onChange={(e) => changeDraft("fiber", e.target.value)} style={S.input} /></div>
                      <div><label style={S.label}>{t("common.units.sugar")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={editDraft.sugar} onChange={(e) => changeDraft("sugar", e.target.value)} style={S.input} /></div>
                      <div><label style={S.label}>{t("common.units.sodium")} ({t("common.units.mg")})</label><input type="number" inputMode="decimal" value={editDraft.sodium} onChange={(e) => changeDraft("sodium", e.target.value)} style={S.input} /></div>
                      <div><label style={S.label}>{t("common.units.cholesterol")} ({t("common.units.mg")})</label><input type="number" inputMode="decimal" value={editDraft.cholesterol} onChange={(e) => changeDraft("cholesterol", e.target.value)} style={S.input} /></div>
                    </div>
                    <div style={NS.mealItemActionsRow}>
                      <button onClick={() => saveEdit(item)} style={{ ...S.saveBtn, marginTop: 0, flex: 1 }}>{t("common.buttons.save")}</button>
                      <button onClick={() => { setEditingId(null); setEditDraft(null); }} style={{ ...S.exportBtn, marginTop: 0, marginBottom: 0, flex: 1 }}>{t("common.buttons.cancel")}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => onAddFood(mealType)} style={NS.mealCardAddBtn} data-tour={mealType === "breakfast" ? "add-breakfast" : undefined}>
        <Plus size={14} /> {t("nutrition.addToMeal", { meal: t(`nutrition.mealTypes.${mealType}`) })}
      </button>
    </div>
  );
}

// "الوقت المعتاد" لكل نوع وجبة - نطاق الساعات الفعلي الذي يسجّل فيه
// المستخدم عادة هذه الوجبة، مبني حصراً من أوقات تسجيل حقيقية سابقة
// (created_at) - لا افتراض ثابت. عتبة 3 إدخالات على الأقل (نفس عتبة
// analyzeMealPatterns) قبل عرض أي نمط - بيانات أقل لا تكفي لوصفها "معتادة".
function formatHourRange(minH, maxH, isEn) {
  function to12(h) {
    const period = h < 12 ? (isEn ? "AM" : "ص") : (isEn ? "PM" : "م");
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return { h12, period };
  }
  const a = to12(minH);
  const b = to12(maxH);
  return a.period === b.period ? `${a.h12}-${b.h12} ${a.period}` : `${a.h12} ${a.period} - ${b.h12} ${b.period}`;
}

// اختيار تصنيف الوجبة - يظهر في كل شاشة "تأكيد/حفظ" عبر طرق الإضافة الخمس
// (باركود وبحث ويدوي عبر ConfirmQuantityCard المشتركة، وتصوير الوجبة
// وتصوير الملصق كل منهما بشاشته الخاصة) بنفس المكوّن الموحّد هذا. القيمة
// الافتراضية (guessMealType في nutrition.js) مجرد تخمين أولي مريح حسب وقت
// اليوم الحالي - قابلة للتغيير الفوري، لا قيد على أي اختيار.
function MealTypeSelector({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <>
      <label style={S.label}>{t("nutrition.mealTypeLabel")}</label>
      <div style={NS.mealTypeRow}>
        {MEAL_TYPES.map((mt) => (
          <button
            key={mt} type="button" onClick={() => onChange(mt)}
            style={{ ...NS.mealTypeBtn, ...(value === mt ? NS.mealTypeBtnActive : {}) }}
          >
            <span style={{ fontSize: 17 }}>{MEAL_TYPE_EMOJI[mt]}</span>
            <span>{t(`nutrition.mealTypes.${mt}`)}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function ConfirmQuantityCard({ product: initialProduct, source, onAdd, onCancel, showToast, preselectedMealType }) {
  const { t } = useTranslation();
  const [product, setProduct] = useState(initialProduct);
  const [editing, setEditing] = useState(false);
  const hasServing = !!product.servingGrams;
  const [unit, setUnit] = useState("g");
  const [multiplier, setMultiplier] = useState(1);
  const [grams, setGrams] = useState(hasServing ? Math.round(product.servingGrams) : 100);
  const [unitQty, setUnitQty] = useState(1);
  const [mealType, setMealType] = useState(() => preselectedMealType || guessMealType());
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
  // servingPresets() is positional (no .id field) — mirror its exact order
  // here without touching lib/nutrition.js: [100g] always first, then
  // [one serving] only when the product has a known serving size, then
  // [cup ~240g] last.
  const presetIds = product.servingGrams ? ["grams100", "oneServing", "cupApprox"] : ["grams100", "cupApprox"];
  // أي وحدة غير الغرام تُحوَّل داخلياً لغرام/مليلتر مكافئ (تقدير تقريبي
  // لغير الأوزان المباشرة) قبل حساب القيم الغذائية، حتى يبقى scaleNutrients
  // بمعامل غرام/100 وحيد بغض النظر عن الوحدة التي اختارها المستخدم.
  const gramsEquivalent = unit === "g" ? grams : unitToGrams(unit, unitQty, product.servingGrams);
  const preview = scaleNutrients(product, gramsEquivalent || 0);
  const unitMeta = unitById(unit);
  const unitBaseQty = unitServingSize(unit, product.servingGrams);

  if (editing) {
    return (
      <ProductEditForm
        product={product}
        showToast={showToast}
        onCancel={() => setEditing(false)}
        onSaved={(corrected) => { setProduct((p) => ({ ...p, ...corrected })); setEditing(false); }}
      />
    );
  }

  return (
    <>
      <div style={NS.productHead}>
        {product.imageUrl && <img src={product.imageUrl} alt="" style={NS.productImg} />}
        <div style={{ flex: 1 }}>
          <div style={NS.productName}>{product.name}</div>
          <div style={NS.productMeta}>{t("nutrition.calPer100g", { cal: product.caloriesPer100g })}</div>
        </div>
        {product.origin === "custom_foods" && (
          <button onClick={() => setEditing(true)} style={NS.editDataBtn}><Edit3 size={13} /> {t("nutrition.editData")}</button>
        )}
      </div>
      <label style={S.label}>{t("nutrition.unitOfMeasure")}</label>
      <div style={NS.unitRow}>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={NS.unitSelect}>
          {UNIT_OPTIONS.map((u) => <option key={u.id} value={u.id}>{t(`nutrition.unitOptions.${u.id}`)}</option>)}
        </select>
      </div>
      {unit === "g" ? (
        <>
          {hasServing && (
            <>
              <label style={S.label}>{t("nutrition.servingsCountEach", { g: Math.round(product.servingGrams) })}</label>
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
          <label style={S.label}>{hasServing ? t("nutrition.orEditQuantityGrams") : t("nutrition.quantityGrams")}</label>
          <input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(Number(e.target.value))} style={S.input} />
          {!hasServing && (
            <div style={NS.presetRow}>
              {presets.map((p, i) => (
                <button key={p.label} onClick={() => setGrams(p.grams)} style={{ ...NS.presetChip, ...(grams === p.grams ? NS.presetChipActive : {}) }}>{t(`nutrition.servingPresets.${presetIds[i]}`)}</button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <label style={S.label}>{t("nutrition.servingsCountEachUnit", { qty: fmtQty(unitBaseQty), unit: t(`nutrition.unitOptions.${unit}`) })}</label>
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
          <label style={S.label}>{t("nutrition.orEditQuantityUnit", { unit: t(`nutrition.unitOptions.${unit}`) })}</label>
          <input type="number" inputMode="decimal" value={unitQty} onChange={(e) => setUnitQty(Number(e.target.value) || 0)} style={S.input} />
          {unitMeta.approx && <p style={NS.unitApproxNote}>{t("nutrition.approxConversionNote")}</p>}
        </>
      )}
      <div style={NS.previewGrid}>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview.calories} /></div><div style={NS.macroLabel}>{t("common.units.kcal")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview.protein} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.protein")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview.carbs} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.carbs")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview.fat} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.fat")}</div></div>
      </div>
      <div style={NS.previewGrid}>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview.fiber} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.fiber")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview.sugar} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.sugar")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview.sodium} unit={t("common.units.mg")} /></div><div style={NS.macroLabel}>{t("common.units.sodium")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview.cholesterol} unit={t("common.units.mg")} /></div><div style={NS.macroLabel}>{t("common.units.cholesterol")}</div></div>
      </div>
      <MealTypeSelector value={mealType} onChange={setMealType} />
      <button
        onClick={() => onAdd({
          id: uid(), foodName: product.name, ...preview,
          unit,
          // خلل حقيقي وُجد وأُصلح: كانت هذه تعرض دائماً "multiplier × servingGrams"
          // بمجرد وجود حجم حصة معروف للمنتج، حتى لو عدّل المستخدم حقل "الكمية
          // (غم)" يدوياً لرقم مختلف تماماً - فيُحفظ في السجل نص "1 × 120غ" رغم
          // أن القيم الغذائية الفعلية محسوبة لكمية أخرى بالكامل (كانت القيمة
          // الرقمية نفسها صحيحة دائماً، فقط النص الوصفي في السجل مضلِّلاً). الآن
          // يُقارَن grams الفعلي بما يفترضه multiplier×servingGrams: تطابق يعني
          // المستخدم استخدم أزرار ×1..×5 فعلاً (نفس النص القديم كما هو)، وأي
          // اختلاف يعني تعديلاً يدوياً فيُعرض الرقم الفعلي مباشرة بدل تضليل.
          servingInfo: unit === "g"
            ? (hasServing && grams === Math.round(product.servingGrams * multiplier)
                ? `${multiplier} × ${Math.round(product.servingGrams)}${t("common.units.g")}`
                : `${grams} ${t("common.units.g")}`)
            : `${fmtQty(unitQty)} ${t(`nutrition.unitOptions.${unit}`)}`,
          source, mealType,
          // origin==="generic" فقط (أطعمة generic-foods.js التقريبية) تُوسَم
          // بـmicroApprox=true - بيانات باركود/بحث/USDA الحقيقية الأخرى تبقى
          // بلا علامة تقريب لأنها دقيقة فعلياً لهذا المنتج بعينه.
          microApprox: product.origin === "generic",
          micronutrients: scaleMicronutrients(product.micronutrientsPer100g, gramsEquivalent || 0),
        })}
        style={S.saveBtn}
        disabled={!gramsEquivalent || gramsEquivalent <= 0}
      >
        {t("nutrition.addToTodayLog")}
      </button>
      <button onClick={onCancel} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>{t("common.buttons.back")}</button>
    </>
  );
}

function ManualEntryForm({ barcode, onSave, onCancel, preselectedMealType }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    foodName: "", brand: "", country: "", servingSizeLabel: "", unit: "g", qty: "",
    calories: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", sodium: "", cholesterol: "", imageUrl: "",
  });
  const [multiplier, setMultiplier] = useState(1);
  const [mealType, setMealType] = useState(() => preselectedMealType || guessMealType());
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
      {barcode && <p style={NS.notFoundNote}>{t("nutrition.productNotFound", { barcode })}</p>}
      <label style={S.label}>{t("nutrition.foodName")}</label>
      <input value={draft.foodName} onChange={(e) => change("foodName", e.target.value)} placeholder={t("nutrition.foodNamePlaceholder")} style={S.input} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("nutrition.brand")}</label>
          <input value={draft.brand} onChange={(e) => change("brand", e.target.value)} placeholder={t("nutrition.optional")} style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("nutrition.country")}</label>
          <input value={draft.country} onChange={(e) => change("country", e.target.value)} placeholder={t("nutrition.optional")} style={S.input} />
        </div>
      </div>
      <label style={S.label}>{t("nutrition.servingDesc")}</label>
      <input value={draft.servingSizeLabel} onChange={(e) => change("servingSizeLabel", e.target.value)} placeholder={t("nutrition.servingDescPlaceholder")} style={S.input} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("nutrition.unitOfMeasure")}</label>
          <select value={draft.unit} onChange={(e) => change("unit", e.target.value)} style={NS.unitSelect}>
            {UNIT_OPTIONS.map((u) => <option key={u.id} value={u.id}>{t(`nutrition.unitOptions.${u.id}`)}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("nutrition.quantityNow", { unit: t(`nutrition.unitOptions.${draft.unit}`) })}</label>
          <input type="number" inputMode="decimal" value={draft.qty} onChange={(e) => change("qty", e.target.value)} placeholder="35" style={S.input} />
        </div>
      </div>
      <label style={S.label}>{t("nutrition.servingsCountOneUnit", { unit: t(`nutrition.unitOptions.${draft.unit}`) })}</label>
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
      {unitMeta.approx && <p style={NS.unitApproxNote}>{t("nutrition.approxConversionNoUnit")}</p>}
      <p style={{ ...S.label, marginTop: 16, marginBottom: 4 }}>{t("nutrition.nutritionValuesPer100g")}</p>
      <label style={S.label}>{t("nutrition.calories")}</label>
      <input type="number" inputMode="decimal" value={draft.calories} onChange={(e) => change("calories", e.target.value)} placeholder={t("nutrition.caloriesPlaceholder")} style={S.input} />
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("common.units.protein")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.protein} onChange={(e) => change("protein", e.target.value)} placeholder="0" style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("common.units.carbs")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.carbs} onChange={(e) => change("carbs", e.target.value)} placeholder="0" style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("common.units.fat")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.fat} onChange={(e) => change("fat", e.target.value)} placeholder="0" style={S.input} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("common.units.fiber")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.fiber} onChange={(e) => change("fiber", e.target.value)} placeholder="0" style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("common.units.sugar")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={draft.sugar} onChange={(e) => change("sugar", e.target.value)} placeholder="0" style={S.input} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("common.units.sodium")} ({t("common.units.mg")})</label>
          <input type="number" inputMode="decimal" value={draft.sodium} onChange={(e) => change("sodium", e.target.value)} placeholder="0" style={S.input} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>{t("common.units.cholesterol")} ({t("common.units.mg")})</label>
          <input type="number" inputMode="decimal" value={draft.cholesterol} onChange={(e) => change("cholesterol", e.target.value)} placeholder="0" style={S.input} />
        </div>
      </div>
      <label style={S.label}>{t("nutrition.productImageUrlOptional")}</label>
      <input value={draft.imageUrl} onChange={(e) => change("imageUrl", e.target.value)} placeholder="https://..." style={S.input} />
      <MealTypeSelector value={mealType} onChange={setMealType} />
      <button
        onClick={() => {
          const per100 = {
            calories: Number(draft.calories) || 0, protein: Number(draft.protein) || 0,
            carbs: Number(draft.carbs) || 0, fat: Number(draft.fat) || 0,
            fiber: Number(draft.fiber) || 0, sugar: Number(draft.sugar) || 0, sodium: Number(draft.sodium) || 0,
            cholesterol: Number(draft.cholesterol) || 0,
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
            sodium: Math.round(per100.sodium * factor), cholesterol: Math.round(per100.cholesterol * factor),
            unit: draft.unit, mealType,
            servingInfo: draft.servingSizeLabel.trim() || `${draft.qty || grams} ${t(`nutrition.unitOptions.${draft.unit}`)}`, source: "manual", barcode,
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
        {t("nutrition.saveAndAddToLog")}
      </button>
      <button onClick={onCancel} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>{t("common.buttons.back")}</button>
    </>
  );
}

// معالج "منتج جديد" من 3 خطوات: يحل محل النموذج اليدوي الطويل كتجربة
// افتراضية أسهل لإضافة منتج غير موجود (لا يحذفه - onManual يبقى متاحاً في
// كل خطوة لمن يفضّل النموذج الكامل). كل خطوة تبني على حالة مشتركة واحدة في
// هذا المكوّن، فلا تُفقد أي بيانات عند الرجوع/التالي بين الخطوات.
function AddProductWizard({ initialBarcode, onSave, onManual, showToast }) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);

  // الخطوة 1: الملصق الغذائي
  const [labelPreview, setLabelPreview] = useState(null);
  const [labelAnalyzing, setLabelAnalyzing] = useState(false);
  const [labelError, setLabelError] = useState(null);
  const [label, setLabel] = useState(null);
  const [basisValues, setBasisValues] = useState(null);
  const [microValues, setMicroValues] = useState({});
  const labelCameraRef = useRef(null);
  const labelGalleryRef = useRef(null);

  async function handleLabelFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLabelPreview(URL.createObjectURL(file));
    setLabelError(null);
    setLabelAnalyzing(true);
    const res = await readNutritionLabel(file, i18n.language);
    setLabelAnalyzing(false);
    if (!res.ok) { setLabelError(i18n.language === "en" ? (res.errorEn || res.error) : res.error); return; }
    setLabel(res);
    setBasisValues({ calories: res.calories, protein: res.protein, carbs: res.carbs, fat: res.fat, fiber: res.fiber, sugar: res.sugar, sodium: res.sodium, cholesterol: res.cholesterol });
    setMicroValues({ ...res.micronutrients });
    if (res.productName) setName((n) => n || res.productName);
  }
  // تعذّرت قراءة الملصق (أو لا صورة أصلاً) - يبدأ المستخدم بقيم فارغة قابلة
  // للتعديل يدوياً بدل إخراجه من المعالج كلياً، نفس مبدأ "كل القيم قابلة
  // للتعديل" المطلوب.
  function enterValuesManually() {
    setLabel({ basis: "100g", servingGrams: null, productName: null });
    setBasisValues({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0 });
    setMicroValues({});
    setLabelError(null);
  }
  function changeBasis(field, val) { setBasisValues((b) => ({ ...b, [field]: Number(val) || 0 })); }
  function changeMicro(key, val) { setMicroValues((m) => ({ ...m, [key]: val === "" ? undefined : Number(val) })); }

  // الخطوة 2: الباركود والاسم
  const [barcode, setBarcode] = useState(initialBarcode || "");
  const [barcodeMode, setBarcodeMode] = useState("manual");
  const [showScanner, setShowScanner] = useState(false);
  const [name, setName] = useState("");

  // الخطوة 3: صورة المنتج + التسجيل الاختياري في سجل اليوم
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoCameraRef = useRef(null);
  const photoGalleryRef = useRef(null);
  const [logToday, setLogToday] = useState(true);
  const [qtyUnit, setQtyUnit] = useState("g");
  const [qtyMultiplier, setQtyMultiplier] = useState(1);
  const [qtyGrams, setQtyGrams] = useState(100);
  const [qtyUnitQty, setQtyUnitQty] = useState(1);
  const [saving, setSaving] = useState(false);

  function handlePhotoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  // per100: تطبيع القيم المُدخلة (أياً كان أساسها المرجعي: 100g/100ml/حصة)
  // لصيغة "لكل 100غم" الموحّدة - نفس الآلية المستخدمة أصلاً في LabelPhotoPanel
  // (labelToPer100Product)، فيبقى custom_foods متسقاً بغض النظر عن مصدر الإدخال.
  const per100 = (basisValues && label)
    ? labelToPer100Product({ ...basisValues, basis: label.basis, servingGrams: label.servingGrams, micronutrients: microValues })
    : null;
  const gramsEquivalent = qtyUnit === "g" ? qtyGrams : unitToGrams(qtyUnit, qtyUnitQty, per100?.servingGrams);
  const qtyPreview = per100 ? scaleNutrients(per100, gramsEquivalent || 0) : null;

  const step1Valid = !!basisValues;
  const step2Valid = barcode.trim() && name.trim();

  async function finalSave() {
    setSaving(true);
    let imageUrl = "";
    if (photoFile) {
      try {
        const blob = await compressImageToBlob(photoFile);
        const upRes = await store.uploadProductPhoto(blob, barcode.trim());
        if (upRes.ok) imageUrl = upRes.url;
        else showToast(t("nutrition.uploadPhotoFailed"));
      } catch {
        showToast(t("nutrition.processPhotoFailed"));
      }
    }
    const cleanMicro = {};
    for (const key of Object.keys(MICRONUTRIENT_META)) {
      const v = per100.micronutrientsPer100g[key];
      if (v != null && !Number.isNaN(v) && v > 0) cleanMicro[key] = Math.round(v * 100) / 100;
    }
    await onSave({
      id: uid(), foodName: name.trim(), ...qtyPreview,
      unit: qtyUnit,
      servingInfo: qtyUnit === "g" ? `${qtyGrams} ${t("common.units.g")}` : `${fmtQty(qtyUnitQty)} ${t(`nutrition.unitOptions.${qtyUnit}`)}`,
      source: "manual", barcode: barcode.trim(),
      productPer100: {
        calories: per100.caloriesPer100g, protein: per100.proteinPer100g, carbs: per100.carbsPer100g,
        fat: per100.fatPer100g, fiber: per100.fiberPer100g, sugar: per100.sugarPer100g, sodium: per100.sodiumPer100gMg,
        cholesterol: per100.cholesterolPer100gMg,
        micronutrients: cleanMicro,
      },
      brand: "", country: "", servingSizeLabel: "", servingGrams: per100.servingGrams || null, imageUrl,
      micronutrients: scaleMicronutrients(per100.micronutrientsPer100g, gramsEquivalent || 0),
      logToday,
    });
    setSaving(false);
  }

  return (
    <>
      <div style={NS.wizardProgress}>
        <div style={NS.wizardProgressLabel}>{t("nutrition.stepOf3", { step })}</div>
        <div style={NS.barTrack}><div style={{ ...NS.barFill, width: `${(step / 3) * 100}%` }} /></div>
      </div>

      {step === 1 && (
        <>
          <p style={{ ...S.label, marginBottom: 8 }}>{t("nutrition.photographLabel")}</p>
          <input ref={labelCameraRef} type="file" accept="image/*" capture="environment" onChange={handleLabelFile} style={{ display: "none" }} />
          <input ref={labelGalleryRef} type="file" accept="image/*" onChange={handleLabelFile} style={{ display: "none" }} />
          {!labelPreview && (
            <div style={NS.chooserGrid}>
              <button onClick={() => labelCameraRef.current?.click()} style={NS.chooserBtn}>
                <span style={NS.chooserIcon}><Camera size={19} /></span> {t("nutrition.takePhoto")}
              </button>
              <button onClick={() => labelGalleryRef.current?.click()} style={NS.chooserBtn}>
                <span style={NS.chooserIcon}><ImagePlus size={19} /></span> {t("nutrition.chooseFromGallery")}
              </button>
            </div>
          )}
          {labelPreview && <img src={labelPreview} alt="" style={NS.photoPreview} />}
          {labelAnalyzing && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 10 }}>
              <Loader2 size={22} className="spin" color="var(--gold)" />
              <span style={{ fontSize: 13, color: "var(--muted2)" }}>{t("nutrition.readingLabel")}</span>
            </div>
          )}
          {labelError && (
            <>
              <div style={NS.errorText}>{labelError}</div>
              <button onClick={() => { setLabelPreview(null); setLabelError(null); }} style={{ ...S.exportBtn, marginBottom: 8 }}>{t("nutrition.retryWithAnotherPhoto")}</button>
              <button onClick={enterValuesManually} style={{ ...S.exportBtn, marginBottom: 8 }}>{t("nutrition.enterManuallyInstead")}</button>
            </>
          )}
          {!labelPreview && !labelError && (
            <button onClick={enterValuesManually} style={{ ...S.exportBtn, marginTop: 8 }}>{t("nutrition.noPhotoManualEntry")}</button>
          )}
          {basisValues && (
            <>
              <div style={NS.disclaimerBox}>
                <Sparkles size={15} color="#C9A24B" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{t("nutrition.reviewValuesNote")}</span>
              </div>
              <p style={{ ...S.label, marginBottom: 4 }}>
                {label.basis === "100g" ? t("nutrition.per100g") : label.basis === "100ml" ? t("nutrition.per100ml") : t("nutrition.perServingG", { g: Math.round(label.servingGrams || 100) })}
              </p>
              <div style={NS.editableGrid}>
                <div><label style={S.label}>{t("nutrition.calories")}</label><input type="number" inputMode="decimal" value={basisValues.calories} onChange={(e) => changeBasis("calories", e.target.value)} style={S.input} /></div>
                <div><label style={S.label}>{t("common.units.protein")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={basisValues.protein} onChange={(e) => changeBasis("protein", e.target.value)} style={S.input} /></div>
                <div><label style={S.label}>{t("common.units.carbs")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={basisValues.carbs} onChange={(e) => changeBasis("carbs", e.target.value)} style={S.input} /></div>
                <div><label style={S.label}>{t("common.units.fat")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={basisValues.fat} onChange={(e) => changeBasis("fat", e.target.value)} style={S.input} /></div>
                <div><label style={S.label}>{t("common.units.fiber")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={basisValues.fiber} onChange={(e) => changeBasis("fiber", e.target.value)} style={S.input} /></div>
                <div><label style={S.label}>{t("common.units.sugar")} ({t("common.units.g")})</label><input type="number" inputMode="decimal" value={basisValues.sugar} onChange={(e) => changeBasis("sugar", e.target.value)} style={S.input} /></div>
                <div><label style={S.label}>{t("common.units.sodium")} ({t("common.units.mg")})</label><input type="number" inputMode="decimal" value={basisValues.sodium} onChange={(e) => changeBasis("sodium", e.target.value)} style={S.input} /></div>
                <div><label style={S.label}>{t("common.units.cholesterol")} ({t("common.units.mg")})</label><input type="number" inputMode="decimal" value={basisValues.cholesterol} onChange={(e) => changeBasis("cholesterol", e.target.value)} style={S.input} /></div>
              </div>
              <p style={{ ...S.label, marginTop: 14, marginBottom: 4 }}>{t("nutrition.vitaminsMineralsOptionalShort")}</p>
              <div style={NS.editableGrid}>
                {Object.entries(MICRONUTRIENT_META).map(([key, meta]) => (
                  <div key={key}>
                    <label style={S.label}>{t(`nutrition.micronutrients.${key}`)} ({meta.unit})</label>
                    <input type="number" inputMode="decimal" value={microValues[key] ?? ""} onChange={(e) => changeMicro(key, e.target.value)} placeholder="0" style={S.input} />
                  </div>
                ))}
              </div>
            </>
          )}
          <div style={NS.wizardNavRow}>
            <button onClick={onManual} style={NS.wizardBackBtn}>{t("nutrition.manualAddInstead")}</button>
            <button onClick={() => setStep(2)} disabled={!step1Valid} style={NS.wizardNextBtn}>{t("common.buttons.next")} {i18n.language === "en" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p style={{ ...S.label, marginBottom: 8 }}>{t("nutrition.barcodeAndName")}</p>
          <div style={NS.multiplierRow}>
            <button onClick={() => setBarcodeMode("manual")} style={{ ...NS.multiplierBtn, width: "auto", padding: "0 14px", ...(barcodeMode === "manual" ? NS.multiplierBtnActive : {}) }}>{t("nutrition.manualTyping")}</button>
            <button onClick={() => setBarcodeMode("scan")} style={{ ...NS.multiplierBtn, width: "auto", padding: "0 14px", ...(barcodeMode === "scan" ? NS.multiplierBtnActive : {}) }}>{t("nutrition.scanWithCamera")}</button>
          </div>
          {barcodeMode === "manual" ? (
            <input
              value={barcode} onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))}
              placeholder={t("nutrition.barcodePlaceholder")} inputMode="numeric" style={S.input}
            />
          ) : (
            <button onClick={() => setShowScanner(true)} style={{ ...S.exportBtn, marginBottom: 12 }}>
              <Camera size={16} style={{ display: "inline", verticalAlign: "-3px", marginInlineEnd: 6 }} />
              {barcode ? t("nutrition.barcodeScanAgain", { barcode }) : t("nutrition.openCameraToScan")}
            </button>
          )}
          <label style={S.label}>{t("nutrition.productName")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("nutrition.foodNamePlaceholder")} style={S.input} />
          {label?.productName && name === label.productName && (
            <p style={NS.unitApproxNote}>{t("nutrition.autoSuggestedNote")}</p>
          )}
          <div style={NS.wizardNavRow}>
            <button onClick={() => setStep(1)} style={NS.wizardBackBtn}>{i18n.language === "en" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />} {t("common.buttons.back")}</button>
            <button onClick={() => setStep(3)} disabled={!step2Valid} style={NS.wizardNextBtn}>{t("common.buttons.next")} {i18n.language === "en" ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}</button>
          </div>
          {showScanner && (
            <BarcodeScannerModal onDetected={(code) => { setBarcode(code); setShowScanner(false); }} onClose={() => setShowScanner(false)} />
          )}
        </>
      )}

      {step === 3 && (
        <>
          <p style={{ ...S.label, marginBottom: 8 }}>{t("nutrition.productPhotoOptional")}</p>
          <input ref={photoCameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} style={{ display: "none" }} />
          <input ref={photoGalleryRef} type="file" accept="image/*" onChange={handlePhotoFile} style={{ display: "none" }} />
          {!photoPreview ? (
            <div style={NS.chooserGrid}>
              <button onClick={() => photoCameraRef.current?.click()} style={NS.chooserBtn}>
                <span style={NS.chooserIcon}><Camera size={19} /></span> {t("nutrition.takePhoto")}
              </button>
              <button onClick={() => photoGalleryRef.current?.click()} style={NS.chooserBtn}>
                <span style={NS.chooserIcon}><ImagePlus size={19} /></span> {t("nutrition.chooseFromGallery")}
              </button>
            </div>
          ) : (
            <>
              <img src={photoPreview} alt="" style={NS.photoPreview} />
              <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} style={{ ...S.exportBtn, marginTop: 4 }}>{t("nutrition.removePhoto")}</button>
            </>
          )}
          {!photoPreview && (
            <p style={{ ...NS.unitApproxNote, textAlign: "center" }}>{t("nutrition.optionalStepNote")}</p>
          )}

          <label style={NS.checkboxRow}>
            <input type="checkbox" checked={logToday} onChange={(e) => setLogToday(e.target.checked)} style={{ width: 18, height: 18 }} />
            {t("nutrition.alsoAddQuantity")}
          </label>

          {logToday && (
            <>
              <label style={S.label}>{t("nutrition.unitOfMeasure")}</label>
              <div style={NS.unitRow}>
                <select value={qtyUnit} onChange={(e) => setQtyUnit(e.target.value)} style={NS.unitSelect}>
                  {UNIT_OPTIONS.map((u) => <option key={u.id} value={u.id}>{t(`nutrition.unitOptions.${u.id}`)}</option>)}
                </select>
              </div>
              {qtyUnit === "g" ? (
                <>
                  <label style={S.label}>{t("nutrition.quantityG")}</label>
                  <input type="number" inputMode="decimal" value={qtyGrams} onChange={(e) => setQtyGrams(Number(e.target.value))} style={S.input} />
                </>
              ) : (
                <>
                  <label style={S.label}>{t("nutrition.servingsCount")}</label>
                  <div style={NS.multiplierRow}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => { setQtyMultiplier(n); setQtyUnitQty(n); }} style={{ ...NS.multiplierBtn, ...(qtyMultiplier === n ? NS.multiplierBtnActive : {}) }}>×{n}</button>
                    ))}
                  </div>
                  <label style={S.label}>{t("nutrition.orQuantityUnit", { unit: t(`nutrition.unitOptions.${qtyUnit}`) })}</label>
                  <input type="number" inputMode="decimal" value={qtyUnitQty} onChange={(e) => setQtyUnitQty(Number(e.target.value) || 0)} style={S.input} />
                </>
              )}
              {qtyPreview && (
                <div style={NS.previewGrid}>
                  <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={qtyPreview.calories} /></div><div style={NS.macroLabel}>{t("common.units.kcal")}</div></div>
                  <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={qtyPreview.protein} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.protein")}</div></div>
                  <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={qtyPreview.carbs} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.carbs")}</div></div>
                  <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={qtyPreview.fat} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.fat")}</div></div>
                </div>
              )}
            </>
          )}

          <div style={NS.wizardNavRow}>
            <button onClick={() => setStep(2)} style={NS.wizardBackBtn}>{i18n.language === "en" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />} {t("common.buttons.back")}</button>
            <button
              onClick={finalSave}
              disabled={saving || (logToday && (!gramsEquivalent || gramsEquivalent <= 0))}
              style={NS.wizardNextBtn}
            >
              {saving ? <Loader2 size={16} className="spin" /> : t("common.buttons.save")}
            </button>
          </div>
        </>
      )}
    </>
  );
}

// أيقونة توضيحية للفئة تُستخدم فقط عندما لا تتوفر صورة حقيقية للمنتج
// (الحال الشائع لأطعمة generic-foods المحلية؛ نتائج custom_foods/Open Food
// Facts تحمل غالباً صورة حقيقية فتُستخدَم بدلها مباشرة - انظر رندر النتائج
// في SearchPanel أدناه).
const CATEGORY_ICONS = {
  egg: Egg, poultry: Drumstick, meat: Beef, fish: Fish, grain: Wheat,
  vegetable: Carrot, fruit: Apple, legume: Bean, dairy: Milk, nut: Nut,
  beverage: Coffee, oil: Droplet, other: Cookie,
};
// Salad هي أيقونة احتياطية عامة (لا "other" تحديداً - تلك محجوزة لعسل/أخرى
// شائعة عبر Cookie) لأي نتيجة بلا فئة معروفة وبلا صورة حقيقية أيضاً - وهي
// الحالة الشائعة لنتائج USDA (آلاف الأطعمة بلا تصنيف فئة في بياناتنا).
function CategoryIcon({ category }) {
  const Icon = CATEGORY_ICONS[category] || Salad;
  return <Icon size={17} color="var(--muted2)" />;
}

// بحث موحّد: يدمج أربعة مصادر في نتيجة واحدة مرتّبة -
// 1) generic-foods.js (محلي، فوري بلا مؤقت ولا اتصال شبكة على الإطلاق).
// 2) USDA FoodData Central (شبكة عبر netlify/functions/usda.js، آلاف
//    الأطعمة العامة الموثّقة رسمياً - المصدر الأساسي الجديد لسدّ أي نقص).
// 3) custom_foods المشتركة (مساهمات مستخدمين سابقين، بحث بالاسم).
// 4) Open Food Facts (شبكة، منتجات تجارية بباركود).
// المصادر 2-4 تعمل بمؤقت debounce قصير (350ms) بعد توقف الكتابة، ولا
// تحجب أبداً ظهور نتائج (1) الفورية. ترتيب العرض: محلي أولاً، ثم USDA
// (قاعدة عامة ضخمة وموثّقة)، ثم custom_foods، ثم Open Food Facts أخيراً.
// ترتيب أنواع بيانات USDA من الأقرب لـ"عنصر أساسي/خام" إلى الأبعد (أطباق
// مُجهَّزة/منتجات تجارية) - Foundation وSR Legacy مصادر USDA المرجعية
// الأدق للأطعمة الخام، Survey (FNDDS) تشمل أطعمة مُجهَّزة ووجبات، Branded
// منتجات تجارية بأسماء علامات. لا تسلسل هرمي حقيقي هنا (USDA لا يوفّر
// "عنصر أساسي ثم تنويعات تحته" كبنية بيانات صريحة) - هذا ترتيب تقريبي
// ذكي فقط: نوع البيانات أولاً، ثم طول الوصف تصاعدياً كمؤشر تقريبي على
// البساطة ("Egg, whole, raw, fresh" أقصر وأقرب لـ"أساسي" من "Egg, whole,
// cooked, fried, no added fat").
const USDA_DATA_TYPE_RANK = { "Foundation": 0, "SR Legacy": 1, "Survey (FNDDS)": 2, "Branded": 3 };
function sortUsdaResults(products) {
  return [...products].sort((a, b) => {
    const rankA = USDA_DATA_TYPE_RANK[a.dataType] ?? 4;
    const rankB = USDA_DATA_TYPE_RANK[b.dataType] ?? 4;
    if (rankA !== rankB) return rankA - rankB;
    return (a.name?.length || 0) - (b.name?.length || 0);
  });
}

function SearchPanel({ onPick, onManual }) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const [query, setQuery] = useState("");
  const [customResults, setCustomResults] = useState([]);
  const [offResults, setOffResults] = useState([]);
  const [offLoading, setOffLoading] = useState(false);
  const [offError, setOffError] = useState(null);
  const [usdaResults, setUsdaResults] = useState([]);
  const [usdaLoading, setUsdaLoading] = useState(false);
  const [usdaError, setUsdaError] = useState(null);
  // يحرس ضد سباق حالات بين طلبات شبكة متتالية (نفس مبدأ requestIdRef
  // السابق) - لو تغيّر النص قبل عودة رد سابق، يُتجاهل أي رد متأخر لا يحمل
  // أحدث رقم مسجَّل وقت وصوله.
  const requestIdRef = useRef(0);
  const normalized = normalizeSearchTerm(query);

  // محلي وفوري بلا أي مؤقت - 77 عنصراً كحد أقصى حالياً، حساب رخيص جداً على
  // كل ضغطة زر، فتظهر نتائج الأطعمة الأساسية "من أول محاولة" بلا أي تأخير.
  const genericResults = useMemo(
    () => searchGenericFoods(normalized).map((f) => genericFoodToProduct(f, isEn)),
    [normalized, isEn],
  );

  // بحث الشبكة: USDA FoodData Central (المصدر الأساسي الجديد، آلاف الأطعمة
  // العامة الموثّقة) + custom_foods المشتركة + Open Food Facts (منتجات
  // تجارية بباركود) - الثلاثة بمؤقت debounce واحد (350ms). USDA لا يفهم
  // العربية إطلاقاً، فيُترجَم مصطلح البحث أولاً عبر food_synonyms (نفس
  // الجدول المستخدم أصلاً لمرادفات Open Food Facts) - نداء واحد مشترك
  // (canonicalPromise) يُعاد استخدامه لكل من USDA والاحتياط الذكي لـOFF،
  // بدل مضاعفة نفس الاستعلام مرتين.
  useEffect(() => {
    // تُمسَح نتائج الشبكة السابقة فوراً عند أي تغيير في نص البحث (لا تنتظر
    // مهلة الـdebounce) حتى لا تظهر نتائج شبكة تخص بحثاً سابقاً مختلطة مع
    // النتائج المحلية الجديدة الظاهرة فوراً أعلاه.
    setOffResults([]); setCustomResults([]); setOffError(null);
    setUsdaResults([]); setUsdaError(null);
    if (!normalized) { setOffLoading(false); setUsdaLoading(false); return; }
    const requestId = ++requestIdRef.current;
    setOffLoading(true); setUsdaLoading(true);
    const timer = setTimeout(async () => {
      store.searchCustomFoodsByName(normalized).then((rows) => {
        if (requestId !== requestIdRef.current) return;
        setCustomResults(rows.map((f) => ({
          barcode: f.barcode, name: f.foodName, brand: f.brand || "", country: f.country || "",
          imageUrl: f.imageUrl || null, caloriesPer100g: f.calories, proteinPer100g: f.protein,
          carbsPer100g: f.carbs, fatPer100g: f.fat, fiberPer100g: f.fiber || 0, sugarPer100g: f.sugar || 0,
          sodiumPer100gMg: f.sodium || 0, servingSizeLabel: f.servingSizeLabel || null, servingGrams: f.servingGrams || null,
          micronutrientsPer100g: f.micronutrients || {}, origin: "custom_foods",
        })));
      });

      const canonicalPromise = store.lookupFoodSynonym(normalized);

      canonicalPromise.then(async (canonical) => {
        if (requestId !== requestIdRef.current) return;
        const usdaTerm = canonical || normalized; // إن لم يوجد مرادف، جرّب النص كما هو (قد يكون إنجليزياً أصلاً)
        const usdaRes = await searchUSDAFoods(usdaTerm);
        if (requestId !== requestIdRef.current) return;
        if (!usdaRes.ok) {
          setUsdaError(isEn ? (usdaRes.errorEn || usdaRes.error) : usdaRes.error);
          setUsdaResults([]);
        } else {
          setUsdaResults(sortUsdaResults(usdaRes.products));
        }
        if (requestId === requestIdRef.current) setUsdaLoading(false);
      });

      const res = await searchProductsByName(normalized);
      if (requestId !== requestIdRef.current) return;
      if (!res.ok) {
        setOffError(isEn ? (res.errorEn || res.error) : res.error);
        setOffResults([]);
      } else if (res.products.length > 0) {
        setOffResults(res.products.map((p) => ({ ...p, origin: "off" })));
      } else {
        const canonical = await canonicalPromise;
        if (requestId !== requestIdRef.current) return;
        if (canonical && normalizeSearchTerm(canonical) !== normalized) {
          const retry = await searchProductsByName(canonical);
          if (requestId !== requestIdRef.current) return;
          setOffResults(retry.ok ? retry.products.map((p) => ({ ...p, origin: "off" })) : []);
        } else {
          setOffResults([]);
        }
      }
      if (requestId === requestIdRef.current) setOffLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [normalized, isEn]);

  // ترتيب العرض: المحلي الفوري أولاً، ثم USDA (قاعدة عامة موثّقة وضخمة)،
  // ثم custom_foods (مساهمات مستخدمين)، ثم Open Food Facts (منتجات تجارية
  // بباركود) أخيراً - الأطعمة العامة النظيفة تسبق دائماً المنتجات التجارية.
  const merged = [...genericResults, ...usdaResults, ...customResults, ...offResults];
  const searched = normalized.length > 0;
  const networkLoading = offLoading || usdaLoading;

  return (
    <>
      <div style={NS.searchRow}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("nutrition.searchPlaceholder")}
          style={NS.searchInput}
          autoFocus
        />
        <div style={{ ...NS.searchBtn, cursor: "default" }}>{networkLoading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}</div>
      </div>
      {offError && <div style={NS.errorText}>{offError}</div>}
      {usdaError && <div style={NS.errorText}>{usdaError}</div>}
      {searched && !networkLoading && merged.length === 0 && (
        <p style={NS.notFoundNote}>{t("nutrition.noSearchResults")}</p>
      )}
      {merged.map((p) => (
        <button key={`${p.origin}-${p.barcode}-${p.name}`} onClick={() => onPick(p)} style={NS.resultRow}>
          {p.imageUrl ? <img src={p.imageUrl} alt="" style={NS.resultImg} /> : (
            <div style={{ ...NS.resultImg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CategoryIcon category={p.category} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={NS.resultName}>{p.name}</div>
            <div style={NS.resultMeta}>
              {t("nutrition.calPer100g", { cal: Math.round(p.caloriesPer100g) })}
              {" · "}{t("common.units.protein")} {Math.round(p.proteinPer100g)}{t("common.units.g")}
              {" · "}{t("common.units.carbs")} {Math.round(p.carbsPer100g)}{t("common.units.g")}
              {" · "}{t("common.units.fat")} {Math.round(p.fatPer100g)}{t("common.units.g")}
            </div>
          </div>
        </button>
      ))}
      {searched && networkLoading && (
        <p style={NS.notFoundNote}>{t("nutrition.searchingWiderDatabase")}</p>
      )}
      <button onClick={onManual} style={{ ...S.exportBtn, marginTop: 4 }}>{t("nutrition.manualAddInstead")}</button>
    </>
  );
}

// تصوير الوجبة بالذكاء الاصطناعي - يستدعي recognizeMealFromImage المعزولة
// (lib/nutrition.js) فقط، ولا يعرف شيئاً عن كون المزوّد الفعلي Gemini من
// عدمه. كل قيمة في النتيجة قابلة للتعديل يدوياً قبل الحفظ، والتنبيه أسفل
// الحقول ثابت لا يمكن إغلاقه.
function AIPhotoPanel({ onSave, onManual, preselectedMealType }) {
  const { t, i18n } = useTranslation();
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { items, calories, protein, carbs, fat } - القيم المعروضة/القابلة للتعديل حالياً
  const [baseResult, setBaseResult] = useState(null); // نفس شكل result، لكن ثابت: تقدير الذكاء الاصطناعي الخام لحصة واحدة (١×) كما وصل، يُستخدم أساساً لإعادة حساب عدد الحصص دون تراكم أخطاء تقريب
  const [multiplier, setMultiplier] = useState(1);
  const [mealType, setMealType] = useState(() => preselectedMealType || guessMealType());
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
    const res = await recognizeMealFromImage(file, i18n.language);
    setAnalyzing(false);
    if (!res.ok) { setError(i18n.language === "en" ? (res.errorEn || res.error) : res.error); return; }
    const initial = { items: res.items, calories: res.calories, protein: res.protein, carbs: res.carbs, fat: res.fat, micronutrients: res.micronutrients || {} };
    setResult(initial);
    setBaseResult(initial);
  }

  function change(field, val) { setResult((r) => ({ ...r, [field]: val })); }
  // عدد الحصص هنا يعني "كم مرة مثل ما في الصورة" - لا وحدة فعلية (غم/مل/كوب)
  // معقولة لصورة وجبة مختلطة، فتُعامَل الصورة كاملة كـ"حصة واحدة" وتُضرب كل
  // قيمها الأربع بعدد الحصص المختار، بنفس سهولة أزرار ×1..×5 في باقي طرق
  // الإضافة. يُعاد الحساب دائماً من baseResult (تقدير الحصة الواحدة الأصلي)
  // لا من القيم المعروضة حالياً، تفادياً لتراكم أخطاء تقريب عبر ضغطات متكررة.
  // الفيتامينات المقدَّرة (micronutrients) تُضرَب بنفس عدد الحصص أيضاً، بنفس
  // منطق الأربعة الأساسية تماماً.
  function applyMultiplier(n) {
    setMultiplier(n);
    if (!baseResult) return;
    const scaledMicros = {};
    for (const [key, val] of Object.entries(baseResult.micronutrients || {})) {
      scaledMicros[key] = Math.round(val * n * 100) / 100;
    }
    setResult({
      items: baseResult.items,
      calories: Math.round((baseResult.calories || 0) * n),
      protein: Math.round((baseResult.protein || 0) * n * 10) / 10,
      carbs: Math.round((baseResult.carbs || 0) * n * 10) / 10,
      fat: Math.round((baseResult.fat || 0) * n * 10) / 10,
      micronutrients: scaledMicros,
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
            {t("nutrition.takePhoto")}
          </button>
          <button onClick={() => galleryInputRef.current?.click()} style={NS.chooserBtn}>
            <span style={NS.chooserIcon}><ImagePlus size={19} /></span>
            {t("nutrition.chooseFromGallery")}
          </button>
        </div>
      )}
      {preview && <img src={preview} alt="" style={NS.photoPreview} />}

      {analyzing && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 10 }}>
          <Loader2 size={22} className="spin" color="var(--gold)" />
          <span style={{ fontSize: 13, color: "var(--muted2)" }}>{t("nutrition.analyzingPhoto")}</span>
        </div>
      )}

      {error && (
        <>
          <div style={NS.errorText}>{error}</div>
          <button onClick={() => { setPreview(null); setError(null); }} style={{ ...S.exportBtn, marginBottom: 8 }}>{t("nutrition.retryWithAnotherPhoto")}</button>
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
            <span>{t("nutrition.aiEstimateNote")}</span>
          </div>
          <label style={S.label}>{t("nutrition.servingsCountPhotoRepresents")}</label>
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
              <label style={S.label}>{t("nutrition.calories")}</label>
              <input type="number" inputMode="decimal" value={result.calories} onChange={(e) => change("calories", Number(e.target.value))} style={S.input} />
            </div>
            <div>
              <label style={S.label}>{t("common.units.protein")} ({t("common.units.g")})</label>
              <input type="number" inputMode="decimal" value={result.protein} onChange={(e) => change("protein", Number(e.target.value))} style={S.input} />
            </div>
            <div>
              <label style={S.label}>{t("common.units.carbs")} ({t("common.units.g")})</label>
              <input type="number" inputMode="decimal" value={result.carbs} onChange={(e) => change("carbs", Number(e.target.value))} style={S.input} />
            </div>
            <div>
              <label style={S.label}>{t("common.units.fat")} ({t("common.units.g")})</label>
              <input type="number" inputMode="decimal" value={result.fat} onChange={(e) => change("fat", Number(e.target.value))} style={S.input} />
            </div>
          </div>
          <MealTypeSelector value={mealType} onChange={setMealType} />
          <button
            onClick={() => onSave({
              id: uid(),
              foodName: result.items?.length > 0 ? result.items.join(i18n.language === "en" ? ", " : "، ") : t("nutrition.mealFallbackName"),
              calories: Number(result.calories) || 0, protein: Number(result.protein) || 0,
              carbs: Number(result.carbs) || 0, fat: Number(result.fat) || 0,
              // الصوديوم/الكوليسترول لا يمكن تقديرهما بصرياً بثقة معقولة من صورة
              // (لا أثر مرئي للملح المضاف أو الكوليسترول في الطعام المطبوخ،
              // خلافاً لحجم الحصة الذي يُقدَّر بصرياً بشكل معقول) - يبقيان صفراً
              // هنا عمداً (لا اختراع رقم دقيق المظهر لعنصر غير مرئي إطلاقاً)،
              // خلافاً للألياف/السكر غير المطلوبين من AI هنا أيضاً بنفس الحذر.
              fiber: 0, sugar: 0, sodium: 0, cholesterol: 0,
              servingInfo: multiplier !== 1 ? t("nutrition.aiEstimateTimes", { n: fmtQty(multiplier) }) : t("nutrition.aiEstimate"), source: "ai_photo", mealType,
              // نفس علامة "≈ تقريبي" الموحّدة المستخدَمة لأطعمة generic-foods.js -
              // لا تمييز إضافي بين المصدرين من منظور المستخدم، كلاهما تقدير
              // عام لا تحليل دقيق لهذا الطعام بعينه.
              micronutrients: result.micronutrients || {},
              microApprox: Object.keys(result.micronutrients || {}).length > 0,
            })}
            style={S.saveBtn}
          >
            {t("nutrition.addToTodayLog")}
          </button>
        </>
      )}

      <button onClick={onManual} style={{ ...S.exportBtn, marginTop: 8 }}>{t("nutrition.manualAddInstead")}</button>
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
function LabelPhotoPanel({ onSave, onManual, preselectedMealType }) {
  const { t, i18n } = useTranslation();
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [label, setLabel] = useState(null); // نتيجة readNutritionLabel الخام (basis + servingGrams + قيم)
  const [basisValues, setBasisValues] = useState(null); // نفس قيم label القابلة للتعديل يدوياً قبل الحفظ
  const [unit, setUnit] = useState("g");
  const [multiplier, setMultiplier] = useState(1);
  const [grams, setGrams] = useState(100);
  const [unitQty, setUnitQty] = useState(1);
  const [mealType, setMealType] = useState(() => preselectedMealType || guessMealType());
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
    const res = await readNutritionLabel(file, i18n.language);
    setAnalyzing(false);
    if (!res.ok) { setError(i18n.language === "en" ? (res.errorEn || res.error) : res.error); return; }
    setLabel(res);
    setBasisValues({
      calories: res.calories, protein: res.protein, carbs: res.carbs, fat: res.fat,
      fiber: res.fiber, sugar: res.sugar, sodium: res.sodium, cholesterol: res.cholesterol,
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
              {t("nutrition.takePhoto")}
            </button>
            <button onClick={() => galleryInputRef.current?.click()} style={NS.chooserBtn}>
              <span style={NS.chooserIcon}><ImagePlus size={19} /></span>
              {t("nutrition.chooseFromGallery")}
            </button>
          </div>
        )}
        {preview && <img src={preview} alt="" style={NS.photoPreview} />}
        {analyzing && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 10 }}>
            <Loader2 size={22} className="spin" color="var(--gold)" />
            <span style={{ fontSize: 13, color: "var(--muted2)" }}>{t("nutrition.readingLabel")}</span>
          </div>
        )}
        {error && (
          <>
            <div style={NS.errorText}>{error}</div>
            <button onClick={() => { setPreview(null); setError(null); }} style={{ ...S.exportBtn, marginBottom: 8 }}>{t("nutrition.retryWithAnotherPhoto")}</button>
            <button onClick={onManual} style={{ ...S.exportBtn, marginBottom: 0 }}>{t("nutrition.manualAddInstead")}</button>
          </>
        )}
        {!preview && !error && (
          <button onClick={onManual} style={{ ...S.exportBtn, marginTop: 8 }}>{t("nutrition.manualAddInstead")}</button>
        )}
      </>
    );
  }

  const hasServing = label.basis === "serving";
  const basisSentence = label.basis === "100g" ? t("nutrition.per100gLabel")
    : label.basis === "100ml" ? t("nutrition.per100mlLabel")
    : t("nutrition.perServingLabel", { g: Math.round(label.servingGrams || 100) });

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
        <span>{t("nutrition.labelReviewNote")}</span>
      </div>
      <p style={{ ...S.label, marginBottom: 4 }}>{basisSentence}</p>
      <div style={NS.editableGrid}>
        <div>
          <label style={S.label}>{t("nutrition.calories")}</label>
          <input type="number" inputMode="decimal" value={basisValues.calories} onChange={(e) => changeBasis("calories", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.protein")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={basisValues.protein} onChange={(e) => changeBasis("protein", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.carbs")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={basisValues.carbs} onChange={(e) => changeBasis("carbs", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.fat")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={basisValues.fat} onChange={(e) => changeBasis("fat", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.fiber")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={basisValues.fiber} onChange={(e) => changeBasis("fiber", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.sugar")} ({t("common.units.g")})</label>
          <input type="number" inputMode="decimal" value={basisValues.sugar} onChange={(e) => changeBasis("sugar", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.sodium")} ({t("common.units.mg")})</label>
          <input type="number" inputMode="decimal" value={basisValues.sodium} onChange={(e) => changeBasis("sodium", e.target.value)} style={S.input} />
        </div>
        <div>
          <label style={S.label}>{t("common.units.cholesterol")} ({t("common.units.mg")})</label>
          <input type="number" inputMode="decimal" value={basisValues.cholesterol} onChange={(e) => changeBasis("cholesterol", e.target.value)} style={S.input} />
        </div>
      </div>

      <p style={{ ...S.label, marginTop: 16, marginBottom: 4 }}>{t("nutrition.howMuchDidYouEat")}</p>
      <label style={S.label}>{t("nutrition.unitOfMeasure")}</label>
      <div style={NS.unitRow}>
        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={NS.unitSelect}>
          {UNIT_OPTIONS.map((u) => <option key={u.id} value={u.id}>{t(`nutrition.unitOptions.${u.id}`)}</option>)}
        </select>
      </div>
      {unit === "g" ? (
        <>
          {hasServing && (
            <>
              <label style={S.label}>{t("nutrition.servingsCountEach", { g: Math.round(per100.servingGrams) })}</label>
              <div style={NS.multiplierRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setMultiplier(n)} style={{ ...NS.multiplierBtn, ...(multiplier === n ? NS.multiplierBtnActive : {}) }}>×{n}</button>
                ))}
                <input type="number" inputMode="decimal" value={multiplier} onChange={(e) => setMultiplier(Math.max(0.25, Number(e.target.value) || 0))} style={NS.multiplierInput} />
              </div>
            </>
          )}
          <label style={S.label}>{hasServing ? t("nutrition.orEditQuantityGrams") : t("nutrition.quantityGrams")}</label>
          <input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(Number(e.target.value))} style={S.input} />
        </>
      ) : (
        <>
          <label style={S.label}>{t("nutrition.servingsCountEachUnit", { qty: fmtQty(unitBaseQty), unit: t(`nutrition.unitOptions.${unit}`) })}</label>
          <div style={NS.multiplierRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setMultiplier(n)} style={{ ...NS.multiplierBtn, ...(multiplier === n ? NS.multiplierBtnActive : {}) }}>×{n}</button>
            ))}
            <input type="number" inputMode="decimal" value={multiplier} onChange={(e) => setMultiplier(Math.max(0.25, Number(e.target.value) || 0))} style={NS.multiplierInput} />
          </div>
          <label style={S.label}>{t("nutrition.orEditQuantityUnit", { unit: t(`nutrition.unitOptions.${unit}`) })}</label>
          <input type="number" inputMode="decimal" value={unitQty} onChange={(e) => setUnitQty(Number(e.target.value) || 0)} style={S.input} />
          {unitMeta.approx && <p style={NS.unitApproxNote}>{t("nutrition.approxConversionNote")}</p>}
        </>
      )}

      <div style={NS.previewGrid}>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview2.calories} /></div><div style={NS.macroLabel}>{t("common.units.kcal")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview2.protein} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.protein")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview2.carbs} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.carbs")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview2.fat} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.fat")}</div></div>
      </div>
      <div style={NS.previewGrid}>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview2.fiber} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.fiber")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview2.sugar} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.sugar")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview2.sodium} unit={t("common.units.mg")} /></div><div style={NS.macroLabel}>{t("common.units.sodium")}</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}><NumericValue value={preview2.cholesterol} unit={t("common.units.mg")} /></div><div style={NS.macroLabel}>{t("common.units.cholesterol")}</div></div>
      </div>
      <MealTypeSelector value={mealType} onChange={setMealType} />
      <button
        onClick={() => onSave({
          id: uid(), foodName: t("nutrition.labelFoodFallback"), ...preview2,
          unit, mealType,
          servingInfo: unit === "g"
            ? (hasServing ? `${multiplier} × ${Math.round(per100.servingGrams)}${t("common.units.g")}` : `${grams} ${t("common.units.g")}`)
            : `${fmtQty(unitQty)} ${t(`nutrition.unitOptions.${unit}`)}`,
          source: "label",
          micronutrients: scaleMicronutrients(per100.micronutrientsPer100g, gramsEquivalent || 0),
        })}
        style={S.saveBtn}
        disabled={!gramsEquivalent || gramsEquivalent <= 0}
      >
        {t("nutrition.addToTodayLog")}
      </button>
      <button onClick={onManual} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>{t("nutrition.manualAddInstead")}</button>
    </>
  );
}

export default function NutritionView({ healthProfile, showToast, profile, setProfile, subscription, journeyActive }) {
  const { t, i18n } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [nutritionLog, setNutritionLog] = useState([]);
  const [waterLog, setWaterLog] = useState({});
  const [sheet, setSheet] = useState(null); // null | "choose" | "scan" | "search" | "manual" | "confirm"
  const [pendingProduct, setPendingProduct] = useState(null); // { product, source }
  // وجبة مُعيَّنة مسبقاً عند الضغط على "+ إضافة لـ[اسم الوجبة]" من بطاقة
  // وجبة معيّنة (Priority 5) - null يعني الاعتماد على تخمين الوقت الحالي
  // (guessMealType) كالسابق تماماً في كل نماذج الإضافة الأربعة.
  const [preselectedMealType, setPreselectedMealType] = useState(null);
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
  // اليوم المعروض حالياً (قد يكون سابقاً لليوم الحقيقي عبر التنقّل أدناه) -
  // كل قسم "سجل/مجاميع/ماء/فيتامينات" يُشتق منه، بينما "تحليل تغذية اليوم"
  // الذكي أدناه يبقى مرتبطاً بـ"اليوم" الحقيقي دائماً (متعمَّد، انظر تعليق
  // generateDailyAnalysis) حتى لا يتغيّر سلوكه القائم أثناء تصفّح يوم سابق.
  const [selectedDate, setSelectedDate] = useState(today);
  const isViewingToday = selectedDate === today;

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

  // جولة التغذية السياقية (Priority 6 من خطة الـOnboarding - أعلى أولوية
  // بين كل الجولات السياقية): تظهر تلقائياً أول مرة يُفتح فيها هذا القسم
  // فعلياً طالما لم تكتمل من قبل (tourProgress.modules.nutrition.done)،
  // مستقلة تماماً عن الجولة الأساسية في MasarApp. 5 خطوات (Phase G وسّعت
  // الأصلية من 3): اضغط "+ إضافة" في الفطور (تفاعلي) → اختر طريقة الإضافة
  // (تفاعلي، أي طريقة) → بعد نجاح الحفظ الفعلي، تلميح ختامي على بطاقة
  // الفطور المحدَّثة → شرح بطاقة الملخّص اليومي (احتياج شخصي مقابل حد
  // إرشادي) → اضغط كوب الماء (تفاعلي). الخطوة 2→3 تنتظر تغيّراً حقيقياً
  // في السجل (لا مؤقّتاً وهمياً) حتى تظهر فقط بعد حفظ فعلي، بغض النظر عن
  // طريقة الإضافة التي اختارها المستخدم.
  const nutritionTourDone = !!profile?.tourProgress?.modules?.nutrition?.done;
  const [nutritionTourStep, setNutritionTourStep] = useState(0); // 0=غير نشطة، 1/2 = Spotlight، "waiting" = بانتظار حفظ، 3 = تلميح ختامي
  const nutritionTourStartedRef = useRef(false);
  const breakfastCountAtTourStartRef = useRef(0);

  useEffect(() => {
    // journeyActive: لا تبدأ هذه الجولة المحلية تلقائياً أثناء زيارة رحلة
    // مسار المتصلة الأساسية لهذه الصفحة (Observe فقط) - تبقى متاحة كاملة
    // لمن يفتح التغذية مستقلاً، أو يعيد تشغيلها يدوياً من الإعدادات لاحقاً.
    if (loaded && !nutritionTourDone && !nutritionTourStartedRef.current && !journeyActive) {
      nutritionTourStartedRef.current = true;
      breakfastCountAtTourStartRef.current = nutritionLog.filter((e) => e.date === today && e.mealType === "breakfast").length;
      setNutritionTourStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, nutritionTourDone, journeyActive]);

  // انتظار سلبي بلا Spotlight معروض: بمجرد أن يُغلَق الشيت (انتهت عملية
  // الإضافة أياً كانت طريقتها) ويظهر صنف فطور جديد فعلاً في السجل، تُعرض
  // خطوة التلميح الختامية تلقائياً.
  useEffect(() => {
    if (nutritionTourStep !== "waiting") return;
    if (sheet !== null) return;
    const currentCount = nutritionLog.filter((e) => e.date === today && e.mealType === "breakfast").length;
    if (currentCount > breakfastCountAtTourStartRef.current) setNutritionTourStep(3);
  }, [nutritionTourStep, sheet, nutritionLog, today]);

  function finishNutritionTour() {
    setNutritionTourStep(0);
    setProfile((p) => ({ ...p, tourProgress: { ...p.tourProgress, modules: { ...(p.tourProgress?.modules || {}), nutrition: { done: true } } } }));
    store.saveTourProgress({ modules: { nutrition: { done: true } } });
  }

  // لا تنقّل لأيام مستقبلية (لا سجل لها بعد) - يُقيَّد هنا لا فقط بتعطيل
  // الزر، حتى لا يتغيّر التاريخ حتى لو استُدعيت الدالة من مصدر آخر لاحقاً.
  function shiftDay(delta) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const next = todayKey(d);
    if (next > today) return;
    setSelectedDate(next);
  }

  const selectedLog = nutritionLog.filter((e) => e.date === selectedDate);
  const totals = sumNutritionEntries(selectedLog);
  // "الوقت المعتاد" لكل نوع وجبة - من كامل نطاق nutritionLog المحمَّل (90
  // يوماً) لا اليوم المعروض فقط، حتى يكون النمط ذا معنى حقيقياً.
  const usualMealTimes = useMemo(() => {
    const result = {};
    for (const mt of MEAL_TYPES) {
      const hours = nutritionLog
        .filter((e) => e.mealType === mt && e.createdAt)
        .map((e) => new Date(e.createdAt).getHours())
        .filter((h) => Number.isFinite(h));
      if (hours.length < 3) continue;
      result[mt] = { minH: Math.min(...hours), maxH: Math.max(...hours) };
    }
    return result;
  }, [nutritionLog]);
  const currentMealType = guessMealType();
  // تُستخدَم لتحليل تغذية اليوم الذكي فقط (نفس نطاقها الأصلي دائماً: اليوم
  // الحقيقي)، بمعزل تام عن selectedDate/totals أعلاه المشتقّين من اليوم
  // المعروض حالياً في التنقّل - انظر تعليق generateDailyAnalysis.
  const todayLog = nutritionLog.filter((e) => e.date === today);
  // تُعرض العناصر التسعة كلها دائماً (حتى غير المُستهلَك في اليوم المعروض
  // يظهر بصفر و0%) حتى يرى المستخدم ما ينقصه فعلياً، لا فقط ما أكله. الاحتياج
  // (rdi) يُخصَّص حسب العمر والجنس من health_profile عبر personalizedRDI إن
  // توفّرا (جداول RDA/AI معتمدة علمياً)، وإلا يُستخدم rdi العام الافتراضي.
  const hasAgeGender = !!(healthProfile?.age && healthProfile?.gender);
  const microRows = Object.keys(MICRONUTRIENT_META).map((key) => {
    const meta = MICRONUTRIENT_META[key];
    const value = Math.round((totals.micronutrients?.[key] || 0) * 100) / 100;
    const rdi = personalizedRDI(key, healthProfile?.age, healthProfile?.gender) ?? meta.rdi;
    // approx: هل ساهم إدخال واحد على الأقل بمصدر "تقدير عام" (أطعمة أساسية
    // من generic-foods.js) في مجموع هذا العنصر اليوم؟ انظر microApprox في
    // sumNutritionEntries (nutrition.js) - يُعرض بعلامة "≈" واضحة أدناه.
    const approx = !!totals.microApprox?.[key];
    return { key, label: t(`nutrition.micronutrients.${key}`), unit: meta.unit, rdi, value, approx, pct: Math.min(100, Math.round((value / rdi) * 100)) };
  });
  // ملخّص يومي موحَّد (getDailyNutritionSummary, nutrition-plan.js) - مصدر
  // الهدف هنا يبقى tee دوماً (nutritionPlan: null عمداً) لمطابقة سلوك هذه
  // الشاشة الحالي بالحرف؛ لو مُرِّرت خطة نشطة هنا لاحقاً سيتغيّر مصدر
  // الهدف فعلياً - قرار مقصود لا يُتَّخذ هنا الآن.
  const dailySummary = getDailyNutritionSummary({ totals, healthProfile, nutritionPlan: null });
  const tee = dailySummary.calorieGoal;
  const teePercent = dailySummary.adherencePct;
  // أهداف الماكروز لدوائر التقدم: نسبة عامة معروفة (بروتين 30%، كارب 40%،
  // دهون 30% من السعرات) وليست حساباً شخصياً دقيقاً - نفس مبدأ "تقديرية"
  // المستخدم فعلاً في إرشادات الألياف/السكر/الصوديوم أعلاه. تُحسب فقط إن
  // أكمل المستخدم بياناته في "أنت" (وإلا لا يوجد TEE أصلاً لتقسيمه).
  const macroTargets = tee ? {
    protein: dailySummary.proteinGoal,
    carbs: dailySummary.carbsGoal,
    fat: dailySummary.fatGoal,
  } : null;
  const todayCups = waterLog[selectedDate] || 0;
  const cupsGoal = waterGoalCups(healthProfile?.weightKg);
  const waterPercent = cupsGoal ? Math.min(100, Math.round((todayCups / cupsGoal) * 100)) : 0;

  function closeSheet() {
    setSheet(null);
    setPendingProduct(null);
    setPendingBarcode(null);
    setLookupError(null);
    setSaveError(null);
    setPreselectedMealType(null);
  }

  // يفتح شاشة الإضافة الموحّدة مباشرة بالوجبة المطلوبة معيَّنة مسبقاً - يُستدعى
  // من زر "+ إضافة لـ[الوجبة]" في تذييل كل بطاقة وجبة (Priority 5). يبدأ من
  // شاشة اختيار الطريقة نفسها (باركود/بحث/يدوي...) كالمعتاد؛ ما تغيَّر فقط
  // هو أن نموذج الإدخال النهائي (أياً كانت الطريقة) يبدأ بهذه الوجبة مُختارة
  // بدل تخمين الوقت الحالي، بلا أي خطوة إضافية من المستخدم لتحديدها يدوياً.
  function openAddFoodFor(mt) {
    setPreselectedMealType(mt);
    setSheet("choose");
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
    // يُسجَّل بتاريخ اليوم المعروض حالياً في التنقّل (قد يكون يوماً سابقاً) -
    // نفس مبدأ TodayView القائم أصلاً (EntryModal يسجّل بتاريخ اليوم المختار
    // هناك)، مع تنبيه واضح أعلى الشاشة (pastDayBanner) حتى لا يظن المستخدم
    // أنه يسجّل في اليوم الحقيقي أثناء تصفّح يوم سابق.
    const full = { ...entry, date: selectedDate };
    setNutritionLog((prev) => [full, ...prev]);
    const result = await store.addNutritionEntry(full);
    if (result.ok) {
      showToast(t("nutrition.addedToLog"));
      closeSheet();
    } else {
      setNutritionLog((prev) => prev.filter((e) => e.id !== full.id));
      // التفاصيل الكاملة (message/code/details/hint) إلى console المطوّر
      // فقط - المستخدم يرى رسالة عامة ودّية دائماً، لا أي نص خام من Supabase.
      console.error("[NutritionView] addNutritionEntry failed:", result);
      const friendly = t("nutrition.entrySaveFailed");
      setSaveError(friendly);
      showToast(t("nutrition.entrySaveFailedDetail", { detail: friendly }));
    }
  }

  async function removeEntry(id) {
    setNutritionLog((prev) => prev.filter((e) => e.id !== id));
    await store.deleteNutritionEntry(id);
  }

  // تعديل سريع لصنف مُسجَّل بالفعل من داخل بطاقة الوجبة مباشرة (Priority 5) -
  // نفس مبدأ التراجع عند الفشل المستخدَم أعلاه في addEntry، لكن عبر
  // store.updateNutritionEntry (تعديل، لا إضافة/حذف).
  async function updateEntry(updated) {
    const prev = nutritionLog;
    setNutritionLog((list) => list.map((e) => (e.id === updated.id ? updated : e)));
    const result = await store.updateNutritionEntry(updated);
    if (result.ok) {
      showToast(t("nutrition.entryUpdated"));
    } else {
      setNutritionLog(prev);
      console.error("[NutritionView] updateNutritionEntry failed:", result);
      showToast(t("nutrition.entrySaveFailed"));
    }
  }

  async function addWaterCup() {
    const prevCups = todayCups;
    const next = todayCups + 1;
    setWaterLog((prev) => ({ ...prev, [selectedDate]: next }));
    const res = await store.saveWaterCups(selectedDate, next);
    if (!res.ok) { setWaterLog((prev) => ({ ...prev, [selectedDate]: prevCups })); showToast(t("nutrition.waterGlassSaveFailed")); }
  }

  async function enableNotifications() {
    const result = await requestNotificationPermission(i18n.language);
    // نفس شرط SettingsView: "مفعّلة" فقط إذا حُفظ اشتراك push حقيقي فعلاً.
    const enabled = !!result.saved;
    setProfile?.((p) => ({ ...p, notificationsEnabled: enabled, notificationsAsked: true }));
    await store.saveNotificationsPreference(enabled, true);
    showToast(enabled ? t("nutrition.notifEnabled") : (result.error ? t(`common.errors.${result.error}`) : t("nutrition.notifNotEnabled")));
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
          brand: cached.brand || "", country: cached.country || "", servingSizeLabel: cached.servingSizeLabel || "",
          // origin="custom_foods" يميّز هذا المنتج كمساهمة مستخدم مشتركة
          // (قابلة للتصحيح عبر زر "تعديل البيانات")، بخلاف بيانات Open Food
          // Facts الخام أدناه التي ليست "بياناتنا" لنعرض تصحيحها بنفس الآلية.
          origin: "custom_foods", barcode,
        },
        source: "barcode",
      });
      setSheet("confirm");
      return;
    }
    const res = await fetchProductByBarcode(barcode);
    setLookupBusy(false);
    if (res.found) {
      setPendingProduct({ product: { ...res.product, origin: "off", barcode }, source: "barcode" });
      setSheet("confirm");
    } else {
      if (res.error) setLookupError(i18n.language === "en" ? (res.errorEn || res.error) : res.error);
      setPendingBarcode(barcode);
      // معالج "منتج جديد" الثلاثي الخطوات يستخدم قراءة الملصق بالذكاء
      // الاصطناعي (مسار الكامل) - غير المشترك يذهب للنموذج اليدوي الكامل
      // مباشرة (كان السلوك الأصلي دائماً)، لا لمعالج سيصطدم بقفل لاحقاً بلا
      // تفسير واضح في نقطة الدخول.
      setSheet(isSub ? "addProduct" : "manual");
    }
  }, [isSub]);

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
      if (!cacheRes.ok) showToast(t("nutrition.mealLoggedProductSaveFailed"));
    }
    const { productPer100, brand, country, servingSizeLabel, servingGrams, imageUrl, logToday, ...logEntry } = entry;
    // logToday=false (مخصّصة لمعالج "منتج جديد" فقط - النموذج اليدوي القديم
    // لا يُرسلها أبداً فتبقى undefined، أي "سجّل دائماً" كسلوكها الأصلي بلا
    // أي تغيير): المستخدم اختار حفظ المنتج في custom_foods فقط دون تسجيله
    // في سجل اليوم (مثلاً يعرّف منتجاً لم يأكله الآن).
    if (logToday === false) { showToast(t("nutrition.productAdded")); closeSheet(); return; }
    await addEntry(logEntry);
  }

  // يستخدم نفس آلية "التقرير الذكي" المبنية مسبقاً (analyze + parseJsonLoose،
  // انظر DailyEvolution في MasarApp.jsx) - يبني الطلب من بيانات اليوم الفعلية
  // فقط (الأطعمة المسجَّلة والمجاميع الحقيقية)، ولا يفترض شيئاً لم يُسجَّل.
  // الطلب نفسه يُفرَّع كاملاً حسب لغة الواجهة (i18n.language) بدل افتراض
  // العربية دائماً - نفس المبدأ العلمي في كلتا النسختين: لا تخترع نمطاً غير
  // موجود فعلياً في الأرقام المُمرَّرة.
  async function generateDailyAnalysis() {
    if (todayLog.length === 0) { setDailyAnalysis({ error: t("nutrition.logFoodFirst") }); return; }
    setAnalysisLoading(true);
    try {
      const isEn = i18n.language === "en";
      // مجاميع اليوم الحقيقي حصراً (بمعزل عن totals المشتقّة من selectedDate
      // أعلاه) - هذا التحليل يبقى "تحليل تغذية اليوم" بمعناه الحرفي دائماً،
      // حتى لو كان المستخدم يتصفّح يوماً سابقاً حالياً عبر شريط التنقّل.
      const todayTotals = sumNutritionEntries(todayLog);
      const foodsList = todayLog
        .map((e) => `${e.foodName} (${Math.round(e.calories)} ${isEn ? "kcal" : "سعرة"})`)
        .join(isEn ? ", " : "، ");
      // أي وجبات (فطور/غداء/عشاء/سناك) لم تُسجَّل اليوم إطلاقاً - حقيقة فعلية
      // من meal_type، لا افتراض - تُذكَر للذكاء الاصطناعي فقط إن وُجدت
      // فعلاً، ليبنيَ عليها فقط إن كانت ذات صلة حقيقية بنمط اليوم.
      const loggedMealTypes = new Set(todayLog.map((e) => e.mealType).filter(Boolean));
      const missingMealTypes = MEAL_TYPES.filter((mt) => !loggedMealTypes.has(mt));
      const missingMealsLine = missingMealTypes.length > 0 && missingMealTypes.length < MEAL_TYPES.length
        ? (isEn
          ? `Meals not logged today: ${missingMealTypes.map((mt) => mt).join(", ")}.`
          : `وجبات لم تُسجَّل اليوم: ${missingMealTypes.map((mt) => t(`nutrition.mealTypes.${mt}`)).join("، ")}.`)
        : "";
      const prompt = isEn
        ? `You are a nutrition coach writing in clear, natural English with no long dashes. Here is the user's actual nutrition data for today only:
Logged foods: ${foodsList}
Totals: ${Math.round(todayTotals.calories)} kcal${tee ? ` out of a ${Math.round(tee)} kcal goal` : ""}, protein ${Math.round(todayTotals.protein)}g, carbs ${Math.round(todayTotals.carbs)}g, fat ${Math.round(todayTotals.fat)}g, fiber ${Math.round(todayTotals.fiber)}g, sugar ${Math.round(todayTotals.sugar)}g, sodium ${Math.round(todayTotals.sodium)}mg.
${missingMealsLine}
Write a short paragraph (two to three sentences) analyzing today's eating pattern based only on these specific real numbers (don't invent anything not mentioned) — for example, good protein but low fiber today, or a missing meal if listed above. Keep numbers clearly separated (don't stack more than two back to back in one clause). Return only JSON with no other text or markdown:
{"analysis":"paragraph here"}`
        : `أنت مدرّب تغذية يكتب بالعربية الفصحى البسيطة بدون أي شرطات طويلة. هذه بيانات تغذية المستخدم الفعلية لهذا اليوم فقط:
الأطعمة المسجَّلة: ${foodsList}
الإجمالي: ${Math.round(todayTotals.calories)} سعرة${tee ? ` من أصل هدف ${Math.round(tee)} سعرة` : ""}، بروتين ${Math.round(todayTotals.protein)}غ، كارب ${Math.round(todayTotals.carbs)}غ، دهون ${Math.round(todayTotals.fat)}غ، ألياف ${Math.round(todayTotals.fiber)}غ، سكر ${Math.round(todayTotals.sugar)}غ، صوديوم ${Math.round(todayTotals.sodium)}مغم.
${missingMealsLine}
اكتب فقرة قصيرة (جملتان إلى ثلاث) تحلّل نمط تغذية اليوم بناءً على هذه الأرقام الفعلية فقط تحديداً (مثال: بروتين جيد لكن ألياف منخفضة اليوم، أو وجبة غائبة إن ذُكرت أعلاه) - لا تخترع نمطاً غير موجود في الأرقام أعلاه. حافظ على وضوح فصل الأرقام (لا تحشر أكثر من رقمين متتاليين في نفس الجملة). أعد فقط JSON بدون أي نص أو markdown:
{"analysis":"الفقرة هنا"}`;
      const text = await analyze(prompt, 500);
      const parsed = parseJsonLoose(text);
      setDailyAnalysis({ text: parsed.analysis });
    } catch (err) {
      console.error("[NutritionView] generateDailyAnalysis failed:", err);
      setDailyAnalysis({ error: t("nutrition.analysisFailed") });
    } finally { setAnalysisLoading(false); }
  }

  return (
    <div style={S.view}>
      <div style={NS.hero}>
        <div style={NS.heroIcon}><Flame size={22} color="var(--on-accent)" /></div>
        <div>
          <div style={NS.heroTitle}>{t("nutrition.heroTitle")}</div>
          <div style={NS.heroSub}>{t("nutrition.heroSub")}</div>
        </div>
      </div>

      {/* الأيقونتان تتبادلان حسب اللغة: كل زر يمثّل "سابق"/"تالي" منطقياً،
          لكن اتجاه السهم يجب أن يشير دائماً نحو حافة الصف الخارجية التي
          يقع عليها الزر فعلياً بعد انعكاس RTL/LTR - نفس نمط شريط التاريخ في
          صفحة "اليوم" (MasarApp.jsx). زر "التالي" مُعطَّل عند اليوم الحقيقي
          لأن لا سجل لأي يوم مستقبلي بعد. */}
      <div style={S.dateRow}>
        <button onClick={() => shiftDay(-1)} style={S.iconBtn} aria-label={t("nutrition.previousDay")}>
          {i18n.language === "en" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
        <div style={S.dateLabel}>
          {arabicDate(selectedDate, { weekday: "long", day: "numeric", month: "long" }, i18n.language === "en" ? "en-US" : undefined)}
          {isViewingToday && <span style={S.todayPill}>{t("nav.today")}</span>}
        </div>
        <button
          onClick={() => shiftDay(1)}
          disabled={isViewingToday}
          style={{ ...S.iconBtn, ...(isViewingToday ? { opacity: 0.4, cursor: "not-allowed" } : {}) }}
          aria-label={t("nutrition.nextDay")}
        >
          {i18n.language === "en" ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* قرار تصميم: يُسمح بإضافة طعام/ماء على يوم سابق (بدل تعطيل الإضافة
          كلياً) لتطابق سلوك "اليوم" (TodayView) القائم فعلاً مع EntryModal -
          لكن مع تنبيه واضح لا يمكن تفويته حتى لا يظن المستخدم أنه يسجّل في
          اليوم الحقيقي. */}
      {!isViewingToday && (
        <div style={NS.pastDayBanner}>{t("nutrition.viewingPastDay")}</div>
      )}

      {profile && !profile.notificationsAsked && (
        <div style={NS.notifBanner}>
          <Bell size={18} color="#C9A24B" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={NS.notifText}>{t("nutrition.notifNote")}</p>
            <div style={NS.notifRow}>
              <button onClick={enableNotifications} style={NS.notifBtn}>{t("common.buttons.enable")}</button>
              <button onClick={dismissNotificationBanner} style={NS.notifDismissBtn}>{t("common.buttons.later")}</button>
            </div>
          </div>
        </div>
      )}

      <div style={NS.summaryCard}>
        <div style={NS.summaryTop}>
          <span style={NS.summaryCalories}><NumericValue value={Math.round(totals.calories)} /> <span style={{ fontSize: 13, color: "var(--muted2)" }}>{t("common.units.kcal")}</span></span>
          {tee ? <span style={NS.summaryTee}>{isolateNumbers(t("nutrition.dailyGoal", { tee }))}</span> : <span style={NS.summaryTee}>{t("nutrition.completeYourProfile")}</span>}
        </div>
        {tee && (
          <>
            <div style={NS.barTrack}><div style={{ ...NS.barFill, width: `${teePercent}%` }} /></div>
            <div style={{ ...NS.summaryTee, marginBottom: 12 }}>
              {isolateNumbers(totals.calories <= tee ? t("nutrition.remainingToday", { n: Math.round(tee - totals.calories) }) : t("nutrition.exceededGoal", { n: Math.round(totals.calories - tee) }))}
            </div>
          </>
        )}
        <div style={NS.macrosRow} data-tour="nutrition-summary">
          <div style={NS.macroChip}><div style={NS.macroValue}><NumericValue value={Math.round(totals.protein * 10) / 10} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.protein")}</div></div>
          <div style={NS.macroChip}><div style={NS.macroValue}><NumericValue value={Math.round(totals.carbs * 10) / 10} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.carbs")}</div></div>
          <div style={NS.macroChip}><div style={NS.macroValue}><NumericValue value={Math.round(totals.fat * 10) / 10} unit={t("common.units.g")} /></div><div style={NS.macroLabel}>{t("common.units.fat")}</div></div>
        </div>

        <MacroRings totals={totals} macroTargets={macroTargets} />

        <div style={NS.guidelineCard}>
          {[
            { key: "fiber", label: t("common.units.fiber"), value: totals.fiber, goal: DAILY_GUIDELINES.fiberMaxG, goalLabel: t("nutrition.fiberGoal", { min: DAILY_GUIDELINES.fiberMinG, max: DAILY_GUIDELINES.fiberMaxG }), unit: t("common.units.g"), color: "#5FA8A0" },
            { key: "sugar", label: t("common.units.sugar"), value: totals.sugar, goal: DAILY_GUIDELINES.sugarMaxG, goalLabel: t("nutrition.sugarGoal", { max: DAILY_GUIDELINES.sugarMaxG }), unit: t("common.units.g"), color: "#C9A24B" },
            { key: "sodium", label: t("common.units.sodium"), value: totals.sodium, goal: DAILY_GUIDELINES.sodiumMaxMg, goalLabel: t("nutrition.sodiumGoal", { max: DAILY_GUIDELINES.sodiumMaxMg }), unit: t("common.units.mg"), color: "#D17B5F" },
            { key: "cholesterol", label: t("common.units.cholesterol"), value: totals.cholesterol, goal: DAILY_GUIDELINES.cholesterolMaxMg, goalLabel: t("nutrition.cholesterolGoal", { max: DAILY_GUIDELINES.cholesterolMaxMg }), unit: t("common.units.mg"), color: "#9B7EBD" },
          ].map((g) => {
            const pct = Math.min(100, Math.round((g.value / g.goal) * 100));
            return (
              <div key={g.key} style={NS.guidelineRow}>
                <div style={NS.guidelineHead}>
                  <span><span style={NS.guidelineName}>{g.label}</span> — <NumericValue value={Math.round(g.value * 10) / 10} unit={g.unit} /></span>
                  <span>{isolateNumbers(g.goalLabel)}</span>
                </div>
                <div style={NS.barTrack}><div style={{ ...NS.barFill, width: `${pct}%`, background: g.color }} /></div>
              </div>
            );
          })}
          <div style={NS.guidelineCardNote}>
            <Info size={11} style={{ verticalAlign: "-1.5px", marginInlineEnd: 3 }} />
            {isolateNumbers(t("nutrition.guidelineNote", { sodium: DAILY_GUIDELINES.sodiumMaxMg, cholesterol: DAILY_GUIDELINES.cholesterolMaxMg }))}
          </div>
        </div>

        <div>
          <div style={NS.microHead}>{t("nutrition.microToday")}</div>
          <div style={NS.disclaimerBox}>
            <Sparkles size={15} color="#C9A24B" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {t("nutrition.microDisclaimer")}
              {!hasAgeGender && ` ${t("nutrition.microDisclaimerProfile")}`}
            </span>
          </div>
          {microRows.map((m) => (
            <div key={m.key} style={NS.guidelineRow}>
              <div style={NS.guidelineHead}>
                <span>
                  <span style={NS.guidelineName}>{m.label}</span> — {m.approx && <span style={NS.approxBadge} title={t("nutrition.approxMicroHint")}>≈ </span>}<NumericValue value={m.value} unit={m.unit} />
                </span>
                <span>{isolateNumbers(t("nutrition.microPercent", { pct: m.pct, rdi: m.rdi, unit: m.unit }))}</span>
              </div>
              <div style={NS.barTrack}><div style={{ ...NS.barFill, width: `${m.pct}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div style={NS.waterCard}>
        <div style={NS.waterHead}>
          <span style={NS.waterTitle}><Droplet size={15} color="#5FA8A0" /> {t("nutrition.water")}</span>
          <span style={NS.waterCount}>{cupsGoal ? t("nutrition.waterCups", { cups: todayCups, goal: cupsGoal }) : `${todayCups} ${t("nutrition.unitOptions.cup")}`}</span>
        </div>
        {cupsGoal && <div style={{ ...NS.barTrack, marginBottom: 10 }}><div style={{ ...NS.barFill, width: `${waterPercent}%`, background: "linear-gradient(90deg, #3E7E78, #5FA8A0)" }} /></div>}
        <button onClick={addWaterCup} style={NS.waterAddBtn} data-tour="water-add-btn"><Plus size={15} /> {t("nutrition.waterGlass")}</button>
      </div>

      <div style={NS.aiAnalysisCard}>
        <div style={NS.aiAnalysisHead}>
          <span style={NS.aiAnalysisTitle}><Sparkles size={15} color="#C9A24B" /> {t("nutrition.dailyAnalysis")}</span>
          {isSub && (
            <button onClick={generateDailyAnalysis} disabled={analysisLoading} style={NS.aiAnalysisBtn}>
              {analysisLoading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
              {analysisLoading ? "..." : t("nutrition.analyze")}
            </button>
          )}
        </div>
        {isSub ? (
          <>
            {!dailyAnalysis && <div style={NS.emptyHint}>{t("nutrition.analysisRequestNote")}</div>}
            {dailyAnalysis?.error && <div style={NS.emptyHint}>{dailyAnalysis.error}</div>}
            {dailyAnalysis?.text && <p style={NS.aiAnalysisText}>{isolateNumbers(dailyAnalysis.text)}</p>}
          </>
        ) : (
          <MiniUpsell title={t("nutrition.upsellAnalysisTitle")} message={t("nutrition.upsellAnalysisMessage")} />
        )}
      </div>

      <div style={NS.logHead}>{isViewingToday ? t("nutrition.todayLog") : t("nutrition.selectedDayLog")}</div>
      <div className="stagger-in responsive-card-list">
      {MEAL_TYPES.map((mt) => (
        <MealCard
          key={mt}
          mealType={mt}
          items={selectedLog.filter((e) => e.mealType === mt)}
          dayTotalCalories={Math.round(totals.calories)}
          usualTimeLabel={usualMealTimes[mt] ? isolateNumbers(t("nutrition.usualMealTime", { range: formatHourRange(usualMealTimes[mt].minH, usualMealTimes[mt].maxH, i18n.language === "en") })) : null}
          isCurrent={isViewingToday && currentMealType === mt}
          isEn={i18n.language === "en"}
          t={t}
          onAddFood={openAddFoodFor}
          onDeleteItem={removeEntry}
          onEditSave={updateEntry}
        />
      ))}
      {selectedLog.some((e) => !e.mealType) && (
        <div>
          <div style={NS.mealGroupHead}>
            <span>{t("nutrition.unspecifiedMeal")}</span>
            <span style={NS.mealGroupCalories}>{isolateNumbers(t("nutrition.calSuffix", { cal: Math.round(sumNutritionEntries(selectedLog.filter((e) => !e.mealType)).calories) }))}</span>
          </div>
          {selectedLog.filter((e) => !e.mealType).map((e) => (
            <div key={e.id} style={NS.logItem}>
              <div style={{ flex: 1 }}>
                <div style={NS.logItemName}>{e.foodName}</div>
                <div style={NS.logItemMeta}>{isolateNumbers(t("nutrition.servingSummary", { servingInfo: e.servingInfo, p: e.protein, c: e.carbs, f: e.fat }))}</div>
              </div>
              <div style={NS.logItemCalories}>{isolateNumbers(t("nutrition.calSuffix", { cal: Math.round(e.calories) }))}</div>
              <button onClick={() => removeEntry(e.id)} style={NS.deleteBtn}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
      </div>

      {sheet && sheet !== "scan" && (
        <div style={NS.overlay} className="overlay-in" onClick={closeSheet}>
          <div style={NS.sheet} className="sheet-in" onClick={(e) => e.stopPropagation()}>
            {sheet !== "scan" && (
              <div style={NS.sheetHead}>
                <span style={NS.sheetTitle}>
                  {sheet === "choose" && t("nutrition.sheetTitles.addFood")}
                  {sheet === "barcodeManual" && t("nutrition.sheetTitles.barcodeEntry")}
                  {sheet === "search" && t("nutrition.sheetTitles.searchByName")}
                  {sheet === "aiPhoto" && t("nutrition.sheetTitles.photographMeal")}
                  {sheet === "labelPhoto" && t("nutrition.sheetTitles.photographLabel")}
                  {sheet === "addProduct" && t("nutrition.sheetTitles.addNewProduct")}
                  {sheet === "manual" && t("nutrition.sheetTitles.manualEntry")}
                  {sheet === "confirm" && t("nutrition.sheetTitles.confirmQuantity")}
                  {sheet === "lookup" && t("nutrition.sheetTitles.searching")}
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
              <div style={NS.chooserGrid} data-tour="add-food-chooser">
                <button onClick={() => setSheet("scan")} style={NS.chooserBtn}>
                  <span style={NS.chooserIcon}><Camera size={19} /></span> {t("nutrition.scanWithCameraOption")}
                </button>
                <button onClick={() => setSheet("barcodeManual")} style={NS.chooserBtn}>
                  <span style={NS.chooserIcon}><Hash size={19} /></span> {t("nutrition.enterBarcodeManually")}
                </button>
                <button onClick={() => setSheet("search")} style={NS.chooserBtn}>
                  <span style={NS.chooserIcon}><Search size={19} /></span> {t("nutrition.searchByNameOption")}
                </button>
                <button
                  onClick={() => setSheet(isSub ? "aiPhoto" : "aiPhotoLocked")}
                  style={{ ...NS.chooserBtn, ...(!isSub ? NS.chooserBtnDisabled : {}) }}
                >
                  <span style={NS.chooserIcon}><ImagePlus size={19} /></span>
                  {t("nutrition.photographMealAi")}
                  {!isSub && <span style={NS.chooserBadge}>{t("nutrition.premiumBadge")}</span>}
                </button>
                <button
                  onClick={() => setSheet(isSub ? "labelPhoto" : "labelPhotoLocked")}
                  style={{ ...NS.chooserBtn, ...(!isSub ? NS.chooserBtnDisabled : {}) }}
                >
                  <span style={NS.chooserIcon}><ClipboardList size={19} /></span>
                  {t("nutrition.photographLabelOption")}
                  {!isSub && <span style={NS.chooserBadge}>{t("nutrition.premiumBadge")}</span>}
                </button>
                <button
                  onClick={() => setSheet(isSub ? "addProduct" : "addProductLocked")}
                  style={{ ...NS.chooserBtn, ...(!isSub ? NS.chooserBtnDisabled : {}) }}
                >
                  <span style={NS.chooserIcon}><Plus size={19} /></span>
                  {t("nutrition.addNewProductOption")}
                  {!isSub && <span style={NS.chooserBadge}>{t("nutrition.premiumBadge")}</span>}
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
              <MiniUpsell title={t("nutrition.upsellPhotoTitle")} message={t("nutrition.upsellPhotoMessage")} />
            )}

            {sheet === "aiPhoto" && (
              <AIPhotoPanel
                onSave={(entry) => addEntry(entry)}
                onManual={() => setSheet("manual")}
                preselectedMealType={preselectedMealType}
              />
            )}

            {sheet === "labelPhotoLocked" && (
              <MiniUpsell title={t("nutrition.upsellLabelTitle")} message={t("nutrition.upsellLabelMessage")} />
            )}

            {sheet === "labelPhoto" && (
              <LabelPhotoPanel
                onSave={(entry) => addEntry(entry)}
                onManual={() => setSheet("manual")}
                preselectedMealType={preselectedMealType}
              />
            )}

            {sheet === "addProductLocked" && (
              <MiniUpsell title={t("nutrition.upsellWizardTitle")} message={t("nutrition.upsellWizardMessage")} />
            )}

            {sheet === "addProduct" && (
              <AddProductWizard
                initialBarcode={pendingBarcode}
                onSave={saveManualEntry}
                onManual={() => setSheet("manual")}
                showToast={showToast}
              />
            )}

            {sheet === "manual" && (
              <>
                {lookupError && <div style={NS.errorText}>{lookupError}</div>}
                <ManualEntryForm barcode={pendingBarcode} onSave={saveManualEntry} onCancel={closeSheet} preselectedMealType={preselectedMealType} />
              </>
            )}

            {sheet === "lookup" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", gap: 10 }}>
                <Loader2 size={22} className="spin" color="var(--gold)" />
                <span style={{ fontSize: 13, color: "var(--muted2)" }}>{t("nutrition.searchingForProduct")}</span>
              </div>
            )}

            {sheet === "confirm" && pendingProduct && (
              <ConfirmQuantityCard
                product={pendingProduct.product}
                source={pendingProduct.source}
                onAdd={addEntry}
                onCancel={closeSheet}
                showToast={showToast}
                preselectedMealType={preselectedMealType}
              />
            )}
          </div>
        </div>
      )}

      {sheet === "scan" && (
        <BarcodeScannerModal onDetected={handleBarcodeDetected} onClose={closeSheet} />
      )}

      {nutritionTourStep > 0 && nutritionTourStep !== "waiting" && (
        <SpotlightTour
          steps={[
            { target: '[data-tour="add-breakfast"]', interactive: true, title: t("onboarding.nutritionTour.step1Title"), body: t("onboarding.nutritionTour.step1Body") },
            { target: '[data-tour="add-food-chooser"]', interactive: true, title: t("onboarding.nutritionTour.step2Title"), body: t("onboarding.nutritionTour.step2Body") },
            { target: '[data-tour="meal-card-breakfast"]', title: t("onboarding.nutritionTour.step3Title"), body: t("onboarding.nutritionTour.step3Body") },
            { target: '[data-tour="nutrition-summary"]', title: t("onboarding.nutritionTour.step4Title"), body: t("onboarding.nutritionTour.step4Body") },
            { target: '[data-tour="water-add-btn"]', interactive: true, title: t("onboarding.nutritionTour.step5Title"), body: t("onboarding.nutritionTour.step5Body") },
          ]}
          stepIndex={nutritionTourStep - 1}
          onNext={() => {
            if (nutritionTourStep === 2) { setNutritionTourStep("waiting"); return; }
            if (nutritionTourStep === 5) { finishNutritionTour(); return; }
            setNutritionTourStep((s) => s + 1);
          }}
          onSkip={finishNutritionTour}
          onFinish={finishNutritionTour}
          labels={{ skip: t("onboarding.skip"), next: t("onboarding.next"), start: t("common.buttons.ok"), back: t("common.buttons.back"), tapHere: t("onboarding.tapHere") }}
        />
      )}
    </div>
  );
}
