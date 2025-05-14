// Copy and paste this entire script into your browser console when on the app
// Then refresh the page to see the onboarding flow

(function resetOnboarding() {
  // Get all localStorage keys
  const keys = Object.keys(localStorage);
  
  // Filter keys that start with "onboarding-completed-"
  const onboardingKeys = keys.filter(key => key.startsWith('onboarding-completed-'));
  
  if (onboardingKeys.length === 0) {
    console.log('No onboarding states found in localStorage.');
    return;
  }
  
  console.log(`Found ${onboardingKeys.length} onboarding states to reset:`);
  
  // Remove each onboarding key
  onboardingKeys.forEach(key => {
    console.log(`Removing: ${key}`);
    localStorage.removeItem(key);
  });
  
  console.log('✅ Onboarding state has been reset successfully!');
  console.log('🔄 Refresh the page to see the onboarding flow.');
})(); 