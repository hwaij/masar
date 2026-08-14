// Netlify Function: اختبار يدوي فقط (Phase 2، وُسِّع لاحقاً ليشمل
// وجبات/ماء بنفس الآلية) - لا cron، لا جدولة، لا إرسال لأي مستخدم غير
// مُدرَج صراحة في PRAYER_TEST_ALLOWLIST (اسم المتغيّر بقي كما هو تاريخياً
// رغم أنه يحكم كل الفئات التجريبية هنا الآن، لا الصلاة فقط - إعادة تسميته
// تكسر إعداد أي بيئة Netlify فعلية مضبوطة عليه بالفعل بلا أي فائدة حقيقية).
// الهدف: إثبات أن خط الأنابيب الكامل (فحص أهلية حقيقي -> بناء نص ودود ->
// إرسال Push حقيقي) يعمل صحيحاً فورياً بلا انتظار نافذة زمنية حقيقية -
// نفس بنية القرار المستخدمة في scheduled-prayer-reminders.js تماماً.
//
// أمان: يتحقق من هوية المستخدم عبر توكن Supabase الحقيقي (نفس نمط
// gemini.js/send-test-push.js)، ثم يرفض أي هوية غير موجودة صراحة في
// PRAYER_TEST_ALLOWLIST - حتى لو كان التوكن صالحاً تماماً لمستخدم حقيقي
// آخر. لا يلمس notification_preferences/notification_log إطلاقاً (تلك
// مرحلة لاحقة) - فقط يحسب ويُرسل مرة واحدة عند كل استدعاء يدوي.
const { todayFivePrayers, nextPrayerNow } = require("./lib/prayer-times");
const { buildMessage } = require("./lib/notification-engine");
const { configureVapid, sendPushToUserSubscriptions } = require("./lib/send-push");

const PRAYER_NAMES = {
  fajr: { ar: "الفجر", en: "Fajr" },
  dhuhr: { ar: "الظهر", en: "Dhuhr" },
  asr: { ar: "العصر", en: "Asr" },
  maghrib: { ar: "المغرب", en: "Maghrib" },
  isha: { ar: "العشاء", en: "Isha" },
};

const MEAL_LABELS = {
  breakfast: { ar: "الفطور", en: "Breakfast" },
  lunch: { ar: "الغداء", en: "Lunch" },
  dinner: { ar: "العشاء", en: "Dinner" },
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

async function getCallerUserId(url, anonKey, accessToken) {
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id || null;
}

function readAllowlist() {
  return (process.env.PRAYER_TEST_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const vapidPublicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
  const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  const vapidSubject = (process.env.VAPID_SUBJECT || "").trim();
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error("[prayer-reminder-test] missing VAPID env vars");
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "الخدمة غير مهيأة على الخادم." }) };
  }

  const { url, anonKey } = readSupabaseEnv();
  if (!url || !anonKey) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "الخدمة غير مهيأة على الخادم." }) };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) {
    return { statusCode: 401, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "سجّل الدخول أولاً." }) };
  }

  let userId;
  try {
    userId = await getCallerUserId(url, anonKey, accessToken);
  } catch (e) {
    console.error("[prayer-reminder-test] auth verification failed:", e);
    return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "تعذّر التحقق من حسابك الآن." }) };
  }
  if (!userId) {
    return { statusCode: 401, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "جلستك غير صالحة، سجّل الدخول مرة أخرى." }) };
  }

  const allowlist = readAllowlist();
  if (!allowlist.includes(userId)) {
    console.error(`[prayer-reminder-test] rejected: userId ${userId} not in PRAYER_TEST_ALLOWLIST`);
    // TEMP: تشخيص مؤقت آمن لمساعدة صاحب الحساب على تصحيح PRAYER_TEST_ALLOWLIST
    // من طرفه - إزالة لاحقاً. لا يكشف أي قيمة من محتوى allowlist نفسه (قد
    // تحوي معرّفات مستخدمين آخرين لاحقاً)، فقط: هل env var مضبوط أصلاً
    // (مضبوط لكن فارغ يختلف عن غير مضبوط إطلاقاً)، عدد المعرّفات المقروءة
    // منه، ومعرّف حساب المستدعي نفسه (آمن لأنه يعرفه أصلاً - توكنه هو).
    const rawEnvPresent = typeof process.env.PRAYER_TEST_ALLOWLIST === "string";
    const rawEnvTrimmedLength = (process.env.PRAYER_TEST_ALLOWLIST || "").trim().length;
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "هذه الدالة التجريبية محصورة حالياً بمرحلة الاختبار.",
        debug: {
          allowlistEnvVarPresent: rawEnvPresent,
          allowlistEnvVarEmpty: rawEnvTrimmedLength === 0,
          allowlistParsedCount: allowlist.length,
          yourUserId: userId,
        },
      }),
    };
  }

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch { /* بلا body صالح - نستخدم الصلاة القادمة تلقائياً */ }
  const lang = body?.lang === "en" ? "en" : "ar";
  const category = body?.category === "meals" || body?.category === "water" ? body.category : "prayer";

  // بناء الرسالة ومعلومات الاستجابة حسب الفئة المطلوبة - لا فحص أهلية حقيقي
  // هنا (لا notification_log/nutrition_log/water_log) عمداً: هذه أداة اختبار
  // "هل يصل Push فعلياً لجهازي الآن؟" فقط، بمعزل تام عن منطق القرار الحقيقي
  // المُختبَر بالفعل في scheduled-prayer-reminders.js نفسها.
  let message, notificationPayload, responseExtra;
  if (category === "meals") {
    const mealType = MEAL_LABELS[body?.mealType] ? body.mealType : "breakfast";
    message = buildMessage("meals", lang, { mealLabel: MEAL_LABELS[mealType][lang] });
    notificationPayload = JSON.stringify({ title: message.title, body: message.body, url: "/nutrition" });
    responseExtra = { meal: { type: mealType } };
  } else if (category === "water") {
    message = buildMessage("water", lang, {});
    notificationPayload = JSON.stringify({ title: message.title, body: message.body, url: "/nutrition" });
    responseExtra = {};
  } else {
    // يسمح بتحديد صلاة بعينها صراحة (لاختبار فوري بلا انتظار الوقت الحقيقي)،
    // وإلا يستخدم الصلاة القادمة فعلياً الآن بتوقيت الكويت - كلا المسارين
    // يعتمدان حساب وقت حقيقي فعلي من lib/prayer-times.js، لا قيمة وهمية.
    let prayer;
    if (body?.prayerId && PRAYER_NAMES[body.prayerId]) {
      const today = todayFivePrayers();
      prayer = today.find((p) => p.id === body.prayerId);
    } else {
      prayer = nextPrayerNow();
    }
    if (!prayer) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "تعذّر تحديد الصلاة المطلوبة." }) };
    }
    const prayerName = PRAYER_NAMES[prayer.id][lang];
    message = buildMessage("prayer", lang, { prayerName });
    notificationPayload = JSON.stringify({ title: message.title, body: message.body, url: "/prayer" });
    responseExtra = { prayer: { id: prayer.id, time: prayer.time, tomorrow: !!prayer.tomorrow } };
  }

  configureVapid(vapidSubject, vapidPublicKey, vapidPrivateKey);

  let sendResult;
  try {
    sendResult = await sendPushToUserSubscriptions({ url, anonKey, accessToken, userId, notificationPayload });
  } catch (e) {
    console.error("[prayer-reminder-test] fetching/sending failed:", e);
    return { statusCode: 502, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "تعذّر إرسال الإشعار الآن." }) };
  }
  if (sendResult.error === "NO_SUBSCRIPTIONS") {
    return { statusCode: 404, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "لا يوجد اشتراك إشعارات محفوظ لحسابك بعد." }) };
  }

  return {
    statusCode: sendResult.sent ? 200 : 502,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sent: sendResult.sent,
      results: sendResult.results,
      ...responseExtra,
      error: sendResult.sent ? undefined : "تعذّر إرسال الإشعار لأي من أجهزتك المحفوظة.",
    }),
  };
};
