import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, X, Trash2, Camera, Search, Loader2, Droplet, Flame, Check,
} from "lucide-react";
import { store } from "../lib/store";
import { todayKey, uid } from "../lib/helpers";
import {
  fetchProductByBarcode, searchProductsByName, scaleNutrients,
  sumNutritionEntries, waterGoalCups, servingPresets,
} from "../lib/nutrition";
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
  chooserBtn: { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "var(--surface-sunken)", border: "1px solid var(--border2)", borderRadius: 12, padding: "13px 14px", fontSize: 14, fontWeight: 600, color: "var(--ink)", cursor: "pointer", fontFamily: "inherit", marginBottom: 10 },
  chooserIcon: { width: 32, height: 32, borderRadius: 10, background: "rgba(201,162,75,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gold)", flexShrink: 0 },
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
};

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
        if (!cancelled) setError("تعذّر الوصول إلى كاميرا الجهاز. تأكد من السماح للمتصفح باستخدام الكاميرا، أو استخدم البحث بالاسم/الإدخال اليدوي.");
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
    <div style={NS.overlay} onClick={onClose}>
      <div style={NS.sheet} onClick={(e) => e.stopPropagation()}>
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

function ConfirmQuantityCard({ product, source, onAdd, onCancel }) {
  const presets = servingPresets(product.servingGrams);
  const [grams, setGrams] = useState(presets[0].grams);
  const preview = scaleNutrients(product, grams || 0);

  return (
    <>
      <div style={NS.productHead}>
        {product.imageUrl && <img src={product.imageUrl} alt="" style={NS.productImg} />}
        <div>
          <div style={NS.productName}>{product.name}</div>
          <div style={NS.productMeta}>{product.caloriesPer100g} سعرة / 100غم</div>
        </div>
      </div>
      <label style={S.label}>الكمية (غم)</label>
      <input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(Number(e.target.value))} style={S.input} />
      <div style={NS.presetRow}>
        {presets.map((p) => (
          <button key={p.label} onClick={() => setGrams(p.grams)} style={{ ...NS.presetChip, ...(grams === p.grams ? NS.presetChipActive : {}) }}>{p.label}</button>
        ))}
      </div>
      <div style={NS.previewGrid}>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.calories}</div><div style={NS.macroLabel}>سعرة</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.protein}غ</div><div style={NS.macroLabel}>بروتين</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.carbs}غ</div><div style={NS.macroLabel}>كارب</div></div>
        <div style={NS.previewChip}><div style={NS.macroValue}>{preview.fat}غ</div><div style={NS.macroLabel}>دهون</div></div>
      </div>
      <button
        onClick={() => onAdd({
          id: uid(), foodName: product.name, ...preview,
          servingInfo: `${grams} غم`, source,
        })}
        style={S.saveBtn}
        disabled={!grams || grams <= 0}
      >
        إضافة إلى سجل اليوم
      </button>
      <button onClick={onCancel} style={{ ...S.exportBtn, marginTop: 8, marginBottom: 0 }}>رجوع</button>
    </>
  );
}

function ManualEntryForm({ barcode, onSave, onCancel }) {
  const [draft, setDraft] = useState({ foodName: "", calories: "", protein: "", carbs: "", fat: "" });
  function change(field, val) { setDraft((d) => ({ ...d, [field]: val })); }
  const valid = draft.foodName.trim() && Number(draft.calories) > 0;

  return (
    <>
      {barcode && <p style={NS.notFoundNote}>لم يُعثر على هذا المنتج ({barcode}) في قاعدة بيانات الأطعمة. أضِفه يدوياً وسنتذكره تلقائياً لهذا الباركود في المرات القادمة.</p>}
      <label style={S.label}>اسم الطعام</label>
      <input value={draft.foodName} onChange={(e) => change("foodName", e.target.value)} placeholder="مثال: تمر سكري" style={S.input} />
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
      <button
        onClick={() => onSave({
          id: uid(), foodName: draft.foodName.trim(),
          calories: Number(draft.calories) || 0, protein: Number(draft.protein) || 0,
          carbs: Number(draft.carbs) || 0, fat: Number(draft.fat) || 0,
          servingInfo: "إدخال يدوي", source: "manual", barcode,
        })}
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

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true); setError(null); setSearched(true);
    const res = await searchProductsByName(q);
    setLoading(false);
    if (!res.ok) { setError(res.error); setResults([]); return; }
    setResults(res.products);
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

export default function NutritionView({ healthProfile, showToast }) {
  const [loaded, setLoaded] = useState(false);
  const [nutritionLog, setNutritionLog] = useState([]);
  const [waterLog, setWaterLog] = useState({});
  const [sheet, setSheet] = useState(null); // null | "choose" | "scan" | "search" | "manual" | "confirm"
  const [pendingProduct, setPendingProduct] = useState(null); // { product, source }
  const [pendingBarcode, setPendingBarcode] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState(null);

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
  const tee = healthProfile?.tee || null;
  const teePercent = tee ? Math.min(100, Math.round((totals.calories / tee) * 100)) : 0;
  const todayCups = waterLog[today] || 0;
  const cupsGoal = waterGoalCups(healthProfile?.weightKg);
  const waterPercent = cupsGoal ? Math.min(100, Math.round((todayCups / cupsGoal) * 100)) : 0;

  function closeSheet() {
    setSheet(null);
    setPendingProduct(null);
    setPendingBarcode(null);
    setLookupError(null);
  }

  async function addEntry(entry) {
    const full = { ...entry, date: today };
    setNutritionLog((prev) => [full, ...prev]);
    await store.addNutritionEntry(full);
    showToast("أُضيف إلى سجل اليوم");
    closeSheet();
  }

  async function removeEntry(id) {
    setNutritionLog((prev) => prev.filter((e) => e.id !== id));
    await store.deleteNutritionEntry(id);
  }

  async function addWaterCup() {
    const next = todayCups + 1;
    setWaterLog((prev) => ({ ...prev, [today]: next }));
    await store.saveWaterCups(today, next);
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
          carbsPer100g: cached.carbs, fatPer100g: cached.fat, imageUrl: null, servingGrams: null,
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

  async function saveManualEntry(entry) {
    if (entry.barcode) {
      await store.saveCustomFood({
        barcode: entry.barcode, foodName: entry.foodName,
        calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fat: entry.fat,
      });
    }
    await addEntry(entry);
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
      </div>

      <div style={NS.waterCard}>
        <div style={NS.waterHead}>
          <span style={NS.waterTitle}><Droplet size={15} color="#5FA8A0" /> الماء</span>
          <span style={NS.waterCount}>{todayCups}{cupsGoal ? ` / ${cupsGoal}` : ""} كوب</span>
        </div>
        {cupsGoal && <div style={{ ...NS.barTrack, marginBottom: 10 }}><div style={{ ...NS.barFill, width: `${waterPercent}%`, background: "linear-gradient(90deg, #3E7E78, #5FA8A0)" }} /></div>}
        <button onClick={addWaterCup} style={NS.waterAddBtn}><Plus size={15} /> كوب ماء</button>
      </div>

      <button onClick={() => setSheet("choose")} style={NS.addFoodBtn}><Plus size={16} /> أضف طعاماً</button>

      <div style={NS.logHead}>سجل اليوم</div>
      {loaded && todayLog.length === 0 && <div style={NS.emptyHint}>لم تُضِف أي طعام اليوم بعد.</div>}
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

      {sheet && sheet !== "scan" && (
        <div style={NS.overlay} onClick={closeSheet}>
          <div style={NS.sheet} onClick={(e) => e.stopPropagation()}>
            {sheet !== "scan" && (
              <div style={NS.sheetHead}>
                <span style={NS.sheetTitle}>
                  {sheet === "choose" && "أضف طعاماً"}
                  {sheet === "search" && "بحث بالاسم"}
                  {sheet === "manual" && "إضافة يدوية"}
                  {sheet === "confirm" && "تأكيد الكمية"}
                  {sheet === "lookup" && "جاري البحث..."}
                </span>
                <button onClick={closeSheet} style={NS.closeBtn}><X size={16} /></button>
              </div>
            )}

            {sheet === "choose" && (
              <>
                <button onClick={() => setSheet("scan")} style={NS.chooserBtn}>
                  <span style={NS.chooserIcon}><Camera size={17} /></span> مسح الباركود
                </button>
                <button onClick={() => setSheet("search")} style={NS.chooserBtn}>
                  <span style={NS.chooserIcon}><Search size={17} /></span> بحث بالاسم
                </button>
                <button onClick={() => setSheet("manual")} style={NS.chooserBtn}>
                  <span style={NS.chooserIcon}><Plus size={17} /></span> إضافة يدوية
                </button>
              </>
            )}

            {sheet === "search" && (
              <SearchPanel
                onPick={(product) => { setPendingProduct({ product, source: "search" }); setSheet("confirm"); }}
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
