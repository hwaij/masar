// قراءة مفتاح الإعدادات العامة "allow_old_dates" (مفتاح أدمن مؤقت يسمح
// بتسجيل الأكل لتاريخ أقدم من 14 يوماً، راجع supabase-schema.sql للحارس
// الحقيقي) - مباشرة من Supabase عبر RLS (authenticated يرى هذا المفتاح
// تحديداً فقط من app_settings، لا أي مفتاح إعدادات آخر قد يُضاف لاحقاً لهذا
// الجدول)، بلا أي نداء لدالة الأدمن - أي مستخدم مسجَّل دخول يحتاج معرفة هل
// النافذة مفتوحة الآن فعلياً (NutritionView)، لا الأدمن فقط. isOpenNow
// محسوبة هنا بالعميل فقط لعرض/تمكين التنقّل بالواجهة - الحارس الحقيقي
// الوحيد الموثوق يبقى trigger enforce_nutrition_log_date_window بقاعدة
// البيانات نفسها، لا هذا الحساب (لو تأخر العميل بالتحديث أو تعطّل الجلب،
// أي محاولة إدخال فعلية تُرفَض/تُقبَل من الخادم بصرف النظر عمّا يعرضه هذا).
import { supabase, hasSupabase } from "./supabase";

export async function fetchAllowOldDatesSetting() {
  if (!hasSupabase) return { enabled: false, closesAt: null, isOpenNow: false };
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "allow_old_dates")
      .maybeSingle();
    if (error || !data?.value) return { enabled: false, closesAt: null, isOpenNow: false };
    const v = data.value;
    const closesAt = v.closes_at || null;
    const isOpenNow = !!v.enabled && !!closesAt && new Date(closesAt).getTime() > Date.now();
    return { enabled: !!v.enabled, closesAt, isOpenNow };
  } catch {
    return { enabled: false, closesAt: null, isOpenNow: false };
  }
}
