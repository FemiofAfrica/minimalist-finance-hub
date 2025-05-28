# Guide to Update the Supabase Edge Function

## Steps to update the `parse-transaction-groq` function

1. **Log in to your Supabase Dashboard**
   - Go to your project dashboard

2. **Navigate to Edge Functions**
   - In the left sidebar, click on "Edge Functions"
   - Find and select the `parse-transaction-groq` function

3. **Edit the Function**
   - Look for the `callGroqAPI` function, which contains the prompt
   - Find the prompt variable definition, which should look like:
     ```javascript
     const prompt = `
       You are a transaction parser that outputs ONLY raw JSON.
       Parse the following transaction text strictly into this JSON format:
       ...
     `;
     ```

4. **Replace the Prompt**
   - Replace the entire prompt content with the improved prompt from `improved_groq_prompt.txt`
   - Make sure to keep the same format with backticks

5. **Update the Category Patterns (Optional but Recommended)**
   - Find the `patterns.categories` array (around line 425-447)
   - Replace it with the improved categories array from `improved_category_matching.js`
   - This ensures both the AI and fallback mechanism use the same categories

6. **Deploy the Updated Function**
   - Save the changes
   - Deploy the updated function

## Benefits of the Improved Prompt

1. **Explicit Category List**: Provides a clear list of categories with descriptions
2. **Critical Categorization Rules**: Explicitly maps certain keywords to specific categories
3. **Detailed Examples**: Includes diverse examples that demonstrate proper categorization
4. **Specific Personal Care Example**: Explicitly shows that haircuts belong to "Personal Care"
5. **Clearer Instructions**: Gives the AI more precise instructions for categorization

## Testing the Updated Function

After deploying, test the function with these inputs:

1. "Got a haircut for 5000"
2. "Spent 3300 on biscuits and garri"
3. "Paid 15000 for electricity bill"

The function should now correctly categorize:
- Haircuts as "Personal Care"
- Biscuits and garri as "Groceries"
- Electricity bill as "Utilities"

This update leverages the AI's capabilities while providing clear guidelines for proper categorization. 