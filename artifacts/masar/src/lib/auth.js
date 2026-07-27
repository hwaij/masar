import { supabase, hasSupabase } from "./supabase";
import { withTimeout } from "./helpers";

export const hasAuth = hasSupabase;

// خلل حقيقي معروف في supabase-js: getSession() قد يعلَق للأبد (لا يُحل
// ولا يُرفض) في حالات نادرة - غالباً قفل مزامنة بين تبويبات (navigator.locks)
// لم يُحرَّر بعد إغلاق تبويب سابق، أو بعد إعادة تنشيط تبويب كان في الخلفية
// طويلاً على الجوال. هذا هو السبب الجذري الفعلي لعلوق شاشة التحميل أحياناً:
// شاشة الإقلاع تنتظر هذا النداء قبل أي شيء آخر. المهلة هنا لا تُلغي النداء
// الحقيقي (قد يكتمل لاحقاً في الخلفية)، لكنها تمنع تعليق الإقلاع بالكامل -
// onAuthChange أدناه سيُحدّث حالة المستخدم فعلياً بمجرد وصول أي جلسة حقيقية.
export async function getSession() {
  if (!hasSupabase) return null;
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), 6000, { data: null });
    return data?.session || null;
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
