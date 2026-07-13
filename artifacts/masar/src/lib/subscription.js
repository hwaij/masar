// المصدر الوحيد للحقيقة حول حالة الاشتراك في كل أنحاء التطبيق. مشترك
// فعّال الآن يعني: عضو VIP دائم لا ينتهي أبداً، أو مشترك عادي لم ينتهِ
// تاريخ اشتراكه بعد — بمقارنة التاريخ المحلي للمستخدم (localDayKey)
// لا UTC، حتى لا ينتهي الاشتراك قبل منتصف ليل المستخدم الفعلي بساعات
// بسبب فارق التوقيت. هذه المرحلة أساس فقط: لا شيء هنا يقفل أي ميزة.
import { localDayKey } from "./tips";

export function isActiveSubscriber(sub) {
  if (!sub) return false;
  if (sub.isVip) return true;
  if (!sub.isSubscriber) return false;
  if (!sub.subscriptionEnd) return false;
  return sub.subscriptionEnd >= localDayKey();
}
