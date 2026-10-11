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

// نصوص التذكيرات اليدوية الفورية (mode=broadcast) - منفصلة عمداً عن
// MESSAGES.meals/sleep في notification-engine.js (تلك صياغة محايدة
// للمسار المجدول تلقائياً سابقاً؛ هذه رسالة مباشرة بنص المالك المطلوب
// حرفياً). العنوان "مسارك" فقط لكل الحالات (بلا أي إشارة لـ"إدارة"/جهة
// مراقبة قد تُخيف المستخدم) - مطابق تماماً لعنوان الرسالة المخصّصة أدناه،
// لا فرق بينهما. فطور/غداء/عشاء/نوم/تسجيل الأكل هي الفئات الخمس التي
// أُوقف إرسالها التلقائي المجدول (راجع scheduled-prayer-reminders.js) -
// تُرسَل من الآن يدوياً فقط من هنا.
const BROADCAST_MESSAGES = {
  breakfast: { title: "مسارك", body: "لا تنسَ تسجيل فطورك في مسارك 🍳" },
  lunch: { title: "مسارك", body: "لا تنسَ تسجيل غدائك في مسارك 🍲" },
  dinner: { title: "مسارك", body: "لا تنسَ تسجيل عشائك في مسارك 🍽️" },
  sleep: { title: "مسارك", body: "لا تنسَ تسجيل نومك في مسارك 🌙" },
  mealLog: { title: "مسارك", body: "لا تنسَ تسجيل وجبتك في مسارك 🍽️" },
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

  // نظرة عامة على كل الطلاب دفعة واحدة ليوم محدَّد. السبب الحقيقي للخلل
  // القديم (قائمة ناقصة/غير مستقرة، طلبة سجّلوا أكلاً ولا يظهرون): كل
  // استعلام "صفوف متعددة" من PostgREST يخضع لحد Supabase الافتراضي للصفوف
  // المُعادة (Max Rows، 1000 افتراضياً) بصرف النظر عن limit= المطلوب صريحاً،
  // وبلا ORDER BY ثابت على تلك الاستعلامات القديمة (profile/nutrition_log)
  // أي صفوف تقع ضمن الـ1000 المُعادة غير مضمونة الثبات بين طلبين متطابقين -
  // هذا يطابق تماماً عرض "رفرش عدة مرات لرؤية الكل" و"طلبة سجّلوا ولا
  // يظهرون" (قد يسقطون من الاقتطاع العشوائي في أي طلب). الإصلاح: استدعاء
  // admin_overview_for_date (راجع supabase-schema.sql) التي تُعيد صفاً واحداً
  // فقط دائماً (json يحوي كل البيانات كمصفوفة بداخله) - حد الصفوف لا ينطبق
  // إطلاقاً على استجابة من صف واحد بصرف النظر عن عدد الطلاب الحقيقي.
  if (mode === "overview") {
    const date = (event.queryStringParameters?.date || "").trim();
    if (!isValidDateStr(date)) return json(400, { error: "تاريخ غير صالح." });

    try {
      const res = await fetch(`${url}/rest/v1/rpc/admin_overview_for_date`, {
        method: "POST",
        headers: { ...serviceHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ p_date: date }),
      });
      if (!res.ok) return json(502, { error: "تعذّر جلب النظرة العامة الآن، حاول مرة أخرى.", partial: true });
      const data = await res.json();
      const students = (data?.students || []).map((s) => ({
        owner: s.owner,
        universityId: s.universityId || "",
        name: s.name || "",
        gender: s.gender === "male" || s.gender === "female" ? s.gender : null,
        ateToday: !!s.ateToday,
        calories: Math.round(Number(s.calories) || 0),
        protein: Math.round(Number(s.protein) || 0),
        carbs: Math.round(Number(s.carbs) || 0),
        fat: Math.round(Number(s.fat) || 0),
        tee: typeof s.tee === "number" ? s.tee : null,
      }));
      const noUniversityId = (data?.noUniversityId || []).map((s) => ({ owner: s.owner, name: s.name || "" }));
      return json(200, { date, students, noUniversityId, loadedCount: students.length });
    } catch (e) {
      console.error("[admin-report] overview failed:", e);
      return json(502, { error: "تعذّر جلب النظرة العامة الآن، حاول مرة أخرى.", partial: true });
    }
  }

  // Phase 2: قائمة كل الطلاب مع تاريخ/وقت الدخول ونافذة الأسبوعين - راجع
  // admin_students_overview في supabase-schema.sql لمنطق الحساب الكامل (كل
  // شيء بتوقيت الكويت، وداخل نداء واحد بنفس مبدأ إصلاح mode=overview أعلاه).
  if (mode === "studentsOverview") {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/admin_students_overview`, {
        method: "POST",
        headers: { ...serviceHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) return json(502, { error: "تعذّر جلب قائمة الطلاب الآن، حاول مرة أخرى.", partial: true });
      const students = await res.json();
      return json(200, { students: Array.isArray(students) ? students : [], loadedCount: Array.isArray(students) ? students.length : 0 });
    } catch (e) {
      console.error("[admin-report] studentsOverview failed:", e);
      return json(502, { error: "تعذّر جلب قائمة الطلاب الآن، حاول مرة أخرى.", partial: true });
    }
  }

  // Phase 4: تقرير نافذة الأسبوعين الكامل لطالب واحد (كل الأنشطة المسجَّلة
  // ضمن النافذة، نداء واحد - راجع admin_student_window_report في
  // supabase-schema.sql).
  if (mode === "studentWindowReport") {
    const owner = (event.queryStringParameters?.owner || "").trim();
    if (!owner) return json(400, { error: "معرّف طالب غير صالح." });
    try {
      const res = await fetch(`${url}/rest/v1/rpc/admin_student_window_report`, {
        method: "POST",
        headers: { ...serviceHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ p_owner: owner }),
      });
      if (!res.ok) return json(502, { error: "تعذّر جلب تقرير الطالب الآن، حاول مرة أخرى." });
      const data = await res.json();
      return json(200, data);
    } catch (e) {
      console.error("[admin-report] studentWindowReport failed:", e);
      return json(502, { error: "تعذّر جلب تقرير الطالب الآن، حاول مرة أخرى." });
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
    // إما نوع تذكير جاهز (reminderType، نص ثابت) أو رسالة حرة (customMessage، نص
    // المالك نفسه بالضبط بلا أي قالب) - أحدهما مطلوب، لا كلاهما معاً (قيمة
    // غير فارغة واحدة فقط من الاثنين تُحدِّد نوع الإرسال).
    const reminderType = (bodyParams.reminderType || "").trim();
    const customMessage = (bodyParams.customMessage || "").trim();
    let title, body;
    if (reminderType) {
      if (!BROADCAST_MESSAGES[reminderType]) return json(400, { error: "نوع تذكير غير صالح." });
      ({ title, body } = BROADCAST_MESSAGES[reminderType]);
    } else if (customMessage) {
      // عنوان اسم التطبيق فقط - بلا أي إشارة لـ"إدارة"/جهة مراقبة قد تُخيف
      // المستخدم (نفس نمط مصدر الإشعار في send-test-push.js: "مسارك" بلا
      // صفة إدارية). النص الحر يبقى في body بلا أي تعديل.
      title = "مسارك";
      body = customMessage;
    } else {
      return json(400, { error: "الرسالة فارغة." });
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

  // Phase 3: إرسال رسالة لمجموعة محدَّدة من الطلاب (owners مختارون من
  // الواجهة، بإقصاء أي استبعاد فردي سبق منه) - تُنشئ صف admin_messages واحد
  // + صف admin_message_receipts لكل مستلم (الحارس الحقيقي لـ"ظهور الرسالة
  // الحاجبة له فقط" - RLS على admin_messages نفسها تمنع أي قراءة بلا صف
  // استلام مطابق، راجع supabase-schema.sql)، ثم تحاول إرسال Push حقيقي (أفضل
  // مجهود - المسار الموثوق الحقيقي يبقى الشاشة الحاجبة داخل التطبيق نفسها،
  // لا الإشعار).
  if (mode === "sendMessage") {
    if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

    let bodyParams = {};
    try {
      bodyParams = JSON.parse(event.body || "{}");
    } catch {
      bodyParams = {};
    }
    const messageBody = (bodyParams.body || "").trim();
    const targetOwners = Array.isArray(bodyParams.targetOwners)
      ? [...new Set(bodyParams.targetOwners.filter((o) => typeof o === "string" && o && o !== "solo"))]
      : [];
    const targetDescription = (bodyParams.targetDescription || "").trim();
    if (!messageBody) return json(400, { error: "الرسالة فارغة." });
    if (targetOwners.length === 0) return json(400, { error: "لم يتم اختيار أي طالب." });

    try {
      const createRes = await fetch(`${url}/rest/v1/admin_messages`, {
        method: "POST",
        headers: { ...serviceHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ body: messageBody, target_description: targetDescription || null }),
      });
      if (!createRes.ok) return json(502, { error: "تعذّر إنشاء الرسالة الآن، حاول مرة أخرى." });
      const created = await createRes.json();
      const messageId = Array.isArray(created) && created[0]?.id;
      if (!messageId) return json(502, { error: "تعذّر إنشاء الرسالة الآن، حاول مرة أخرى." });

      const receiptsRes = await fetch(`${url}/rest/v1/admin_message_receipts`, {
        method: "POST",
        headers: { ...serviceHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify(targetOwners.map((owner) => ({ message_id: messageId, owner }))),
      });
      if (!receiptsRes.ok) return json(502, { error: "تعذّر تسجيل المستلمين الآن، حاول مرة أخرى." });

      // إرسال Push أفضل مجهود - فشله لا يفشل الطلب كله (الرسالة والمستلمون
      // سُجِّلوا فعلاً، والشاشة الحاجبة ستظهر عند فتح التطبيق بصرف النظر عن
      // نجاح/فشل الإشعار نفسه).
      let pushSent = 0;
      const vapidPublicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
      const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
      const vapidSubject = (process.env.VAPID_SUBJECT || "").trim();
      if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
        try {
          configureVapid(vapidSubject, vapidPublicKey, vapidPrivateKey);
          const targetSet = new Set(targetOwners);
          const subsRes = await fetch(
            `${url}/rest/v1/push_subscriptions?select=id,owner,endpoint,p256dh,auth,platform`,
            { headers: serviceHeaders },
          );
          if (subsRes.ok) {
            const allSubs = await subsRes.json();
            const subs = allSubs.filter((s) => targetSet.has(s.owner));
            // العنوان "مسارك" فقط - بلا "رسالة من الإدارة" أو أي كلمة تخوّف
            // (نفس اشتراط الواجهة الحاجبة بالضبط).
            const notificationPayload = JSON.stringify({ title: "مسارك", body: messageBody, url: "/" });
            const results = await Promise.all(
              subs.map((sub) => sendToSubscriptionRow({ url, headers: serviceHeaders, sub, notificationPayload })),
            );
            const sentOwners = new Set();
            results.forEach((r, i) => { if (r.ok) sentOwners.add(subs[i].owner); });
            pushSent = sentOwners.size;
          }
        } catch (e) {
          console.error("[admin-report] sendMessage push failed (message still created):", e);
        }
      }

      return json(200, { messageId, totalTargets: targetOwners.length, pushSent });
    } catch (e) {
      console.error("[admin-report] sendMessage failed:", e);
      return json(502, { error: "تعذّر إرسال الرسالة الآن، حاول مرة أخرى." });
    }
  }

  // قائمة الرسائل المرسَلة سابقاً + عدّاد (كم ضغط موافق من أصل كم مستلم)
  // لكل واحدة - آخر 100 رسالة فقط (كافية لأي استخدام فعلي لهذه الميزة).
  if (mode === "messages") {
    try {
      const messagesRes = await fetch(
        `${url}/rest/v1/admin_messages?select=id,body,created_at,target_description&order=created_at.desc&limit=100`,
        { headers: serviceHeaders },
      );
      if (!messagesRes.ok) return json(502, { error: "تعذّر جلب الرسائل الآن، حاول مرة أخرى." });
      const messages = await messagesRes.json();
      if (!Array.isArray(messages) || messages.length === 0) return json(200, { messages: [] });

      const ids = messages.map((m) => `"${m.id}"`).join(",");
      const receiptsRes = await fetch(
        `${url}/rest/v1/admin_message_receipts?message_id=in.(${ids})&select=message_id,acknowledged_at`,
        { headers: serviceHeaders },
      );
      if (!receiptsRes.ok) return json(502, { error: "تعذّر جلب حالة الاستلام الآن، حاول مرة أخرى." });
      const receipts = await receiptsRes.json();

      const countsByMessage = new Map();
      for (const r of receipts) {
        if (!countsByMessage.has(r.message_id)) countsByMessage.set(r.message_id, { total: 0, acknowledged: 0 });
        const c = countsByMessage.get(r.message_id);
        c.total += 1;
        if (r.acknowledged_at) c.acknowledged += 1;
      }

      return json(200, {
        messages: messages.map((m) => {
          const c = countsByMessage.get(m.id) || { total: 0, acknowledged: 0 };
          return {
            id: m.id,
            body: m.body,
            createdAt: m.created_at,
            targetDescription: m.target_description || "",
            totalTargets: c.total,
            acknowledgedCount: c.acknowledged,
          };
        }),
      });
    } catch (e) {
      console.error("[admin-report] messages failed:", e);
      return json(502, { error: "تعذّر جلب الرسائل الآن، حاول مرة أخرى." });
    }
  }

  // تفاصيل مستلمي رسالة واحدة (✓/✗ لكل طالب + وقت الضغط) - messageId مطلوب.
  if (mode === "messageReceipts") {
    const messageId = (event.queryStringParameters?.messageId || "").trim();
    if (!messageId) return json(400, { error: "معرّف رسالة غير صالح." });
    try {
      const [receiptsRes, profilesRes] = await Promise.all([
        fetch(
          `${url}/rest/v1/admin_message_receipts?message_id=eq.${encodeURIComponent(messageId)}&select=owner,sent_at,acknowledged_at`,
          { headers: serviceHeaders },
        ),
        fetch(`${url}/rest/v1/profile?select=owner,university_id,name`, { headers: serviceHeaders }),
      ]);
      if (!receiptsRes.ok || !profilesRes.ok) return json(502, { error: "تعذّر جلب قائمة المستلمين الآن، حاول مرة أخرى." });
      const receipts = await receiptsRes.json();
      const profiles = await profilesRes.json();
      const profileByOwner = new Map(profiles.map((p) => [p.owner, p]));

      const result = receipts.map((r) => {
        const p = profileByOwner.get(r.owner);
        return {
          owner: r.owner,
          universityId: p?.university_id || "",
          name: p?.name || "",
          sentAt: r.sent_at,
          acknowledgedAt: r.acknowledged_at || null,
        };
      });
      return json(200, { receipts: result });
    } catch (e) {
      console.error("[admin-report] messageReceipts failed:", e);
      return json(502, { error: "تعذّر جلب قائمة المستلمين الآن، حاول مرة أخرى." });
    }
  }

  return json(400, { error: "طلب غير صالح." });
};
