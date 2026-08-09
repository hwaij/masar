// Netlify Function: server-side proxy for USDA FoodData Central so
// USDA_API_KEY never reaches the browser. This is a public utility search
// (no subscription/auth gate, unlike gemini.js) - the whole nutrition
// search feature already works for guests, so USDA must too.
//
// Results are cached in Supabase (usda_cache, 30 days) to protect the
// shared free-tier quota (1000 requests/hour across every app user) -
// most searches repeat on the same common staple foods, so caching
// collapses the vast majority of traffic to zero real USDA calls.
const USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Foundation/SR Legacy/Survey (FNDDS) هي الأطعمة العامة عالية الجودة (بيض،
// خضار، فواكه، لحوم...) - نفس ما يطلبه هذا القسم أساساً. Branded مضمّنة
// بأولوية أدنى فقط (تُرتَّب لاحقاً في الواجهة) لتغطية حالات نادرة لا يجدها
// Open Food Facts نفسه.
const DATA_TYPES = ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"];

// معرّفات العناصر الغذائية القياسية في USDA (نفس المعرّفات عبر كل قواعد
// بياناتهم) - مطابقة لأعمدة nutrition_log الأساسية الستة زائد الصوديوم.
const NUTRIENT_MAP = {
  1008: "caloriesPer100g",
  1003: "proteinPer100g",
  1005: "carbsPer100g",
  1004: "fatPer100g",
  1079: "fiberPer100g",
  2000: "sugarPer100g",
  1093: "sodiumPer100gMg",
  1253: "cholesterolPer100gMg",
};
// نفس مفاتيح MICRONUTRIENT_META في src/lib/nutrition.js - تطابق مباشر
// بلا أي تحويل وحدة إضافي (USDA يُبلغ عنها بنفس الوحدات: مكغ للفيتامينات
// د/أ/ب12، مغ للباقي).
const MICRO_NUTRIENT_MAP = {
  1114: "vitamin_d", 1162: "vitamin_c", 1106: "vitamin_a", 1178: "vitamin_b12",
  1089: "iron", 1087: "calcium", 1092: "potassium", 1095: "zinc", 1090: "magnesium",
};

function readSupabaseEnv() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  return { url, anonKey };
}

async function readCache(term) {
  const { url, anonKey } = readSupabaseEnv();
  if (!url || !anonKey) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/usda_cache?search_term=eq.${encodeURIComponent(term)}&select=results,cached_at`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return null;
    if (Date.now() - new Date(row.cached_at).getTime() > CACHE_MAX_AGE_MS) return null; // انتهت صلاحية الكاش
    return row.results;
  } catch (e) {
    console.error("[usda] cache read failed:", e);
    return null;
  }
}

// فشل الكتابة هنا لا يُفشل الطلب نفسه أبداً (النتائج وصلت للمستخدم فعلاً) -
// فقط يعني عدم استفادة البحث التالي لنفس المصطلح من الكاش، فيُسجَّل
// كخطأ في اللوغ فقط.
async function writeCache(term, results) {
  const { url, anonKey } = readSupabaseEnv();
  if (!url || !anonKey) return;
  try {
    const res = await fetch(`${url}/rest/v1/usda_cache?on_conflict=search_term`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([{ search_term: term, results, cached_at: new Date().toISOString() }]),
    });
    if (!res.ok) console.error("[usda] cache write HTTP", res.status, await res.text());
  } catch (e) {
    console.error("[usda] cache write failed:", e);
  }
}

// يستخرج فقط الحقول المطلوبة فعلياً من استجابة USDA الخام (ثقيلة جداً
// وتحوي عشرات الحقول غير المستخدمة) - ويستبعد أي نتيجة بلا اسم أو بلا
// سعرات (بيانات غير مفيدة لعرضها، نفس مبدأ فلترة Open Food Facts في
// searchProductsByName بـsrc/lib/nutrition.js).
function normalizeFoods(foods) {
  return (foods || [])
    .slice(0, 25)
    .map((f) => {
      const product = { fdcId: f.fdcId, name: f.description || "", dataType: f.dataType || "" };
      const micronutrientsPer100g = {};
      for (const n of f.foodNutrients || []) {
        const id = n.nutrientId;
        if (NUTRIENT_MAP[id] != null && typeof n.value === "number") product[NUTRIENT_MAP[id]] = n.value;
        if (MICRO_NUTRIENT_MAP[id] != null && typeof n.value === "number") micronutrientsPer100g[MICRO_NUTRIENT_MAP[id]] = n.value;
      }
      product.micronutrientsPer100g = micronutrientsPer100g;
      return product;
    })
    .filter((p) => p.name.trim().length > 0 && p.caloriesPer100g != null);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "USDA_API_KEY غير مضبوط على الخادم" }) };
  }

  const rawQuery = (event.queryStringParameters?.query || "").trim();
  if (!rawQuery || rawQuery.length > 100) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "طلب بحث غير صالح" }) };
  }
  const term = rawQuery.toLowerCase();

  const cached = await readCache(term);
  if (cached) {
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products: cached, cached: true }) };
  }

  try {
    const usdaUrl = `${USDA_SEARCH_URL}?query=${encodeURIComponent(rawQuery)}&pageSize=25&dataType=${encodeURIComponent(DATA_TYPES.join(","))}&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(usdaUrl);
    if (!res.ok) {
      const bodyText = await res.text();
      console.error(`[usda] HTTP ${res.status}:`, bodyText.slice(0, 500));
      const status = res.status === 429 ? 429 : 502;
      return {
        statusCode: status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: res.status === 429 ? "الطلبات كثيرة الآن على قاعدة USDA" : "تعذّر الاتصال بقاعدة USDA" }),
      };
    }
    const data = await res.json();
    const products = normalizeFoods(data.foods);
    await writeCache(term, products);
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products, cached: false }) };
  } catch (e) {
    console.error("[usda] network/exception error:", e);
    return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "تعذّر الاتصال بقاعدة USDA الآن" }) };
  }
};
