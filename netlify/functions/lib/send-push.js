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
};
