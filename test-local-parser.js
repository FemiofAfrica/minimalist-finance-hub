// Test script for the local transaction parser
import fetch from 'node-fetch';

async function testLocalParser() {
  try {
    const testCases = [
      'I sent 5k to Abdul for my haircut',
      'Received salary 400,000 from company',
      'Paid electricity bill 15000',
      'Uber ride to work 3500',
      'Supermarket shopping 12000',
      'Transfer 25000 to Mom',
      'Internet subscription 10k'
    ];
    
    console.log('Testing local transaction parser...\n');
    
    for (const text of testCases) {
      console.log(`\nParsing: "${text}"`);
      
      const response = await fetch('http://localhost:3000/parse-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        console.error(`Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(errorText);
        continue;
      }
      
      const result = await response.json();
      console.log('Result:', JSON.stringify(result, null, 2));
    }
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
testLocalParser(); 