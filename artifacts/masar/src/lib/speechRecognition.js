// طبقة رفيعة فوق Web Speech API - SpeechRecognition (الاتجاه المعاكس تماماً
// لـspeech.js: هناك التطبيق يتكلم Speech Synthesis، هنا المستخدم يتكلم
// والتطبيق يحاول فهم أمر محدد مسبقاً - Speech Recognition). مجانية ومدمجة في
// المتصفح، بلا أي خدمة خارجية مدفوعة، تماماً كمبدأ speech.js.
//
// حدود حقيقية يجب معرفتها بصدق: الدعم متفاوت جداً بين المتصفحات - يعمل جيداً
// على Chrome (سطح المكتب وAndroid)، لكنه غير مدعوم إطلاقاً أو محدود جداً على
// Safari/iOS (isRecognitionSupported تُعيد false هناك في الغالب - هذا قيد
// حقيقي في المتصفح نفسه، لا خطأ في هذا الكود). دقة التعرف على العربية أقل من
// الإنجليزية بشكل عام في هذه التقنية أياً كان المتصفح المستخدم.

function getRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isRecognitionSupported() {
  return !!getRecognitionCtor();
}

// يبدأ استماعاً لمرة واحدة (غير مستمر - continuous=false) بلغة الواجهة
// الحالية، ويعيد كائن التعرّف نفسه حتى يمكن إيقافه يدوياً (stopListening)
// قبل انتهائه تلقائياً. onResult يستلم أفضل نص متعرَّف عليه فقط
// (interimResults=false، maxAlternatives=1) - يكفي تماماً لنطاق أوامر ثابتة
// محدودة مسبقاً، لا حاجة لمعالجة بدائل متعددة أو نتائج جزئية متدفقة.
export function startListening(lang, { onResult, onError, onEnd } = {}) {
  const Ctor = getRecognitionCtor();
  if (!Ctor) { onError?.("unsupported"); return null; }
  try {
    const recognizer = new Ctor();
    recognizer.lang = lang === "en" ? "en-US" : "ar-SA";
    recognizer.continuous = false;
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;
    recognizer.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      onResult?.(transcript);
    };
    recognizer.onerror = (event) => { onError?.(event.error || "unknown"); };
    recognizer.onend = () => { onEnd?.(); };
    recognizer.start();
    return recognizer;
  } catch (e) {
    onError?.(e?.message || "unknown");
    return null;
  }
}

export function stopListening(recognizer) {
  try { recognizer?.stop(); } catch { /* قد يكون متوقفاً فعلاً - تجاهل آمن */ }
}
