# API Testing Guide for FinTrack Migration

This guide explains how to test the Express API endpoints before proceeding with the frontend migration from Supabase to Express API.

## Overview

We've created a test script (`test-api-endpoints.js`) that verifies the functionality of the key API endpoints used by our services, particularly the `searchService.axios.ts` file. This testing ensures that our Express backend is correctly handling requests and returning the expected data structures before we complete the frontend migration.

## Prerequisites

- Node.js installed
- Express server running on port 3456
- Valid test user ID in your database

## Setup

1. Make sure your Express server is running:
   ```
   node server.js
   ```

2. Open the `test-api-endpoints.js` file and update the `TEST_USER_ID` constant with a valid user ID from your database:
   ```javascript
   const TEST_USER_ID = 'your-test-user-id'; // Replace with actual test user ID
   ```

## Running the Tests

Execute the test script with:

```
node test-api-endpoints.js
```

## What's Being Tested

The script tests the following endpoints:

1. **Transactions Endpoint** (`/api/transactions`)
   - Verifies that we can fetch transactions for a user
   - Checks that the response includes transactions, totalIncome, totalExpenses, and netBalance

2. **Transaction Search** (`/api/transactions?query=...`)
   - Tests searching transactions by description
   - Validates the response format

3. **Accounts Endpoint** (`/api/accounts`)
   - Verifies that we can fetch accounts for a user
   - Checks the response format

4. **Cards Endpoint** (`/api/cards`)
   - Verifies that we can fetch cards for a user
   - Checks the response format

5. **Search Functionality**
   - Simulates the client-side filtering that happens in `searchService.axios.ts`
   - Tests searching for accounts and cards by name

## Expected Output

The script provides colored console output indicating the success or failure of each test. A successful test run should show green checkmarks (✓) for each endpoint tested.

Example output:
```
API ENDPOINT TESTING SCRIPT
Testing endpoints used by searchService.axios.ts

✓ Server is running

==================================================
 Testing Transactions Endpoint 
==================================================

Fetching transactions...
✓ Retrieved 15 transactions
Total Income: 5000
Total Expenses: 2500
Net Balance: 2500

==================================================
 Testing Transaction Search 
==================================================

Searching transactions with query: "test"...
✓ Search returned 3 transactions
Sample results:
  1. Test Payment - $50.00
  2. Test Deposit - $100.00
  3. Testing Service - $25.00

// ... more output for other endpoints ...

TESTING COMPLETE
```

## Troubleshooting

- If the server connection fails, make sure your Express server is running on port 3456
- If you see "Unexpected response format" errors, check that your API endpoints are returning data in the expected format
- If authentication errors occur, verify that the TEST_USER_ID is valid and has access to the requested resources

## Next Steps

Once all tests pass successfully, you can proceed with confidence to the next steps of the migration process, knowing that your Express API endpoints are working correctly and compatible with the frontend services.