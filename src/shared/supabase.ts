/**
 * Supabase client initialization module
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
}

// Initialize and export Supabase client
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);