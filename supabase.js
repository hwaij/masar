import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// إذا لم تُضبط المفاتيح، يبقى supabase = null ويعمل التطبيق بالتخزين المحلي فقط
export const supabase =
  url && anonKey && !url.includes("YOUR_PROJECT")
    ? createClient(url, anonKey)
    : null;

export const hasSupabase = !!supabase;
