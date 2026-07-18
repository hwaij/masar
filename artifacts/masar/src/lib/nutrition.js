// قسم "التغذية": الاتصال بـ Open Food Facts (بحث بالباركود أو بالاسم)
// وحسابات ماء/سعرات اليوم. Open Food Facts مجاني ولا يحتاج مفتاح API.
// التوثيق: https://world.openfoodfacts.org/data

import { parseJsonLoose } from "./helpers";

const OFF_PRODUCT_URL = (barcode) => `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
const OFF_SEARCH_URL = (query) => `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=true&page_size=20`;

// مهلة قصيرة حتى لا يعلّق المستخدم طويلاً إن كان الاتصال بطيئاً/معطّلاً —
// الإدخال اليدوي بديل متاح دائماً بغضّ النظر عن نتيجة هذا الاستدعاء.
const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// تُطبَّع بيانات Open Food Facts (اسم مختلف الحقول واختلاف توفّرها) إلى
// شكل موحّد يفهمه بقية القسم، بغضّ النظر عن مصدرها (منتج أو نتيجة بحث).
function normalizeProduct(p, barcode) {
  const n = p.nutriments || {};
  const caloriesPer100g = n["energy-kcal_100g"] ?? n["energy-kcal"] ?? null;
  const proteinPer100g = n["proteins_100g"] ?? null;
  const carbsPer100g = n["carbohydrates_100g"] ?? null;
  const fatPer100g = n["fat_100g"] ?? null;
  if (caloriesPer100g == null) return null; // بلا سعرات لكل 100غم، لا فائدة من عرضه
  // serving_quantity يأتي أحياناً كنص وأحياناً كرقم؛ نستخرج أول رقم فقط.
  const servingMatch = String(p.serving_size || "").match(/[\d.]+/);
  const servingGrams = p.serving_quantity ? Number(p.serving_quantity) : (servingMatch ? Number(servingMatch[0]) : null);
  // Open Food Facts تُخزّن الصوديوم بالغرام لكل 100غم (sodium_100g) لا
  // بالميليغرام - نحوّله هنا مرة واحدة حتى يبقى كل الصوديوم في هذا الملف
  // بالميليغرام دائماً (المعيار المعروف عالمياً لعرضه: أقل من 2300مغم يومياً).
  const sodiumGramsPer100g = n["sodium_100g"] ?? null;
  return {
    barcode: p.code || barcode || "",
    name: p.product_name || p.generic_name || "منتج بلا اسم",
    brand: p.brands || "",
    country: (p.countries || "").split(",")[0]?.trim() || "",
    imageUrl: p.image_front_small_url || p.image_front_url || p.image_url || null,
    caloriesPer100g,
    proteinPer100g: proteinPer100g ?? 0,
    carbsPer100g: carbsPer100g ?? 0,
    fatPer100g: fatPer100g ?? 0,
    fiberPer100g: n["fiber_100g"] ?? 0,
    sugarPer100g: n["sugars_100g"] ?? 0,
    sodiumPer100gMg: sodiumGramsPer100g != null ? Math.round(sodiumGramsPer100g * 1000) : 0,
    servingSizeLabel: p.serving_size || null,
    servingGrams: servingGrams && servingGrams > 0 ? servingGrams : null,
  };
}

// تطبيع نص البحث: أحرف صغيرة، إزالة التشكيل العربي والتطويل، وقصّ
// المسافات الزائدة من الطرفين وضغط المسافات الداخلية - يُستخدم قبل أي
// مقارنة نصية (المرادفات، ومطابقة اسم منتج محفوظ محلياً) حتى يعمل البحث
// بنفس الدقة بغض النظر عن حالة الأحرف أو تشكيل زائد كتبه المستخدم.
export function normalizeSearchTerm(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, "") // تشكيل عربي (فتحتان..سكون) + ألف خنجرية + تطويل
    .trim()
    .replace(/\s+/g, " ");
}

// إرشادات تقديرية عامة معروفة (ليست دقيقة طبياً لفرد بعينه) لمقارنة
// الاستهلاك اليومي - مذكورة صراحة كتقديرات عامة في الواجهة، لا كأرقام
// موصوفة طبياً لحالة المستخدم.
export const DAILY_GUIDELINES = {
  fiberMinG: 25,
  fiberMaxG: 30,
  sugarMaxG: 50,
  sodiumMaxMg: 2300,
};

// يُرجع { found: true, product } أو { found: false, error? } — لا يرمي
// استثناءً أبداً، حتى تبقى واجهة الاستخدام بسيطة (دائماً await ثم تحقّق
// من found) والإدخال اليدوي متاحاً كبديل فوري عند أي فشل.
export async function fetchProductByBarcode(barcode) {
  try {
    const data = await fetchWithTimeout(OFF_PRODUCT_URL(barcode));
    if (data.status !== 1 || !data.product) return { found: false };
    const product = normalizeProduct(data.product, barcode);
    if (!product) return { found: false };
    return { found: true, product };
  } catch (e) {
    console.error("[nutrition] fetchProductByBarcode failed:", e);
    return { found: false, error: "تعذّر الاتصال بقاعدة بيانات الأطعمة. تأكد من اتصالك بالإنترنت أو أضف الطعام يدوياً." };
  }
}

export async function searchProductsByName(query) {
  try {
    const data = await fetchWithTimeout(OFF_SEARCH_URL(query));
    const products = (data.products || [])
      .map((p) => normalizeProduct(p, p.code))
      .filter(Boolean)
      .slice(0, 20);
    return { ok: true, products };
  } catch (e) {
    console.error("[nutrition] searchProductsByName failed:", e);
    return { ok: false, products: [], error: "تعذّر البحث الآن. تأكد من اتصالك بالإنترنت أو أضف الطعام يدوياً." };
  }
}

// خيارات سريعة لحجم الحصة — تُعبّئ خانة "الكمية (غم)" ولا تمنع المستخدم
// من كتابة رقم مختلف بنفسه.
export function servingPresets(servingGrams) {
  const presets = [{ label: "100 غم", grams: 100 }];
  if (servingGrams) presets.push({ label: "حصة واحدة", grams: Math.round(servingGrams) });
  presets.push({ label: "كوب (~240غم)", grams: 240 });
  return presets;
}

// وحدات القياس المتاحة عند تسجيل الطعام. "factor" يحوّل رقماً واحداً من
// الوحدة إلى غرام/مليلتر مباشرة (تقديرات معيارية معروفة)؛ "piece" و
// "serving" ليس لهما تحويل ثابت لأن وزنهما يعتمد على المنتج نفسه، فتُحسب
// عبر servingGrams إن كان معروفاً (وإلا افتراض معقول 100غم). "approx"
// يُستخدم لعرض ملاحظة "تقدير تقريبي" بجانب أي وحدة ليست وزناً مباشراً.
export const UNIT_OPTIONS = [
  { id: "g", label: "غرام (g)", factor: 1, approx: false },
  { id: "kg", label: "كيلوغرام (kg)", factor: 1000, approx: false },
  { id: "ml", label: "مليلتر (ml)", factor: 1, approx: true },
  { id: "l", label: "لتر (L)", factor: 1000, approx: true },
  { id: "tbsp", label: "ملعقة كبيرة", factor: 15, approx: true },
  { id: "tsp", label: "ملعقة صغيرة", factor: 5, approx: true },
  { id: "cup", label: "كوب", factor: 240, approx: true },
  { id: "piece", label: "قطعة", factor: null, approx: true },
  { id: "serving", label: "حصة", factor: null, approx: true },
];

export function unitById(unitId) {
  return UNIT_OPTIONS.find((u) => u.id === unitId) || UNIT_OPTIONS[0];
}

// يحوّل كمية مُدخلة بأي وحدة إلى غرام/مليلتر مكافئ لاستخدامه مباشرة في
// scaleNutrients (التي تحسب دائماً بمعامل غرام/100). "قطعة"/"حصة" ليس لهما
// معامل ثابت فتُستخدم servingGrams الفعلية للمنتج إن توفرت، أو 100 كافتراض
// معقول عند غيابها.
export function unitToGrams(unitId, qty, servingGrams) {
  const unit = unitById(unitId);
  const n = Number(qty) || 0;
  if (unit.factor != null) return n * unit.factor;
  const base = servingGrams && servingGrams > 0 ? servingGrams : 100;
  return n * base;
}

// يحسب القيم الفعلية لكمية معيّنة بالغرام انطلاقاً من قيم كل 100غم.
export function scaleNutrients(product, grams) {
  const factor = grams / 100;
  return {
    calories: Math.round(product.caloriesPer100g * factor),
    protein: Math.round(product.proteinPer100g * factor * 10) / 10,
    carbs: Math.round(product.carbsPer100g * factor * 10) / 10,
    fat: Math.round(product.fatPer100g * factor * 10) / 10,
    fiber: Math.round((product.fiberPer100g || 0) * factor * 10) / 10,
    sugar: Math.round((product.sugarPer100g || 0) * factor * 10) / 10,
    sodium: Math.round((product.sodiumPer100gMg || 0) * factor),
  };
}

export function sumNutritionEntries(entries) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
      fiber: acc.fiber + (e.fiber || 0),
      sugar: acc.sugar + (e.sugar || 0),
      sodium: acc.sodium + (e.sodium || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  );
}

// الكاميرا تحتاج سياقاً آمناً (HTTPS) لتعمل في أي متصفح — localhost مستثنى
// دائماً لأغراض التطوير المحلي.
export function isSecureContextForCamera() {
  return typeof window !== "undefined" && (window.isSecureContext || window.location.hostname === "localhost");
}

// رسالة مختلفة حسب سبب فشل getUserMedia الفعلي (اسم الخطأ القياسي الذي
// يرجعه المتصفح)، بدل رسالة عامة واحدة لكل الحالات — تشمل إرشاداً مختلفاً
// لـiOS مقابل Android عند رفض الإذن، وهي الحالة الأشيع في سياق PWA.
export function describeCameraError(err) {
  const name = err?.name || "";
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return isIOS
      ? "يبدو أن إذن الكاميرا معطّل. من إعدادات آيفون: الإعدادات ← مسار (أو Safari إن لم يكن التطبيق مثبّتاً على شاشتك الرئيسية) ← فعّل إذن الكاميرا، ثم أعد المحاولة."
      : "يبدو أن إذن الكاميرا معطّل. من إعدادات جهازك: الإعدادات ← التطبيقات ← مسار (أو المتصفح) ← الأذونات ← فعّل إذن الكاميرا، ثم أعد المحاولة.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "لم يُعثر على كاميرا في هذا الجهاز. استخدم البحث بالاسم أو الإدخال اليدوي بدلاً من ذلك.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "الكاميرا مستخدَمة من تطبيق آخر حالياً. أغلق أي تطبيق آخر يستخدم الكاميرا وحاول مرة أخرى.";
  }
  if (name === "OverconstrainedError") {
    return "تعذّر ضبط الكاميرا الخلفية على هذا الجهاز. جرّب مرة أخرى أو استخدم البحث بالاسم/الإدخال اليدوي.";
  }
  if (name === "SecurityError") {
    return "تعذّر الوصول للكاميرا بسبب اتصال غير آمن. تأكد من فتح الموقع عبر رابط https.";
  }
  return "تعذّر الوصول إلى كاميرا الجهاز. تأكد من السماح للمتصفح باستخدام الكاميرا، أو استخدم البحث بالاسم/الإدخال اليدوي.";
}

const ML_PER_KG = 33;
const ML_PER_CUP = 250;

// الهدف اليومي للماء بالأكواب = (الوزن كغم × 33 مل) ÷ 250 مل للكوب،
// مقرّباً لأقرب عدد صحيح لا يقل عن كوب واحد.
export function waterGoalCups(weightKg) {
  if (!weightKg) return null;
  const ml = weightKg * ML_PER_KG;
  return Math.max(1, Math.round(ml / ML_PER_CUP));
}

// يضغط صورة الوجبة قبل إرسالها (تصغير للبُعد الأطول + ضغط JPEG) - يبقي
// حجم الطلب معقولاً لسقف حجم الطلب في Netlify Function ولحساب Gemini،
// ويسرّع الرفع على اتصال جوال بطيء. يُرجع base64 بلا رأس data: URL.
async function compressImageToBase64(file, maxDim = 1024, quality = 0.75) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("تعذّر تحميل الصورة"));
    el.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
  return { base64: compressedDataUrl.split(",")[1], mimeType: "image/jpeg" };
}

// نقطة التكامل الوحيدة مع "التعرّف على الطعام بالذكاء الاصطناعي". اليوم
// تستدعي Gemini داخلياً، لكنها معزولة عمداً هنا بواجهة ثابتة (صورة تدخل،
// تقدير غذائي منظّم يخرج) - استبدال Gemini مستقبلاً بخدمة تعرّف متخصصة
// على الطعام يعني تعديل جسم هذه الدالة فقط، دون أي تغيير في NutritionView
// أو أي مكان آخر يستدعيها.
export async function recognizeMealFromImage(imageFile) {
  try {
    const { base64, mimeType } = await compressImageToBase64(imageFile);
    const prompt = `حلّل صورة الوجبة هذه. أرجع فقط JSON صالحاً بدون أي نص أو markdown إضافي، بهذا الشكل بالضبط:
{"items":["اسم نوع الطعام الأول","اسم نوع الطعام الثاني"],"calories":رقم,"protein":رقم,"carbs":رقم,"fat":رقم}
حيث items قائمة بأنواع الطعام الظاهرة في الصورة بالعربية، والقيم الأخرى تقدير إجمالي تقريبي للوجبة كاملة كما تبدو في الصورة (سعرات حرارية، بروتين وكارب ودهون بالغرام). قدّر بأفضل ما تستطيع بناءً على الحجم الظاهر، ولا تُرجع أصفاراً افتراضية إن كان هناك طعام واضح في الصورة.`;
    const { geminiAnalyzeImage } = await import("./gemini.js");
    const text = await geminiAnalyzeImage(prompt, base64, mimeType, 500);
    const parsed = parseJsonLoose(text);
    return {
      ok: true,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      calories: Number(parsed.calories) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fat: Number(parsed.fat) || 0,
    };
  } catch (e) {
    console.error("[nutrition] recognizeMealFromImage failed:", e);
    return { ok: false, error: e?.message || "تعذّر تحليل صورة الوجبة الآن. جرّب مرة أخرى أو أضف الطعام يدوياً." };
  }
}
