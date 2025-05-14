// This script resets the onboarding state in localStorage
// It removes all onboarding-completed-* entries
// Run with: node reset-onboarding.js

// Function to clear onboarding state
function clearOnboardingState() {
  if (typeof localStorage !== 'undefined') {
    // Get all keys in localStorage
    const keys = Object.keys(localStorage);
    
    // Filter for onboarding keys
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding-completed-'));
    
    if (onboardingKeys.length > 0) {
      console.log(`Found ${onboardingKeys.length} onboarding states to reset:`);
      
      // Remove each key
      onboardingKeys.forEach(key => {
        console.log(` - Removing ${key}`);
        localStorage.removeItem(key);
      });
      
      console.log('All onboarding states have been reset!');
    } else {
      console.log('No onboarding states found in localStorage.');
    }
  } else {
    console.error('localStorage is not available in this environment.');
  }
}

// When running in browser
if (typeof window !== 'undefined') {
  clearOnboardingState();
  console.log('You can now refresh the page to see the onboarding flow again.');
}

// Export for possible use in other contexts
module.exports = clearOnboardingState; 