import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// شرط أساسي لعمل الإشعارات (Web Push) في أي متصفح، ولتعرّف iOS 16.4+ على
// الموقع كتطبيق ويب حقيقي بعد إضافته للشاشة الرئيسية.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[sw] registration failed:", err);
    });
  });
}
