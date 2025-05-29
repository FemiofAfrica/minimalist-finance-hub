// Test file to verify proxy server is working
import fetch from 'node-fetch';

async function testProxy() {
  try {
    console.log('Testing proxy server...');
    
    // First try OPTIONS request
    const optionsResponse = await fetch('http://localhost:3000/functions/parse-transaction-groq', {
      method: 'OPTIONS',
    });
    
    console.log('OPTIONS request status:', optionsResponse.status, optionsResponse.statusText);
    console.log('Headers:', Object.fromEntries(optionsResponse.headers.entries()));
    
    // Then try POST request
    const postResponse = await fetch('http://localhost:3000/functions/parse-transaction-groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'I sent 5k to Abdul for my haircut'
      })
    });
    
    console.log('\nPOST request status:', postResponse.status, postResponse.statusText);
    
    if (postResponse.ok) {
      const data = await postResponse.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const text = await postResponse.text();
      console.log('Error response:', text);
    }
  } catch (error) {
    console.error('Error testing proxy:', error);
  }
}

// Run the test
testProxy(); 