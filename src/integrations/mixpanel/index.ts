// Import Mixpanel browser API
import mixpanel from 'mixpanel-browser';

// Environment configuration
const isProd = import.meta.env.PROD; // True if production build
const isDev = import.meta.env.DEV; // True if development build
const isTest = import.meta.env.MODE === 'test'; // Customize based on your setup

// Project tokens - read from environment variables with fallbacks
const MIXPANEL_PROD_TOKEN = import.meta.env.VITE_MIXPANEL_PROD_TOKEN || '61412526d8c55df7859826e20ebb8d1f';
const MIXPANEL_DEV_TOKEN = import.meta.env.VITE_MIXPANEL_DEV_TOKEN || '61412526d8c55df7859826e20ebb8d1f';

// Initialize Mixpanel with the appropriate token
if (isProd) {
  mixpanel.init(MIXPANEL_PROD_TOKEN, { 
    debug: false, 
    ignore_dnt: true,
    cross_subdomain_cookie: false,
    secure_cookie: true,
    xhr_headers: {
      'Access-Control-Allow-Origin': '*'
    }
  });
} else if (isDev) {
  mixpanel.init(MIXPANEL_DEV_TOKEN, { 
    debug: true, 
    ignore_dnt: true,
    cross_subdomain_cookie: false,
    secure_cookie: true,
    xhr_headers: {
      'Access-Control-Allow-Origin': '*'
    }
  });
} else {
  // In test environments, use a mock implementation
  console.log('[Mixpanel] Test environment detected, tracking disabled');
}

// Utility functions for tracking - will safely handle all environments
export const MixpanelService = {
  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Track: ${eventName}`, properties);
      return;
    }
    try {
      mixpanel.track(eventName, properties);
      if (isDev) console.log(`[Mixpanel] Tracked: ${eventName}`, properties);
    } catch (error) {
      console.error(`[Mixpanel] Error tracking ${eventName}:`, error);
    }
  },
  
  identify: (userId: string) => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Identify: ${userId}`);
      return;
    }
    try {
      mixpanel.identify(userId);
      if (isDev) console.log(`[Mixpanel] Identified user: ${userId}`);
    } catch (error) {
      console.error(`[Mixpanel] Error identifying user ${userId}:`, error);
    }
  },
  
  setUserProfile: (properties: Record<string, any>) => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Set Profile:`, properties);
      return;
    }
    try {
      mixpanel.people.set(properties);
      if (isDev) console.log(`[Mixpanel] Set profile:`, properties);
    } catch (error) {
      console.error(`[Mixpanel] Error setting profile:`, error);
    }
  },
  
  reset: () => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Reset`);
      return;
    }
    try {
      mixpanel.reset();
      if (isDev) console.log(`[Mixpanel] Reset tracking`);
    } catch (error) {
      console.error(`[Mixpanel] Error resetting:`, error);
    }
  }
};

export default mixpanel; 