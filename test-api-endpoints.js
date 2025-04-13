/**
 * API Endpoint Testing Script
 * 
 * This script tests the Express API endpoints that are used by our searchService.axios.ts
 * to ensure they're working correctly before proceeding with the frontend migration.
 * 
 * Run with: node test-api-endpoints.js
 */

import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://localhost:3456'; // Match the port in server.js
axios.defaults.baseURL = API_BASE_URL;

// Test user ID - replace with a valid user ID from your database
const TEST_USER_ID = '3393a074-8692-4d58-87cd-77d910b5cdfc'; // This appears to be a valid UUID format

// Verify this is a valid user ID in your database before running tests
// If this ID doesn't exist in your database, replace it with a valid one

// Test data
const testQuery = 'test';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

/**
 * Log a message with color
 */
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Log a success message
 */
function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

/**
 * Log an error message
 */
function logError(message, error) {
  log(`✗ ${message}`, colors.red);
  if (error) {
    console.error('  Error details:', error.response?.data || error.message || error);
  }
}

/**
 * Log a section header
 */
function logSection(title) {
  console.log('\n' + colors.bright + colors.blue + '='.repeat(50) + colors.reset);
  console.log(colors.bright + colors.blue + ` ${title} ` + colors.reset);
  console.log(colors.bright + colors.blue + '='.repeat(50) + colors.reset + '\n');
}

/**
 * Test if the server is running
 */
async function testServerConnection() {
  try {
    const response = await axios.get('/');
    logSuccess('Server is running');
    log(`Server responded with status: ${response.status}`, colors.blue);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logError('Server connection failed. Make sure the server is running on port 3456');
      log('Run the server with: node server.js', colors.yellow);
    } else if (error.response) {
      // The server responded with a status code outside the 2xx range
      log(`Server is running but returned status: ${error.response.status}`, colors.blue);
      logSuccess('Server is running (returned error response, but that\'s okay for this test)');
      return true;
    } else if (error.request) {
      // The request was made but no response was received
      logError('No response received from server. Check if it\'s running on port 3456');
    } else {
      // Something else happened while setting up the request
      logError(`Error setting up request: ${error.message}`);
    }
    return error.response ? true : false; // Return true if we got any response
  }
}

/**
 * Test the transactions endpoint
 */
async function testTransactionsEndpoint() {
  logSection('Testing Transactions Endpoint');
  
  try {
    log('Fetching transactions...', colors.yellow);
    const response = await axios.get('/api/transactions', {
      params: { userId: TEST_USER_ID }
    });
    
    if (response.data && response.data.transactions) {
      logSuccess(`Retrieved ${response.data.transactions.length} transactions`);
      log(`Total Income: ${response.data.totalIncome}`, colors.blue);
      log(`Total Expenses: ${response.data.totalExpenses}`, colors.blue);
      log(`Net Balance: ${response.data.netBalance}`, colors.blue);
      
      // Log a few sample transactions
      if (response.data.transactions.length > 0) {
        log('Sample transactions:', colors.blue);
        response.data.transactions.slice(0, 3).forEach((tx, i) => {
          log(`  ${i+1}. ${tx.description || 'No description'} - $${Math.abs(tx.amount).toFixed(2)} - Date: ${new Date(tx.date).toLocaleDateString()}`, colors.blue);
        });
        
        // Verify transaction structure
        const sampleTransaction = response.data.transactions[0];
        const requiredFields = ['transaction_id', 'amount', 'description', 'date'];
        const missingFields = requiredFields.filter(field => !sampleTransaction.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
          log(`Warning: Transaction is missing expected fields: ${missingFields.join(', ')}`, colors.yellow);
        } else {
          log('Transaction structure looks good', colors.green);
        }
      } else {
        log('No transactions found for this user. You may need to create some transactions first.', colors.yellow);
      }
      
      return true;
    } else {
      logError('Unexpected response format from transactions endpoint');
      log('Expected response.data to contain a transactions array', colors.yellow);
      return false;
    }
  } catch (error) {
    logError('Failed to fetch transactions', error);
    return false;
  }
}

/**
 * Test the transaction search functionality
 */
async function testTransactionSearch() {
  logSection('Testing Transaction Search');
  
  try {
    log(`Searching transactions with query: "${testQuery}"...`, colors.yellow);
    const response = await axios.get('/api/transactions', {
      params: { userId: TEST_USER_ID, query: testQuery }
    });
    
    if (response.data && response.data.transactions) {
      logSuccess(`Search returned ${response.data.transactions.length} transactions`);
      
      // Log the first few results
      if (response.data.transactions.length > 0) {
        log('Sample results:', colors.blue);
        response.data.transactions.slice(0, 3).forEach((tx, i) => {
          log(`  ${i+1}. ${tx.description || 'No description'} - $${Math.abs(tx.amount).toFixed(2)}`, colors.blue);
        });
      } else {
        log('No matching transactions found. This may be expected if no transactions match the search query.', colors.yellow);
      }
      
      return true;
    } else {
      logError('Unexpected response format from transaction search');
      return false;
    }
  } catch (error) {
    logError('Failed to search transactions', error);
    return false;
  }
}

/**
 * Test the accounts endpoint
 */
async function testAccountsEndpoint() {
  logSection('Testing Accounts Endpoint');
  
  try {
    log('Fetching accounts...', colors.yellow);
    const response = await axios.get('/api/accounts', {
      params: { userId: TEST_USER_ID }
    });
    
    if (Array.isArray(response.data)) {
      logSuccess(`Retrieved ${response.data.length} accounts`);
      
      // Log the accounts
      if (response.data.length > 0) {
        log('Accounts:', colors.blue);
        response.data.forEach((account, i) => {
          log(`  ${i+1}. ${account.name || 'Unnamed'} - Balance: $${account.balance.toFixed(2)} - ID: ${account.account_id}`, colors.blue);
        });
        
        // Verify account structure matches what searchService.axios.ts expects
        const sampleAccount = response.data[0];
        const requiredFields = ['account_id', 'name', 'balance'];
        const missingFields = requiredFields.filter(field => !sampleAccount.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
          log(`Warning: Account is missing fields required by searchService: ${missingFields.join(', ')}`, colors.yellow);
        } else {
          log('Account structure matches searchService requirements', colors.green);
        }
      } else {
        log('No accounts found for this user. You may need to create some accounts first.', colors.yellow);
      }
      
      return true;
    } else {
      logError('Unexpected response format from accounts endpoint');
      return false;
    }
  } catch (error) {
    logError('Failed to fetch accounts', error);
    return false;
  }
}

/**
 * Test the cards endpoint
 */
async function testCardsEndpoint() {
  logSection('Testing Cards Endpoint');
  
  try {
    log('Fetching cards...', colors.yellow);
    const response = await axios.get('/api/cards', {
      params: { userId: TEST_USER_ID }
    });
    
    if (Array.isArray(response.data)) {
      logSuccess(`Retrieved ${response.data.length} cards`);
      
      // Log the cards
      if (response.data.length > 0) {
        log('Cards:', colors.blue);
        response.data.forEach((card, i) => {
          log(`  ${i+1}. ${card.card_name || 'Unnamed'} - ${card.card_type || 'No type'} - ID: ${card.card_id}`, colors.blue);
        });
        
        // Verify card structure matches what searchService.axios.ts expects
        const sampleCard = response.data[0];
        const requiredFields = ['card_id', 'card_name'];
        const missingFields = requiredFields.filter(field => !sampleCard.hasOwnProperty(field));
        
        if (missingFields.length > 0) {
          log(`Warning: Card is missing fields required by searchService: ${missingFields.join(', ')}`, colors.yellow);
        } else {
          log('Card structure matches searchService requirements', colors.green);
        }
      } else {
        log('No cards found for this user. You may need to create some cards first.', colors.yellow);
      }
      
      return true;
    } else {
      logError('Unexpected response format from cards endpoint');
      return false;
    }
  } catch (error) {
    logError('Failed to fetch cards', error);
    return false;
  }
}

/**
 * Test the search functionality in searchService.axios.ts
 */
async function testSearchAccountsAndCards() {
  logSection('Testing Search Accounts and Cards');
  
  try {
    log(`Searching accounts and cards with query: "${testQuery}"...`, colors.yellow);
    
    // Test accounts search
    const accountsResponse = await axios.get('/api/accounts', {
      params: { userId: TEST_USER_ID }
    });
    
    // Test cards search
    const cardsResponse = await axios.get('/api/cards', {
      params: { userId: TEST_USER_ID }
    });
    
    // Verify the response formats match what searchService.axios.ts expects
    if (!Array.isArray(accountsResponse.data)) {
      log('Warning: Accounts endpoint response is not an array as expected by searchService.axios.ts', colors.yellow);
    }
    
    if (!Array.isArray(cardsResponse.data)) {
      log('Warning: Cards endpoint response is not an array as expected by searchService.axios.ts', colors.yellow);
    }
    
    // Simulate the client-side filtering that happens in searchService.axios.ts
    const filteredAccounts = (accountsResponse.data || []).filter(account => 
      account.name?.toLowerCase().includes(testQuery.toLowerCase())
    ).slice(0, 3).map(account => ({
      id: account.account_id,
      name: account.name,
      type: 'account'
    }));
    
    const filteredCards = (cardsResponse.data || []).filter(card => 
      card.card_name?.toLowerCase().includes(testQuery.toLowerCase())
    ).slice(0, 3).map(card => ({
      id: card.card_id,
      name: card.card_name,
      type: 'card'
    }));
    
    logSuccess(`Search returned ${filteredAccounts.length} accounts and ${filteredCards.length} cards`);
    
    // Log the results
    if (filteredAccounts.length > 0) {
      log('Matching accounts:', colors.blue);
      filteredAccounts.forEach((account, i) => {
        log(`  ${i+1}. ${account.name || 'Unnamed'} (${account.id})`, colors.blue);
      });
    } else {
      log('No accounts matched the search query. Try a different query or add accounts with matching names.', colors.yellow);
    }
    
    if (filteredCards.length > 0) {
      log('Matching cards:', colors.blue);
      filteredCards.forEach((card, i) => {
        log(`  ${i+1}. ${card.name || 'Unnamed'} (${card.id})`, colors.blue);
      });
    } else {
      log('No cards matched the search query. Try a different query or add cards with matching names.', colors.yellow);
    }
    
    // Verify the search implementation matches searchService.axios.ts
    log('Note: This test simulates the client-side filtering done in searchService.axios.ts', colors.yellow);
    log('The actual filtering is performed in the frontend, not in the API endpoints', colors.yellow);
    
    return true;
  } catch (error) {
    logError('Failed to search accounts and cards', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(colors.bright + '\nAPI ENDPOINT TESTING SCRIPT' + colors.reset);
  console.log('Testing endpoints used by searchService.axios.ts\n');
  
  // First check if the server is running
  const serverRunning = await testServerConnection();
  if (!serverRunning) {
    log('\nPlease start the server with: node server.js', colors.yellow);
    return;
  }
  
  // Run the tests and collect results
  const results = {
    transactions: await testTransactionsEndpoint(),
    transactionSearch: await testTransactionSearch(),
    accounts: await testAccountsEndpoint(),
    cards: await testCardsEndpoint(),
    search: await testSearchAccountsAndCards()
  };
  
  // Display summary
  logSection('Test Results Summary');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result).length;
  
  if (passedTests === totalTests) {
    log(`All tests passed! (${passedTests}/${totalTests})`, colors.green);
    log('The API endpoints required by searchService.axios.ts are working correctly.', colors.green);
  } else {
    log(`${passedTests} out of ${totalTests} tests passed.`, colors.yellow);
    
    // List failed tests
    const failedTests = Object.entries(results)
      .filter(([_, result]) => !result)
      .map(([name, _]) => name);
    
    log('Failed tests:', colors.red);
    failedTests.forEach(test => log(`  - ${test}`, colors.red));
    log('\nPlease fix the issues with these endpoints before proceeding with the frontend migration.', colors.yellow);
  }
  
  console.log('\n' + colors.bright + 'TESTING COMPLETE' + colors.reset + '\n');
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error during testing:', error);
});