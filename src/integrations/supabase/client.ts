
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables for Supabase configuration
let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
let SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log Supabase configuration for debugging
console.log('Supabase configuration:', { 
  url: SUPABASE_URL ? 'Set' : 'Not set',
  key: SUPABASE_PUBLISHABLE_KEY ? 'Set' : 'Not set'
});

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

// Initialize Supabase client with enhanced error handling and retry logic
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'minimalist-finance-hub'
    },
    // Add fetch implementation with timeout
    fetch: (url, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
    }
  }
});

// Add connection health check function
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Simple health check query
    const { error } = await supabase.from('health_check').select('count').maybeSingle();
    // If we get a 404, that's fine - it means we reached Supabase but the table doesn't exist
    return !error || error.code === '404';
  } catch (e) {
    console.error('Supabase connection check failed:', e);
    return false;
  }
};

// Test connection and log any issues
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth event:', event);
  if (event === 'SIGNED_IN') {
    console.log('User signed in successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  } else if (event === 'USER_UPDATED') {
    console.log('User updated');
  }
});

// Set user ID from auth when making database requests
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting user session:', error.message);
      return null;
    }
    return data.session?.user?.id || null;
  } catch (error) {
    console.error('Unexpected error getting user session:', error);
    return null;
  }
};

// Export the function
export { getCurrentUserId };
