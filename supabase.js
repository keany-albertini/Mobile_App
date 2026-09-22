import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://anwgxemngmhdvdqowyry.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7yQB9C0DP7ZuQJFFjn9v9A_00Bl4K88';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
