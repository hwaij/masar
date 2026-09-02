// قسم "التغذية": الاتصال بـ Open Food Facts (بحث بالباركود أو بالاسم)
// وحسابات ماء/سعرات اليوم. Open Food Facts مجاني ولا يحتاج مفتاح API.
// التوثيق: https://world.openfoodfacts.org/data

import { parseJsonLoose, analyze } from "./helpers";
import { findFuzzyMatches } from "./fuzzy";

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

// تخمين أساس القيم الغذائية (وزن g أم حجم ml) من نص حجم الحصة الموثَّق في
// Open Food Facts نفسها (serving_size، يُقرَأ أصلاً هنا لاستخراج رقم
// الحصة) - Open Food Facts لا تعرض حقلاً صريحاً منفصلاً لهذا التمييز في كل
// الاستجابات، فهذا أفضل إشارة متاحة فعلياً بلا تخمين من فراغ. افتراضي "g"
// عند الغموض (الغالبية العظمى من المنتجات صلبة/شبه صلبة أصلاً).
function guessPer100Basis(servingSizeText) {
  const text = String(servingSizeText || "");
  if (/\d\s*(ml|l)\b/i.test(text) || /مل|لتر/.test(text)) return "ml";
  return "g";
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
  // Open Food Facts تُخزّن الكوليسترول بالغرام لكل 100غم أيضاً (نفس وحدة
  // الصوديوم) - نحوّله لميليغرام هنا لنفس السبب، وبنفس معاملة الصوديوم
  // تماماً (حقل رقمي أساسي افتراضه صفر عند الغياب، لا معاملة "قيمة غائبة"
  // كما في الفيتامينات/المعادن المرنة أدناه).
  const cholesterolGramsPer100g = n["cholesterol_100g"] ?? null;
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
    cholesterolPer100gMg: cholesterolGramsPer100g != null ? Math.round(cholesterolGramsPer100g * 1000) : 0,
    servingSizeLabel: p.serving_size || null,
    servingGrams: servingGrams && servingGrams > 0 ? servingGrams : null,
    micronutrientsPer100g: extractMicronutrients(n),
    per100Basis: guessPer100Basis(p.serving_size),
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

// تصنيف الوجبة (فطور/غداء/عشاء/سناك) - حقل وصفي بسيط يُخزَّن مع كل إدخال
// (nutrition_log.meal_type) لتجميع سجل اليوم بصرياً تحت عناوين واضحة، ويفتح
// الباب مستقبلاً لتحليلات لكل وجبة (مثل "فطورك دائماً منخفض البروتين") دون
// أي تغيير بنيوي إضافي - أي دالة تحليل مستقبلية تُشغَّل ببساطة على مجموعة
// فرعية من nutrition_log مصفّاة بـmeal_type، بنفس دوال التجميع الموجودة
// أصلاً (sumNutritionEntries) دون أي منطق جديد.
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

// تخمين مبدئي بسيط حسب وقت اليوم الحالي - نطاقات عامة شائعة (لا معيار طبي
// دقيق)، قابلة للتغيير الفوري من المستخدم عبر أزرار الاختيار الأربعة - هذا
// افتراض أولي مريح فقط، لا قيد. الفترة بين منتصف الليل والفجر (لا فطور ولا
// غداء ولا عشاء منطقياً) تُصنَّف "سناك" كافتراض محايد معقول.
export function guessMealType(now = new Date()) {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "breakfast";
  if (h >= 11 && h < 16) return "lunch";
  if (h >= 16 && h < 21) return "dinner";
  return "snack";
}

// إرشادات تقديرية عامة معروفة (ليست دقيقة طبياً لفرد بعينه) لمقارنة
// الاستهلاك اليومي - مذكورة صراحة كتقديرات عامة في الواجهة، لا كأرقام
// موصوفة طبياً لحالة المستخدم.
export const DAILY_GUIDELINES = {
  fiberMinG: 25,
  fiberMaxG: 30,
  sugarMaxG: 50,
  sodiumMaxMg: 2300,
  // إرشاد عام شائع (لا احتياج شخصي محسوب) - يُعرض دائماً بصياغة "حد
  // إرشادي عام" صريحة في الواجهة، بتمييز بصري مختلف عن بطاقات الماكروز
  // الأساسية (بروتين/كارب/دهون) المحسوبة فعلياً من بيانات المستخدم
  // الشخصية (TEE/وزن) - حتى لا يخلط المستخدم بين النوعين (Priority 6/7).
  cholesterolMaxMg: 300,
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
    return {
      found: false,
      error: "تعذّر الاتصال بقاعدة بيانات الأطعمة. تأكد من اتصالك بالإنترنت أو أضف الطعام يدوياً.",
      errorEn: "Couldn't connect to the food database. Check your internet connection or add the food manually.",
    };
  }
}

export async function searchProductsByName(query) {
  try {
    const data = await fetchWithTimeout(OFF_SEARCH_URL(query));
    // فلترة النتائج الرديئة: منتج بلا اسم حقيقي (product_name/generic_name
    // فارغان في Open Food Facts نفسها) لا فائدة من عرضه ضمن نتائج بحث متعددة
    // (خلافاً لمسح باركود مباشر لمنتج بعينه في fetchProductByBarcode أعلاه،
    // حيث لا بديل آخر يُعرض فيبقى "منتج بلا اسم" أفضل من لا شيء هناك تحديداً).
    const products = (data.products || [])
      .filter((p) => (p.product_name || p.generic_name || "").trim().length > 0)
      .map((p) => normalizeProduct(p, p.code))
      .filter(Boolean)
      .slice(0, 20);
    return { ok: true, products };
  } catch (e) {
    console.error("[nutrition] searchProductsByName failed:", e);
    return {
      ok: false,
      products: [],
      error: "تعذّر البحث الآن. تأكد من اتصالك بالإنترنت أو أضف الطعام يدوياً.",
      errorEn: "Couldn't search right now. Check your internet connection or add the food manually.",
    };
  }
}

const USDA_FUNCTION_URL = "/.netlify/functions/usda";

// USDA FoodData Central عبر netlify/functions/usda.js (المفتاح لا يصل
// للمتصفح إطلاقاً - انظر تعليق الدالة). term يجب أن يكون إنجليزياً (USDA
// لا يفهم العربية) - ترجمته من العربية عبر food_synonyms مسؤولية المستدعي
// (SearchPanel في NutritionView.jsx) لا هذه الدالة، حتى تبقى معزولة تماماً
// عن أي منطق مرادفات، تماماً كعزل searchProductsByName عن نفس المنطق.
function normalizeUsdaProduct(p) {
  if (p == null || typeof p.caloriesPer100g !== "number") return null;
  return {
    barcode: `usda:${p.fdcId}`,
    name: p.name,
    brand: "",
    country: "",
    imageUrl: null,
    caloriesPer100g: p.caloriesPer100g,
    proteinPer100g: p.proteinPer100g ?? 0,
    carbsPer100g: p.carbsPer100g ?? 0,
    fatPer100g: p.fatPer100g ?? 0,
    fiberPer100g: p.fiberPer100g ?? 0,
    sugarPer100g: p.sugarPer100g ?? 0,
    sodiumPer100gMg: p.sodiumPer100gMg ?? 0,
    cholesterolPer100gMg: p.cholesterolPer100gMg ?? 0,
    servingSizeLabel: null,
    servingGrams: null,
    micronutrientsPer100g: p.micronutrientsPer100g || {},
    origin: "usda",
    dataType: p.dataType || "",
    per100Basis: "g", // USDA FoodData Central لا توثّق أساس حجم/مل بشكل مميَّز - افتراض وزن دائماً.
  };
}

export async function searchUSDAFoods(term) {
  try {
    const data = await fetchWithTimeout(`${USDA_FUNCTION_URL}?query=${encodeURIComponent(term)}`);
    const products = (data.products || []).map(normalizeUsdaProduct).filter(Boolean);
    return { ok: true, products };
  } catch (e) {
    console.error("[nutrition] searchUSDAFoods failed:", e);
    return {
      ok: false,
      products: [],
      error: "تعذّر البحث في قاعدة USDA الآن.",
      errorEn: "Couldn't search the USDA database right now.",
    };
  }
}

// طبقة احتياطية ذكية عبر Gemini - آخر حل في تسلسل البحث (بعد فشل القاموس
// الثابت + محاولة النص كما هو + المطابقة التقريبية/fuzzy معاً - راجع
// findFuzzyFoodSuggestions أدناه واستدعاء SearchPanel في NutritionView.jsx
// لتفاصيل الترتيب الكامل)، حتى لا تُبطئ الحالة الشائعة التي يحلّها القاموس
// أو التصحيح الإملائي فوراً بلا أي انتظار إضافي.
//
// أوسع من "ترجمة كلمة" بسيطة: تتعرّف أيضاً على الأطباق العربية/الخليجية
// المركّبة (مثل "ورق عنب" - أرز + عنب + توابل، لا مقابل واحد دقيق له في
// USDA) فتقترح إما أقرب صنف مفرد قابل للبحث عنه (مع الإفصاح أنه تقريب لا
// مطابقة دقيقة)، أو مكوّناته الأساسية كبديل عند فشل ذلك الصنف المفرد نفسه.
//
// تعتمد على analyze() (Gemini) - ميزة مدفوعة صراحة في مسار (انظر تعليق
// netlify/functions/gemini.js: "Gemini access is a paid feature") تُحدَّد
// أهليتها بالكامل خادمياً بفحص الاشتراك، لا هنا. أي فشل (غير مشترك، لا
// اتصال، رد غير مفهوم...) يُعامَل بصمت بإرجاع null فيبقى البحث بلا نتيجة
// إضافية كما كان تماماً - هذا تحسين ثانوي اختياري، لا مساراً أساسياً يستحق
// رسالة خطأ مزعجة عند فشله.
//
// القيمة المُرجعة: { term, approximate, components } أو null عند أي فشل.
// term: أفضل مصطلح إنجليزي مفرد يستحق تجربته في USDA. approximate: true
// إن كان هذا تقريباً لطبق مركّب لا مقابل دقيق له (تُعرض حينها ملاحظة شفافة
// للمستخدم بدل ادّعاء تطابق دقيق). components: أسماء المكوّنات الأساسية
// (إنجليزي، بحد أقصى 3) للطبق المركّب - تُستخدَم فقط كاقتراح "هل تقصد"
// احتياطي إن فشل البحث حتى بـterm نفسه.
export async function translateFoodTermForUsda(term) {
  const cleaned = (term || "").trim();
  if (!cleaned) return null;
  try {
    const prompt = `You are a nutrition-database search assistant for a food-tracking app that queries USDA FoodData Central (English-only, and it has no exact single entry for many composite regional dishes).

A user searched for this food name (it may be Arabic, and it may be a composite dish with no single exact USDA match): "${cleaned}"

Reply with ONLY a JSON object, no markdown, no explanation, in exactly this shape:
{"term": "<best single English search term to try in USDA FoodData Central>", "approximate": <true if this is a rough/composite approximation rather than a direct exact match, otherwise false>, "components": [<if approximate is true because it's a composite dish with no good single match, list 1-3 short English names of its main ingredients to search separately as a fallback - otherwise an empty array>]}

Example for "ورق عنب" (stuffed grape leaves - a composite rice+leaves dish with no exact single USDA entry): {"term": "stuffed grape leaves", "approximate": true, "components": ["rice", "grape leaves"]}
Example for "دجاج مشوي" (grilled chicken - a direct match exists): {"term": "grilled chicken", "approximate": false, "components": []}`;
    const text = await analyze(prompt, 150);
    const parsed = parseJsonLoose(text);
    const resultTerm = String(parsed.term || "").trim();
    if (!resultTerm || resultTerm.length > 60) return null;
    const components = Array.isArray(parsed.components)
      ? parsed.components.map((c) => String(c || "").trim()).filter((c) => c.length > 0 && c.length < 40).slice(0, 3)
      : [];
    return { term: resultTerm, approximate: !!parsed.approximate, components };
  } catch (e) {
    console.error("[nutrition] translateFoodTermForUsda failed (falling back silently):", e);
    return null;
  }
}

// تصحيح إملائي محلي فوري (بلا شبكة، ما عدا جلب مرادفات food_synonyms مرة
// واحدة لكل جلسة - انظر store.listFoodSynonymTerms) - يُستدعى فقط بعد فشل
// القاموس التام والنص كما هو معاً، وقبل اللجوء لـGemini (طبقة مدفوعة وأبطأ)
// حتى تُحَل أخطاء الطباعة الشائعة (مثل "دجاذ" بدل "دجاج"، "ارز" بدل "أرز")
// فوراً بلا انتظار شبكة إن أمكن، وحتى لا نستهلك طبقة Gemini المدفوعة لحالة
// كان يكفي فيها تصحيح حرف واحد. genericFoods: مصفوفة GENERIC_FOODS الخام
// (يمرّرها المستدعي - لا استيراد مباشر من generic-foods.js هنا تفادياً
// لاستيراد دائري، فهي تستورد normalizeSearchTerm من هذا الملف أصلاً).
// synonymTerms: نتيجة store.listFoodSynonymTerms() (مصفوفة {term_ar,
// term_en, canonical_term}).
//
// المرشّحون يشملون searchTerms العربية لكل صنف محلي أيضاً لا الاسم الكامل
// فقط - "صدر دجاج مشوي" ككل بعيد جداً عن "دجاذ" (مسافة تعديل كبيرة)، لكن
// كلمة "دجاج" ضمن searchTerms لنفس الصنف قريبة جداً (تعديل حرف واحد) وهي
// بالضبط ما يستحق اقتراحه.
export function findFuzzyFoodSuggestions(normalizedQuery, genericFoods, synonymTerms) {
  if (!normalizedQuery) return [];
  const candidates = [];
  for (const f of genericFoods || []) {
    candidates.push({ text: normalizeSearchTerm(f.name), name: f.name, nameEn: f.nameEn, kind: "generic" });
    for (const term of f.searchTerms || []) {
      if (!/[؀-ۿ]/.test(term)) continue; // مرشّحون عرب فقط - الاستعلام الفاشل عربي أصلاً هنا
      candidates.push({ text: normalizeSearchTerm(term), name: term, nameEn: f.nameEn, kind: "generic" });
    }
  }
  for (const s of synonymTerms || []) {
    if (!s.term_ar) continue;
    candidates.push({
      text: normalizeSearchTerm(s.term_ar), name: s.term_ar, nameEn: s.term_en,
      canonical: s.canonical_term, kind: "synonym",
    });
  }
  return findFuzzyMatches(normalizedQuery, candidates, 3);
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
// "kind" (وزن/حجم/عدد) يُستخدم في quantityInProductBasis أدناه للتمييز بين
// الجرام (وزن) والمليلتر (حجم) - لا تحويل تلقائي 1:1 بينهما بعد الآن إلا
// عند تطابقهما فعلياً مع أساس بيانات المنتج نفسه.
export const UNIT_OPTIONS = [
  { id: "g", label: "غرام (g)", factor: 1, approx: false, kind: "weight" },
  { id: "kg", label: "كيلوغرام (kg)", factor: 1000, approx: false, kind: "weight" },
  { id: "ml", label: "مليلتر (ml)", factor: 1, approx: true, kind: "volume" },
  { id: "l", label: "لتر (L)", factor: 1000, approx: true, kind: "volume" },
  { id: "tbsp", label: "ملعقة كبيرة", factor: 15, approx: true, kind: "volume" },
  { id: "tsp", label: "ملعقة صغيرة", factor: 5, approx: true, kind: "volume" },
  { id: "cup", label: "كوب", factor: 240, approx: true, kind: "volume" },
  { id: "piece", label: "قطعة", factor: null, approx: true, kind: "count" },
  { id: "serving", label: "حصة", factor: null, approx: true, kind: "count" },
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
// خلل حقيقي وُجد وأُصلح: كانت هذه الدالة تقسم servingGrams على معامل
// الوحدة مباشرة بلا أي وعي بالكثافة (product غير مُمرَّر أصلاً) - فحصة
// عسل حقيقية وزنها 21غ (موثَّقة لكل 100غ) كانت تُعرض/تُملأ تلقائياً كـ"21
// مل" عند اختيار وحدة "مل"، رغم أن حجمها الحقيقي (كثافة العسل ~1.42) هو
// ~14.8مل فقط. الأخطر أن هذه القيمة المُعبَّأة تلقائياً (21) كانت تُمرَّر
// بعدها إلى quantityInProductBasis التي *تطبّق* تحويل الكثافة بالاتجاه
// الصحيح - فينتج جولة ذهاب وإياب خاطئة تحسب القيم الغذائية لكمية أكبر
// فعلياً من الحصة الحقيقية (~42% زيادة وهمية في مثال العسل)، بلا أي تنبيه
// "تحويل تقريبي" يلفت نظر المستخدم لأن الخلل في القيمة المُدخَلة نفسها لا
// في تحويلها. الإصلاح: نفس منطق الكثافة المُستخدَم في quantityInProductBasis
// بالضبط لكن بالاتجاه المعاكس (معكوس رياضياً)، حتى تبقى الدالتان دائماً
// انعكاساً تاماً لبعضهما (round-trip) بغضّ النظر عن الوحدة/الأساس المُختارين.
// product معامل جديد اختياري (servingGrams وحده يبقى كافياً حين تطابق
// الوحدة أساس المنتج - الحالة الأشيع، بلا أي تغيير في نتيجتها) - أي نداء
// قديم بلا product يستمر يعمل بالضبط كالسابق فقط عند هذا التطابق.
export function unitServingSize(unitId, servingGrams, product) {
  const unit = unitById(unitId);
  if (!(servingGrams > 0) || unit.factor == null) return 1;
  const basis = product?.per100Basis === "ml" ? "ml" : "g";
  const unitCurrency = unit.kind === "volume" ? "ml" : "g";
  if (unitCurrency === basis) return servingGrams / unit.factor;
  const density = estimateDensityGPerMl(product?.name);
  const naturalInUnitCurrency = unitCurrency === "ml" ? servingGrams / density : servingGrams * density;
  return naturalInUnitCurrency / unit.factor;
}

// كثافات تقريبية معروفة لسوائل شائعة (غم/مل) - تُستخدم فقط في
// quantityInProductBasis أدناه، وفقط عند تعارض حقيقي بين وحدة الإدخال
// وأساس بيانات المنتج (مثال: وزن حليب بالغرام رغم أن قيمه الغذائية
// موثَّقة لكل 100مل). ليست قيماً دقيقة لكل منتج بعينه (كثافة الحليب تختلف
// قليلاً حسب نسبة الدسم مثلاً) - تقدير عام معقول أفضل من افتراض كثافة
// الماء (1.0) للجميع دون تمييز، لا أكثر. أي طعام غير مطابق لهذه الكلمات
// يستخدم الافتراضي 1.0 (قريب من أغلب السوائل الغذائية المائية الشائعة).
const DENSITY_G_PER_ML = [
  { keywords: ["حليب", "milk"], density: 1.03 },
  { keywords: ["زيت زيتون", "olive oil"], density: 0.92 },
  { keywords: ["زيت", "oil"], density: 0.92 },
  { keywords: ["عسل", "honey"], density: 1.42 },
  { keywords: ["ماء", "water"], density: 1.0 },
];

function estimateDensityGPerMl(foodName) {
  const name = normalizeSearchTerm(foodName || "");
  for (const entry of DENSITY_G_PER_ML) {
    if (entry.keywords.some((k) => name.includes(normalizeSearchTerm(k)))) return entry.density;
  }
  return 1.0;
}

// يحوّل كمية مُدخلة بأي وحدة إلى القيمة المكافئة بنفس "عملة" أساس بيانات
// المنتج (غرام إن كانت قيمه الغذائية موثَّقة لكل 100غم، أو مليلتر إن كانت
// موثَّقة لكل 100مل - product.per100Basis) - طبقة تحويل جديدة تُغلِّف
// unitToGrams أعلاه بلا تعديلها. عند تطابق نوع الوحدة مع أساس المنتج (وزن
// + أساس غم، أو حجم + أساس مل - الحالة الأشيع فعلياً)، تمرير مباشر بلا أي
// تغيير في النتيجة القائمة أصلاً (approxDensity:false). عند التعارض فقط
// (وزن الطعام بالغرام رغم أن بياناته موثَّقة لكل 100مل، أو العكس)، تحويل
// تقريبي بالكثافة المعروفة/المقدَّرة أعلاه (approxDensity:true - تُستخدم في
// الواجهة لعرض ملاحظة "تحويل تقريبي" في هذه الحالة تحديداً فقط). القيمة
// المُعادة تُستخدَم مباشرة كمعامل scaleNutrients/scaleMicronutrients (التي
// لا تفرّق أصلاً بين غرام ومليلتر - تحسب دوماً ÷100 من "أساس المنتج"، أياً
// كان)، فلا حاجة لتعديلهما.
export function quantityInProductBasis(unitId, qty, product) {
  const unit = unitById(unitId);
  const basis = product?.per100Basis === "ml" ? "ml" : "g";
  const natural = unitToGrams(unitId, qty, product?.servingGrams);
  if (unit.kind === "count") return { value: natural, approxDensity: false, basis };
  const unitCurrency = unit.kind === "volume" ? "ml" : "g";
  if (unitCurrency === basis) return { value: natural, approxDensity: false, basis };
  const density = estimateDensityGPerMl(product?.name);
  const value = unitCurrency === "g" ? natural / density : natural * density;
  return { value, approxDensity: true, basis };
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
    cholesterol: Math.round((product.cholesterolPer100gMg || 0) * factor),
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
      cholesterol: acc.cholesterol + (e.cholesterol || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0 },
  );
  // تُجمَع الفيتامينات/المعادن بمعزل عن الأربعة الأساسية أعلاه لأن مفاتيحها
  // متغيّرة (لا كل إدخال يحمل نفس العناصر، أو أياً منها أصلاً) - أي إدخال
  // بلا micronutrients لا يُسهم بشيء، ولا يظهر أي عنصر لم يُساهم فيه ولو
  // إدخال واحد اليوم بقيمة حقيقية.
  //
  // microApprox: لكل مفتاح ساهم فيه إدخال واحد على الأقل مصدره "تقدير عام"
  // (microApprox=true على الإدخال - أطعمة generic-foods.js التقريبية، انظر
  // genericFoodToProduct)، لا بيانات دقيقة فعلية لمنتج بعينه (باركود/ملصق) -
  // true تعني "مجموع هذا العنصر لهذا اليوم يشمل قيمة تقريبية واحدة على الأقل"،
  // فيُعرض بعلامة "≈" في الواجهة بدل الإيحاء بدقة كاملة لكل مساهمة فيه.
  const micronutrients = {};
  const microApprox = {};
  // نفس شكل microApprox أعلاه بالضبط، بمفتاح مختلف: true لكل عنصر ساهم فيه
  // إدخال واحد على الأقل مصدره "تقدير عام بالذكاء الاصطناعي" (تحسينات
  // التغذية #4، estimateMicronutrientsAI) - عمود منفصل تماماً عن microApprox
  // (ذاك لمصدر generic-foods.js فقط) حتى تبقى شارة "≈" المرجعية الموثوقة
  // مختلفة تماماً عن شارة "تقدير AI عام" في الواجهة، بلا خلط بين المصدرين.
  const microAiEstimated = {};
  for (const e of entries) {
    if (!e.micronutrients) continue;
    for (const [key, val] of Object.entries(e.micronutrients)) {
      if (val == null) continue;
      micronutrients[key] = (micronutrients[key] || 0) + Number(val);
      if (e.microApprox) microApprox[key] = true;
      if (e.microAiEstimated) microAiEstimated[key] = true;
    }
  }
  return { ...totals, micronutrients, microApprox, microAiEstimated };
}

// ===== تحليل أنماط الوجبات (فطور/غداء/عشاء/سناك) عبر فترة من الأيام =====
// يعمل حصراً على meal_type المسجَّل فعلياً - لا افتراضات ولا أنماط
// "متوقَّعة" مبنية على العموميات، فقط ما يظهر بالفعل في سجل هذا المستخدم.
// entriesInRange: صفوف nutrition_log ضمن الفترة (أي نافذة أسبوع/شهر يحدّدها
// المستدعي). daysInRange: مصفوفة تواريخ الفترة الكاملة (بما فيها الأيام
// التي لم يُسجَّل بها شيء إطلاقاً - ضرورية لحساب "متوسط لكل يوم في الفترة"
// الذي يعكس الإهمال، لا "متوسط لكل يوم سُجِّلت فيه هذه الوجبة" الذي يخفيه).
//
// عتبة أدنى (loggedDays.size < 3) قبل أي استنتاج - بيانات يوم أو يومين لا
// تكفي لوصفها "نمطاً". عتبة "منخفض بشكل ملحوظ" = 60% أو أقل من متوسط بقية
// الوجبات ذات البيانات الكافية (≥3 أيام لكل وجبة تُقارَن) - عتبة متحفّظة
// لتفادي استنتاج من فروق عشوائية طبيعية بين الوجبات.
export function analyzeMealPatterns(entriesInRange, daysInRange) {
  const loggedDays = new Set(entriesInRange.map((e) => e.date));
  if (loggedDays.size < 3) return null;

  const daysWithoutBreakfast = Array.from(loggedDays).filter(
    (day) => !entriesInRange.some((e) => e.date === day && e.mealType === "breakfast"),
  );

  const perMealStats = MEAL_TYPES.map((mt) => {
    const mealEntries = entriesInRange.filter((e) => e.mealType === mt);
    const daysLogged = new Set(mealEntries.map((e) => e.date)).size;
    const totalCal = mealEntries.reduce((s, e) => s + (e.calories || 0), 0);
    const totalProtein = mealEntries.reduce((s, e) => s + (e.protein || 0), 0);
    return {
      mealType: mt, daysLogged,
      avgCaloriesPerLoggedDay: daysLogged > 0 ? totalCal / daysLogged : 0,
      avgProteinPerLoggedDay: daysLogged > 0 ? totalProtein / daysLogged : 0,
      // متوسط لكل يوم في كامل الفترة (وليس فقط الأيام المسجَّلة لهذه الوجبة
      // تحديداً) - هذا ما يُستخدم في الرسم البياني ليعكس الإهمال بصرياً.
      avgCaloriesPerRangeDay: daysInRange.length > 0 ? totalCal / daysInRange.length : 0,
    };
  });

  const withEnoughData = perMealStats.filter((m) => m.daysLogged >= 3);
  let lowCalorieMeal = null;
  let lowProteinMeal = null;
  if (withEnoughData.length >= 2) {
    const avgOfAllCal = withEnoughData.reduce((s, m) => s + m.avgCaloriesPerLoggedDay, 0) / withEnoughData.length;
    const avgOfAllProtein = withEnoughData.reduce((s, m) => s + m.avgProteinPerLoggedDay, 0) / withEnoughData.length;
    const lowestCal = [...withEnoughData].sort((a, b) => a.avgCaloriesPerLoggedDay - b.avgCaloriesPerLoggedDay)[0];
    if (avgOfAllCal > 0 && lowestCal.avgCaloriesPerLoggedDay <= avgOfAllCal * 0.6) lowCalorieMeal = lowestCal;
    const lowestProtein = [...withEnoughData].sort((a, b) => a.avgProteinPerLoggedDay - b.avgProteinPerLoggedDay)[0];
    if (avgOfAllProtein > 0 && lowestProtein.avgProteinPerLoggedDay <= avgOfAllProtein * 0.6) lowProteinMeal = lowestProtein;
  }

  return {
    loggedDaysCount: loggedDays.size,
    daysWithoutBreakfastCount: daysWithoutBreakfast.length,
    perMealStats,
    lowCalorieMeal,
    lowProteinMeal,
  };
}

// ربط المزاج/التوتر بالاستهلاك الغذائي عبر أيام فترة معيّنة (قسم جديد في
// التقرير الأسبوعي) - دالة حسابية بحتة بلا أي ذكاء اصطناعي، بنفس أسلوب
// عتبات analyzeMealPatterns أعلاه بالضبط: لا استنتاج بلا عيّنة كافية، ولا
// "نمط" يُعرض بلا فرق واضح فعلاً في الأرقام.
// entriesInRange: صفوف nutrition_log ضمن الفترة (قد تحمل mood/stress أو لا -
// الصفوف بلا هذه القيم لا تُسهم في المتوسط اليومي، بلا افتراض قيمة لها).
// days: مصفوفة تواريخ الفترة كاملة - تُستخدم لبناء dailySeries كاملة (حتى
// الأيام بلا أي تسجيل تظهر بقيم null بدل حذفها من السلسلة الزمنية للرسم).
export function computeMoodNutritionCorrelation(entriesInRange, days) {
  const byDate = new Map();
  for (const day of days) byDate.set(day, []);
  for (const e of entriesInRange) {
    if (byDate.has(e.date)) byDate.get(e.date).push(e);
  }

  const dailySeries = days.map((day) => {
    const dayEntries = byDate.get(day) || [];
    const moodVals = dayEntries.filter((e) => typeof e.mood === "number").map((e) => e.mood);
    const stressVals = dayEntries.filter((e) => typeof e.stress === "number").map((e) => e.stress);
    const totals = dayEntries.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.calories || 0),
        sugar: acc.sugar + (e.sugar || 0),
        fat: acc.fat + (e.fat || 0),
        sodium: acc.sodium + (e.sodium || 0),
      }),
      { calories: 0, sugar: 0, fat: 0, sodium: 0 },
    );
    return {
      day,
      avgMood: moodVals.length ? moodVals.reduce((a, b) => a + b, 0) / moodVals.length : null,
      avgStress: stressVals.length ? stressVals.reduce((a, b) => a + b, 0) / stressVals.length : null,
      ...totals,
    };
  });

  const daysWithMood = dailySeries.filter((d) => d.avgStress != null);
  // عتبة بيانات صريحة - أقل من 3 أيام تملك توتر مُسجَّل فعلياً لا تكفي لأي
  // استنتاج موثوق (نفس مبدأ عتبة loggedDays.size < 3 في analyzeMealPatterns).
  if (daysWithMood.length < 3) {
    return { enoughData: false, dailySeries, avgMoodWeek: null, avgStressWeek: null, correlations: [] };
  }

  const avgMoodWeek = daysWithMood.reduce((s, d) => s + d.avgMood, 0) / daysWithMood.length;
  const avgStressWeek = daysWithMood.reduce((s, d) => s + d.avgStress, 0) / daysWithMood.length;

  // مقارنة الأيام الأعلى توتراً من متوسط الأسبوع مقابل باقي الأيام - عيّنة
  // ≥2 لكل مجموعة قبل أي مقارنة (نفس مبدأ withWorkout/withoutWorkout في
  // computeMoodFitnessInsight السابق قبل حذف mentalHealth.js).
  const higherStressDays = daysWithMood.filter((d) => d.avgStress > avgStressWeek);
  const otherDays = daysWithMood.filter((d) => d.avgStress <= avgStressWeek);

  const correlations = [];
  if (higherStressDays.length >= 2 && otherDays.length >= 2) {
    const METRIC_KEYS = ["calories", "sugar", "fat", "sodium"];
    for (const key of METRIC_KEYS) {
      const avgHigh = higherStressDays.reduce((s, d) => s + d[key], 0) / higherStressDays.length;
      const avgOther = otherDays.reduce((s, d) => s + d[key], 0) / otherDays.length;
      if (avgOther <= 0) continue;
      const pct = Math.round(((avgHigh - avgOther) / avgOther) * 100);
      // فرق ≥15% فقط يُعتبر نمطاً يستحق العرض - عتبة متحفّظة تفادياً لاستنتاج
      // من فروق عشوائية طبيعية بين الأيام.
      if (Math.abs(pct) >= 15) {
        correlations.push({ metric: key, direction: pct > 0 ? "higher" : "lower", pct: Math.abs(pct) });
      }
    }
  }

  return { enoughData: true, dailySeries, avgMoodWeek, avgStressWeek, correlations };
}

// الكاميرا تحتاج سياقاً آمناً (HTTPS) لتعمل في أي متصفح — localhost مستثنى
// دائماً لأغراض التطوير المحلي.
export function isSecureContextForCamera() {
  return typeof window !== "undefined" && (window.isSecureContext || window.location.hostname === "localhost");
}

// رسالة مختلفة حسب سبب فشل getUserMedia الفعلي (اسم الخطأ القياسي الذي
// يرجعه المتصفح)، بدل رسالة عامة واحدة لكل الحالات — تشمل إرشاداً مختلفاً
// لـiOS مقابل Android عند رفض الإذن، وهي الحالة الأشيع في سياق PWA.
//
// lang معامل اختياري (افتراضياً 'ar'، بنفس نمط fmtHM/arabicDate/getLevel في
// helpers.js) لا يغيّر سلوك أي نداء قائم لا يمرّره. أُضيف بدل إرجاع كائن
// {error, errorEn} لأن هذه الدالة تُرجع نصاً مباشراً يُمرَّر إلى setError()
// في NutritionView.jsx (سلسلة نصية بسيطة، لا كائناً) — تحويلها لكائن كان
// سيكسر ذلك الاستدعاء القائم؛ معامل لغة اختياري يبقيه يعمل بلا أي تغيير.
export function describeCameraError(err, lang = "ar") {
  const name = err?.name || "";
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const en = lang === "en";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    if (en) {
      return isIOS
        ? "It looks like camera access is disabled. On your iPhone: Settings → Masar (or Safari if the app isn't installed on your home screen) → enable camera access, then try again."
        : "It looks like camera access is disabled. On your device: Settings → Apps → Masar (or your browser) → Permissions → enable camera access, then try again.";
    }
    return isIOS
      ? "يبدو أن إذن الكاميرا معطّل. من إعدادات آيفون: الإعدادات ← مسار (أو Safari إن لم يكن التطبيق مثبّتاً على شاشتك الرئيسية) ← فعّل إذن الكاميرا، ثم أعد المحاولة."
      : "يبدو أن إذن الكاميرا معطّل. من إعدادات جهازك: الإعدادات ← التطبيقات ← مسار (أو المتصفح) ← الأذونات ← فعّل إذن الكاميرا، ثم أعد المحاولة.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return en
      ? "No camera was found on this device. Use search by name or manual entry instead."
      : "لم يُعثر على كاميرا في هذا الجهاز. استخدم البحث بالاسم أو الإدخال اليدوي بدلاً من ذلك.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return en
      ? "The camera is currently in use by another app. Close any other app using the camera and try again."
      : "الكاميرا مستخدَمة من تطبيق آخر حالياً. أغلق أي تطبيق آخر يستخدم الكاميرا وحاول مرة أخرى.";
  }
  if (name === "OverconstrainedError") {
    return en
      ? "Couldn't set up the rear camera on this device. Try again or use search by name/manual entry."
      : "تعذّر ضبط الكاميرا الخلفية على هذا الجهاز. جرّب مرة أخرى أو استخدم البحث بالاسم/الإدخال اليدوي.";
  }
  if (name === "SecurityError") {
    return en
      ? "Couldn't access the camera because the connection isn't secure. Make sure you're opening the site over an https link."
      : "تعذّر الوصول للكاميرا بسبب اتصال غير آمن. تأكد من فتح الموقع عبر رابط https.";
  }
  return en
    ? "Couldn't access the device camera. Make sure the browser is allowed to use the camera, or use search by name/manual entry."
    : "تعذّر الوصول إلى كاميرا الجهاز. تأكد من السماح للمتصفح باستخدام الكاميرا، أو استخدم البحث بالاسم/الإدخال اليدوي.";
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

// نفس منطق التصغير أعلاه لكن يُخرج Blob حقيقياً (لا base64) - تُستخدم عند
// رفع صورة منتج فعلياً لتخزين Supabase Storage (معالج "منتج جديد")، بخلاف
// compressImageToBase64 المخصَّصة لإرسال الصورة إلى Gemini تحديداً.
export async function compressImageToBlob(file, maxDim = 1024, quality = 0.8) {
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
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// خطأ حقيقي وُجد فعلياً: import("./gemini.js") أدناه قد يفشل تحديداً بعد
// نشر جديد إن كان هذا التبويب مفتوحاً منذ قبل النشر (يحمل اسم ملف الجزء
// المقسَّم القديم الذي لم يعد موجوداً على الخادم، فيُعيد Netlify صفحة
// index.html بدل JS حقيقي - يظهر هذا كخطأ متصفح خام تقني بحت مثل
// "'text/html' is not a valid JavaScript MIME type" لا رسالة مفهومة).
// معالج vite:preloadError العام في main.tsx يعيد تحميل الصفحة تلقائياً في
// أغلب الأحيان قبل أن يصل أي خطأ هنا أصلاً، لكن هذا فحص دفاعي إضافي: إن
// وصلت هذه الحالة تحديداً هنا رغم ذلك، لا نعرض نص الخطأ التقني الخام
// للمستخدم (e?.message)، بل رسالة واضحة قابلة للتنفيذ.
function isChunkLoadError(e) {
  const msg = String(e?.message || "");
  return /MIME type|dynamically imported module|module script failed|Failed to fetch/i.test(msg);
}
const CHUNK_LOAD_ERROR_MESSAGE = "التطبيق تحديث نسخته الآن، يرجى تحديث الصفحة (Refresh) والمحاولة مرة أخرى.";
const CHUNK_LOAD_ERROR_MESSAGE_EN = "The app just updated to a new version — please refresh the page and try again.";

// نقطة التكامل الوحيدة مع "التعرّف على الطعام بالذكاء الاصطناعي". اليوم
// تستدعي Gemini داخلياً، لكنها معزولة عمداً هنا بواجهة ثابتة (صورة تدخل،
// تقدير غذائي منظّم يخرج) - استبدال Gemini مستقبلاً بخدمة تعرّف متخصصة
// على الطعام يعني تعديل جسم هذه الدالة فقط، دون أي تغيير في NutritionView
// أو أي مكان آخر يستدعيها.
//
// lang معامل اختياري (افتراضياً 'ar') يتحكم فقط بلغة تعليمة الـprompt
// المُرسلة لـGemini (وبالتالي لغة أسماء الأطعمة في items المُرجعة) — لا
// علاقة له بحقول الخطأ (error/errorEn) أدناه التي تُرجَع دائماً بكلتا
// اللغتين بغض النظر عن lang، بنفس نمط errorEn الإضافي في بقية هذا الملف.
// المستدعي في NutritionView.jsx يمرر i18n.language: recognizeMealFromImage(file, i18n.language).
export async function recognizeMealFromImage(imageFile, lang = "ar") {
  try {
    const { base64, mimeType } = await compressImageToBase64(imageFile);
    const prompt = lang === "en"
      ? `Analyze this meal photo. Return only valid JSON with no extra text or markdown, in exactly this shape:
{"items":["first food item name","second food item name"],"calories":number,"protein":number,"carbs":number,"fat":number,"micronutrients":{}}
Where items is a list of the food types visible in the photo in English, and calories/protein/carbs/fat are an approximate total estimate for the entire meal as it appears in the photo (calories, protein, carbs, and fat in grams). Estimate as best you can based on the apparent portion size, and don't return default zeros if food is clearly visible in the image.
"micronutrients": a JSON object with an approximate total estimate for the whole meal, using only these exact keys where relevant: vitamin_d (mcg), vitamin_c (mg), vitamin_a (mcg), vitamin_b12 (mcg), iron (mg), calcium (mg), potassium (mg), zinc (mg), magnesium (mg). This is a rough estimate based on your general knowledge of the visible ingredients' typical composition, not a lab analysis — only include a key if you have reasonable confidence in it based on a specific ingredient clearly visible in the photo (e.g. eggs, spinach, citrus fruit). Never invent a precise-looking number for an ingredient you can't identify with confidence — omit that key instead. Return {} if you aren't reasonably confident about any of them.`
      : `حلّل صورة الوجبة هذه. أرجع فقط JSON صالحاً بدون أي نص أو markdown إضافي، بهذا الشكل بالضبط:
{"items":["اسم نوع الطعام الأول","اسم نوع الطعام الثاني"],"calories":رقم,"protein":رقم,"carbs":رقم,"fat":رقم,"micronutrients":{}}
حيث items قائمة بأنواع الطعام الظاهرة في الصورة بالعربية، وcalories/protein/carbs/fat تقدير إجمالي تقريبي للوجبة كاملة كما تبدو في الصورة (سعرات حرارية، بروتين وكارب ودهون بالغرام). قدّر بأفضل ما تستطيع بناءً على الحجم الظاهر، ولا تُرجع أصفاراً افتراضية إن كان هناك طعام واضح في الصورة.
"micronutrients": كائن JSON بتقدير إجمالي تقريبي للوجبة كاملة، بهذه المفاتيح فقط حيث تكون ذات صلة: vitamin_d (بالميكروغرام mcg)، vitamin_c (بالميليغرام mg)، vitamin_a (بالميكروغرام mcg)، vitamin_b12 (بالميكروغرام mcg)، iron (بالميليغرام mg)، calcium (بالميليغرام mg)، potassium (بالميليغرام mg)، zinc (بالميليغرام mg)، magnesium (بالميليغرام mg). هذا تقدير تقريبي بناءً على معرفتك العامة بالتركيب النموذجي للمكوّنات الظاهرة، لا تحليل مخبري - أضف مفتاحاً فقط إن كنت واثقاً بشكل معقول منه بناءً على مكوّن واضح في الصورة (مثل بيض، سبانخ، حمضيات). لا تخترع أبداً رقماً دقيق المظهر لمكوّن لا تستطيع تمييزه بثقة - احذف ذلك المفتاح بدلاً من ذلك. أرجع {} إن لم تكن واثقاً بشكل معقول من أي منها.`;
    const { geminiAnalyzeImage } = await import("./gemini.js");
    const text = await geminiAnalyzeImage(prompt, base64, mimeType, 650);
    const parsed = parseJsonLoose(text);
    // نفس مبدأ "لا اختراع قيم" في readNutritionLabel أدناه - فقط المفاتيح
    // المعروفة (MICRONUTRIENT_META) وقيمها رقمية فعلاً تُقبَل، أي شيء آخر
    // (مفتاح غريب، قيمة غير رقمية) يُتجاهَل بصمت بدل رميه للواجهة كما هو.
    const rawMicros = parsed.micronutrients && typeof parsed.micronutrients === "object" ? parsed.micronutrients : {};
    const micronutrients = {};
    for (const key of Object.keys(MICRONUTRIENT_META)) {
      const v = rawMicros[key];
      if (v != null && !Number.isNaN(Number(v))) micronutrients[key] = Number(v);
    }
    return {
      ok: true,
      items: Array.isArray(parsed.items) ? parsed.items : [],
      calories: Number(parsed.calories) || 0,
      protein: Number(parsed.protein) || 0,
      carbs: Number(parsed.carbs) || 0,
      fat: Number(parsed.fat) || 0,
      micronutrients,
    };
  } catch (e) {
    console.error("[nutrition] recognizeMealFromImage failed:", e);
    const chunkError = isChunkLoadError(e);
    const error = chunkError ? CHUNK_LOAD_ERROR_MESSAGE : "تعذّر تحليل صورة الوجبة الآن. جرّب مرة أخرى أو أضف الطعام يدوياً.";
    const errorEn = chunkError ? CHUNK_LOAD_ERROR_MESSAGE_EN : "Couldn't analyze the meal photo right now. Try again or add the food manually.";
    return { ok: false, error, errorEn };
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
//
// lang معامل اختياري (افتراضياً 'ar') يتحكم فقط بلغة تعليمة الـprompt —
// نفس مخطط JSON بالضبط (basis/servingGrams/calories/...) بكلتا اللغتين، لا
// فرق سوى صياغة التعليمات. المستدعي في NutritionView.jsx يمرر
// i18n.language: readNutritionLabel(file, i18n.language).
export async function readNutritionLabel(imageFile, lang = "ar") {
  try {
    const { base64, mimeType } = await compressImageToBase64(imageFile);
    const prompt = lang === "en"
      ? `Analyze this printed "Nutrition Facts" label photo. Read only the numbers actually printed on the label — don't invent or estimate any number that isn't written. Return only valid JSON with no extra text or markdown, in exactly this shape:
{"basis":"100g or 100ml or serving","servingGrams":number or null,"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number,"cholesterol":number,"micronutrients":{},"productName":string or null}

Where:
- "basis": the actual reference basis printed on the label for these specific values — "100g" if per 100 grams, "100ml" if per 100 milliliters, or "serving" if per single serving only with no other 100g/100ml column. If both are shown, choose "100g" or "100ml" (always more precise) rather than "serving".
- "servingGrams": only if basis="serving", the serving size in grams as written or computed (e.g. Serving Size 30g → 30, or 240ml → 240). Null if basis is "100g" or "100ml".
- calories/protein/carbs/fat/fiber/sugar: numbers exactly as printed relative to the basis. Set to 0 only if not mentioned at all — never invent a missing number.
- "sodium": in milligrams (mg) as printed, or converted from grams if needed. 0 if not mentioned.
- "cholesterol": in milligrams (mg) as printed, or converted from grams if needed. 0 if not mentioned at all on the label.
- "micronutrients": a JSON object containing only vitamins/minerals actually mentioned on the label from this list (exact keys): vitamin_d (mcg), vitamin_c (mg), vitamin_a (mcg), vitamin_b12 (mcg), iron (mg), calcium (mg), potassium (mg), zinc (mg), magnesium (mg). Convert units as needed. Return {} if none mentioned.
- "productName": only if clearly written and legible in the same photo; null if no clear name appears, don't guess.

If the label can't be read clearly enough, return exactly: {"error":"unreadable"}`
      : `حلّل صورة "جدول القيم الغذائية" (Nutrition Facts label) المطبوع هذا. اقرأ الأرقام المطبوعة فعلياً على الملصق فقط، ولا تخترع أو تقدّر أي رقم غير مكتوب. أرجع فقط JSON صالحاً بدون أي نص أو markdown إضافي، بهذا الشكل بالضبط:
{"basis":"100g أو 100ml أو serving","servingGrams":رقم أو null,"calories":رقم,"protein":رقم,"carbs":رقم,"fat":رقم,"fiber":رقم,"sugar":رقم,"sodium":رقم,"cholesterol":رقم,"micronutrients":{},"productName":نص أو null}

حيث:
- "basis": الأساس المرجعي الفعلي المكتوب على الملصق لهذه القيم تحديداً - "100g" إن كانت القيم لكل 100 غرام، "100ml" إن كانت لكل 100 مليلتر، أو "serving" إن كانت لكل حصة واحدة (Per Serving) فقط بدون أي عمود آخر لكل 100g/100ml. إن ذُكر كلاهما معاً على نفس الملصق (شائع جداً)، اختر "100g" أو "100ml" (الأدق دائماً) لا "serving".
- "servingGrams": فقط إن كان basis="serving"، حجم الحصة الواحدة بالغرام كما هو مكتوب أو محسوب من الملصق (مثال: Serving Size 30g → 30، أو 240ml → 240). اجعلها null دائماً إن كان basis="100g" أو "100ml".
- calories/protein/carbs/fat/fiber/sugar: أرقام كما هي مطبوعة تماماً بالنسبة للأساس المرجعي basis (سعرات، وبروتين/كارب/دهون/ألياف/سكر بالغرام). اجعل القيمة 0 فقط إن كانت غير مذكورة إطلاقاً على الملصق - لا تخترع رقماً غائباً.
- "sodium": بالميليغرام (mg) كما هو مطبوع، أو محسوباً من غرام إلى ميليغرام إن كُتب بالغرام على الملصق. 0 إن كان غير مذكور.
- "cholesterol": بالميليغرام (mg) كما هو مطبوع (يُكتب غالباً "Cholesterol")، أو محسوباً من غرام إلى ميليغرام إن لزم. 0 فقط إن كان غير مذكور إطلاقاً على الملصق.
- "micronutrients": كائن JSON يحوي فقط الفيتامينات/المعادن المذكورة فعلياً على نفس الملصق من هذه القائمة تحديداً (بنفس هذه المفاتيح بالضبط): vitamin_d (فيتامين د بالميكروغرام mcg)، vitamin_c (فيتامين ج بالميليغرام mg)، vitamin_a (فيتامين أ بالميكروغرام mcg)، vitamin_b12 (فيتامين ب12 بالميكروغرام mcg)، iron (الحديد بالميليغرام mg)، calcium (الكالسيوم بالميليغرام mg)، potassium (البوتاسيوم بالميليغرام mg)، zinc (الزنك بالميليغرام mg)، magnesium (المغنيسيوم بالميليغرام mg). حوّل الوحدة إلى ما ذُكر أعلاه إن كانت مختلفة على الملصق (مثال: إن كُتب الحديد بالغرام حوّله لميليغرام). لا تُضف مفتاحاً لعنصر غير مذكور إطلاقاً على الملصق - أرجع كائناً فارغاً {} إن لم يُذكر أي منها.
- "productName": اسم المنتج فقط إن كان مكتوباً بوضوح وقابلاً للقراءة في نفس الصورة (على العبوة/الملصق نفسه، لا مجرد جدول القيم الغذائية وحده) - أرجع null إن لم يظهر اسم واضح في الصورة، لا تخمّن اسماً.

إن تعذّرت قراءة الملصق بوضوح كافٍ (صورة غير واضحة، إضاءة سيئة، الجدول غير ظاهر بالكامل في الصورة)، أرجع بالضبط هذا فقط: {"error":"unreadable"}`;
    const { geminiAnalyzeImage } = await import("./gemini.js");
    const text = await geminiAnalyzeImage(prompt, base64, mimeType, 700);
    const parsed = parseJsonLoose(text);
    if (parsed.error || !parsed.basis) {
      return {
        ok: false,
        error: "تعذّر قراءة الملصق بوضوح. جرّب صورة أوضح (إضاءة أفضل، الجدول كاملاً) أو أضف الطعام يدوياً.",
        errorEn: "Couldn't read the label clearly. Try a clearer photo (better lighting, the whole table visible) or add the food manually.",
      };
    }
    const basis = ["100g", "100ml", "serving"].includes(parsed.basis) ? parsed.basis : "100g";
    const rawMicros = parsed.micronutrients && typeof parsed.micronutrients === "object" ? parsed.micronutrients : {};
    const micronutrients = {};
    for (const key of Object.keys(MICRONUTRIENT_META)) {
      const v = rawMicros[key];
      if (v != null && !Number.isNaN(Number(v))) micronutrients[key] = Number(v);
    }
    const productName = typeof parsed.productName === "string" && parsed.productName.trim() ? parsed.productName.trim() : null;
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
      cholesterol: Number(parsed.cholesterol) || 0,
      micronutrients,
      productName,
    };
  } catch (e) {
    console.error("[nutrition] readNutritionLabel failed:", e);
    const chunkError = isChunkLoadError(e);
    const error = chunkError ? CHUNK_LOAD_ERROR_MESSAGE : "تعذّر قراءة الملصق الآن. جرّب مرة أخرى أو أضف الطعام يدوياً.";
    const errorEn = chunkError ? CHUNK_LOAD_ERROR_MESSAGE_EN : "Couldn't read the label right now. Try again or add the food manually.";
    return { ok: false, error, errorEn };
  }
}

// تقدير عام بالذكاء الاصطناعي لفيتامينات/معادن صنف لا يملك بيانات مرجعية
// دقيقة (لا generic-foods.js ولا USDA ولا ملصق واضح) - مصدر ثانٍ اختياري
// صريح تماماً (زر واحد لكل صنف مسجَّل بعينه، لا تلقائي/صامت إطلاقاً أبداً)
// يكمّل المصدر الأول (علامة "≈" المرجعية) دون خلط بينهما. القيمة المُعادة
// هنا لغرض العرض الإرشادي للمستخدم فقط - يجب ألا تُستخدم أبداً كأساس لأي
// حساب غذائي أو توصية طبية أو تقرير (يُطبَّق هذا القيد في NutritionView.jsx
// بعزل نتيجتها عن أي حساب فعلي، وبشارة مختلفة تماماً بصرياً عن "≈"). نفس
// قالب geminiAnalyze (نص فقط، لا صورة) ونفس حارس المفاتيح المسموحة
// (MICRONUTRIENT_META) وفحص الأرقام الصالحة المُستخدَمين في
// recognizeMealFromImage/readNutritionLabel أعلاه بالضبط - بلا أي تعديل على
// netlify/functions/gemini.js (الحدود/الأمان/الاشتراك الحالية تُغطي هذا
// تلقائياً لأنها نفس نقطة النهاية).
export async function estimateMicronutrientsAI(foodName, lang = "ar") {
  try {
    const prompt = lang === "en"
      ? `Based only on your general knowledge of this food item's typical nutritional composition, give a cautious estimate of its vitamin/mineral content. Item: "${foodName}".
Return only valid JSON with no extra text or markdown, in exactly this shape:
{"micronutrients":{}}
Using only these exact keys where relevant, for a normal single serving of this item: vitamin_d (mcg), vitamin_c (mg), vitamin_a (mcg), vitamin_b12 (mcg), iron (mg), calcium (mg), potassium (mg), zinc (mg), magnesium (mg). Do not invent false precision — if you aren't reasonably confident about a specific element for this item, omit that key entirely instead of guessing a number. Return {"micronutrients":{}} if you aren't confident about any of them.`
      : `بناءً فقط على معرفتك العامة بالتركيب الغذائي النموذجي لهذا الصنف، أعطِ تقديراً حذراً لمحتواه من الفيتامينات/المعادن. الصنف: "${foodName}".
أرجع فقط JSON صالحاً بدون أي نص أو markdown إضافي، بهذا الشكل بالضبط:
{"micronutrients":{}}
بهذه المفاتيح فقط حيث تكون ذات صلة، لحصة واحدة عادية من هذا الصنف: vitamin_d (بالميكروغرام mcg)، vitamin_c (بالميليغرام mg)، vitamin_a (بالميكروغرام mcg)، vitamin_b12 (بالميكروغرام mcg)، iron (بالميليغرام mg)، calcium (بالميليغرام mg)، potassium (بالميليغرام mg)، zinc (بالميليغرام mg)، magnesium (بالميليغرام mg). لا تخترع دقة زائفة - إن لم تكن واثقاً بشكل معقول من عنصر معيّن لهذا الصنف، احذف ذلك المفتاح تماماً بدل تخمين رقم. أرجع {"micronutrients":{}} إن لم تكن واثقاً بشكل معقول من أي منها.`;
    const { geminiAnalyze } = await import("./gemini.js");
    const text = await geminiAnalyze(prompt, 400);
    const parsed = parseJsonLoose(text);
    const rawMicros = parsed.micronutrients && typeof parsed.micronutrients === "object" ? parsed.micronutrients : {};
    const micronutrients = {};
    for (const key of Object.keys(MICRONUTRIENT_META)) {
      const v = rawMicros[key];
      if (v != null && !Number.isNaN(Number(v))) micronutrients[key] = Number(v);
    }
    return { ok: true, micronutrients };
  } catch (e) {
    console.error("[nutrition] estimateMicronutrientsAI failed:", e);
    const chunkError = isChunkLoadError(e);
    const error = chunkError ? CHUNK_LOAD_ERROR_MESSAGE : "تعذّر تقدير الفيتامينات بالذكاء الاصطناعي الآن. جرّب مرة أخرى لاحقاً.";
    const errorEn = chunkError ? CHUNK_LOAD_ERROR_MESSAGE_EN : "Couldn't estimate vitamins with AI right now. Try again later.";
    return { ok: false, error, errorEn };
  }
}

// يحوّل نتيجة readNutritionLabel (أياً كان أساسها المرجعي) إلى "منتج لكل
// 100g" قياسي - نفس الشكل الذي يتوقعه scaleNutrients/unitToGrams أصلاً
// (caloriesPer100g...)، حتى تُستخدم آلية الحصص/الوحدات الموحّدة نفسها بلا
// أي تفريع خاص. عند basis="serving"، يُطبَّق تحويل نسبي بسيط (القيمة لكل
// حصة × 100/حجم الحصة)؛ servingGrams تفترض 100 إن كانت غير معروفة (نفس
// افتراض unitToGrams الافتراضي الموجود أصلاً لوحدات "قطعة"/"حصة" المجهولة).
// per100Basis: "ml" فقط عند basis="100ml" الصريح من Gemini؛ "serving"
// يبقى مُعامَلاً كوزن (g) حتى لو كانت الحصة سائلة فعلياً - قيد معروف (لا
// نطلب من Gemini حالياً تمييز وحدة الحصة نفسها وزناً كانت أم حجماً)، لا
// يُخفى، أدق مما كان (كان الوضع السابق يخلط بلا تمييز مطلقاً).
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
    cholesterolPer100gMg: (label.cholesterol || 0) * factor,
    servingGrams: label.basis === "serving" ? servingGrams : null,
    micronutrientsPer100g,
    per100Basis: label.basis === "100ml" ? "ml" : "g",
  };
}
