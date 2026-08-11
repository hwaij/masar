// البنية التحتية لطلب إذن الإشعارات وتسجيل اشتراك Web Push، وحفظه فعلياً
// في Supabase (push_subscriptions) حتى يصبح قابلاً للاستخدام لاحقاً من
// خادم إرسال حقيقي (Netlify Function، مرحلة لاحقة) - قبل هذا التعديل كان
// الاشتراك يُنشأ في المتصفح ثم يُهمَل فوراً بلا أي حفظ، فلا يوجد أي طريقة
// لإرسال Push له لاحقاً مهما نجحت خطوات الإذن/الاشتراك ظاهرياً.
//
// المفتاح العام هنا آمن للنشر في كود العميل (هذا بالضبط الغرض منه في
// معيار VAPID) — المفتاح الخاص المقابل لا يظهر هنا إطلاقاً ولن يُستخدم
// حتى بناء خادم الإرسال الفعلي لاحقاً.
import { store } from "./store";

// مفتاح VAPID عام جديد (Phase C) - المفتاح القديم استُبدل لأنه تعذّر
// إثبات وجود مفتاح خاص مطابق له في أي مكان (لا وصول للوحة تحكم Netlify من
// هذه البيئة)، فتوليد زوج جديد بالكامل كان الخيار الآمن الوحيد بدل
// الافتراض. أي اشتراك قديم محفوظ بالمفتاح القديم يصبح عديم الفائدة تلقائياً
// (لن يطابق مفتاح الخادم الجديد) - لا ضرر عملياً لأنه لم يكن هناك من الأصل
// أي خادم إرسال حقيقي يستخدمه.
const VAPID_PUBLIC_KEY = "BCQay02YhmBDLTfkyjeyH46OhvkhUDXXOvmCBUq5PBx0vSet9aest5n-ITUWOtUOMquzQNutOHTWskWYiLk5bCQ";

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

// يطلب إذن الإشعارات من المستخدم، يُنشئ اشتراك push حقيقياً عند الموافقة،
// ثم يحفظه فعلياً في Supabase قبل اعتبار العملية ناجحة - "نجاح" هذه الدالة
// (subscribed:true, saved:true, بلا error) هو الشرط الوحيد الذي يجوز معه
// إظهار "الإشعارات مفعّلة" للمستخدم؛ أي حالة أخرى (حتى لو مُنح الإذن
// ونجح الاشتراك محلياً) تعني أن Push الحقيقي لن يصله أبداً لاحقاً.
//
// يُرجع { granted, subscribed, saved, error } — أبداً لا يرمي استثناءً.
// `error`، إن وُجد، رمز ثابت (code) لا نص عربي جاهز، يُترجَم في React عبر
// t(`common.errors.${error}`):
//   - PUSH_NOT_SUPPORTED: المتصفح لا يدعم Web Push إطلاقاً (يشمل حالة
//     Safari iOS بلا تثبيت على الشاشة الرئيسية - PushManager غير موجود).
//   - PUSH_REQUEST_FAILED: فشل طلب إذن الإشعارات نفسه (قبل الموافقة/الرفض).
//   - PUSH_PARTIAL_FAILURE: مُنح الإذن لكن فشل إنشاء اشتراك الـpush نفسه.
//   - PUSH_NOT_SIGNED_IN: الاشتراك نجح لكن المستخدم ضيف محلي (owner='solo')
//     بلا حساب حقيقي - لا هوية خادم لحفظ الاشتراك لها، فلا فائدة منه.
//   - PUSH_SAVE_FAILED: الاشتراك نجح لكن حفظه في Supabase فشل (شبكة/خادم).
export async function requestNotificationPermission() {
  if (!pushSupported()) {
    return { granted: false, subscribed: false, saved: false, error: "PUSH_NOT_SUPPORTED" };
  }
  let permission;
  try {
    permission = await Notification.requestPermission();
  } catch (e) {
    console.error("[push] permission request failed:", e);
    return { granted: false, subscribed: false, saved: false, error: "PUSH_REQUEST_FAILED" };
  }
  if (permission !== "granted") {
    return { granted: false, subscribed: false, saved: false };
  }
  let subscription;
  try {
    subscription = await subscribeToPush();
  } catch (e) {
    console.error("[push] subscribe failed:", e);
    return { granted: true, subscribed: false, saved: false, error: "PUSH_PARTIAL_FAILURE" };
  }
  const saveRes = await store.savePushSubscription(subscription);
  if (!saveRes.ok) {
    console.error("[push] save subscription failed:", saveRes.error);
    return { granted: true, subscribed: true, saved: false, error: saveRes.error === "NOT_SIGNED_IN" ? "PUSH_NOT_SIGNED_IN" : "PUSH_SAVE_FAILED" };
  }
  return { granted: true, subscribed: true, saved: true };
}

// يُلغي اشتراك الـpush الحالي محلياً في المتصفح، ويحذف صفّه المطابق في
// Supabase (لا يبقى صفاً يتيماً يُرسَل إليه لاحقاً بعد أن الغى المستخدم
// موافقته فعلياً). لا يمكن سحب إذن المتصفح نفسه برمجياً — ذلك متاح
// للمستخدم فقط من إعدادات نظامه/متصفحه.
export async function disablePush() {
  if (!pushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      const endpoint = existing.endpoint;
      await existing.unsubscribe();
      const delRes = await store.deletePushSubscription(endpoint);
      if (!delRes.ok) console.error("[push] delete subscription row failed:", delRes.error);
    }
  } catch (e) {
    console.error("[push] unsubscribe failed:", e);
  }
}
