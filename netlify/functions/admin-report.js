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
const { configureVapid, sendToSubscriptionRow } = require("./lib/send-push");

const ADMIN_EMAIL = "hwaijmamoud@gmail.com";

const SUGGEST_LIMIT = 15;

// نصوص تذكير الوجبات اليدوي الفوري (mode=broadcast) - منفصلة عمداً عن
// MESSAGES.meals في notification-engine.js (تلك صياغة محايدة لا تفترض وجبة
// بعينها لم تُسجَّل بعد "يمكنك تسجيلها متى ناسبك"؛ هذه رسالة مباشرة بنص
// الوجبة المحدَّدة التي طلبها المالك حرفياً: "لا تنسَ تسجيل فطورك").
const MEAL_BROADCAST_MESSAGES = {
  breakfast: { title: "🍳 تذكير بالفطور", body: "لا تنسَ تسجيل فطورك في مسارك 🍳" },
  lunch: { title: "🍲 تذكير بالغداء", body: "لا تنسَ تسجيل غدائك في مسارك 🍲" },
  dinner: { title: "🍽️ تذكير بالعشاء", body: "لا تنسَ تسجيل عشائك في مسارك 🍽️" },
};

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
  // GET لكل أوضاع القراءة كما كانت (check/suggest/report/overview)، وPOST
  // فقط للوضع الوحيد الذي يُنفِّذ فعلاً إجراءً جانبياً (broadcast: إرسال
  // إشعار حقيقي) - فصل METHOD يطابق طبيعة كل وضع (قراءة بلا أثر جانبي مقابل
  // إجراء حقيقي)، لا تعسفاً.
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
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

      const [logRes, healthRes] = await Promise.all([
        fetch(logUrl, { headers: serviceHeaders }),
        fetch(
          `${url}/rest/v1/health_profile?owner=eq.${encodeURIComponent(owner)}&select=tee&limit=1`,
          { headers: serviceHeaders },
        ),
      ]);
      if (!logRes.ok) return json(502, { error: "تعذّر جلب السجل الغذائي الآن، حاول مرة أخرى." });
      const entries = await logRes.json();
      // tee (Total Energy Expenditure): يُحسَب ويُخزَّن فقط بعد أن يكمل
      // الطالب بياناته الصحية (طول/وزن/عمر/جنس/نشاط) في قسم "أنت" - غيابه
      // يعني بيانات ناقصة، لا خطأً، فتُعاد null صراحة بدل رقم مُختلَق
      // (الواجهة تعرض رسالة واضحة بدلاً من ذلك).
      let tee = null;
      if (healthRes.ok) {
        const healthRows = await healthRes.json();
        tee = (Array.isArray(healthRows) && typeof healthRows[0]?.tee === "number") ? healthRows[0].tee : null;
      }
      return json(200, {
        found: true,
        owner: profile.owner,
        universityId: profile.university_id || "",
        name: profile.name || "",
        entries,
        healthProfile: { tee },
      });
    } catch (e) {
      console.error("[admin-report] report failed:", e);
      return json(502, { error: "تعذّر جلب السجل الغذائي الآن، حاول مرة أخرى." });
    }
  }

  // نظرة عامة على كل الطلاب دفعة واحدة ليوم محدَّد - 3 استعلامات فقط بصرف
  // النظر عن عدد الطلاب (لا طلب منفصل لكل طالب، مطلوب صراحة لتحمّل +500
  // طالب): (1) كل الملفات الشخصية التي تحمل رقماً جامعياً، (2) nutrition_log
  // لهذا التاريخ فقط بلا فلترة owner (يتفادى بناء قائمة in.() ضخمة قد تتجاوز
  // حدود طول الرابط مع مئات المعرّفات)، (3) health_profile لعمودي owner/tee
  // فقط لكل الصفوف (خفيف الحجم حتى مع آلاف المستخدمين). المطابقة والتجميع
  // (owner -> مجموع اليوم) تتم بالذاكرة هنا بعد الجلب، لا بالقاعدة.
  if (mode === "overview") {
    const date = (event.queryStringParameters?.date || "").trim();
    if (!isValidDateStr(date)) return json(400, { error: "تاريخ غير صالح." });

    try {
      const profRes = await fetch(
        `${url}/rest/v1/profile?university_id=not.is.null&select=owner,university_id,name&limit=2000`,
        { headers: serviceHeaders },
      );
      if (!profRes.ok) return json(502, { error: "تعذّر جلب قائمة الطلاب الآن، حاول مرة أخرى." });
      const profiles = await profRes.json();
      if (!Array.isArray(profiles) || profiles.length === 0) return json(200, { date, students: [] });

      const [logRes, healthRes] = await Promise.all([
        fetch(
          `${url}/rest/v1/nutrition_log?date=eq.${encodeURIComponent(date)}&select=owner,calories,protein,carbs,fat`,
          { headers: serviceHeaders },
        ),
        fetch(`${url}/rest/v1/health_profile?select=owner,tee,gender`, { headers: serviceHeaders }),
      ]);
      if (!logRes.ok || !healthRes.ok) return json(502, { error: "تعذّر جلب بيانات اليوم الآن، حاول مرة أخرى." });
      const logs = await logRes.json();
      const healthRows = await healthRes.json();

      const totalsByOwner = new Map();
      for (const row of logs) {
        if (!totalsByOwner.has(row.owner)) totalsByOwner.set(row.owner, { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 });
        const t = totalsByOwner.get(row.owner);
        t.calories += Number(row.calories) || 0;
        t.protein += Number(row.protein) || 0;
        t.carbs += Number(row.carbs) || 0;
        t.fat += Number(row.fat) || 0;
        t.count += 1;
      }
      const teeByOwner = new Map(healthRows.map((r) => [r.owner, typeof r.tee === "number" ? r.tee : null]));
      // الجنس (male/female) - عرض فقط، لا علاقة له بأي حساب هنا (ذاك يبقى
      // حصراً عبر tee المحسوب مسبقاً وقت إكمال "أنت"؛ هذا العمود توضيحي بحت).
      const genderByOwner = new Map(healthRows.map((r) => [r.owner, r.gender === "male" || r.gender === "female" ? r.gender : null]));

      const students = profiles.map((p) => {
        const t = totalsByOwner.get(p.owner);
        return {
          owner: p.owner,
          universityId: p.university_id || "",
          name: p.name || "",
          gender: genderByOwner.get(p.owner) ?? null,
          ateToday: !!t && t.count > 0,
          calories: t ? Math.round(t.calories) : 0,
          protein: t ? Math.round(t.protein) : 0,
          carbs: t ? Math.round(t.carbs) : 0,
          fat: t ? Math.round(t.fat) : 0,
          tee: teeByOwner.get(p.owner) ?? null,
        };
      });
      return json(200, { date, students });
    } catch (e) {
      console.error("[admin-report] overview failed:", e);
      return json(502, { error: "تعذّر جلب النظرة العامة الآن، حاول مرة أخرى." });
    }
  }

  // تذكير وجبة يدوي فوري لكل المستخدمين المؤهَّلين دفعة واحدة - بديل احتياطي
  // يدوي عن scheduled-prayer-reminders.js (التي ثبت أحياناً عدم موثوقيتها
  // فعلياً بسبب تأخير/إسقاط تشغيلات الجدولة الخارجية، راجع تعليق ذلك الملف) -
  // يستخدم بالضبط نفس بنية الإرسال (configureVapid/sendToSubscriptionRow من
  // lib/send-push.js)، لا نظاماً موازياً. فوري عمداً: لا فحص تكرار (notification_log)
  // ولا Quiet Hours ولا حد يومي ولا تفضيل فئة فردي - هذا إجراء يدوي واعٍ
  // ومقصود من المالك تحديداً لتجاوز عدم موثوقية الجدولة التلقائية، لا تذكيراً
  // تلقائياً آخر يجب أن يخضع لنفس قيودها؛ يبقى مُقيَّداً فقط بما يُقيِّد كل
  // إشعار آخر بالتطبيق: profile.notifications_enabled=true (تفعيل الإشعارات
  // عموماً) ووجود اشتراك Push فعلي.
  if (mode === "broadcast") {
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

    let bodyParams = {};
    try {
      bodyParams = JSON.parse(event.body || "{}");
    } catch {
      bodyParams = {};
    }
    const mealType = (bodyParams.mealType || "").trim();
    if (!MEAL_BROADCAST_MESSAGES[mealType]) {
      return json(400, { error: "نوع وجبة غير صالح." });
    }

    const vapidPublicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
    const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
    const vapidSubject = (process.env.VAPID_SUBJECT || "").trim();
    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      return json(500, { error: "خدمة الإشعارات غير مهيأة على الخادم." });
    }
    configureVapid(vapidSubject, vapidPublicKey, vapidPrivateKey);

    try {
      const candidatesRes = await fetch(
        `${url}/rest/v1/profile?notifications_enabled=eq.true&select=owner`,
        { headers: serviceHeaders },
      );
      if (!candidatesRes.ok) return json(502, { error: "تعذّر جلب قائمة المستخدمين الآن، حاول مرة أخرى." });
      const candidateRows = await candidatesRes.json();
      const candidateOwners = new Set(candidateRows.map((r) => r.owner).filter((o) => o && o !== "solo"));
      if (candidateOwners.size === 0) return json(200, { totalUsers: 0, sentUsers: 0 });

      // لا in.() بقائمة owner هنا عمداً (نفس سبب mode=overview أعلاه بالضبط:
      // قد تتجاوز حدود طول الرابط مع مئات/آلاف المستخدمين) - نجلب كل صفوف
      // push_subscriptions (عمودين فقط لازمين زائد ما يحتاجه الإرسال، خفيف
      // الحجم) ثم نُصفّي بالذاكرة بمن هو مؤهَّل فعلاً.
      const subsRes = await fetch(
        `${url}/rest/v1/push_subscriptions?select=id,owner,endpoint,p256dh,auth,platform`,
        { headers: serviceHeaders },
      );
      if (!subsRes.ok) return json(502, { error: "تعذّر جلب اشتراكات الإشعارات الآن، حاول مرة أخرى." });
      const allSubs = await subsRes.json();
      const subs = allSubs.filter((s) => candidateOwners.has(s.owner));
      if (subs.length === 0) return json(200, { totalUsers: candidateOwners.size, sentUsers: 0 });

      const { title, body } = MEAL_BROADCAST_MESSAGES[mealType];
      const notificationPayload = JSON.stringify({ title, body, url: "/nutrition" });

      const results = await Promise.all(
        subs.map((sub) => sendToSubscriptionRow({ url, headers: serviceHeaders, sub, notificationPayload })),
      );
      const sentOwners = new Set();
      results.forEach((r, i) => {
        if (r.ok) sentOwners.add(subs[i].owner);
      });

      return json(200, { totalUsers: candidateOwners.size, sentUsers: sentOwners.size });
    } catch (e) {
      console.error("[admin-report] broadcast failed:", e);
      return json(502, { error: "تعذّر إرسال التذكير الآن، حاول مرة أخرى." });
    }
  }

  return json(400, { error: "طلب غير صالح." });
};
