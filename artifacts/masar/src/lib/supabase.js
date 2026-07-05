import { createClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "");
const anonKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim().replace(/^["']|["']$/g, "");

function createSupabaseClient() {
  if (!url || !anonKey || url.includes("YOUR_PROJECT")) return null;
  try {
    return createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    // A malformed env value (bad URL, stray quotes, etc.) must never crash
    // the whole app at module-load time — fall back to local-only mode.
    console.error("[supabase] failed to init client, falling back to local-only mode:", err);
    return null;
  }
}

export const supabase = createSupabaseClient();

export const hasSupabase = !!supabase;
