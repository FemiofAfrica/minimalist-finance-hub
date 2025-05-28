import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { retryWithBackoff } from '../../utils/networkUtils';

// Get Supabase URL and key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Check your .env file.');
}

// Create and export the Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: customFetch,
  },
});

// Enhanced fetch function with retries and better error handling
async function customFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  // Check if this is an edge function call
  const isEdgeFunction = typeof input === 'string' && 
    (input.includes('/functions/v1/') || input.includes('/storage/v1/'));

  // Only apply special handling for edge functions
  if (!isEdgeFunction) {
    return fetch(input, init);
  }

  // Add custom headers for CORS
  const enhancedInit: RequestInit = {
    ...init,
    headers: {
      ...init?.headers,
      'X-Client-Info': 'supabase-js/2.x',
    },
    credentials: 'omit',
  };

  // Retry logic for edge functions
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for Supabase edge function`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
      }
      
      const response = await fetch(input, enhancedInit);
      
      // For 429 (rate limit) errors, retry with backoff
      if (response.status === 429) {
        console.warn('Rate limit hit, retrying with backoff');
        continue;
      }
      
      // For CORS or auth errors, try a different approach
      if (response.status === 401 || response.status === 403) {
        // Refresh auth if possible
        try {
          const { data } = await supabase.auth.refreshSession();
          if (data?.session) {
            console.log('Auth refreshed, retrying request');
            continue;
          }
        } catch (e) {
          console.error('Error refreshing auth:', e);
        }
      }
      
      return response;
    } catch (error) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('Failed to fetch after multiple retries');
}

// Utility function to safely call edge functions with better error handling
export async function callEdgeFunction(
  functionName: string, 
  payload?: any, 
  options?: { throwError?: boolean }
) {
  const throwError = options?.throwError ?? false;
  
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });
    
    if (error) {
      console.error(`Error calling ${functionName}:`, error);
      if (throwError) throw error;
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error(`Exception calling ${functionName}:`, err);
    if (throwError) throw err;
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export default supabase;
