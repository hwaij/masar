import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./locales/ar.json";
import en from "./locales/en.json";
import { store } from "./lib/store";

const initialLang = store.getLocalLanguage();

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: initialLang,
  fallbackLng: "ar",
  interpolation: { escapeValue: false },
});

// يُطبَّق على جذر المستند تلقائياً عند أي تغيير للغة — سواء عند التهيئة
// الأولى أو عند أي i18n.changeLanguage() لاحق من أي مكان في التطبيق — حتى
// لا تحتاج كل نقطة استدعاء لتذكّر تحديث dir/lang يدوياً.
function applyDocumentDirection(lng) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("lang", lng);
  document.documentElement.setAttribute("dir", lng === "en" ? "ltr" : "rtl");
}

applyDocumentDirection(initialLang);
i18n.on("languageChanged", applyDocumentDirection);

export default i18n;
