import { supabase, hasSupabase } from "./supabase";

export const hasAuth = hasSupabase;

export async function getSession() {
  if (!hasSupabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
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
