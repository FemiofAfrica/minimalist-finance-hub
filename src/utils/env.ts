/**
 * Initialize environment variables at runtime
 * This is useful for client-side only environment variables that 
 * can be configured by the user
 */
export function initializeClientEnvironment(): void {
  if (typeof window !== 'undefined') {
    // Create the ENV object if it doesn't exist
    window.ENV = window.ENV || {};
    
    // Add environment variables as needed
    
  }
}

/**
 * Get the correct Supabase Functions URL for the current environment
 */
export function getSupabaseFunctionsUrl(): string {
  // First try the Vite environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  
  if (supabaseUrl) {
    // Replace the main URL with the functions URL
    return supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.supabase.co/functions/v1');
  }
  
  // Fallback to development URL if no environment variable is set
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:54321/functions/v1';
  }
  
  // Ultimate fallback - this shouldn't happen in production
  console.warn('No Supabase URL found in environment variables, using hardcoded fallback');
  return 'https://idcgvnwatraddbsppxzl.supabase.co/functions/v1';
}

export default initializeClientEnvironment; 