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
// كل وضع (suggest/report) يتحقق من isAdmin بشكل مستقل، لا يعتمد على أن
// المستدعي استدعى mode=check بأمانة أولاً.
//
// القراءة تستخدم SUPABASE_SERVICE_ROLE_KEY (متغيّر بيئة سري على الخادم فقط)
// لتجاوز RLS عمداً وبأمان - تماماً كنمط scheduled-prayer-reminders.js: هذا
// مسموح فقط لأن الوصول محصور بفحص البريد أعلاه قبل أي استعلام، لا لأي سبب
// آخر.
//
// "owner" (معرّف الحساب الحقيقي uuid) يُعاد للواجهة في نتائج mode=suggest
// ويُستخدَم كمعرّف الاختيار في mode=report - ليس تسريباً (المستدعي هنا مخوَّل
// بالفعل لرؤية كل بيانات أي طالب)، بل الحل الوحيد الموثوق لتفادي التباس بين
// طلاب بنفس الاسم أو رقم جامعي متشابه جزئياً - الاختيار دائماً بمعرّف الحساب
// الفريد، لا بنص الاسم/الرقم المعروض.
const ADMIN_EMAIL = "hwaijmamoud@gmail.com";

const SUGGEST_LIMIT = 15;

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

// يمنع أحرف % و_ التي كتبها المستخدم من التصرّف كأحرف بدل (wildcard) غير
// مقصودة داخل ILIKE - القيمة الحقيقية المطلوب مطابقتها حرفياً فقط، والـ%
// الوحيدة المقصودة هي التي نضيفها نحن أنفسنا (بداية/نهاية النمط) لا التي قد
// يكتبها المستخدم بالخطأ أو عمداً.
function escapeLike(q) {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function isValidDateStr(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
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

  const serviceHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  // اقتراحات فورية (autocomplete) أثناء الكتابة - بحث بالبداية (prefix) على
  // الرقم الجامعي، وبحث باحتواء (substring) على الاسم، معاً في استعلامين
  // منفصلين بسيطين (بدل or=() المركّبة على عمودين مختلفين في PostgREST -
  // تعقيد/مخاطر escaping غير ضرورية هنا) ثم دمج النتيجتين وإزالة التكرار
  // بمعرّف owner.
  if (mode === "suggest") {
    const qRaw = (event.queryStringParameters?.q || "").trim();
    if (!qRaw || qRaw.length > 100) return json(200, { suggestions: [] });
    const q = escapeLike(qRaw);

    try {
      const [prefixRes, nameRes] = await Promise.all([
        fetch(
          `${url}/rest/v1/profile?university_id=ilike.${encodeURIComponent(`${q}%`)}&select=owner,university_id,name&limit=${SUGGEST_LIMIT}`,
          { headers: serviceHeaders },
        ),
        fetch(
          `${url}/rest/v1/profile?name=ilike.${encodeURIComponent(`%${q}%`)}&select=owner,university_id,name&limit=${SUGGEST_LIMIT}`,
          { headers: serviceHeaders },
        ),
      ]);
      if (!prefixRes.ok || !nameRes.ok) return json(502, { error: "تعذّر البحث الآن، حاول مرة أخرى." });
      const [prefixRows, nameRows] = await Promise.all([prefixRes.json(), nameRes.json()]);

      const byOwner = new Map();
      for (const r of [...prefixRows, ...nameRows]) {
        if (!byOwner.has(r.owner)) byOwner.set(r.owner, r);
      }
      const suggestions = [...byOwner.values()]
        .slice(0, SUGGEST_LIMIT)
        .map((r) => ({ owner: r.owner, universityId: r.university_id || "", name: r.name || "" }));
      return json(200, { suggestions });
    } catch (e) {
      console.error("[admin-report] suggest failed:", e);
      return json(502, { error: "تعذّر البحث الآن، حاول مرة أخرى." });
    }
  }

  // السجل الغذائي الكامل لطالب محدَّد بمعرّف حسابه (owner) - مُختار من نتائج
  // suggest أعلاه، لا بإعادة كتابة رقمه/اسمه يدوياً (يتفادى أي التباس بين
  // طلاب متشابهين). from/to اختياريان (YYYY-MM-DD) - فلترة فعلية على
  // الاستعلام نفسه، لا إخفاء صفوف بالواجهة فقط.
  if (mode === "report") {
    const owner = (event.queryStringParameters?.owner || "").trim();
    if (!owner) return json(400, { error: "معرّف طالب غير صالح." });
    const from = event.queryStringParameters?.from;
    const to = event.queryStringParameters?.to;
    if (from && !isValidDateStr(from)) return json(400, { error: "تاريخ بداية غير صالح." });
    if (to && !isValidDateStr(to)) return json(400, { error: "تاريخ نهاية غير صالح." });

    try {
      const profRes = await fetch(
        `${url}/rest/v1/profile?owner=eq.${encodeURIComponent(owner)}&select=owner,university_id,name&limit=1`,
        { headers: serviceHeaders },
      );
      if (!profRes.ok) return json(502, { error: "تعذّر جلب بيانات الطالب الآن، حاول مرة أخرى." });
      const profiles = await profRes.json();
      const profile = Array.isArray(profiles) && profiles[0];
      if (!profile) return json(200, { found: false, entries: [] });

      let logUrl =
        `${url}/rest/v1/nutrition_log?owner=eq.${encodeURIComponent(owner)}` +
        `&select=date,meal_type,food_name,quantity,unit,calories,protein,carbs,fat,fiber,sugar,sodium,cholesterol,source,created_at`;
      if (from) logUrl += `&date=gte.${encodeURIComponent(from)}`;
      if (to) logUrl += `&date=lte.${encodeURIComponent(to)}`;
      logUrl += `&order=date.desc,created_at.desc`;

      const logRes = await fetch(logUrl, { headers: serviceHeaders });
      if (!logRes.ok) return json(502, { error: "تعذّر جلب السجل الغذائي الآن، حاول مرة أخرى." });
      const entries = await logRes.json();
      return json(200, {
        found: true,
        owner: profile.owner,
        universityId: profile.university_id || "",
        name: profile.name || "",
        entries,
      });
    } catch (e) {
      console.error("[admin-report] report failed:", e);
      return json(502, { error: "تعذّر جلب السجل الغذائي الآن، حاول مرة أخرى." });
    }
  }

  return json(400, { error: "طلب غير صالح." });
};
