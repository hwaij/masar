// طبقة رقيقة فوق Web Speech API (SpeechSynthesis) - مدمجة في المتصفح مجاناً
// بلا أي خدمة خارجية أو مكتبة صوت مدفوعة. هذه "قراءة صوتية" (التطبيق
// يتكلم) فقط - وليست "أوامر صوتية" (Speech Recognition، حيث يتكلم
// المستخدم ويفهمه التطبيق)، وهما تقنيتان مختلفتان تماماً؛ هذا الملف يغطي
// الأولى فقط عمداً (الثانية أقل موثوقية عبر المتصفحات وتتطلب تعقيداً إضافياً
// كبيراً، خارج نطاق هذه المرحلة).
//
// حدود حقيقية يجب الإفصاح عنها للمستخدم (لا وعد بجودة موحّدة):
// - الدعم متوفر في أغلب المتصفحات الحديثة (Chrome/Edge/Safari/Firefox) لكن
//   جودة الصوت المتاحة فعلياً (خاصة للعربية) تعتمد على أصوات نظام التشغيل
//   المثبَّتة - قد تكون آلية الطابع أو غير متوفرة إطلاقاً على بعض الأجهزة/
//   المتصفحات القديمة.
// - على iOS/Safari تحديداً، لا يمكن تشغيل الصوت تلقائياً بلا تفاعل مستخدم
//   سابق (نفس قيد تشغيل الفيديو/الصوت العام في تلك المتصفحات) - قد لا
//   تُسمَع القراءة التلقائية عند أول دخول للتطبيق حتى يضغط المستخدم أي شيء
//   أولاً؛ هذا قيد من المتصفح نفسه لا خلل في هذا الكود.

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
}

// lang: "ar" | "en" (لغة واجهة التطبيق الحالية - نفس ما يقرره i18n)
// onEnd (اختياري): يُستدعى عند انتهاء القراءة طبيعياً أو بخطأ/إلغاء - يُستخدَم
// من المستدعي (MasarApp.jsx) فقط لتحديث حالة زر "إيقاف/إعادة تشغيل" (عرض
// "إيقاف" أثناء القراءة الفعلية، "إعادة" بعدها) - لا منطق هنا يعتمد عليه.
export function speak(text, lang, { onEnd } = {}) {
  if (!isSpeechSupported() || !text) return false;
  try {
    // أي كلام سابق يُلغى فوراً قبل بدء كلام جديد - يمنع تراكم/تداخل قراءتين
    // (مثال: تنقّل سريع بين قسمين قبل انتهاء قراءة الأول). الإلغاء نفسه
    // يُطلق onend/onerror على الـutterance القديمة إن وُجدت - المستدعي
    // يتحمّل استدعاءات onEnd متعددة بأمان (setState بقيمة متكررة لا ضرر منه).
    window.speechSynthesis.cancel();
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = lang === "en" ? "en-US" : "ar-SA";
    utter.rate = 1;
    if (onEnd) { utter.onend = onEnd; utter.onerror = onEnd; }
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking() {
  if (!isSpeechSupported()) return;
  try { window.speechSynthesis.cancel(); } catch {}
}

export function isSpeakingNow() {
  return isSpeechSupported() && window.speechSynthesis.speaking;
}
