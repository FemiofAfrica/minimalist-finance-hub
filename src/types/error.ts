// Common error types for API responses and error handling

/**
 * Standard API error interface for HTTP responses
 */
export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: string;
}

/**
 * Authentication specific error interface
 */
export interface AuthError extends ApiError {
  // Auth-specific fields
  authFlow?: string; // e.g., 'login', 'signup', 'reset-password'
}

/**
 * Create a typed error from any error object
 * @param error The error object to convert
 * @returns A properly typed ApiError
 */
export function createApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    return error as ApiError;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    const apiError = new Error(error) as ApiError;
    return apiError;
  }
  
  // Handle object errors (e.g., from fetch responses)
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    const message = errorObj.message as string || 'Unknown error';
    const apiError = new Error(message) as ApiError;
    
    // Copy additional properties
    if (errorObj.status) apiError.status = Number(errorObj.status);
    if (errorObj.code) apiError.code = String(errorObj.code);
    if (errorObj.details) apiError.details = String(errorObj.details);
    
    return apiError;
  }
  
  // Fallback for completely unknown errors
  return new Error('Unknown error occurred') as ApiError;
}