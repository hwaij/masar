// قسم "التغذية": الاتصال بـ Open Food Facts (بحث بالباركود أو بالاسم)
// وحسابات ماء/سعرات اليوم. Open Food Facts مجاني ولا يحتاج مفتاح API.
// التوثيق: https://world.openfoodfacts.org/data

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
  return {
    barcode: p.code || barcode || "",
    name: p.product_name || p.generic_name || "منتج بلا اسم",
    imageUrl: p.image_front_small_url || p.image_front_url || p.image_url || null,
    caloriesPer100g,
    proteinPer100g: proteinPer100g ?? 0,
    carbsPer100g: carbsPer100g ?? 0,
    fatPer100g: fatPer100g ?? 0,
    servingSizeLabel: p.serving_size || null,
    servingGrams: servingGrams && servingGrams > 0 ? servingGrams : null,
  };
}

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

// يحسب القيم الفعلية لكمية معيّنة بالغرام انطلاقاً من قيم كل 100غم.
export function scaleNutrients(product, grams) {
  const factor = grams / 100;
  return {
    calories: Math.round(product.caloriesPer100g * factor),
    protein: Math.round(product.proteinPer100g * factor * 10) / 10,
    carbs: Math.round(product.carbsPer100g * factor * 10) / 10,
    fat: Math.round(product.fatPer100g * factor * 10) / 10,
  };
}

export function sumNutritionEntries(entries) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
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
