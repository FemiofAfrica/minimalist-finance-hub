import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { retryWithBackoff } from '../../utils/networkUtils';

// Get Supabase URL and key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Determine if we're in development mode
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

// Get the actual Supabase functions URL
const supabaseFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

// For local development, try to use local parser but fall back to production if not available
const localFunctionUrl = 'http://localhost:3000/parse-transaction';  // Local proxy (if available)
const localSupabaseFunctionUrl = 'http://localhost:54321/functions/v1'; // Local Supabase (if running)
  
// For direct debugging if needed
const directFunctionUrl = isDevelopment 
  ? 'http://localhost:54321/functions/v1'
  : null; // Don't use this in production

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

// Export a dedicated function for local testing with explicit option
export function callLocalEdgeFunction(
  functionName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any,
  options?: { throwError?: boolean }
) {
  // Only allow local functions in development
  if (!isDevelopment) {
    console.warn('callLocalEdgeFunction was called in production - using regular edge function instead');
    return callEdgeFunction(functionName, payload, options);
  }
  return callEdgeFunction(functionName, payload, { ...options, useLocalhost: true });
}

// Utility function to safely call edge functions with better error handling
export async function callEdgeFunction(
  functionName: string, 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any, 
  options?: { throwError?: boolean, useLocalhost?: boolean }
) {
  const throwError = options?.throwError ?? false;
  // Only allow useLocalhost in development
  const useLocalEdgeFunction = isDevelopment && (options?.useLocalhost ?? false);
  
  try {
    if (useLocalEdgeFunction && functionName === 'parse-transaction-groq') {
      console.log('Attempting to use local development setup...');
      
      // Try local proxy first (port 3000)
      try {
        const url = localFunctionUrl;
        console.log(`Trying local parser at ${url}. Payload:`, payload);
        
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

        console.log(`Local parser response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('Successfully used local parser');
          return { data, error: null };
        } else {
          console.log(`Local parser failed with status ${response.status}, trying local Supabase...`);
        }
      } catch (err) {
        console.log('Local parser not available (expected in most dev setups), trying local Supabase...');
      }

      // Try local Supabase functions (port 54321)
      try {
        const url = `${localSupabaseFunctionUrl}/${functionName}`;
        console.log(`Trying local Supabase at ${url}`);
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        console.log(`Local Supabase response status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log('Successfully used local Supabase');
          return { data, error: null };
        } else {
          console.log(`Local Supabase failed with status ${response.status}, falling back to production...`);
        }
      } catch (err) {
        console.log('Local Supabase not available, falling back to production...');
      }

      // If both local options failed, fall back to production
      console.log('Local development services not available, using production functions');
    }
    
    // Production logic or fallback from local development
    console.log(`Calling Supabase Edge Function: ${functionName}`);

    // Special case for parse-transaction-groq - use direct fetch with anon key instead of authenticated request
    if (functionName === 'parse-transaction-groq') {
      try {
        console.log(`Calling parse-transaction-groq via direct fetch with anon key`);
        
        // Create a URL with all parameters
        const url = `${supabaseUrl}/functions/v1/${functionName}`;
        
        // Get a fresh session token if available - this addresses potential authorization issues
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Prepare authorization headers - try both authenticated and anonymous approaches
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Client-Info': 'supabase-js/2.x',
          'Origin': currentDomain,
        };
        
        // If user is logged in, use their session token
        if (session?.access_token) {
          console.log('Using authenticated session for parse-transaction-groq');
          headers['Authorization'] = `Bearer ${session.access_token}`;
        } else {
          // Otherwise fall back to anon key
          console.log('Using anonymous key for parse-transaction-groq');
          headers['Authorization'] = `Bearer ${supabaseKey}`;
          headers['apikey'] = supabaseKey;
        }
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        // Log the response status for debugging
        console.log(`Edge function response status: ${response.status}`);

        if (!response.ok) {
          const responseText = await response.text().catch(() => null);
          console.error('Error response body:', responseText);
          
          const error = new Error(`Edge function error: ${response.status} ${response.statusText}`);
          console.error(`Error calling ${functionName}:`, error);
          
          // If we still get an error, try using the standard client
          if (response.status === 401 || response.status === 403) {
            console.log('Authorization failed with direct fetch, trying standard client');
            
            // Try using the Supabase client's built-in function invocation
            const { data, error: invokeError } = await supabase.functions.invoke(functionName, {
              body: payload
            });
            
            if (invokeError) {
              console.error(`Error calling ${functionName} with standard client:`, invokeError);
              if (throwError) throw invokeError;
              return { data: null, error: invokeError };
            }
            
            return { data, error: null };
          }
          
          if (throwError) throw error;
          return { data: null, error };
        }

        const data = await response.json();
        return { data, error: null };
      } catch (err) {
        console.error(`Exception calling ${functionName}:`, err);
        
        // As a last resort, try using the standard client
        try {
          console.log('Trying standard Supabase client as fallback');
          const { data, error: fallbackError } = await supabase.functions.invoke(functionName, {
            body: payload
          });
          
          if (fallbackError) {
            console.error(`Fallback attempt failed for ${functionName}:`, fallbackError);
            if (throwError) throw fallbackError;
            return { data: null, error: fallbackError };
          }
          
          return { data, error: null };
        } catch (fallbackErr) {
          console.error(`Fallback attempt exception for ${functionName}:`, fallbackErr);
          if (throwError) throw fallbackErr;
          return { data: null, error: fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)) };
        }
      }
    }
    
    // Handle authenticated functions with standard Supabase approach
    return await callWithStandardClient(functionName, payload, throwError);
  } catch (err) {
    console.error(`Exception calling ${functionName}:`, err);
    if (throwError) throw err;
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// Helper function to call edge function with standard Supabase client
async function callWithStandardClient(
  functionName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any,
  throwError?: boolean
) {
  // Get the access token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Error getting Supabase session:', sessionError);
    if (throwError) throw sessionError;
    return { data: null, error: sessionError };
  }

  // If user is logged in, use their token
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  // Use the standard Supabase client
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers
    });
    
    if (error) {
      console.error(`Error calling ${functionName}:`, error);
      if (throwError) throw error;
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error(`Error in standard client call to ${functionName}:`, error);
    if (throwError) throw error;
    return { data: null, error };
  }
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
