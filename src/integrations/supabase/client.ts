import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { retryWithBackoff } from '../../utils/networkUtils';

// Get Supabase URL and key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Determine if we're in development mode
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// For local development, use our super simple proxy server
const localFunctionUrl = isDevelopment
  ? 'http://localhost:3000/parse-transaction'  // Super simple proxy
  : 'http://localhost:54321/functions/v1';
  
// For direct debugging if needed
const directFunctionUrl = 'http://localhost:54321/functions/v1';

// Get the current domain for CORS
const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://www.kpege.com';

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
      'Origin': currentDomain,
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

  // All retries failed
  throw lastError || new Error('Failed to send request after retries');
}

// Utility function to safely call edge functions with better error handling
export async function callEdgeFunction(
  functionName: string, 
  payload?: any, 
  options?: { throwError?: boolean, useLocalhost?: boolean }
) {
  const throwError = options?.throwError ?? false;
  // Allow explicit override with useLocalhost option, or auto-detect based on environment
  const useLocalEdgeFunction = options?.useLocalhost ?? isDevelopment;
  
  try {
    if (useLocalEdgeFunction) {
      // For local development, we only support the parse-transaction-groq function
      if (functionName !== 'parse-transaction-groq') {
        console.warn(`Local development only supports parse-transaction-groq, got ${functionName}`);
      }
      
      const url = localFunctionUrl;
      console.log(`Using local parser at ${url}. Payload:`, payload);
      
      try {
        // For local development
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: payload?.text,
            context_amount: payload?.context_amount,
            context_date: payload?.context_date,
            context_narration: payload?.context_narration
          }),
        });

        console.log(`Response status for local parser: ${response.status}`);

        if (!response.ok) {
          const responseText = await response.text().catch(() => 'No response text');
          console.error(`Error response for local parser:`, responseText);
          
          const error = new Error(`Local parser error: ${response.status} ${response.statusText}`);
          console.error(`Error calling local parser:`, error);
          if (throwError) throw error;
          return { data: null, error };
        }

        const data = await response.json();
        return { data, error: null };
      } catch (err) {
        console.error(`Exception calling local parser:`, err);
        if (throwError) throw err;
        return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
      }
    } else {
      // For production, we need to get the access token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Error getting Supabase session:', sessionError);
        if (throwError) throw sessionError;
        return { data: null, error: sessionError };
      }

      const accessToken = session?.access_token;

      if (!accessToken) {
        const noTokenError = new Error("No access token available. User might not be logged in.");
        console.error(`Error calling ${functionName}:`, noTokenError);
        if (throwError) throw noTokenError;
        return { data: null, error: noTokenError };
      }
      
      // Use the standard Supabase client for production
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      });
      
      if (error) {
        console.error(`Error calling ${functionName}:`, error);
        if (throwError) throw error;
        return { data: null, error };
      }
      
      return { data, error: null };
    }
  } catch (err) {
    console.error(`Exception calling ${functionName}:`, err);
    if (throwError) throw err;
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// Export a dedicated function for local testing with explicit option
export function callLocalEdgeFunction(
  functionName: string,
  payload?: any,
  options?: { throwError?: boolean }
) {
  return callEdgeFunction(functionName, payload, { ...options, useLocalhost: true });
}

// Function to test if our proxy is working
export async function testEdgeFunctionConnection() {
  try {
    // First try the proxy
    const proxyResponse = await fetch(`${localFunctionUrl}/parse-transaction-groq`, {
      method: 'OPTIONS',
    });
    
    console.log('Proxy Edge Function test:', proxyResponse.status, proxyResponse.statusText);
    
    // Then try direct connection
    const directResponse = await fetch(`${directFunctionUrl}/parse-transaction-groq`, {
      method: 'OPTIONS',
    });
    
    console.log('Direct Edge Function test:', directResponse.status, directResponse.statusText);
    
    return { 
      proxyWorking: proxyResponse.ok,
      directWorking: directResponse.ok,
      proxyStatus: proxyResponse.status,
      directStatus: directResponse.status
    };
  } catch (error) {
    console.error('Error testing Edge Function connections:', error);
    return { proxyWorking: false, directWorking: false, error };
  }
}

export default supabase;
