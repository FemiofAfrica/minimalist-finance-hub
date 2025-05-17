# Category Column Name Fixes

This document provides a comprehensive guide to fixing the issues with category column name references in the FinTrack application.

## The Problem

The database schema uses columns `name` and `type` for the categories table, but parts of the application are trying to access non-existent columns `category_name` and `category_type`.

## Files Updated

1. **src/components/ChatInput.tsx**
   - Fixed category lookup query: `.eq('name', parsedData.category_name)` instead of `.eq('category_name', parsedData.category_name)`
   - Fixed category insert: `name` and `type` instead of `category_name` and `category_type` 
   - Removed redundant fields from transaction insert

2. **src/services/dashboardService.ts**
   - Updated all category queries to use `categories (name, type)` instead of `categories (category_name, category_type)`
   - Updated data access in functions to reference `categories.name` and `categories.type`

3. **src/integrations/supabase/database.types.ts**
   - Fixed TypeScript interface definitions to match the actual database schema
   - Updated `Row`, `Insert`, and `Update` types to use `name` and `type`

## Database SQL Fix

Created `fix_application_functions.sql` with:

1. An updated `create_transaction` function that:
   - Correctly references the categories table columns
   - Uses proper SQL queries to find existing categories by name/type
   - Updates account balances correctly

2. A fixed `transaction_details` view that:
   - Joins transactions with accounts and categories 
   - Properly aliases fields for backward compatibility

## How to Apply the Fixes

### 1. Frontend Code

Deploy the updated TypeScript files:
- ChatInput.tsx
- dashboardService.ts 
- database.types.ts

### 2. Database Functions

Execute the SQL script in the Supabase SQL Editor:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor 
3. Paste the contents of `fix_application_functions.sql`
4. Run the script

### 3. Testing

After applying the fixes, test the following workflows:
- Creating new transactions with categories
- Viewing transactions in the dashboard
- Checking that the pie charts display correctly
- Verifying that account balances update properly

## Additional Considerations

- If you encounter any other parts of the code that reference `category_name` or `category_type`, update them to use `name` and `type`.
- Remember that TypeScript types and the actual database schema must stay in sync.
- If needed, run `npx supabase gen types typescript --schema public > src/integrations/supabase/database.types.ts` to regenerate your database types. 