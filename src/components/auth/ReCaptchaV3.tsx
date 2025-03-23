import { useEffect, useCallback } from 'react';

interface ReCaptchaV3Props {
  action: string;
  onVerify: (token: string, score: number) => void;
  onError?: (error: Error) => void;
  threshold?: number;
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function ReCaptchaV3({ action, onVerify, onError, threshold = 0.5 }: ReCaptchaV3Props) {
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const RECAPTCHA_SECRET_KEY = import.meta.env.VITE_RECAPTCHA_SECRET_KEY;

  const loadReCaptcha = useCallback(async () => {
    if (!document.querySelector('#recaptcha-script')) {
      const script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      return new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
      });
    }
    return Promise.resolve();
  }, [RECAPTCHA_SITE_KEY]);

  const executeReCaptcha = useCallback(async () => {
    try {
      await window.grecaptcha.ready(async () => {
        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
        onVerify(token, 1.0);
      });
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('ReCAPTCHA verification failed'));
    }
  }, [action, RECAPTCHA_SITE_KEY, onVerify, onError]);

  useEffect(() => {
    loadReCaptcha()
      .then(executeReCaptcha)
      .catch((error) => onError?.(error));
  }, [loadReCaptcha, executeReCaptcha, onError]);

  return null; // Invisible reCAPTCHA doesn't need to render anything
}