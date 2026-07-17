// Service Worker لمسار — الحد الأدنى اللازم لعمل الإشعارات (Web Push) في
// سياق PWA. لا تخزين مؤقت (caching) هنا عمداً: هذا خارج نطاق هذا الإصلاح،
// والهدف الوحيد الآن هو تسجيل الاشتراك في الإشعارات بنجاح، لا بناء نظام
// الإرسال الفعلي (سيأتي لاحقاً).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// معالج fetch بلا تدخّل — مطلوب في متصفحات كثيرة (خاصة Chrome/Android)
// كأحد شروط اعتبار الموقع تطبيقاً قابلاً للتثبيت (installable PWA).
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || "مسار";
  const options = {
    body: data.body || "",
    icon: "/logo-mark.png",
    badge: "/logo-mark.png",
    dir: "rtl",
    lang: "ar",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
