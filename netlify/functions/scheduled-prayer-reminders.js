// Netlify Scheduled Function (كل 5 دقائق، مُجدولة عبر netlify.toml:
// [functions."scheduled-prayer-reminders"] schedule = "*/5 * * * *") -
// ترسل تذكيرات حقيقية تلقائياً بلا أي تفاعل بشري (صلاة/وجبات/ماء)،
// لمستخدمين حقيقيين مؤهَّلين فعلاً، بلا استدعاء يدوي أو allowlist اختبار
// (تلك تبقى في prayer-reminder-test.js بلا أي تعديل - أداة اختبار منفصلة
// ومستمرة الفائدة). الاسم "scheduled-prayer-reminders" تاريخي من Phase 3
// الأولى (صلاة فقط) - أُبقي عليه عمداً بلا إعادة تسمية لتفادي أي احتمال
// كسر لجدولة Netlify/GitHub Actions القائمة فعلياً على هذا المسار بالذات.
//
// جدولة Netlify الداخلية لهذا الرابط بالذات أثبتت أنها غير موثوقة على
// الأقل مؤقتاً (بلاغات عطل منصّي حديثة من Netlify نفسها) - لذا يوجد أيضاً
// .github/workflows/prayer-reminders-cron.yml كمُشغِّل بديل مستقل عبر HTTP
// عادي، بلا أي فرق في السلوك (هذه الدالة لا تميّز مصدر الاستدعاء إطلاقاً -
// الأمان الحقيقي الوحيد يبقى app_flags.prayer_reminders_live كما هو موثَّق
// أدناه، ومنع التكرار عبر notification_log يجعل استدعاءين متزامنين من
// مصدرين مختلفين لنفس المناسبة آمناً بلا إرسال مضاعف). GitHub Actions نفسه
// أثبت أيضاً أنه قد يُسقط أغلب التشغيلات المجدولة تحت الحمل العام (لاحظنا
// تشغيلتين فعليتين فقط خلال ساعتين رغم جدولة كل 5 دقائق) - لذا كل نافذة
// "مستحقة الآن" أدناه (صلاة/وجبة/ماء) واسعة عمداً حول وقتها المستهدف، لا
// نافذة ضيقة تنغلق فور تجاوز الوقت المثالي.
//
// الأمان - الأهم في هذا الملف بالكامل: محكوم كلياً بمفتاح
// app_flags.prayer_reminders_live (افتراضياً false). طالما هذا العلم
// false، الدالة تُنفَّذ (يمكن حتى استدعاؤها يدوياً عبر رابطها مباشرة، أو عبر
// الجدولة الحقيقية كل 5 دقائق) لكنها تخرج فوراً بلا قراءة أي بيانات مستخدم
// وبلا إرسال أي شيء لأي أحد. هذا هو الخط الفاصل الحقيقي الوحيد بين "منشور
// على Netlify ويعمل بجدول زمني" و"يرسل فعلياً لمستخدمين حقيقيين" - لا شيء
// آخر في هذا الملف أو في النشر نفسه يوقف الإرسال الفعلي عدا هذا العلم. هذا
// العلم يحكم كل الفئات معاً (صلاة/وجبات/ماء) - لا مفتاح منفصل لكل فئة بعد.
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

const MEAL_LABELS = {
  breakfast: { ar: "الفطور", en: "Breakfast" },
  lunch: { ar: "الغداء", en: "Lunch" },
  dinner: { ar: "العشاء", en: "Dinner" },
};

// أوقات تقديرية عامة معقولة (لا معيار طبي، لا حاجة لدقة فلكية كالصلاة) -
// قابلة للتعديل لاحقاً بلا أي تغيير بنيوي. نافذة ±15 دقيقة أوسع عمداً من
// نافذة الصلاة (±10) - نفس درس تأخير GitHub Actions cron ينطبق هنا بنفس
// القوة، ولا حساسية زمنية دقيقة لوجبة/كوب ماء كما للصلاة، فلا مانع من هامش
// أكبر. الشرط الحقيقي للإرسال ليس الوقت وحده بل عدم وجود تسجيل فعلي بعد
// (nutrition_log/water_log) - الوقت هنا مجرد نافذة إتاحة، لا وعد صارم.
const REMINDER_WINDOW_HALF_MIN = 15;
const PRAYER_WINDOW_HALF_MIN = 10;
const MEAL_ANCHORS_MIN = { breakfast: 8 * 60, lunch: 13 * 60, dinner: 19 * 60 };
// تذكيرا ماء يوميان مستقلان (occurrence_key مختلف لكل منهما) - لا تذكير كل
// ساعة؛ كل منهما يُرسَل فقط إن لم يُسجَّل أي كوب ماء بعد اليوم (checked في
// processWater)، فلو سجّل المستخدم كوباً بين الاثنين، الثاني لا يُرسَل أصلاً.
const WATER_ANCHORS_MIN = { water_midday: 12 * 60 + 30, water_afternoon: 16 * 60 + 30 };

function isDueNow(nowMin, anchorMin, halfWidth) {
  return nowMin >= anchorMin - halfWidth && nowMin < anchorMin + halfWidth;
}

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

  // صلاة "مستحقة" الآن: نافذة ±10 دقائق حول وقتها. السبب: المُشغِّل الحقيقي
  // هو GitHub Actions cron كل 5 دقائق، وهو موثَّق رسمياً بتأخير شائع 5-30
  // دقيقة تحت الحمل العام على المنصة - راقبنا هذا فعلياً: صلاة المغرب فاتت
  // بالكامل يوماً لأن أقرب تشغيلتين فعليتين وقعتا بعيداً جداً قبل وبعد
  // النافذة القديمة الضيقة (5 دقائق قبل فقط). notification_log (occurrence_key
  // = تاريخ+معرّف الصلاة، لا وقت) يمنع أي تكرار بغض النظر عن كم تشغيلة وقعت
  // فعلياً ضمن النافذة الموسَّعة.
  const duePrayers = prayers.filter((p) => {
    const [ph, pm] = p.time.split(":").map(Number);
    return isDueNow(nowMin, ph * 60 + pm, PRAYER_WINDOW_HALF_MIN);
  });
  const dueMeals = Object.keys(MEAL_ANCHORS_MIN).filter((mealType) =>
    isDueNow(nowMin, MEAL_ANCHORS_MIN[mealType], REMINDER_WINDOW_HALF_MIN),
  );
  const dueWaterKeys = Object.keys(WATER_ANCHORS_MIN).filter((key) =>
    isDueNow(nowMin, WATER_ANCHORS_MIN[key], REMINDER_WINDOW_HALF_MIN),
  );

  if (duePrayers.length === 0 && dueMeals.length === 0 && dueWaterKeys.length === 0) {
    console.log(`[scheduled-prayer-reminders] nothing due right now (${nowHHMM} Kuwait).`);
    return { statusCode: 200, body: "nothing due" };
  }

  const headers = serviceHeaders(serviceRoleKey);
  const summary = [];

  for (const prayer of duePrayers) {
    const occurrenceKey = buildOccurrenceKey(todayKey, prayer.id);
    try {
      const result = await processPrayer({ url, headers, prayer, occurrenceKey, todayKey, nowHHMM });
      summary.push({ type: "prayer", id: prayer.id, ...result });
    } catch (e) {
      console.error(`[scheduled-prayer-reminders] processing prayer ${prayer.id} failed:`, e);
      summary.push({ type: "prayer", id: prayer.id, error: String(e) });
    }
  }
  for (const mealType of dueMeals) {
    const occurrenceKey = buildOccurrenceKey(todayKey, mealType);
    try {
      const result = await processMeal({ url, headers, mealType, occurrenceKey, todayKey, nowHHMM });
      summary.push({ type: "meal", id: mealType, ...result });
    } catch (e) {
      console.error(`[scheduled-prayer-reminders] processing meal ${mealType} failed:`, e);
      summary.push({ type: "meal", id: mealType, error: String(e) });
    }
  }
  for (const waterKey of dueWaterKeys) {
    const occurrenceKey = buildOccurrenceKey(todayKey, waterKey);
    try {
      const result = await processWater({ url, headers, occurrenceKey, todayKey, nowHHMM });
      summary.push({ type: "water", id: waterKey, ...result });
    } catch (e) {
      console.error(`[scheduled-prayer-reminders] processing water ${waterKey} failed:`, e);
      summary.push({ type: "water", id: waterKey, error: String(e) });
    }
  }

  console.log("[scheduled-prayer-reminders] run summary:", JSON.stringify(summary));
  return { statusCode: 200, body: JSON.stringify(summary) };
};

// جوهر مشترك بين كل الفئات (صلاة/وجبات/ماء): يبني قائمة المؤهَّلين فعلياً
// عبر نفس الخطوات (منع تكرار، تفعيل عام، اشتراك Push فعّال، تفضيلات
// المستخدم عبر shouldSend مركزياً)، ثم يرسل ويسجّل. الفرق الوحيد بين الفئات
// هو "من أنجز الفعل بالفعل" (fulfilledOwners) الذي تجلبه كل دالة غلاف
// (processPrayer/processMeal/processWater) من مصدر بياناتها الخاص
// (prayer_log/nutrition_log/water_log) قبل استدعاء هذه - غير مُصفّاة مسبقاً
// بمن يملك اشتراك Push فعلي (تُصفّى هنا لاحقاً عبر fulfilledOwners.has)،
// تبسيطاً مقبولاً بحجم المستخدمين الحالي لهذا التطبيق.
async function processReminder({ url, headers, category, occurrenceKey, nowHHMM, fulfilledOwners, message, linkPath }) {
  // 1) من أُرسل له بالفعل هذه المناسبة تحديداً - منع تكرار حقيقي حتى لو
  // تشغّلت الدالة مرتين لنفس النافذة (تداخل تشغيل، إعادة محاولة تلقائية...).
  const alreadySent = await fetchJson(
    `${url}/rest/v1/notification_log?category=eq.${category}&occurrence_key=eq.${encodeURIComponent(occurrenceKey)}&select=owner`,
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

  // 4) تفضيلاتهم (حد يومي/Quiet Hours/تفعيل كل الفئات معاً - عمود واحد لكل
  // فئة، تُقرأ كلها دفعة واحدة بصرف النظر عن الفئة الحالية، فتُستخدَم نفس
  // الاستعلامات لكل الفئات بلا تفرّع). غياب صف تفضيلات لمستخدم (لم يُنشَأ له
  // واحد بعد) يُعامَل بالقيم الافتراضية أدناه (مطابقة لقيم العمود الافتراضية
  // في المخطط).
  const prefsRows = await fetchJson(
    `${url}/rest/v1/notification_preferences?owner=in.${inList(ownersWithSubs)}&select=owner,daily_cap,quiet_hours_start,quiet_hours_end,category_prayer,category_water,category_meals`,
    headers,
  );
  const prefsByOwner = new Map(prefsRows.map((r) => [r.owner, r]));

  // 5) عدد إشعاراتهم اليوم (كل الفئات معاً) لفحص الحد اليومي.
  const { startUtc, endUtc } = kuwaitDayBoundsUtc();
  const todayLog = await fetchJson(
    `${url}/rest/v1/notification_log?owner=in.${inList(ownersWithSubs)}&sent_at=gte.${encodeURIComponent(startUtc)}&sent_at=lt.${encodeURIComponent(endUtc)}&select=owner`,
    headers,
  );
  const sentTodayCountByOwner = new Map();
  for (const row of todayLog) sentTodayCountByOwner.set(row.owner, (sentTodayCountByOwner.get(row.owner) || 0) + 1);

  // القرار: نفس محرك القرار المركزي من Phase 1، بلا أي منطق قرار مواز - منع
  // التكرار، الحد اليومي، تفعيل الفئة، وQuiet Hours (الصلاة وحدها مُستثناة
  // منها داخل shouldSend نفسها؛ الوجبات والماء تحترمانها بصرامة عبر nowHHMM
  // الحقيقي الممرَّر هنا، بخلاف الصلاة التي كانت تمرّر قيمة وهمية سابقاً).
  const categoryPrefKey = `category_${category}`;
  const eligibleOwners = ownersWithSubs.filter((owner) => {
    if (fulfilledOwners.has(owner)) return false;
    const prefs = prefsByOwner.get(owner);
    const decision = shouldSend({
      category,
      preferences: prefs
        ? {
            dailyCap: prefs.daily_cap,
            quietHoursStart: prefs.quiet_hours_start,
            quietHoursEnd: prefs.quiet_hours_end,
            categoryEnabled: { [category]: prefs[categoryPrefKey] },
          }
        : { dailyCap: 8, quietHoursStart: "22:00", quietHoursEnd: "06:00", categoryEnabled: { [category]: true } },
      nowHHMM,
      sentTodayCount: sentTodayCountByOwner.get(owner) || 0,
      alreadySentThisOccurrence: alreadySentOwners.has(owner),
    });
    return decision.send;
  });

  if (eligibleOwners.length === 0) return { eligible: 0, sent: 0 };

  // إرسال متوازٍ لكل (مستخدم × جهاز) معاً - لا تسلسل. اللغة عربية افتراضياً
  // (لا عمود لغة يُقرأ خادمياً بسهولة بعد؛ يمكن ربطها بـprofile.language
  // لاحقاً بلا تغيير في هذا المسار).
  const notificationPayload = JSON.stringify({ title: message.title, body: message.body, url: linkPath });

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
          body: JSON.stringify({ owner, category, occurrence_key: occurrenceKey, lang: "ar" }),
        }).catch((e) => console.error(`[scheduled-prayer-reminders] notification_log insert failed (${category}):`, e));
      }
      return { owner, sent: anySent };
    }),
  );

  return { eligible: eligibleOwners.length, sent: results.filter((r) => r.sent).length };
}

async function processPrayer({ url, headers, prayer, occurrenceKey, todayKey, nowHHMM }) {
  // من صلّى هذه الصلاة بعينها اليوم بالفعل - لا داعي لتذكيره بها.
  const prayed = await fetchJson(
    `${url}/rest/v1/prayer_log?date=eq.${todayKey}&prayer_id=eq.${prayer.id}&select=owner`,
    headers,
  );
  const message = buildMessage("prayer", "ar", { prayerName: PRAYER_NAMES[prayer.id].ar });
  return processReminder({
    url,
    headers,
    category: "prayer",
    occurrenceKey,
    nowHHMM,
    fulfilledOwners: new Set(prayed.map((r) => r.owner)),
    message,
    linkPath: "/prayer",
  });
}

async function processMeal({ url, headers, mealType, occurrenceKey, nowHHMM }) {
  // من سجّل هذه الوجبة بعينها اليوم بالفعل في nutrition_log (أي مصدر: باركود/
  // بحث/يدوي/تصوير/ملصق) - لا داعي لتذكيره بها. نستخدم created_at (طابع زمني
  // حقيقي) بدل عمود date النصي عمداً: date يُكتَب من العميل بتاريخ UTC للحظة
  // الحفظ (src/lib/helpers.js: todayKey()، لا بتاريخ الكويت المحلي)، فقد
  // يتخلّف يوماً كاملاً عن يوم الكويت الحقيقي بين منتصف الليل الكويتي
  // والساعة 03:00 (نافذة تشمل وقت سحور رمضان الحقيقي) - لو اعتمدنا date هنا
  // فقد نرسل تذكيراً خاطئاً لمن سجّل وجبته بالفعل في تلك النافذة تحديداً.
  // created_at بلا هذا الالتباس؛ مقارنته بحدود يوم الكويت الحقيقية
  // (kuwaitDayBoundsUtc، نفس المستخدَمة لسقف الإشعارات اليومي) صحيحة دوماً.
  const { startUtc: mealStartUtc, endUtc: mealEndUtc } = kuwaitDayBoundsUtc();
  const logged = await fetchJson(
    `${url}/rest/v1/nutrition_log?meal_type=eq.${mealType}&created_at=gte.${encodeURIComponent(mealStartUtc)}&created_at=lt.${encodeURIComponent(mealEndUtc)}&select=owner`,
    headers,
  );
  const message = buildMessage("meals", "ar", { mealLabel: MEAL_LABELS[mealType].ar });
  return processReminder({
    url,
    headers,
    category: "meals",
    occurrenceKey,
    nowHHMM,
    fulfilledOwners: new Set(logged.map((r) => r.owner)),
    message,
    linkPath: "/nutrition",
  });
}

async function processWater({ url, headers, occurrenceKey, todayKey, nowHHMM }) {
  // من سجّل كوب ماء واحداً على الأقل اليوم بالفعل (water_log صف واحد لكل
  // (owner, date) - cups_count>0 يكفي، بصرف النظر عن العدد الدقيق). بخلاف
  // nutrition_log، هذا الجدول لا يملك created_at (صف واحد يُحدَّث بمكانه، لا
  // سجل أحداث)، وdate هو المفتاح الأساسي نفسه (لا بديل عنه للاستعلام) - يبقى
  // معرَّضاً نظرياً لنفس التباس UTC/الكويت بين منتصف الليل والساعة 03:00
  // الموصوف أعلاه (قد يُرسَل تذكير ماء خاطئ لمن سجّل كوباً في تلك النافذة
  // تحديداً) بلا حل نظيف بلا تغيير بنيوي في طريقة كتابة الجدول نفسها - أثر
  // عملي محدود (تذكير زائد لا معلومة خاطئة)، تُرك كما هو عمداً بدل تعقيد غير
  // مضمون النتيجة.
  const logged = await fetchJson(
    `${url}/rest/v1/water_log?date=eq.${todayKey}&cups_count=gt.0&select=owner`,
    headers,
  );
  const message = buildMessage("water", "ar", {});
  return processReminder({
    url,
    headers,
    category: "water",
    occurrenceKey,
    nowHHMM,
    fulfilledOwners: new Set(logged.map((r) => r.owner)),
    message,
    linkPath: "/nutrition",
  });
}
