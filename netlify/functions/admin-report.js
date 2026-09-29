// Netlify Function: تقرير إداري محصور بحساب واحد فقط (مالك المشروع) - لا
// علاقة له بنظام الاشتراكات العام. البريد المصرَّح له مكتوب هنا حرفياً في
// كود الخادم فقط - لا يظهر إطلاقاً في حزمة الواجهة الأمامية (Vite/React لا
// تحزم ملفات netlify/functions أصلاً)، ولا في أي كود يعمل بالمتصفح؛ الواجهة
// لا تعرف هذا البريد ولا تقارنه بأي شيء - تعتمد كلياً على استجابة هذه الدالة
// (mode=check) لتقرير isAdmin: true/false فقط.
//
// التحقق الفعلي: نتحقق من هوية صاحب الجلسة عبر accessToken (نفس أسلوب
// gemini.js تماماً - /auth/v1/user يرجع صاحب التوكن الحقيقي، لا شيء يُصدَّق
// بلا التحقق من الخادم) ثم نقارن بريده ببريد المالك المصرَّح. أي عدم تطابق
// (بلا توكن، توكن غير صالح، أو بريد مختلف) يُرفض فوراً بلا كشف أي بيانات -
// حتى mode=search نفسها تتحقق من isAdmin مجدداً بشكل مستقل (لا تعتمد على أن
// المستدعي استدعى mode=check بأمانة أولاً).
//
// القراءة تستخدم SUPABASE_SERVICE_ROLE_KEY (متغيّر بيئة سري على الخادم فقط)
// لتجاوز RLS عمداً وبأمان - تماماً كنمط scheduled-prayer-reminders.js: هذا
// مسموح فقط لأن الوصول محصور بفحص البريد أعلاه قبل أي استعلام، لا لأي سبب
// آخر.
const ADMIN_EMAIL = "hwaijmamoud@gmail.com";

function readSupabaseEnv() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return { url, anonKey, serviceRoleKey };
}

async function resolveCallerEmail(url, anonKey, accessToken) {
  if (!accessToken) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.email || null;
  } catch (e) {
    console.error("[admin-report] resolveCallerEmail failed:", e);
    return null;
  }
}

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  const { url, anonKey, serviceRoleKey } = readSupabaseEnv();
  if (!url || !anonKey) {
    return json(500, { error: "الخدمة غير مهيأة على الخادم." });
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const callerEmail = await resolveCallerEmail(url, anonKey, accessToken);
  const isAdmin = !!callerEmail && callerEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const mode = event.queryStringParameters?.mode || "";

  if (mode === "check") {
    return json(200, { isAdmin });
  }

  // أي وضع آخر غير "check" يتطلب isAdmin=true - لا كشف لأي فرق بين "بلا
  // إذن" و"وضع غير معروف" (نفس رسالة الرفض دائماً)، حتى لا يُستدَل من شكل
  // الخطأ على وجود أوضاع أخرى غير موثّقة.
  if (!isAdmin) {
    return json(403, { error: "الوصول مرفوض." });
  }

  if (!serviceRoleKey) {
    return json(500, { error: "الخدمة غير مهيأة على الخادم." });
  }

  if (mode === "search") {
    const universityId = (event.queryStringParameters?.universityId || "").trim();
    if (!universityId || universityId.length > 100) {
      return json(400, { error: "رقم جامعي غير صالح." });
    }

    const serviceHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

    try {
      const profRes = await fetch(
        `${url}/rest/v1/profile?university_id=eq.${encodeURIComponent(universityId)}&select=owner&limit=1`,
        { headers: serviceHeaders },
      );
      if (!profRes.ok) return json(502, { error: "تعذّر البحث الآن، حاول مرة أخرى." });
      const profiles = await profRes.json();
      const owner = Array.isArray(profiles) && profiles[0]?.owner;
      if (!owner) return json(200, { universityId, found: false, entries: [] });

      const logRes = await fetch(
        `${url}/rest/v1/nutrition_log?owner=eq.${encodeURIComponent(owner)}` +
          `&select=date,meal_type,food_name,quantity,unit,calories,protein,carbs,fat,fiber,sugar,sodium,cholesterol,source,created_at` +
          `&order=date.desc,created_at.desc`,
        { headers: serviceHeaders },
      );
      if (!logRes.ok) return json(502, { error: "تعذّر جلب السجل الغذائي الآن، حاول مرة أخرى." });
      const entries = await logRes.json();
      return json(200, { universityId, found: true, entries });
    } catch (e) {
      console.error("[admin-report] search failed:", e);
      return json(502, { error: "تعذّر البحث الآن، حاول مرة أخرى." });
    }
  }

  return json(400, { error: "طلب غير صالح." });
};
