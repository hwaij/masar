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

// الفيتامينات والمعادن المستهدفة (الأكثر شيوعاً فعلياً على الملصقات
// والباركود). كل مفتاح: تسمية عربية، الوحدة المعروضة، والاحتياج اليومي
// التقديري العام (RDI/DV مرجعية بالغة معروفة، وليست حساباً شخصياً دقيقاً -
// نفس مبدأ "تقديرية" المُتَّبَع في DAILY_GUIDELINES أدناه). إضافة عنصر جديد
// مستقبلاً = سطر واحد هنا فقط، بلا أي تعديل بنيوي (jsonb مرن في القاعدة).
export const MICRONUTRIENT_META = {
  vitamin_d: { label: "فيتامين د", unit: "مكغ", rdi: 20 },
  vitamin_c: { label: "فيتامين ج", unit: "مغ", rdi: 90 },
  vitamin_a: { label: "فيتامين أ", unit: "مكغ", rdi: 900 },
  vitamin_b12: { label: "فيتامين ب12", unit: "مكغ", rdi: 2.4 },
  iron: { label: "الحديد", unit: "مغ", rdi: 18 },
  calcium: { label: "الكالسيوم", unit: "مغ", rdi: 1300 },
  potassium: { label: "البوتاسيوم", unit: "مغ", rdi: 4700 },
  zinc: { label: "الزنك", unit: "مغ", rdi: 11 },
  magnesium: { label: "المغنيسيوم", unit: "مغ", rdi: 420 },
};

// جداول RDA/AI مرجعية معتمدة (NIH Office of Dietary Supplements) حسب الفئة
// العمرية والجنس - تُستخدم لتخصيص الاحتياج اليومي عندما يتوفّر عمر وجنس
// المستخدم في health_profile. ملاحظة علمية مهمة: الوزن والطول لا يدخلان في
// حساب احتياج أغلب الفيتامينات/المعادن (خلافاً للسعرات/TEE) فلا نستخدمهما
// هنا. القيم دون سن 14 غير مغطّاة (فئات الأطفال تختلف جذرياً ولم تُراجَع
// هنا) - عندها ترجع personalizedRDI قيمة null ويستخدم المستدعي rdi العام
// في MICRONUTRIENT_META أعلاه بدلاً منها.
const RDI_RULES = {
  vitamin_d: [
    { minAge: 14, maxAge: 70, value: 15 },
    { minAge: 71, maxAge: Infinity, value: 20 },
  ],
  vitamin_c: [
    { minAge: 14, maxAge: 18, gender: "male", value: 75 },
    { minAge: 14, maxAge: 18, gender: "female", value: 65 },
    { minAge: 19, maxAge: Infinity, gender: "male", value: 90 },
    { minAge: 19, maxAge: Infinity, gender: "female", value: 75 },
  ],
  vitamin_a: [
    { minAge: 14, maxAge: Infinity, gender: "male", value: 900 },
    { minAge: 14, maxAge: Infinity, gender: "female", value: 700 },
  ],
  vitamin_b12: [
    { minAge: 14, maxAge: Infinity, value: 2.4 },
  ],
  iron: [
    { minAge: 14, maxAge: 18, gender: "male", value: 11 },
    { minAge: 14, maxAge: 18, gender: "female", value: 15 },
    { minAge: 19, maxAge: 50, gender: "male", value: 8 },
    { minAge: 19, maxAge: 50, gender: "female", value: 18 },
    { minAge: 51, maxAge: Infinity, value: 8 },
  ],
  calcium: [
    { minAge: 14, maxAge: 18, value: 1300 },
    { minAge: 19, maxAge: 50, value: 1000 },
    { minAge: 51, maxAge: 70, gender: "male", value: 1000 },
    { minAge: 51, maxAge: 70, gender: "female", value: 1200 },
    { minAge: 71, maxAge: Infinity, value: 1200 },
  ],
  potassium: [
    { minAge: 14, maxAge: 18, gender: "male", value: 3000 },
    { minAge: 14, maxAge: 18, gender: "female", value: 2300 },
    { minAge: 19, maxAge: Infinity, gender: "male", value: 3400 },
    { minAge: 19, maxAge: Infinity, gender: "female", value: 2600 },
  ],
  zinc: [
    { minAge: 14, maxAge: 18, gender: "male", value: 11 },
    { minAge: 14, maxAge: 18, gender: "female", value: 9 },
    { minAge: 19, maxAge: Infinity, gender: "male", value: 11 },
    { minAge: 19, maxAge: Infinity, gender: "female", value: 8 },
  ],
  magnesium: [
    { minAge: 14, maxAge: 18, gender: "male", value: 410 },
    { minAge: 14, maxAge: 18, gender: "female", value: 360 },
    { minAge: 19, maxAge: 30, gender: "male", value: 400 },
    { minAge: 19, maxAge: 30, gender: "female", value: 310 },
    { minAge: 31, maxAge: Infinity, gender: "male", value: 420 },
    { minAge: 31, maxAge: Infinity, gender: "female", value: 320 },
  ],
};

// يُرجع الاحتياج اليومي المخصَّص لعنصر معيّن حسب العمر والجنس، أو null إن
// تعذّر التخصيص (عمر غير مُدخَل بعد، أو أصغر من 14، أو لا توجد قاعدة تطابق
// الجنس المطلوب) - عندها يستخدم المستدعي القيمة العامة الافتراضية بدلاً.
export function personalizedRDI(key, age, gender) {
  const rules = RDI_RULES[key];
  if (!rules || !age || age < 14) return null;
  const matches = rules.filter((r) => age >= r.minAge && age <= r.maxAge && (!r.gender || r.gender === gender));
  if (matches.length === 0) return null;
  const genderSpecific = matches.find((r) => r.gender === gender);
  return (genderSpecific || matches[0]).value;
}

// اسم حقل Open Food Facts المقابل لكل مفتاح لدينا. الوحدة القانونية لكل
// عنصر في تصنيف Open Food Facts الرسمي (taxonomies/nutrients.txt) تطابق
// بالضبط الوحدة المعروضة أعلاه (مكغ لفيتامين د/أ/ب12، مغ للباقي) - لا حاجة
// لأي تحويل وحدة إضافي هنا، خلافاً للصوديوم أعلاه (وحدته القانونية غرام).
const OFF_MICRO_FIELDS = {
  vitamin_d: "vitamin-d_100g", vitamin_c: "vitamin-c_100g", vitamin_a: "vitamin-a_100g",
  vitamin_b12: "vitamin-b12_100g", iron: "iron_100g", calcium: "calcium_100g",
  potassium: "potassium_100g", zinc: "zinc_100g", magnesium: "magnesium_100g",
};

// يستخرج فقط العناصر الموجودة فعلياً في استجابة الـAPI - لا يُضيف مفتاحاً
// لعنصر غائب عن بيانات المنتج (مبدأ "لا اختراع قيم": كائن قد يكون فارغاً
// تماماً لمنتج لا تتوفر له أي بيانات فيتامينات، وهذا متوقَّع وطبيعي).
function extractMicronutrients(n) {
  const result = {};
  for (const [key, offField] of Object.entries(OFF_MICRO_FIELDS)) {
    const v = n[offField];
    if (v != null && !Number.isNaN(Number(v))) result[key] = Number(v);
  }
  return result;
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
    micronutrientsPer100g: extractMicronutrients(n),
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

// "حجم حصة واحدة" بالوحدة المطلوبة — تُستخدم لإظهار "كل حصة = X <وحدة>"
// وكقيمة أساس لأزرار عدد الحصص السريعة (×1..×5) في كل وحدات القياس، لا
// الغرام فقط. إن كان حجم حصة حقيقي للمنتج معروفاً (servingGrams) ولهذه
// الوحدة معامل تحويل ثابت (وزن/حجم: g/kg/ml/l/tbsp/tsp/cup)، تُحوَّل حصة
// المنتج الحقيقية لهذه الوحدة (حصة 250غم بوحدة "مل" = 250). لوحدات "قطعة"/
// "حصة" (لا معامل ثابت لهما، تعتمد على servingGrams مباشرة داخل
// unitToGrams) أو عند غياب أي حجم حصة معروف، "حصة واحدة" تعني ببساطة وحدة
// طبيعية واحدة من هذه الوحدة (كوب واحد، ملعقة واحدة، قطعة واحدة) - نفس
// الافتراض الذي يستخدمه unitToGrams أصلاً.
export function unitServingSize(unitId, servingGrams) {
  const unit = unitById(unitId);
  if (servingGrams && servingGrams > 0 && unit.factor != null) return servingGrams / unit.factor;
  return 1;
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

// نفس منطق scaleNutrients بالضبط (كمية بالغرام ÷ 100 × القيمة لكل 100غم)،
// لكن لكائن micronutrientsPer100g المرن (مفاتيح متغيرة حسب توفّر البيانات)
// بدل حقول ثابتة. مفتاح غير موجود في المدخل يبقى غائباً في الخرج تماماً -
// لا صفر مخترَع لعنصر لم تتوفر له بيانات أصلاً لهذا المنتج.
export function scaleMicronutrients(micronutrientsPer100g, grams) {
  if (!micronutrientsPer100g) return {};
  const factor = grams / 100;
  const result = {};
  for (const [key, val] of Object.entries(micronutrientsPer100g)) {
    if (val == null) continue;
    result[key] = Math.round(val * factor * 100) / 100;
  }
  return result;
}

export function sumNutritionEntries(entries) {
  const totals = entries.reduce(
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
  // تُجمَع الفيتامينات/المعادن بمعزل عن الأربعة الأساسية أعلاه لأن مفاتيحها
  // متغيّرة (لا كل إدخال يحمل نفس العناصر، أو أياً منها أصلاً) - أي إدخال
  // بلا micronutrients لا يُسهم بشيء، ولا يظهر أي عنصر لم يُساهم فيه ولو
  // إدخال واحد اليوم بقيمة حقيقية.
  const micronutrients = {};
  for (const e of entries) {
    if (!e.micronutrients) continue;
    for (const [key, val] of Object.entries(e.micronutrients)) {
      if (val == null) continue;
      micronutrients[key] = (micronutrients[key] || 0) + Number(val);
    }
  }
  return { ...totals, micronutrients };
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

// نقطة تكامل معزولة ثانية ومنفصلة تماماً عن recognizeMealFromImage: تلك
// تقدّر وجبة كاملة بصرياً (تخمين)، بينما هذه تقرأ أرقاماً مطبوعة صريحة على
// جدول القيم الغذائية (Nutrition Facts) - مهمة مختلفة جوهرياً (قراءة نص لا
// تقدير بصري)، فتُعزل بدالتها الخاصة حتى يبقى استبدال أي منهما مستقبلاً
// (خدمة OCR متخصصة مثلاً بدل Gemini) تغييراً معزولاً تماماً عن الأخرى.
// "basis": الأساس المرجعي الفعلي كما هو مكتوب على الملصق - لا نفترضه
// أبداً، بل نطلب من Gemini قراءته كما هو (بعض الملصقات لكل 100g، بعضها لكل
// حصة فقط، بعضها الاثنان معاً - عندها نُفضّل 100g/100ml كأساس أدق، لكن هذا
// اختيار Gemini نفسه بحسب التعليمة أدناه، لا افتراض من هذا الكود).
export async function readNutritionLabel(imageFile) {
  try {
    const { base64, mimeType } = await compressImageToBase64(imageFile);
    const prompt = `حلّل صورة "جدول القيم الغذائية" (Nutrition Facts label) المطبوع هذا. اقرأ الأرقام المطبوعة فعلياً على الملصق فقط، ولا تخترع أو تقدّر أي رقم غير مكتوب. أرجع فقط JSON صالحاً بدون أي نص أو markdown إضافي، بهذا الشكل بالضبط:
{"basis":"100g أو 100ml أو serving","servingGrams":رقم أو null,"calories":رقم,"protein":رقم,"carbs":رقم,"fat":رقم,"fiber":رقم,"sugar":رقم,"sodium":رقم,"micronutrients":{}}

حيث:
- "basis": الأساس المرجعي الفعلي المكتوب على الملصق لهذه القيم تحديداً - "100g" إن كانت القيم لكل 100 غرام، "100ml" إن كانت لكل 100 مليلتر، أو "serving" إن كانت لكل حصة واحدة (Per Serving) فقط بدون أي عمود آخر لكل 100g/100ml. إن ذُكر كلاهما معاً على نفس الملصق (شائع جداً)، اختر "100g" أو "100ml" (الأدق دائماً) لا "serving".
- "servingGrams": فقط إن كان basis="serving"، حجم الحصة الواحدة بالغرام كما هو مكتوب أو محسوب من الملصق (مثال: Serving Size 30g → 30، أو 240ml → 240). اجعلها null دائماً إن كان basis="100g" أو "100ml".
- calories/protein/carbs/fat/fiber/sugar: أرقام كما هي مطبوعة تماماً بالنسبة للأساس المرجعي basis (سعرات، وبروتين/كارب/دهون/ألياف/سكر بالغرام). اجعل القيمة 0 فقط إن كانت غير مذكورة إطلاقاً على الملصق - لا تخترع رقماً غائباً.
- "sodium": بالميليغرام (mg) كما هو مطبوع، أو محسوباً من غرام إلى ميليغرام إن كُتب بالغرام على الملصق.
- "micronutrients": كائن JSON يحوي فقط الفيتامينات/المعادن المذكورة فعلياً على نفس الملصق من هذه القائمة تحديداً (بنفس هذه المفاتيح بالضبط): vitamin_d (فيتامين د بالميكروغرام mcg)، vitamin_c (فيتامين ج بالميليغرام mg)، vitamin_a (فيتامين أ بالميكروغرام mcg)، vitamin_b12 (فيتامين ب12 بالميكروغرام mcg)، iron (الحديد بالميليغرام mg)، calcium (الكالسيوم بالميليغرام mg)، potassium (البوتاسيوم بالميليغرام mg)، zinc (الزنك بالميليغرام mg)، magnesium (المغنيسيوم بالميليغرام mg). حوّل الوحدة إلى ما ذُكر أعلاه إن كانت مختلفة على الملصق (مثال: إن كُتب الحديد بالغرام حوّله لميليغرام). لا تُضف مفتاحاً لعنصر غير مذكور إطلاقاً على الملصق - أرجع كائناً فارغاً {} إن لم يُذكر أي منها.

إن تعذّرت قراءة الملصق بوضوح كافٍ (صورة غير واضحة، إضاءة سيئة، الجدول غير ظاهر بالكامل في الصورة)، أرجع بالضبط هذا فقط: {"error":"unreadable"}`;
    const { geminiAnalyzeImage } = await import("./gemini.js");
    const text = await geminiAnalyzeImage(prompt, base64, mimeType, 700);
    const parsed = parseJsonLoose(text);
    if (parsed.error || !parsed.basis) {
      return { ok: false, error: "تعذّر قراءة الملصق بوضوح. جرّب صورة أوضح (إضاءة أفضل، الجدول كاملاً) أو أضف الطعام يدوياً." };
    }
    const basis = ["100g", "100ml", "serving"].includes(parsed.basis) ? parsed.basis : "100g";
    const rawMicros = parsed.micronutrients && typeof parsed.micronutrients === "object" ? parsed.micronutrients : {};
    const micronutrients = {};
    for (const key of Object.keys(MICRONUTRIENT_META)) {
      const v = rawMicros[key];
      if (v != null && !Number.isNaN(Number(v))) micronutrients[key] = Number(v);
    }
    return {
      ok: true,
      basis,
      servingGrams: basis === "serving" ? (Number(parsed.servingGrams) || null) : null,
      calories: Number(parsed.calories) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fat: Number(parsed.fat) || 0,
      fiber: Number(parsed.fiber) || 0,
      sugar: Number(parsed.sugar) || 0,
      sodium: Number(parsed.sodium) || 0,
      micronutrients,
    };
  } catch (e) {
    console.error("[nutrition] readNutritionLabel failed:", e);
    return { ok: false, error: e?.message || "تعذّر قراءة الملصق الآن. جرّب مرة أخرى أو أضف الطعام يدوياً." };
  }
}

// يحوّل نتيجة readNutritionLabel (أياً كان أساسها المرجعي) إلى "منتج لكل
// 100g" قياسي - نفس الشكل الذي يتوقعه scaleNutrients/unitToGrams أصلاً
// (caloriesPer100g...)، حتى تُستخدم آلية الحصص/الوحدات الموحّدة نفسها بلا
// أي تفريع خاص. عند basis="serving"، يُطبَّق تحويل نسبي بسيط (القيمة لكل
// حصة × 100/حجم الحصة)؛ servingGrams تفترض 100 إن كانت غير معروفة (نفس
// افتراض unitToGrams الافتراضي الموجود أصلاً لوحدات "قطعة"/"حصة" المجهولة).
export function labelToPer100Product(label) {
  const servingGrams = label.basis === "serving" ? (label.servingGrams && label.servingGrams > 0 ? label.servingGrams : 100) : null;
  const factor = label.basis === "serving" ? 100 / servingGrams : 1;
  const micronutrientsPer100g = {};
  for (const [key, value] of Object.entries(label.micronutrients || {})) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      micronutrientsPer100g[key] = value * factor;
    }
  }
  return {
    caloriesPer100g: (label.calories || 0) * factor,
    proteinPer100g: (label.protein || 0) * factor,
    carbsPer100g: (label.carbs || 0) * factor,
    fatPer100g: (label.fat || 0) * factor,
    fiberPer100g: (label.fiber || 0) * factor,
    sugarPer100g: (label.sugar || 0) * factor,
    sodiumPer100gMg: (label.sodium || 0) * factor,
    servingGrams: label.basis === "serving" ? servingGrams : null,
    micronutrientsPer100g,
  };
}
