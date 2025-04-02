
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { retryWithBackoff } from '../../utils/networkUtils';

// Use environment variables for Supabase configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate Supabase configuration
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Supabase configuration is missing. Please check your environment variables.');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Set user ID from auth when making database requests with retry logic
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data } = await retryWithBackoff(() => supabase.auth.getSession());
    return data.session?.user?.id || null;
  } catch (error) {
    console.error('Failed to get user session after retries:', error);
    return null;
  }
};
