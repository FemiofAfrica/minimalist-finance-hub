export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes?: string[];
  challengeTs?: string;
  hostname?: string;
  action?: string;
}

export interface TurnstileError extends Error {
  errorCodes?: string[];
}

/**
 * Verify a Turnstile token independently using our Vercel API route
 * This bypasses Supabase's built-in captcha configuration issues
 */
export async function verifyTurnstileToken(
  token: string, 
  remoteip?: string
): Promise<TurnstileVerificationResult> {
  try {
    console.log('[Turnstile] Verifying token independently...');
    
    // Use Vercel API route for verification
    const verifyUrl = '/api/verify-turnstile';
    
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        remoteip: remoteip || undefined
      })
    });

    if (!response.ok) {
      console.error('[Turnstile] API route error:', response.status, response.statusText);
      throw new Error(`Verification service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data) {
      throw new Error('No response from verification service');
    }

    console.log('[Turnstile] Verification result:', data);

    if (!data.success) {
      const turnstileError = new Error(
        `Turnstile verification failed: ${data.errorCodes?.join(', ') || 'Unknown error'}`
      ) as TurnstileError;
      turnstileError.errorCodes = data.errorCodes;
      throw turnstileError;
    }

    return {
      success: data.success,
      errorCodes: data.errorCodes,
      challengeTs: data.challengeTs,
      hostname: data.hostname,
      action: data.action
    };

  } catch (error) {
    console.error('[Turnstile] Verification failed:', error);
    
    // Re-throw with better error messages
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Turnstile verification failed');
  }
}

/**
 * Check if a Turnstile token appears to be valid format-wise
 */
export function isValidTurnstileTokenFormat(token: string): boolean {
  // Turnstile tokens are typically base64-encoded strings
  // This is just a basic format check, not actual verification
  return typeof token === 'string' && 
         token.length > 50 && 
         /^[A-Za-z0-9+/=_-]+$/.test(token);
}

/**
 * Get user-friendly error message from Turnstile error codes
 */
export function getTurnstileErrorMessage(errorCodes?: string[]): string {
  if (!errorCodes || errorCodes.length === 0) {
    return 'Captcha verification failed. Please try again.';
  }

  const errorMessages: Record<string, string> = {
    'missing-input-secret': 'Server configuration error. Please contact support.',
    'invalid-input-secret': 'Server configuration error. Please contact support.',
    'missing-input-response': 'Please complete the captcha verification.',
    'invalid-input-response': 'Captcha verification failed. Please try again.',
    'bad-request': 'Invalid captcha request. Please refresh and try again.',
    'timeout-or-duplicate': 'Captcha has expired or already been used. Please try again.',
    'internal-error': 'Captcha service temporarily unavailable. Please try again.',
    'challenge-failed': 'Captcha challenge failed. Please try again.',
    'challenge-expired': 'Captcha has expired. Please complete it again.',
    'challenge-required': 'Please complete the captcha verification.',
  };

  // Return the first known error message, or a generic one
  for (const code of errorCodes) {
    if (errorMessages[code]) {
      return errorMessages[code];
    }
  }

  return `Captcha verification failed (${errorCodes.join(', ')}). Please try again.`;
} 