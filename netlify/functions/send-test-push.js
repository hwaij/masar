// Netlify Function: sends one real Web Push test notification to the
// signed-in caller's own saved subscription(s) (push_subscriptions),
// using the server-only VAPID private key (never exposed to any client).
//
// Ownership is enforced the same way gemini.js enforces subscription
// gating: every Supabase read/write below is done with the CALLER'S OWN
// access token (never a service-role key), so Postgres RLS itself is what
// stops a caller from ever touching another user's subscriptions - there
// is no separate "trust me, I checked owner" logic to get wrong here.
//
// Expired/invalid subscriptions (push service replies 404/410) are
// deleted immediately, since a dead subscription can never receive
// anything future notifications would send to it either.
const webpush = require("web-push");

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
  }).catch((e) => console.error("[send-test-push] mark result failed:", e));
}

async function deleteSubscription(url, anonKey, accessToken, id) {
  await fetch(`${url}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}`, apikey: anonKey, Prefer: "return=minimal" },
  }).catch((e) => console.error("[send-test-push] delete expired subscription failed:", e));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const vapidPublicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
  const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  const vapidSubject = (process.env.VAPID_SUBJECT || "").trim();
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error("[send-test-push] missing VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT env vars");
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "الخدمة غير مهيأة على الخادم." }),
    };
  }

  const { url, anonKey } = readSupabaseEnv();
  if (!url || !anonKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "الخدمة غير مهيأة على الخادم." }),
    };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "سجّل الدخول أولاً." }),
    };
  }

  let userId;
  try {
    userId = await getCallerUserId(url, anonKey, accessToken);
  } catch (e) {
    console.error("[send-test-push] auth verification failed:", e);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "تعذّر التحقق من حسابك الآن، حاول مرة أخرى." }),
    };
  }
  if (!userId) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "جلستك غير صالحة، سجّل الدخول مرة أخرى." }),
    };
  }

  let lang = "ar";
  try {
    const payload = JSON.parse(event.body || "{}");
    if (payload?.lang === "en") lang = "en";
  } catch {
    // body اختياري هنا - نص إشعار افتراضي إن لم يُرسَل أي شيء صالح.
  }
  const notificationPayload = JSON.stringify(
    lang === "en"
      ? { title: "🎉 Notifications are working!", body: "You'll get Masar reminders here.", url: "/settings" }
      : { title: "🎉 الإشعارات تعمل!", body: "ستصلك تذكيرات مسار من هنا.", url: "/settings" },
  );

  let subscriptions;
  try {
    subscriptions = await fetchOwnSubscriptions(url, anonKey, accessToken, userId);
  } catch (e) {
    console.error("[send-test-push] fetching subscriptions failed:", e);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "تعذّر قراءة اشتراكات الإشعارات الآن." }),
    };
  }
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "لا يوجد اشتراك إشعارات محفوظ لحسابك بعد." }),
    };
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const results = await Promise.all(
    subscriptions.map(async (row) => {
      const pushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
        await markSubscriptionResult(url, anonKey, accessToken, row.id, true);
        return { platform: row.platform || null, ok: true };
      } catch (e) {
        const statusCode = e?.statusCode;
        console.error(`[send-test-push] send failed (HTTP ${statusCode || "?"}):`, e?.body || e?.message || e);
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscription(url, anonKey, accessToken, row.id);
          return { platform: row.platform || null, ok: false, expired: true };
        }
        await markSubscriptionResult(url, anonKey, accessToken, row.id, false);
        return { platform: row.platform || null, ok: false, statusCode: statusCode || null };
      }
    }),
  );

  const anySent = results.some((r) => r.ok);
  return {
    statusCode: anySent ? 200 : 502,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sent: anySent,
      results,
      error: anySent ? undefined : "تعذّر إرسال الإشعار لأي من أجهزتك المحفوظة.",
    }),
  };
};
