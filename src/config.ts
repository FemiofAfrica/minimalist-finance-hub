// Configuration constants for the application

// reCAPTCHA Configuration
export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
export const RECAPTCHA_SECRET_KEY = import.meta.env.VITE_RECAPTCHA_SECRET_KEY;

// Validation thresholds
export const RECAPTCHA_SCORE_THRESHOLD = 0.5; // Minimum score to consider human interaction