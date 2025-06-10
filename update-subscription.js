// Run this in your browser console to update the push subscription
async function updatePushSubscriptionInDatabase() {
  try {
    console.log('🔄 Updating push subscription in database...');
    
    // Get fresh subscription data
    const subscriptionData = JSON.parse(localStorage.getItem('pushSubscription'));
    if (!subscriptionData) {
      throw new Error('No subscription data found in localStorage');
    }
    
    console.log('📋 Using subscription data:', subscriptionData);
    
    // Make direct API call to update subscription
    const response = await fetch('https://idcgvnwatraddbsppxzl.supabase.co/rest/v1/push_subscriptions', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2d2bndhdHJhZGRic3BweHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5ODI4NzIsImV4cCI6MjA0ODU1ODg3Mn0.cW8nJOFXHZXkHtcjrTkglNsv_dMZaJY4yrPo05tXfnY',
        'Authorization': `Bearer ${(await window.supabase?.auth.getSession())?.data?.session?.access_token || 'no-token'}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        endpoint: subscriptionData.endpoint,
        p256dh_key: subscriptionData.keys.p256dh,
        auth_key: subscriptionData.keys.auth
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Update failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Database updated successfully!', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to update database:', error);
    
    // If that fails, let's try the manual approach
    console.log('📝 Manual update needed. Please run this SQL in Supabase dashboard:');
    console.log(`
UPDATE push_subscriptions 
SET 
  endpoint = '${subscriptionData.endpoint}',
  p256dh_key = '${subscriptionData.keys.p256dh}',
  auth_key = '${subscriptionData.keys.auth}',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'phermmodynamic@gmail.com'
);
    `);
    
    throw error;
  }
}

// Copy this function and run it in your browser console
console.log('📋 Copy and run: updatePushSubscriptionInDatabase()'); 