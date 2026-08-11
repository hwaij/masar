// Service Worker لمسار - يسجّل اشتراك الإشعارات (Web Push)، يعرض
// الإشعارات الواردة فعلياً، ويعالج النقر عليها بالتوجيه داخل التطبيق. لا
// تخزين مؤقت (caching) هنا عمداً - خارج نطاق هذا الإصلاح.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// معالج fetch بلا تدخّل - مطلوب في متصفحات كثيرة (خاصة Chrome/Android)
// كأحد شروط اعتبار الموقع تطبيقاً قابلاً للتثبيت (installable PWA).
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || "مسار";
  const isEnglish = data.lang === "en";
  const options = {
    body: data.body || "",
    // أيقونة/شارة قابلتان للتخصيص من الحمولة نفسها (تحضيراً لتصنيفات
    // مستقبلية كالصلاة/التغذية) مع رجوع آمن للشعار الافتراضي دوماً.
    icon: data.icon || "/logo-mark.png",
    badge: data.badge || "/logo-mark.png",
    dir: isEnglish ? "ltr" : "rtl",
    lang: isEnglish ? "en" : "ar",
    // tag اختياري: يسمح لاحقاً بتجميع/استبدال إشعارات من نفس الفئة بدل
    // تكديسها، بلا افتراض أي تصنيفات فعلية الآن (لا قيمة افتراضية مخترعة).
    tag: data.tag || undefined,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// يحوّل قيمة "url" الواردة من الحمولة إلى الصيغة التي يفهمها MasarApp.jsx
// فعلاً بالفعل (نمط "/?view=<id>" المستخدم أصلاً في اختصارات manifest.json)
// - مسار خام بسيط مثل "/prayer" يتحوّل لنفس الصيغة تلقائياً؛ أي قيمة لا
// يعرفها التطبيق يتجاهلها هو نفسه بأمان (يعود لـ"today" افتراضياً)، فلا
// حاجة لتكرار لائحة الشاشات المعروفة هنا في الـService Worker.
function resolveTargetUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "/";
  if (rawUrl.includes("?view=")) return rawUrl;
  const seg = rawUrl.replace(/^\/+|\/+$/g, "");
  return seg ? `/?view=${encodeURIComponent(seg)}` : "/";
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = resolveTargetUrl(event.notification.data?.url);
  const targetAbsolute = new URL(targetUrl, self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // إعادة استخدام أول نافذة مفتوحة من نطاق التطبيق نفسه بدل فتح تبويب
      // جديد في كل مرة.
      const existing = allClients.find((c) => c.url.startsWith(self.registration.scope));
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) {
          try {
            await existing.navigate(targetAbsolute);
          } catch (e) {
            console.error("[sw] navigate existing client failed (focus still applied):", e);
          }
        }
        return;
      }
      if (self.clients.openWindow) await self.clients.openWindow(targetAbsolute);
    })(),
  );
});

// مفتاح VAPID العام - يجب أن يطابق دوماً VAPID_PUBLIC_KEY في
// src/lib/push.js (لا قيمة سرية هنا، آمن حسب معيار VAPID نفسه، لكنه مكرَّر
// بلا بناء مشترك لأن هذا الملف يُخدَّم كما هو من public/ بلا معالجة Vite).
const VAPID_PUBLIC_KEY = "BCQay02YhmBDLTfkyjeyH46OhvkhUDXXOvmCBUq5PBx0vSet9aest5n-ITUWOtUOMquzQNutOHTWskWYiLk5bCQ";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// المتصفح قد يُدوِّر الاشتراك من تلقاء نفسه (نادر لكن وارد) - بلا هذا
// المعالج يتوقف وصول Push بصمت دون أي إشعار للمستخدم أو للتطبيق. الـService
// Worker يُعيد الاشتراك بنفس المفتاح العام، ثم يُرسل الاشتراك الجديد لأي
// نافذة تطبيق مفتوحة لتحفظه في Supabase (الـService Worker نفسه لا يملك
// جلسة مصادقة المستخدم اللازمة للكتابة المباشرة).
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of allClients) {
          client.postMessage({ type: "masar-push-subscription-changed", subscription: newSubscription.toJSON() });
        }
      } catch (e) {
        console.error("[sw] pushsubscriptionchange resubscribe failed:", e);
      }
    })(),
  );
});
