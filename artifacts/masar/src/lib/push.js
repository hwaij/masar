// البنية التحتية لطلب إذن الإشعارات وتسجيل اشتراك Web Push — هذا الملف
// لا يبني أي نظام إرسال فعلي (لا يوجد خادم يرسل بعد)؛ فقط يطلب الإذن
// ويُنشئ اشتراك push حقيقياً عبر service worker، تمهيداً لمرحلة لاحقة.
//
// المفتاح العام هنا آمن للنشر في كود العميل (هذا بالضبط الغرض منه في
// معيار VAPID) — المفتاح الخاص المقابل لا يظهر هنا إطلاقاً ولن يُستخدم
// حتى بناء خادم الإرسال الفعلي لاحقاً.
const VAPID_PUBLIC_KEY = "BKryNl1wfzmE9NPLvPEr-lxAIk-yxwQZqOqEZ6qjxSxX1oz34QNwN-fDWC9k5usK8dyblCoisRNEXXmA-wRKE3o";

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
}

// يطلب إذن الإشعارات من المستخدم، ثم يسجّل اشتراك push فعلياً عند الموافقة.
// يُرجع { granted, subscribed, error } — أبداً لا يرمي استثناءً، حتى يبقى
// الاستخدام في الواجهة بسيطاً (استدعاء واحد + تحقّق من الحقول).
export async function requestNotificationPermission() {
  if (!pushSupported()) {
    return { granted: false, subscribed: false, error: "الإشعارات غير مدعومة على هذا المتصفح." };
  }
  let permission;
  try {
    permission = await Notification.requestPermission();
  } catch (e) {
    console.error("[push] permission request failed:", e);
    return { granted: false, subscribed: false, error: "تعذّر طلب إذن الإشعارات الآن." };
  }
  if (permission !== "granted") {
    return { granted: false, subscribed: false };
  }
  try {
    await subscribeToPush();
    return { granted: true, subscribed: true };
  } catch (e) {
    console.error("[push] subscribe failed:", e);
    return { granted: true, subscribed: false, error: "فُعِّل الإذن لكن تعذّر تفعيل الإشعارات بالكامل الآن. حاول مرة أخرى لاحقاً." };
  }
}

// يُلغي اشتراك الـpush الحالي (لا يمكن سحب إذن المتصفح نفسه برمجياً —
// ذلك متاح للمستخدم فقط من إعدادات نظامه/متصفحه).
export async function disablePush() {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
  } catch (e) {
    console.error("[push] unsubscribe failed:", e);
  }
}
