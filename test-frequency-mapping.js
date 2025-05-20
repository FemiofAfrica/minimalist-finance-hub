// Test script for the subscription frequency mapping
// Import the mapping functions directly from our TypeScript file
// Note: This is a simplified test for demonstration purposes

// Copy of the mapping function from subscription.ts
function mapAppFrequencyToDBFrequency(appFrequency) {
  // Always convert to string and lowercase for consistency
  const frequency = String(appFrequency).toLowerCase();
  
  switch (frequency) {
    case 'monthly':
      return 'monthly';
    case 'annually':
      return 'yearly'; // DB uses 'yearly' not 'annually'
    case 'quarterly':
      return 'quarterly';
    case 'weekly':
      return 'weekly';
    case 'custom':
      return 'monthly'; // Default to monthly as custom is not in the enum
    default:
      // Handle uppercase inputs
      if (frequency === 'monthly' || frequency === 'MONTHLY'.toLowerCase()) return 'monthly';
      if (frequency === 'annually' || frequency === 'ANNUALLY'.toLowerCase()) return 'yearly';
      if (frequency === 'quarterly' || frequency === 'QUARTERLY'.toLowerCase()) return 'quarterly';
      if (frequency === 'weekly' || frequency === 'WEEKLY'.toLowerCase()) return 'weekly';
      return 'monthly'; // Default to monthly
  }
}

// Test with various inputs
const testValues = [
  'MONTHLY',
  'monthly',
  'Monthly',
  'ANNUALLY',
  'annually',
  'Annually',
  'QUARTERLY',
  'quarterly',
  'Quarterly',
  'WEEKLY',
  'weekly',
  'Weekly',
  'CUSTOM',
  'custom',
  'Custom',
  'invalid'
];

// Run tests and print results
console.log('Testing frequency mapping function:');
console.log('----------------------------------');
for (const value of testValues) {
  const mappedValue = mapAppFrequencyToDBFrequency(value);
  console.log(`Input: "${value}" => Output: "${mappedValue}"`);
}

// Valid database enum values from Supabase schema (for reference)
console.log('\nValid Supabase enum values:');
console.log('- monthly');
console.log('- yearly');
console.log('- quarterly');
console.log('- weekly'); 