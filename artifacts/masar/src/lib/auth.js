import { supabase, hasSupabase, authStorageKey } from "./supabase";
import { withTimeout } from "./helpers";

export const hasAuth = hasSupabase;

// خلل حقيقي معروف في supabase-js: getSession() قد يعلَق للأبد (لا يُحل
// ولا يُرفض) في حالات نادرة - غالباً قفل مزامنة بين تبويبات (navigator.locks)
// لم يُحرَّر بعد إغلاق تبويب سابق، أو بعد إعادة تنشيط تبويب كان في الخلفية
// طويلاً على الجوال. هذا هو السبب الجذري الفعلي لعلوق شاشة التحميل أحياناً:
// شاشة الإقلاع تنتظر هذا النداء قبل أي شيء آخر. المهلة هنا لا تُلغي النداء
// الحقيقي (قد يكتمل لاحقاً في الخلفية)، لكنها تمنع تعليق الإقلاع بالكامل -
// onAuthChange أدناه سيُحدّث حالة المستخدم فعلياً بمجرد وصول أي جلسة حقيقية.
//
// timedOut (في القيمة المُعادة): كان الخلل السابق هنا أن انتهاء المهلة كان
// يُعامَل تماماً كـ"لا توجد جلسة" (session: null)، فيُسجَّل المستخدم خارجاً
// في الواجهة رغم أن جلسته الحقيقية قد تكون سليمة تماماً - وهذا هو السبب
// الجذري الفعلي وراء "شاشة تسجيل الدخول العالقة" التي يبلّغ عنها المستخدمون:
// القفل العالق (لا انتهاء جلسة فعلي) يُترجَم خطأً لطلب إعادة تسجيل دخول.
// الحل: تمييز الحالتين صراحة - المستدعي (MasarApp.jsx) يستخدم
// getCachedSessionUser() أدناه كخط دفاع فقط حين timedOut=true، بدل افتراض
// تسجيل الخروج تلقائياً.
export async function getSession() {
  if (!hasSupabase) return { session: null, timedOut: false };
  const TIMED_OUT = Symbol("timed-out");
  try {
    const result = await withTimeout(supabase.auth.getSession(), 6000, TIMED_OUT);
    if (result === TIMED_OUT) return { session: null, timedOut: true };
    return { session: result?.data?.session || null, timedOut: false };
  } catch {
    return { session: null, timedOut: false };
  }
}

// قراءة الجلسة المخزَّنة محلياً مباشرة من localStorage (نفس المفتاح الذي
// يستخدمه supabase-js داخلياً - انظر authStorageKey في supabase.js) بلا أي
// نداء شبكة أو قفل مزامنة - تُستخدَم فقط كخط دفاع احتياطي حين تنتهي مهلة
// getSession() الحقيقية (timedOut=true أعلاه)، لإبقاء المستخدم في واجهة
// التطبيق بدل شاشة تسجيل دخول مربكة له فعلياً جلسة صالحة مخزَّنة، ريثما
// يتحرّر القفل في الخلفية ويُصحِّح onAuthChange الحالة إن احتاج الأمر
// فعلياً. لا تحقّق دقيق من صلاحية انتهاء الرمز هنا عمداً (autoRefreshToken
// يتولى ذلك فور تحرّر القفل) - هذا قرار واجهة فوري لا تحقّق أمني، ولا يمنح
// أي صلاحية وصول فعلية لم تكن ممنوحة أصلاً (طلبات Supabase اللاحقة تعتمد
// على الرمز الحقيقي المخزَّن، لا على هذه القراءة).
export function getCachedSessionUser() {
  if (!hasSupabase || !authStorageKey) return null;
  try {
    const raw = localStorage.getItem(authStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return userFromSession(parsed?.currentSession || parsed);
  } catch {
    return null;
  }
}

export function onAuthChange(cb) {
  if (!hasSupabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => { try { data?.subscription?.unsubscribe(); } catch {} };
}

export async function signInWithGoogle() {
  if (!hasSupabase) throw new Error("no-supabase");
  const base = import.meta.env.BASE_URL || "/";
  const redirectTo = `${window.location.protocol}//${window.location.host}${base}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, queryParams: { prompt: "select_account" } },
  });
  if (error) throw error;
}

export async function signInWithEmail(email, password) {
  if (!hasSupabase) throw new Error("no-supabase");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return userFromSession(data?.session || null);
}

export async function signUpWithEmail(email, password) {
  if (!hasSupabase) throw new Error("no-supabase");
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return {
    user: userFromSession(data?.session || null),
    needsEmailConfirmation: !data?.session,
  };
}

export async function signOut() {
  if (!hasSupabase) return;
  try { await supabase.auth.signOut(); } catch {}
}

export function userFromSession(session) {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email || "",
    name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || "",
    avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
  };
}
