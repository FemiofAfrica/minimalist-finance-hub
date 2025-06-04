// Import Mixpanel browser API
import mixpanel from 'mixpanel-browser';

// Environment configuration
const isProd = import.meta.env.PROD; // True if production build
const isDev = import.meta.env.DEV; // True if development build
const isTest = import.meta.env.MODE === 'test'; // Customize based on your setup

// Project tokens - read from environment variables with fallbacks
const MIXPANEL_PROD_TOKEN = import.meta.env.MIXPANEL_PROD_TOKEN;
const MIXPANEL_DEV_TOKEN = import.meta.env.MIXPANEL_DEV_TOKEN;

// Flag to track if analytics is likely blocked
let analyticsBlocked = false;
// Flag to prevent console error spam
let errorLogged = false;
// Flag to track if Mixpanel is properly initialized
let mixpanelInitialized = false;
// Flag to track if we've tested connectivity
let connectivityTested = false;

// Type definitions for better type safety
type MixpanelProperties = Record<string, string | number | boolean | Date | null | undefined>;
type ErrorWithMessage = {
  message?: string;
  toString(): string;
};

// Test function to check if Mixpanel requests are blocked
const testMixpanelConnectivity = async (): Promise<boolean> => {
  if (connectivityTested || !mixpanelInitialized) {
    return !analyticsBlocked;
  }
  
  connectivityTested = true;
  
  try {
    // Try to make a minimal test request to Mixpanel
    const testUrl = 'https://api-js.mixpanel.com/track/';
    const testData = new URLSearchParams({
      data: btoa(JSON.stringify([{
        event: '_test_connectivity',
        properties: {
          distinct_id: 'test',
          token: mixpanelInitialized ? (isProd ? MIXPANEL_PROD_TOKEN : MIXPANEL_DEV_TOKEN) : 'test',
          time: Date.now()
        }
      }]))
    });

    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: testData,
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });

    if (!response.ok) {
      throw new Error(`Test request failed: ${response.status}`);
    }

    console.log('[Mixpanel] Connectivity test passed');
    return true;
  } catch (error) {
    console.warn('[Mixpanel] Connectivity test failed - analytics likely blocked:', error);
    analyticsBlocked = true;
    if (!errorLogged) {
      console.warn('[Mixpanel] Analytics requests appear to be blocked by an ad blocker or privacy extension. This is expected behavior and won\'t affect the application functionality.');
      errorLogged = true;
    }
    return false;
  }
};

// Initialize Mixpanel with the appropriate token
try {
  if (isProd && MIXPANEL_PROD_TOKEN) {
    mixpanel.init(MIXPANEL_PROD_TOKEN, { 
      debug: false, 
      ignore_dnt: true,
      cross_subdomain_cookie: false,
      secure_cookie: true,
      xhr_headers: {
        'Access-Control-Allow-Origin': '*'
      },
      // Disable automatic tracking to prevent immediate blocked requests
      track_pageview: false,
      track_links_timeout: 0
    });
    mixpanelInitialized = true;
    console.log('[Mixpanel] Production analytics initialized');
    
    // Test connectivity after a short delay
    setTimeout(() => testMixpanelConnectivity(), 1000);
  } else if (isDev && MIXPANEL_DEV_TOKEN) {
    mixpanel.init(MIXPANEL_DEV_TOKEN, { 
      debug: true, 
      ignore_dnt: true,
      cross_subdomain_cookie: false,
      secure_cookie: true,
      xhr_headers: {
        'Access-Control-Allow-Origin': '*'
      },
      // Disable automatic tracking to prevent immediate blocked requests
      track_pageview: false,
      track_links_timeout: 0
    });
    mixpanelInitialized = true;
    console.log('[Mixpanel] Development analytics initialized');
    
    // Test connectivity after a short delay
    setTimeout(() => testMixpanelConnectivity(), 1000);
  } else if (isTest) {
    // In test environments, use a mock implementation
    console.log('[Mixpanel] Test environment detected, tracking disabled');
  } else {
    // No token available
    console.warn('[Mixpanel] No analytics token configured, tracking disabled');
  }
} catch (error) {
  console.warn('[Mixpanel] Failed to initialize:', error);
  mixpanelInitialized = false;
}

// Graceful error handler to reduce console spam
const handleAnalyticsError = (error: ErrorWithMessage) => {
  // Check if error is related to network/request blocking
  if (error && (
      error.toString().includes('network error') || 
      error.message?.includes('network error') ||
      error.toString().includes('blocked') ||
      error.message?.includes('blocked') ||
      error.toString().includes('ERR_BLOCKED_BY_CLIENT') ||
      error.message?.includes('ERR_BLOCKED_BY_CLIENT'))
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
  trackEvent: async (eventName: string, properties?: MixpanelProperties) => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Track: ${eventName}`, properties);
      return;
    }
    
    // Skip if Mixpanel is not initialized
    if (!mixpanelInitialized) return;
    
    // Test connectivity if not already done
    if (!connectivityTested) {
      const isConnected = await testMixpanelConnectivity();
      if (!isConnected) return;
    }
    
    // Skip if analytics is blocked
    if (analyticsBlocked) return;
    
    try {
      mixpanel.track(eventName, properties);
      if (isDev) console.log(`[Mixpanel] Tracked: ${eventName}`, properties);
    } catch (error) {
      handleAnalyticsError(error as ErrorWithMessage);
    }
  },
  
  identify: async (userId: string) => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Identify: ${userId}`);
      return;
    }
    
    // Skip if Mixpanel is not initialized
    if (!mixpanelInitialized) return;
    
    // Test connectivity if not already done
    if (!connectivityTested) {
      const isConnected = await testMixpanelConnectivity();
      if (!isConnected) return;
    }
    
    // Skip if analytics is blocked
    if (analyticsBlocked) return;
    
    try {
      mixpanel.identify(userId);
      if (isDev) console.log(`[Mixpanel] Identified user: ${userId}`);
    } catch (error) {
      handleAnalyticsError(error as ErrorWithMessage);
    }
  },
  
  setUserProfile: async (properties: MixpanelProperties) => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Set Profile:`, properties);
      return;
    }
    
    // Skip if Mixpanel is not initialized
    if (!mixpanelInitialized) return;
    
    // Test connectivity if not already done
    if (!connectivityTested) {
      const isConnected = await testMixpanelConnectivity();
      if (!isConnected) return;
    }
    
    // Skip if analytics is blocked
    if (analyticsBlocked) return;
    
    try {
      mixpanel.people.set(properties);
      if (isDev) console.log(`[Mixpanel] Set profile:`, properties);
    } catch (error) {
      handleAnalyticsError(error as ErrorWithMessage);
    }
  },
  
  reset: () => {
    if (isTest) {
      console.log(`[Mixpanel Mock] Reset`);
      return;
    }
    
    // Skip if Mixpanel is not initialized
    if (!mixpanelInitialized) return;
    
    // Skip if analytics is blocked
    if (analyticsBlocked) return;
    
    try {
      mixpanel.reset();
      if (isDev) console.log(`[Mixpanel] Reset tracking`);
    } catch (error) {
      handleAnalyticsError(error as ErrorWithMessage);
    }
  },
  
  // Expose blocked state for components that need to know
  isBlocked: () => analyticsBlocked,
  
  // Expose initialization state
  isInitialized: () => mixpanelInitialized,
  
  // Manual connectivity test
  testConnectivity: testMixpanelConnectivity
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

// Listen for fetch errors that might indicate blocked requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const response = await originalFetch(...args);
    return response;
  } catch (error) {
    // Check if this is a Mixpanel request that was blocked
    const urlArg = args[0];
    let url: string = '';
    
    if (typeof urlArg === 'string') {
      url = urlArg;
    } else if (urlArg instanceof Request) {
      url = urlArg.url;
    } else if (urlArg instanceof URL) {
      url = urlArg.toString();
    }
    
    if (url && url.includes('api-js.mixpanel.com')) {
      analyticsBlocked = true;
      if (!errorLogged) {
        console.warn('[Mixpanel] Request blocked by ad blocker - disabling further analytics requests');
        errorLogged = true;
      }
      // Return a fake successful response to prevent further errors
      return new Response('{}', { status: 200 });
    }
    throw error;
  }
};

export default mixpanel; 