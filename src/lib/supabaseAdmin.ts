import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = import.meta.env.VITE_SUPABASE_SERVICE_ROLE;

let adminClient: SupabaseClient<Database> | null = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
  adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
} else {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      "[supabase-admin] Missing VITE_SUPABASE_SERVICE_ROLE variable. Admin operations will be disabled.",
    );
  }
}

export const supabaseAdmin = adminClient;

