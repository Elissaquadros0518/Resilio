import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Expose only the host for development diagnostics; never expose the URL's
// credentials/query string or the publishable key.
export const supabaseProjectHost = (() => {
  try { return new URL(supabaseUrl).host; } catch { return null; }
})();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// This client uses only the browser-safe publishable/anon key. Never use a
// service-role key in Vite environment variables or browser code.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
