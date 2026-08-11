// مساعد مشترك لإرسال Web Push حقيقي لكل اشتراكات مستخدم واحد - نفس نمط
// القراءة/الكتابة (بتوكن المستخدم نفسه دائماً، RLS هي الحارس، لا service-role
// هنا) وتنظيف الاشتراكات المنتهية (404/410) المستخدَم أصلاً في
// send-test-push.js (Phase C) - استُخرج هنا كملف جديد منفصل حتى يُعاد
// استخدامه من دوال جديدة (مثل اختبار تذكير الصلاة اليدوي، Phase 2) بلا
// المساس بـsend-test-push.js نفسه إطلاقاً، الذي لم يُؤكَّد استلامه فعلياً
// على جهاز حقيقي بعد.
const webpush = require("web-push");

async function fetchOwnSubscriptions(url, anonKey, accessToken, userId) {
  const res = await fetch(
    `${url}/rest/v1/push_subscriptions?owner=eq.${encodeURIComponent(userId)}&select=id,endpoint,p256dh,auth,platform`,
    { headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey } },
  );
  if (!res.ok) throw new Error(`fetch subscriptions failed: HTTP ${res.status}`);
  return res.json();
}

async function markSubscriptionResult(url, anonKey, accessToken, id, ok) {
  const field = ok ? "last_success_at" : "last_error_at";
  await fetch(`${url}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ [field]: new Date().toISOString() }),
  }).catch((e) => console.error("[send-push] mark result failed:", e));
}

async function deleteSubscription(url, anonKey, accessToken, id) {
  await fetch(`${url}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey, Prefer: "return=minimal" },
  }).catch((e) => console.error("[send-push] delete expired subscription failed:", e));
}

// يهيّئ VAPID مرة واحدة قبل أي إرسال - يجب استدعاؤها من الدالة المستدعية
// بعد قراءة env vars الخاصة بها (لا تُقرأ env vars هنا مباشرة، حتى يبقى
// هذا الملف عاماً بلا افتراضات عن اسم المتغيرات).
function configureVapid(subject, publicKey, privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

// يرسل حمولة واحدة (JSON.stringify مسبقاً) لكل اشتراكات مستخدم واحد
// (بتوكنه هو)، يحدّث last_success_at/last_error_at لكل اشتراك، يحذف أي
// اشتراك يرد عليه بـ404/410 (منتهي/غير صالح). لا يفترض شيئاً عن الفئة أو
// المحتوى - الحمولة والقرار جاهزان مسبقاً من طبقة الاستدعاء.
async function sendPushToUserSubscriptions({ url, anonKey, accessToken, userId, notificationPayload }) {
  const subscriptions = await fetchOwnSubscriptions(url, anonKey, accessToken, userId);
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return { sent: false, results: [], error: "NO_SUBSCRIPTIONS" };
  }

  const results = await Promise.all(
    subscriptions.map(async (row) => {
      const pushSubscription = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
        await markSubscriptionResult(url, anonKey, accessToken, row.id, true);
        return { platform: row.platform || null, ok: true };
      } catch (e) {
        const statusCode = e?.statusCode;
        console.error(`[send-push] send failed (HTTP ${statusCode || "?"}):`, e?.body || e?.message || e);
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscription(url, anonKey, accessToken, row.id);
          return { platform: row.platform || null, ok: false, expired: true };
        }
        await markSubscriptionResult(url, anonKey, accessToken, row.id, false);
        return { platform: row.platform || null, ok: false, statusCode: statusCode || null };
      }
    }),
  );

  return { sent: results.some((r) => r.ok), results };
}

module.exports = {
  fetchOwnSubscriptions,
  markSubscriptionResult,
  deleteSubscription,
  configureVapid,
  sendPushToUserSubscriptions,
  sendToSubscriptionRow,
  patchSubscriptionRow,
  deleteSubscriptionRow,
};

// ============================================================
// النسخة العامة أدناه (Phase 3) - لا تفترض شكل مصادقة معيّن (توكن مستخدم
// واحد أو service-role عبر كل المستخدمين معاً) ولا تجلب الاشتراكات هي
// نفسها (تصلها جاهزة من طبقة الاستدعاء، التي قد تحتاج استعلامات متعددة
// المستخدمين لا يمكن التعبير عنها بدالة "اشتراكاتي أنا" أعلاه). إضافة
// خالصة بلا أي تعديل على الدوال الموجودة أعلاه (سلوكها byte-identical،
// لا خطر على send-test-push.js/prayer-reminder-test.js الحاليين).
async function patchSubscriptionRow(url, headers, id, fields) {
  await fetch(`${url}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(fields),
  }).catch((e) => console.error("[send-push] mark result (generic) failed:", e));
}

async function deleteSubscriptionRow(url, headers, id) {
  await fetch(`${url}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...headers, Prefer: "return=minimal" },
  }).catch((e) => console.error("[send-push] delete expired subscription (generic) failed:", e));
}

// يرسل لصف اشتراك خام واحد (مُجهَّز مسبقاً من طبقة الاستدعاء) - يُحدّث/يحذف
// صفّه في push_subscriptions عبر ترويسات مصادقة عامة (headers جاهزة، مهما
// كان مصدرها). يُستخدَم من الدوال المجدولة (تعمل بصلاحية service_role عبر
// مستخدمين متعددين معاً، لا سياق "مستخدم واحد" كالدوال أعلاه).
async function sendToSubscriptionRow({ url, headers, sub, notificationPayload }) {
  const pushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
  try {
    await webpush.sendNotification(pushSubscription, notificationPayload);
    await patchSubscriptionRow(url, headers, sub.id, { last_success_at: new Date().toISOString() });
    return { ok: true, platform: sub.platform || null };
  } catch (e) {
    const statusCode = e?.statusCode;
    console.error(`[send-push] send failed (HTTP ${statusCode || "?"}):`, e?.body || e?.message || e);
    if (statusCode === 404 || statusCode === 410) {
      await deleteSubscriptionRow(url, headers, sub.id);
      return { ok: false, expired: true, platform: sub.platform || null };
    }
    await patchSubscriptionRow(url, headers, sub.id, { last_error_at: new Date().toISOString() });
    return { ok: false, statusCode: statusCode || null, platform: sub.platform || null };
  }
}

