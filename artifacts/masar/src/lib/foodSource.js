// مصدر الأكل المعروض للمستخدم (عرض فقط - لا يُستخدم في أي حساب غذائي ولا
// منطق بحث). يفصل بين حقلين مختلفين تماماً مُخزَّنين على nutrition_log:
//   - source: طريقة الإضافة (بحث/باركود/صوت/صورة AI/ملصق/يدوي...) - موجود
//     أصلاً قبل هذا الملف، بلا أي تغيير بقيمه.
//   - dataOrigin: من أين جاءت القيم الغذائية فعلياً (قاعدة مسار المحلية/
//     USDA/USDA Branded/Open Food Facts/مستخدم) - حقل جديد (data_origin في
//     قاعدة البيانات، راجع supabase-schema.sql). قد يكون null لسجلات قديمة
//     (قبل هذا التحديث) أو لإدخالات لا "منتج" حقيقي وراءها (تقدير AI مباشر،
//     قراءة ملصق) - عمداً لا نخمّن قيمة له في هذه الحالات.
//
// deriveDataOrigin: تُحوّل كائن "product" الحي أثناء البحث/التأكيد (قبل
// الحفظ، يحمل origin/dataType من searchFoodCandidatesOnce أو SearchPanel)
// إلى نفس قيم dataOrigin المخزَّنة - مصدر واحد للمنطق بدل تكراره في كل مكان
// بالواجهة يعرض نتيجة قبل حفظها.
export function deriveDataOrigin(product) {
  if (!product) return null;
  if (product.origin === "usda") {
    return product.dataType === "Branded" ? "usda_branded" : "usda";
  }
  if (product.origin === "generic" || product.origin === "off" || product.origin === "custom_foods") {
    return product.origin;
  }
  // "previous" (إعادة استخدام صنف سابق) أو أي قيمة أخرى غير معروفة - لا
  // تخمين؛ المتصل المسؤول عن حالة "previous" يمرّر dataOrigin المحفوظ أصلاً
  // لذلك الإدخال القديم بدل الاعتماد على هذه الدالة.
  return null;
}

const SOURCE_LABELS = {
  generic: { ar: "قاعدة مسار (مبنية على USDA)", en: "Masarak database (USDA-based)" },
  usda: { ar: "USDA FoodData Central", en: "USDA FoodData Central" },
  usda_branded: { ar: "منتج تجاري – USDA", en: "Branded product – USDA" },
  off: { ar: "Open Food Facts (مجتمعي)", en: "Open Food Facts (community)" },
  custom_foods: { ar: "أضافه مستخدم (غير موثق)", en: "Added by a user (unverified)" },
};

// سطر "المصدر: ..." صغير يُعرض تحت اسم الأكل في كل مكان (نتائج بحث/باركود/
// صورة وصوت/السجل اليومي). الأولوية: dataOrigin (الأدق - من أين جاءت
// الأرقام فعلياً) أولاً، ثم حالات source الخاصة التي لا "منتج" حقيقي وراءها
// (ملصق/تقدير AI مباشر)، ثم "غير محدد" بلا أي تخمين لما تبقّى (يشمل كل
// السجلات القديمة قبل إضافة data_origin).
export function getFoodSourceLabel({ source, dataOrigin, microAiEstimated } = {}, isEn) {
  const lang = isEn ? "en" : "ar";
  let base;
  if (dataOrigin && SOURCE_LABELS[dataOrigin]) {
    base = SOURCE_LABELS[dataOrigin][lang];
  } else if (source === "label") {
    base = isEn ? "Product label (read by AI)" : "ملصق المنتج (قرأه الذكاء الاصطناعي)";
  } else if (source === "ai_estimate") {
    base = isEn ? "AI estimate (not precise)" : "تقدير الذكاء الاصطناعي (غير دقيق)";
  } else {
    base = isEn ? "Unspecified" : "غير محدد";
  }
  const prefix = isEn ? "Source: " : "المصدر: ";
  const microNote = microAiEstimated
    ? (isEn ? " · micronutrients are AI-estimated" : " · المغذيات الدقيقة تقديرية (AI)")
    : "";
  return `${prefix}${base}${microNote}`;
}
