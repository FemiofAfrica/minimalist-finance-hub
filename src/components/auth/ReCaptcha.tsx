import { useEffect, useRef } from 'react';

interface ReCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    grecaptcha: any;
    onReCaptchaLoad?: () => void;
  }
}

export function ReCaptcha({ onVerify, onExpire, onError }: ReCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number>();

  useEffect(() => {
    // Load reCAPTCHA script if not already loaded
    if (!document.querySelector('#recaptcha-script')) {
      const script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      
      window.onReCaptchaLoad = () => {
        if (containerRef.current) {
          widgetId.current = window.grecaptcha.render(containerRef.current, {
            'sitekey': import.meta.env.VITE_RECAPTCHA_SITE_KEY,
            'callback': onVerify,
            'expired-callback': onExpire,
            'error-callback': onError,
            'theme': 'light',
            'size': 'normal'
          });
        }
      };

      script.onload = () => {
        if (window.grecaptcha && window.grecaptcha.render) {
          window.onReCaptchaLoad?.();
        }
      };

      document.head.appendChild(script);
    } else if (window.grecaptcha && window.grecaptcha.render) {
      window.onReCaptchaLoad?.();
    }

    return () => {
      if (widgetId.current !== undefined) {
        window.grecaptcha?.reset(widgetId.current);
      }
    };
  }, [onVerify, onExpire, onError]);

  return <div ref={containerRef} className="mt-4" />;
}