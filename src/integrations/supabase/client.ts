
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables for Supabase configuration
let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
let SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback to local development if environment variables are not available
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn('Supabase environment variables not found, using local development setup');
  // Local development fallback
  const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
  const LOCAL_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  
  // Override with local values if environment variables are missing
  if (!SUPABASE_URL) SUPABASE_URL = LOCAL_SUPABASE_URL;
  if (!SUPABASE_PUBLISHABLE_KEY) SUPABASE_PUBLISHABLE_KEY = LOCAL_SUPABASE_KEY;
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
