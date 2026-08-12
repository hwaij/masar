// Netlify Scheduled Function (كل 5 دقائق، مُجدولة عبر netlify.toml:
// [functions."scheduled-prayer-reminders"] schedule = "*/5 * * * *") -
// ترسل تذكير صلاة حقيقياً تلقائياً بلا أي تفاعل بشري، لمستخدمين حقيقيين
// مؤهَّلين فعلاً، بلا استدعاء يدوي أو allowlist اختبار (تلك تبقى في
// prayer-reminder-test.js بلا أي تعديل - أداة اختبار منفصلة ومستمرة الفائدة).
//
// جدولة Netlify الداخلية لهذا الرابط بالذات أثبتت أنها غير موثوقة على
// الأقل مؤقتاً (بلاغات عطل منصّي حديثة من Netlify نفسها) - لذا يوجد أيضاً
// .github/workflows/prayer-reminders-cron.yml كمُشغِّل بديل مستقل عبر HTTP
// عادي، بلا أي فرق في السلوك (هذه الدالة لا تميّز مصدر الاستدعاء إطلاقاً -
// الأمان الحقيقي الوحيد يبقى app_flags.prayer_reminders_live كما هو موثَّق
// أدناه، ومنع التكرار عبر notification_log يجعل استدعاءين متزامنين من
// مصدرين مختلفين لنفس المناسبة آمناً بلا إرسال مضاعف).
//
// الأمان - الأهم في هذا الملف بالكامل: محكوم كلياً بمفتاح
// app_flags.prayer_reminders_live (افتراضياً false). طالما هذا العلم
// false، الدالة تُنفَّذ (يمكن حتى استدعاؤها يدوياً عبر رابطها مباشرة، أو عبر
// الجدولة الحقيقية كل 5 دقائق) لكنها تخرج فوراً بلا قراءة أي بيانات مستخدم
// وبلا إرسال أي شيء لأي أحد. هذا هو الخط الفاصل الحقيقي الوحيد بين "منشور
// على Netlify ويعمل بجدول زمني" و"يرسل فعلياً لمستخدمين حقيقيين" - لا شيء
// آخر في هذا الملف أو في النشر نفسه يوقف الإرسال الفعلي عدا هذا العلم.
//
// يستخدم SUPABASE_SERVICE_ROLE_KEY (لا توكن مستخدم) لأنه يقرأ/يكتب عبر كل
// المستخدمين معاً دفعة واحدة، لا اشتراك مستخدم واحد كما في
// send-test-push.js/prayer-reminder-test.js - يتجاوز RLS عمداً وبأمان فقط
// لأن هذا المفتاح سري تماماً في متغيرات بيئة الخادم، لا يظهر لأي عميل مطلقاً.
const { todayFivePrayers, todayDateKeyKuwait, kuwaitNowParts } = require("./lib/prayer-times");
const { shouldSend, buildOccurrenceKey, buildMessage } = require("./lib/notification-engine");
const { configureVapid, sendToSubscriptionRow } = require("./lib/send-push");

const PRAYER_NAMES = {
  fajr: { ar: "الفجر", en: "Fajr" },
  dhuhr: { ar: "الظهر", en: "Dhuhr" },
  asr: { ar: "العصر", en: "Asr" },
  maghrib: { ar: "المغرب", en: "Maghrib" },
  isha: { ar: "العشاء", en: "Isha" },
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

// نفس نمط app_flags.free_for_all الموجود أصلاً (gemini.js) - قراءة عامة
// بمفتاح anon، بلا حاجة لـservice-role لمجرد قراءة علم عام واحد.
async function isPrayerRemindersLive(url, anonKey) {
  try {
    const res = await fetch(`${url}/rest/v1/app_flags?id=eq.global&select=prayer_reminders_live`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) return false;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    return !!row?.prayer_reminders_live;
  } catch (e) {
    console.error("[scheduled-prayer-reminders] master switch check failed:", e);
    return false;
  }
}

function serviceHeaders(serviceRoleKey) {
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// معرّفات المستخدمين UUID آمنة بلا ترميز إضافي - نفس نمط استعلامات
// PostgREST "in.()" المستخدَم في gemini.js/usda.js لقيم بسيطة مشابهة.
function inList(values) {
  return `(${values.join(",")})`;
}

// حدود "اليوم" بتوقيت الكويت مُعبَّراً عنها كطابعَي UTC - ضرورية لتصفية
// notification_log بحدود يوم كويتي صحيحة (يوم UTC مُزاح عنه 3 ساعات).
function kuwaitDayBoundsUtc() {
  const { year, month, day } = kuwaitNowParts();
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 3 * 60 * 60 * 1000);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString() };
}

exports.handler = async (event) => {
  const { url, anonKey, serviceRoleKey } = readSupabaseEnv();
  if (!url || !anonKey || !serviceRoleKey) {
    console.error("[scheduled-prayer-reminders] missing Supabase env vars (URL/anon/service-role) - skipping run.");
    return { statusCode: 200, body: "misconfigured, skipped" };
  }

  const live = await isPrayerRemindersLive(url, anonKey);
  if (!live) {
    console.log("[scheduled-prayer-reminders] app_flags.prayer_reminders_live=false - master switch off, no sends this run.");
    return { statusCode: 200, body: "master switch off" };
  }

  const vapidPublicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
  const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  const vapidSubject = (process.env.VAPID_SUBJECT || "").trim();
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error("[scheduled-prayer-reminders] missing VAPID env vars - skipping run.");
    return { statusCode: 200, body: "vapid misconfigured, skipped" };
  }
  configureVapid(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const { hours, minutes } = kuwaitNowParts();
  const nowMin = hours * 60 + minutes;
  const nowHHMM = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const todayKey = todayDateKeyKuwait();
  const prayers = todayFivePrayers();

  // صلاة "مستحقة" الآن: الوقت الحالي بتوقيت الكويت بين (وقتها - 5 دقائق)
  // ووقتها نفسه (حصري) - نافذة 5 دقائق مطابقة تماماً لتكرار الجدولة نفسها،
  // فلا فجوة ولا تداخل بين تشغيلتين متتاليتين لنفس الصلاة.
  const duePrayers = prayers.filter((p) => {
    const [ph, pm] = p.time.split(":").map(Number);
    const pMin = ph * 60 + pm;
    return nowMin >= pMin - 5 && nowMin < pMin;
  });

  if (duePrayers.length === 0) {
    console.log(`[scheduled-prayer-reminders] no prayer due right now (${nowHHMM} Kuwait).`);
    return { statusCode: 200, body: "no prayer due" };
  }

  const headers = serviceHeaders(serviceRoleKey);
  const summary = [];
  for (const prayer of duePrayers) {
    const occurrenceKey = buildOccurrenceKey(todayKey, prayer.id);
    try {
      const result = await processPrayer({ url, headers, prayer, occurrenceKey, todayKey });
      summary.push({ prayer: prayer.id, ...result });
    } catch (e) {
      console.error(`[scheduled-prayer-reminders] processing ${prayer.id} failed:`, e);
      summary.push({ prayer: prayer.id, error: String(e) });
    }
  }

  console.log("[scheduled-prayer-reminders] run summary:", JSON.stringify(summary));
  return { statusCode: 200, body: JSON.stringify(summary) };
};

async function processPrayer({ url, headers, prayer, occurrenceKey, todayKey }) {
  // 1) من أُرسل له بالفعل هذه المناسبة تحديداً - منع تكرار حقيقي حتى لو
  // تشغّلت الدالة مرتين لنفس النافذة (تداخل تشغيل، إعادة محاولة تلقائية...).
  const alreadySent = await fetchJson(
    `${url}/rest/v1/notification_log?category=eq.prayer&occurrence_key=eq.${encodeURIComponent(occurrenceKey)}&select=owner`,
    headers,
  );
  const alreadySentOwners = new Set(alreadySent.map((r) => r.owner));

  // 2) المستخدمون المؤهَّلون أساساً: فعّلوا الإشعارات فعلياً (المُتحكِّم
  // الأعلى - profile.notifications_enabled، لا علاقة لهذا بـallowlist
  // الاختبار في prayer-reminder-test.js إطلاقاً).
  const candidates = await fetchJson(`${url}/rest/v1/profile?notifications_enabled=eq.true&select=owner`, headers);
  const candidateOwners = candidates.map((r) => r.owner).filter((o) => o && o !== "solo");
  if (candidateOwners.length === 0) return { eligible: 0, sent: 0 };

  // 3) اشتراكات Push الفعلية لهؤلاء - تُستخدَم أيضاً مباشرة للإرسال (لا
  // استعلام منفصل لاحقاً لجلب نفس الصفوف مرة أخرى).
  const subscriptions = await fetchJson(
    `${url}/rest/v1/push_subscriptions?owner=in.${inList(candidateOwners)}&select=id,owner,endpoint,p256dh,auth,platform`,
    headers,
  );
  const subsByOwner = new Map();
  for (const s of subscriptions) {
    if (!subsByOwner.has(s.owner)) subsByOwner.set(s.owner, []);
    subsByOwner.get(s.owner).push(s);
  }
  const ownersWithSubs = [...subsByOwner.keys()];
  if (ownersWithSubs.length === 0) return { eligible: 0, sent: 0 };

  // 4) من صلّى هذه الصلاة بعينها اليوم بالفعل - لا داعي لتذكيره بها.
  const prayed = await fetchJson(
    `${url}/rest/v1/prayer_log?date=eq.${todayKey}&prayer_id=eq.${prayer.id}&owner=in.${inList(ownersWithSubs)}&select=owner`,
    headers,
  );
  const prayedOwners = new Set(prayed.map((r) => r.owner));

  // 5) تفضيلاتهم (حد يومي/تفعيل فئة الصلاة تحديداً) - غياب صف تفضيلات لمستخدم
  // (لم يُنشَأ له واحد بعد) يُعامَل بالقيم الافتراضية داخل shouldSend نفسها.
  const prefsRows = await fetchJson(
    `${url}/rest/v1/notification_preferences?owner=in.${inList(ownersWithSubs)}&select=owner,daily_cap,category_prayer`,
    headers,
  );
  const prefsByOwner = new Map(prefsRows.map((r) => [r.owner, r]));

  // 6) عدد إشعاراتهم اليوم (لفحص الحد اليومي) - فئة الصلاة فقط موجودة فعلياً
  // في هذه المرحلة، فهذا يكفي تماماً لحساب سقف اليوم الحقيقي حالياً.
  const { startUtc, endUtc } = kuwaitDayBoundsUtc();
  const todayLog = await fetchJson(
    `${url}/rest/v1/notification_log?owner=in.${inList(ownersWithSubs)}&sent_at=gte.${encodeURIComponent(startUtc)}&sent_at=lt.${encodeURIComponent(endUtc)}&select=owner`,
    headers,
  );
  const sentTodayCountByOwner = new Map();
  for (const row of todayLog) sentTodayCountByOwner.set(row.owner, (sentTodayCountByOwner.get(row.owner) || 0) + 1);

  // القرار: نفس محرك القرار المركزي من Phase 1، بلا أي منطق قرار مواز -
  // منع التكرار (5)، الحد اليومي (6)، تفعيل الفئة (5)، واستثناء الصلاة من
  // Quiet Hours (مُطبَّق داخل shouldSend نفسها، لا حاجة لتمرير وقت حقيقي هنا).
  const eligibleOwners = ownersWithSubs.filter((owner) => {
    if (prayedOwners.has(owner)) return false;
    const prefs = prefsByOwner.get(owner);
    const decision = shouldSend({
      category: "prayer",
      preferences: prefs
        ? { dailyCap: prefs.daily_cap, categoryEnabled: { prayer: prefs.category_prayer } }
        : { dailyCap: 8, categoryEnabled: { prayer: true } },
      nowHHMM: "12:00", // غير مؤثِّر فعلياً - الصلاة مُستثناة من Quiet Hours دوماً
      sentTodayCount: sentTodayCountByOwner.get(owner) || 0,
      alreadySentThisOccurrence: alreadySentOwners.has(owner),
    });
    return decision.send;
  });

  if (eligibleOwners.length === 0) return { eligible: 0, sent: 0 };

  // إرسال متوازٍ لكل (مستخدم × جهاز) معاً - لا تسلسل. اللغة عربية افتراضياً
  // (لا عمود لغة يُقرأ خادمياً بسهولة بعد في هذه النسخة الأولى من الجدولة؛
  // يمكن ربطها بـprofile.language لاحقاً بلا تغيير في هذا المسار).
  const message = buildMessage("prayer", "ar", { prayerName: PRAYER_NAMES[prayer.id].ar });
  const notificationPayload = JSON.stringify({ title: message.title, body: message.body, url: "/prayer" });

  const results = await Promise.all(
    eligibleOwners.map(async (owner) => {
      const ownerSubs = subsByOwner.get(owner) || [];
      const sendResults = await Promise.all(
        ownerSubs.map((sub) => sendToSubscriptionRow({ url, headers, sub, notificationPayload })),
      );
      const anySent = sendResults.some((r) => r.ok);
      if (anySent) {
        // resolution=ignore-duplicates: حماية إضافية فوق القيد الفريد نفسه -
        // لو حاول تشغيل متزامن آخر تسجيل نفس الصف بالضبط، يُتجاهَل بصمت بدل
        // أن يرمي خطأ 409 غير معالَج.
        await fetch(`${url}/rest/v1/notification_log`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal,resolution=ignore-duplicates" },
          body: JSON.stringify({ owner, category: "prayer", occurrence_key: occurrenceKey, lang: "ar" }),
        }).catch((e) => console.error("[scheduled-prayer-reminders] notification_log insert failed:", e));
      }
      return { owner, sent: anySent };
    }),
  );

  return { eligible: eligibleOwners.length, sent: results.filter((r) => r.sent).length };
}
