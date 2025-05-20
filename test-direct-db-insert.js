// Test script for direct subscription inserts with various frequency values
// Run with: node test-direct-db-insert.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client (you'll need to provide your own credentials)
const supabaseUrl = 'https://idcgvnwatraddbsppxzl.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY; // Set this environment variable before running

if (!supabaseKey) {
  console.error('Error: SUPABASE_KEY environment variable not set');
  console.log('Run with: SUPABASE_KEY=your_key node test-direct-db-insert.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test function to insert a subscription with a specific frequency
async function testFrequencyInsert(frequency, originalFrequency) {
  console.log(`\nTesting insert with frequency: "${frequency}" (original: "${originalFrequency}")`);

  try {
    // Generate a unique ID for testing
    const testId = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Get first user ID for testing
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (userError || !userData || userData.length === 0) {
      console.error('Error fetching user ID:', userError || 'No users found');
      return false;
    }
    
    const userId = userData[0].id;
    
    const subscription = {
      subscription_id: testId,
      name: `Test Subscription ${testId}`,
      amount: 100,
      frequency: frequency,
      next_billing_date: new Date().toISOString().split('T')[0],
      is_active: true,
      user_id: userId,
      auto_renew: true,
      reminder_days: 3
    };
    
    console.log('Subscription data to insert:', subscription);
    
    // Try to insert the subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([subscription])
      .select()
      .single();
      
    if (error) {
      console.error(`❌ Insert failed with frequency "${frequency}":`, error);
      return false;
    }
    
    console.log(`✅ Successfully inserted subscription with frequency "${frequency}"`);
    console.log('Inserted data:', data);
    
    // Clean up test data
    const { error: deleteError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('subscription_id', testId);
      
    if (deleteError) {
      console.warn(`Warning: Could not delete test subscription ${testId}:`, deleteError);
    }
    
    return true;
  } catch (err) {
    console.error(`❌ Exception testing frequency "${frequency}":`, err);
    return false;
  }
}

// Run tests for different frequency values
async function runTests() {
  console.log('=== TESTING DIRECT SUBSCRIPTION INSERTS WITH DIFFERENT FREQUENCIES ===');
  
  // Valid values according to the database
  const results = await Promise.all([
    testFrequencyInsert('monthly', 'MONTHLY'),
    testFrequencyInsert('yearly', 'ANNUALLY'),
    testFrequencyInsert('quarterly', 'QUARTERLY'),
    testFrequencyInsert('weekly', 'WEEKLY')
  ]);
  
  // Summary
  console.log('\n=== TEST RESULTS SUMMARY ===');
  console.log(`monthly: ${results[0] ? '✅ Success' : '❌ Failed'}`);
  console.log(`yearly: ${results[1] ? '✅ Success' : '❌ Failed'}`);
  console.log(`quarterly: ${results[2] ? '✅ Success' : '❌ Failed'}`);
  console.log(`weekly: ${results[3] ? '✅ Success' : '❌ Failed'}`);
}

// Run the tests
runTests()
  .catch(err => console.error('Test execution error:', err))
  .finally(() => process.exit(0)); 