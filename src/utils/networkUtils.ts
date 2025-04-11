const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Exponential backoff configuration
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 32000; // 32 seconds
const MAX_RETRIES = 5;

/**
 * Check connectivity to Supabase service
 */
export const checkSupabaseConnectivity = async (): Promise<boolean> => {
  // First check general connectivity
  const isOnline = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true;

  if (!isOnline) {
    console.warn('Device reports offline status');
    return false;
  }

  try {
    // Test Supabase endpoint with a GET request
    // Using GET instead of HEAD as the endpoint may not support HEAD requests
    const testUrl = `${SUPABASE_URL}/auth/v1/health?nocache=${Date.now()}`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Cache-Control': 'no-cache',
        'apikey': SUPABASE_ANON_KEY
      },
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) {
      const errorMessage = `Health check failed with status ${response.status}. This may indicate an authentication issue with Supabase.`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.warn('Supabase connectivity test failed:', error);
    return false;
  }
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> => {
  let lastError: Error;
  let delay = INITIAL_RETRY_DELAY;

  for (let i = 0; i < retries; i++) {
    try {
      // Check connectivity before attempting
      const isConnected = await checkSupabaseConnectivity();
      if (!isConnected) {
        throw new Error('No connection to Supabase');
      }

      return await fn();
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error);
      lastError = error as Error;

      if (i === retries - 1) break;

      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, MAX_RETRY_DELAY);
    }
  }

  throw lastError;
};