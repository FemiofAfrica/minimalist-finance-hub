// Import Mixpanel browser API
import mixpanel from 'mixpanel-browser';

// Environment configuration
const isProd = import.meta.env.PROD; // True if production build
const isDev = import.meta.env.DEV; // True if development build
const isTest = import.meta.env.MODE === 'test'; // Customize based on your setup

// Project tokens - read from environment variables with fallbacks
const MIXPANEL_PROD_TOKEN = import.meta.env.VITE_MIXPANEL_PROD_TOKEN || '61412526d8c55df7859826e20ebb8d1f';
const MIXPANEL_DEV_TOKEN = import.meta.env.VITE_MIXPANEL_DEV_TOKEN || '61412526d8c55df7859826e20ebb8d1f';

// Flag to track if analytics is likely blocked
let analyticsBlocked = false;
// Flag to prevent console error spam
let errorLogged = false;

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

// Graceful error handler to reduce console spam
const handleAnalyticsError = (error: any) => {
  // Check if error is related to network/request blocking
  if (error && (
      error.toString().includes('network error') || 
      error.message?.includes('network error') ||
      error.toString().includes('blocked') ||
      error.message?.includes('blocked'))
  ) {
    analyticsBlocked = true;
    if (!errorLogged && isDev) {
      console.warn('[Mixpanel] Analytics requests appear to be blocked by an ad blocker or privacy extension. This is expected behavior and won\'t affect the application functionality.');
      errorLogged = true;
    }
    return;
  }
  
  // For other errors, log normally (once)
  if (!errorLogged) {
    console.error('[Mixpanel] Error:', error);
    errorLogged = true;
  }
};

// Utility functions for tracking - will safely handle all environments
export const MixpanelService = {
  trackEvent: (eventName: string, properties?: Record<string, any>) => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Track: ${eventName}`, properties);
      return;
    }
    
    // Skip if we already know analytics is blocked
    if (analyticsBlocked) return;
    
    try {
      mixpanel.track(eventName, properties);
      if (isDev) console.log(`[Mixpanel] Tracked: ${eventName}`, properties);
    } catch (error) {
      handleAnalyticsError(error);
    }
  },
  
  identify: (userId: string) => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Identify: ${userId}`);
      return;
    }
    
    // Skip if we already know analytics is blocked
    if (analyticsBlocked) return;
    
    try {
      mixpanel.identify(userId);
      if (isDev) console.log(`[Mixpanel] Identified user: ${userId}`);
    } catch (error) {
      handleAnalyticsError(error);
    }
  },
  
  setUserProfile: (properties: Record<string, any>) => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Set Profile:`, properties);
      return;
    }
    
    // Skip if we already know analytics is blocked
    if (analyticsBlocked) return;
    
    try {
      mixpanel.people.set(properties);
      if (isDev) console.log(`[Mixpanel] Set profile:`, properties);
    } catch (error) {
      handleAnalyticsError(error);
    }
  },
  
  reset: () => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Reset`);
      return;
    }
    
    // Always try to reset, even if blocked
    try {
      mixpanel.reset();
      if (isDev) console.log(`[Mixpanel] Reset tracking`);
    } catch (error) {
      handleAnalyticsError(error);
    }
  },
  
  // Expose blocked state for components that need to know
  isBlocked: () => analyticsBlocked
};

// Set up global error handler for Mixpanel requests
window.addEventListener('error', (event) => {
  // Check if error is related to Mixpanel
  if (event.filename?.includes('mixpanel') || 
      event.message?.includes('mixpanel') ||
      event.error?.stack?.includes('mixpanel')) {
    
    analyticsBlocked = true;
    if (!errorLogged && isDev) {
      console.warn('[Mixpanel] Analytics requests appear to be blocked. This won\'t affect the application functionality.');
      errorLogged = true;
    }
    // Prevent the error from appearing in the console
    event.preventDefault();
  }
});

export default mixpanel; 