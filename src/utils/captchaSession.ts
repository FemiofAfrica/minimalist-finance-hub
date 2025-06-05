// Captcha session management utility
interface CaptchaSession {
  token: string;
  timestamp: number;
  verified: boolean;
}

const CAPTCHA_SESSION_KEY = 'kpege_captcha_session';
const CAPTCHA_VALIDITY_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

export const captchaSession = {
  // Store successful captcha verification
  store: (token: string): void => {
    const session: CaptchaSession = {
      token,
      timestamp: Date.now(),
      verified: true
    };
    
    try {
      sessionStorage.setItem(CAPTCHA_SESSION_KEY, JSON.stringify(session));
      console.log('[CaptchaSession] Stored verification session');
    } catch (error) {
      console.warn('[CaptchaSession] Failed to store session:', error);
    }
  },

  // Check if user has valid captcha verification
  isValid: (): boolean => {
    try {
      const stored = sessionStorage.getItem(CAPTCHA_SESSION_KEY);
      if (!stored) return false;

      const session: CaptchaSession = JSON.parse(stored);
      const age = Date.now() - session.timestamp;
      
      const isValid = session.verified && age < CAPTCHA_VALIDITY_DURATION;
      
      if (!isValid && age >= CAPTCHA_VALIDITY_DURATION) {
        // Clean up expired session
        captchaSession.clear();
        console.log('[CaptchaSession] Session expired, cleared');
      }
      
      return isValid;
    } catch (error) {
      console.warn('[CaptchaSession] Error checking session:', error);
      captchaSession.clear();
      return false;
    }
  },

  // Get stored token if valid
  getToken: (): string | null => {
    if (!captchaSession.isValid()) return null;
    
    try {
      const stored = sessionStorage.getItem(CAPTCHA_SESSION_KEY);
      if (!stored) return null;
      
      const session: CaptchaSession = JSON.parse(stored);
      return session.token;
    } catch (error) {
      console.warn('[CaptchaSession] Error getting token:', error);
      return null;
    }
  },

  // Get session info for debugging
  getInfo: () => {
    try {
      const stored = sessionStorage.getItem(CAPTCHA_SESSION_KEY);
      if (!stored) return null;
      
      const session: CaptchaSession = JSON.parse(stored);
      const age = Date.now() - session.timestamp;
      const remainingTime = Math.max(0, CAPTCHA_VALIDITY_DURATION - age);
      
      return {
        verified: session.verified,
        ageMinutes: Math.round(age / (1000 * 60)),
        remainingMinutes: Math.round(remainingTime / (1000 * 60)),
        isValid: captchaSession.isValid()
      };
    } catch (error) {
      return null;
    }
  },

  // Clear session (logout, error, etc.)
  clear: (): void => {
    try {
      sessionStorage.removeItem(CAPTCHA_SESSION_KEY);
      console.log('[CaptchaSession] Cleared verification session');
    } catch (error) {
      console.warn('[CaptchaSession] Error clearing session:', error);
    }
  },

  // Force refresh - clear and require new verification
  refresh: (): void => {
    captchaSession.clear();
    console.log('[CaptchaSession] Forced session refresh');
  }
}; 