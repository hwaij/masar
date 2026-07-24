import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

createRoot(document.getElementById("root")!).render(<App />);

// خطأ حقيقي وُجد فعلياً: تبويب مفتوح من قبل آخر نشر (deploy) يحمل أسماء
// ملفات JS القديمة (hash) داخل حزمته الرئيسية بالفعل. أي محاولة لاحقة
// لتحميل جزء مقسَّم بالكسل (React.lazy، أو import() اليدوي مثل
// "./gemini.js" في lib/nutrition.js) يطلب من الخادم اسم ملف لم يعد موجوداً
// بعد النشر الجديد، فيُعيد Netlify صفحة index.html نفسها (SPA fallback)
// بدل JS حقيقي - يظهر هذا للمتصفح كخطأ "ليس MIME صالحاً لجافاسكربت" بدل
// أي رسالة واضحة. هذا حدث Vite الرسمي المخصَّص تحديداً لهذه الحالة -
// إعادة تحميل الصفحة مرة واحدة تجلب index.html الجديد بأسماء الملفات
// الصحيحة الحالية وتحل المشكلة تلقائياً دون أن يرى المستخدم أي خطأ خام.
// الحارس عبر sessionStorage يمنع حلقة إعادة تحميل لا نهائية إن كان الخلل
// فعلياً في النشر نفسه (لا مجرد تبويب قديم).
window.addEventListener("vite:preloadError", () => {
  const key = "masar_reloaded_after_preload_error";
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  window.location.reload();
});

// شرط أساسي لعمل الإشعارات (Web Push) في أي متصفح، ولتعرّف iOS 16.4+ على
// الموقع كتطبيق ويب حقيقي بعد إضافته للشاشة الرئيسية.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[sw] registration failed:", err);
    });
  });
}
