// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - This file uses Deno modules which TypeScript doesn't recognize in Node.js context
import { serve as serveHttp } from "https://deno.land/std@0.201.0/http/server.ts";

// Define standard CORS headers for responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allow requests from any origin
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type", // Allowed headers
  "Content-Type": "application/json", // Default content type for responses
};

// --- Interfaces ---
// Define the interface for parsed transaction data expected from the LLM/fallback
interface LocalParsedTransaction {
  description: string;
  amount: number;
  category_name: string;
  category_type: "INCOME" | "EXPENSE" | "TRANSFER"; // Added TRANSFER type
  date?: string; // Optional date field added by the main handler
  source_account?: string; // Optional field for source account in transfers
  destination_account?: string; // Optional field for destination account in transfers
  is_transfer?: boolean; // Flag to indicate if it's a transfer transaction
}

// --- Groq API Connection Verification (Optional) ---
// Function to test the connection to the Groq API using the provided API key.
// Prefix with underscore indicates it might be unused but kept for potential future use.
async function _verifyGroqConnection(apiKey: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    // Send a minimal test request to the Groq chat completions endpoint
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-70b-8192", // Use a valid model
          messages: [{ role: "user", content: "Test connection" }],
          temperature: 0.1,
          max_tokens: 5, // Limit response size for test
        }),
        signal: controller.signal, // Link request to the abort controller
      },
    );

    clearTimeout(timeoutId); // Clear the timeout if the request completes

    // Check if the API returned a non-successful status code
    if (!response.ok) {
      let errorText;
      try {
        // Try to parse error details from the response body
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch {
        // Fallback to plain text if JSON parsing fails
        errorText = await response.text();
      }
      console.error(
        `Groq API connection test failed (${response.status}):`,
        errorText,
      );
      return false; // Connection failed
    }

    // Check if the response body is valid JSON and has the expected structure
    try {
      const data = await response.json();
      // Basic validation of the response structure
      if (!data || typeof data !== "object" || !Array.isArray(data.choices)) {
        console.error(
          "Invalid response format from Groq API during connection test:",
          data,
        );
        return false;
      }
      // Check if we received a valid message content string
      return typeof data.choices?.[0]?.message?.content === "string";
    } catch (parseError) {
      console.error(
        "Error parsing Groq API response during connection test:",
        parseError,
      );
      return false; // Parsing failed
    }
  } catch (error: unknown) {
    // Handle specific errors like timeouts or general network issues
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Groq API connection timeout during test.");
    } else {
      console.error("Error verifying Groq connection:", error);
    }
    return false; // Connection failed due to error
  }
}

// --- Date Parsing Utility ---
// Parses relative date terms or YYYY-MM-DD format from text.
// Defaults to the baseDate (or current date if not provided).
function parseRelativeDate(text: string, baseDate: Date = new Date()): string {
  // Create a date object representing the start of the baseDate (local time)
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const lowerText = text.toLowerCase(); // Case-insensitive matching

  // Check for relative terms first
  if (lowerText.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  }

  if (lowerText.includes("last week")) {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return lastWeek.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  }

  if (lowerText.includes("last month")) {
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    // Adjust day if necessary (e.g., March 31st -> Feb 28th/29th)
    if (lastMonth.getDate() < today.getDate()) {
      lastMonth.setDate(0); // Go to the last day of the previous month
    }
    return lastMonth.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  }

  // Check for explicit date format YYYY-MM-DD using regex
  const dateMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    // Validate the matched date parts
    const year = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]); // 1-based month
    const day = parseInt(dateMatch[3]);
    const parsedDate = new Date(year, month - 1, day); // Month is 0-based in Date constructor

    // Ensure the parsed date is valid and matches the input parts
    if (
      !isNaN(parsedDate.getTime()) &&
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day
    ) {
      return dateMatch[0]; // Return the valid YYYY-MM-DD string
    }
  }

  // Default to today's date if "today" is mentioned or no other date is found
  if (lowerText.includes('today')) {
      return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  // Default to the base date (usually today) if no specific date is found
  return today.toISOString().split("T")[0]; // Format as YYYY-MM-DD
}

// --- Fallback Parser ---
// Simple rule-based parser used when Groq API key is missing or API call fails.
function parseFallback(text: string): Response {
  const lowerText = text.toLowerCase();
  const fallbackData: LocalParsedTransaction = {
    description: "Unknown Transaction",
    amount: 0,
    category_name: "Uncategorized",
    category_type: "EXPENSE", // Default to EXPENSE
    date: parseRelativeDate(text), // Determine date using the utility function
  };

  // --- Regex Patterns for Extraction ---
  const patterns = {
    // Capture description (more robust pattern)
    description: /(?:for|on|at|:|bought|paid|spent|received)\\s+(.+?)(?:\\s+(?:₦|\\$|\d+(?:\.\d{1,2})?)|yesterday|today|last week|last month|$)/i,
    // Capture amount, allowing for currency symbols (optional) and commas/dots
    amount: /(\d+(?:\.\d{1,2})?)/, // Simplified pattern - focusing on digits and optional dot+digits
    // Keywords indicating income
    income: /(?:received|earned|got paid|salary|bonus|gift|refund|income|deposit)/i,
    // Keywords indicating expense (used if income keywords aren't found)
    expense: /(?:spent|bought|paid|purchased|payment|withdrawal|charge|fee)/i,
    // Keywords indicating a transfer
    transfer: /(?:transfer|transferred|moved|sent|move|send) (?:money|cash|\$|₦|#)?/i,
    // Patterns to extract source and destination accounts
    sourceAccount: /(?:from|out of|source) (?:my |the )?(.*?)(?:account|wallet|card|to|$)/i,
    destAccount: /(?:to|into|destination) (?:my |the )?(.*?)(?:account|wallet|card|$)/i,
    // Simple category keyword matching
    categories: [
        { name: "Groceries", patterns: /(?:groceries|supermarket|food shopping)/i },
        { name: "Dining", patterns: /(?:dinner|lunch|breakfast|restaurant|cafe|food|eat out)/i },
        { name: "Salary", patterns: /(?:salary|paycheck|wages)/i },
        { name: "Transport", patterns: /(?:fuel|gas|transport|uber|taxi|bus|train|bolt|lagos ride)/i },
        // Updated Utilities pattern
        { name: "Utilities", patterns: /(?:utilities|electricity|water|gas bill|internet|data|airtime|recharge|top-up|bill|nep[ha]|ikedc|ekedc)/i },
        { name: "Entertainment", patterns: /(?:movie|cinema|concert|show|game|entertainment|netflix|spotify)/i },
        { name: "Shopping", patterns: /(?:shopping|clothes|shoes|accessories|mall|amazon|jumia|konga)/i },
        { name: "Healthcare", patterns: /(?:medical|doctor|hospital|pharmacy|healthcare|chemist)/i },
        { name: "Education", patterns: /(?:tuition|course|books|school fees|education)/i },
        // Updated Housing pattern
        { name: "Housing", patterns: /(?:rent|mortgage|housing|accommodation)/i },
        { name: "Insurance", patterns: /(?:insurance|premium)/i }, // Added Insurance
        { name: "Gift", patterns: /(?:gift|present)/i },
        { name: "Transfer", patterns: /(?:transfer|moved|sent)/i },
      ]
  };

  // Check if this is a transfer transaction
  const isTransfer = patterns.transfer.test(lowerText);
  
  if (isTransfer) {
    fallbackData.is_transfer = true;
    fallbackData.category_type = "TRANSFER";
    fallbackData.category_name = "Transfer";
    
    // Extract source account
    const sourceMatch = lowerText.match(patterns.sourceAccount);
    if (sourceMatch && sourceMatch[1]) {
      fallbackData.source_account = sourceMatch[1].trim();
    }
    
    // Extract destination account
    const destMatch = lowerText.match(patterns.destAccount);
    if (destMatch && destMatch[1]) {
      fallbackData.destination_account = destMatch[1].trim();
    }
  }

  // --- Extraction Logic ---
  // Extract Amount
  const amountMatch = text.match(patterns.amount);
  console.log("Fallback Parser - Amount Match:", amountMatch); // DEBUG LOG
  if (amountMatch && amountMatch[1]) {
    // Remove commas and parse as float, ensure positive
    fallbackData.amount = Math.abs(parseFloat(amountMatch[1].replace(/,/g, "")));
    console.log("Fallback Parser - Extracted Amount:", fallbackData.amount); // DEBUG LOG
  } else {
    console.log("Fallback Parser - Amount pattern did not match or capture group 1 was empty.");
  }

  // Determine Category Type (Income/Expense/Transfer)
  if (!isTransfer) {
    if (patterns.income.test(lowerText)) {
      fallbackData.category_type = "INCOME";
    } else if (patterns.expense.test(lowerText)) {
      fallbackData.category_type = "EXPENSE";
    } // Defaults to EXPENSE if neither is strongly indicated
  }

  // --- Refactored Description Extraction ---
  let textWithoutAmountAndDate = text;
  let matchedDateKeyword = "";

  // Remove Amount
  if (amountMatch && amountMatch[0]) {
    textWithoutAmountAndDate = textWithoutAmountAndDate.replace(amountMatch[0], "").trim();
    console.log("Fallback Parser - Text after removing amount:", textWithoutAmountAndDate); // DEBUG LOG
  }

  // Identify and Remove Date Keyword
  const dateKeywords = ["yesterday", "today", "last week", "last month"];
  for (const keyword of dateKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i'); // Match whole word, case-insensitive
    if (regex.test(textWithoutAmountAndDate)) {
      matchedDateKeyword = keyword; // Store the keyword if needed later, though date is already parsed
      textWithoutAmountAndDate = textWithoutAmountAndDate.replace(regex, "").trim();
      console.log(`Fallback Parser - Text after removing date keyword '${keyword}':`, textWithoutAmountAndDate); // DEBUG LOG
      break; // Stop after finding the first keyword
    }
  }
  // Also attempt to remove explicit date format if present and wasn't part of amount
   const dateRegex = /(\d{4})-(\d{2})-(\d{2})/;
   if (dateRegex.test(textWithoutAmountAndDate)) {
       textWithoutAmountAndDate = textWithoutAmountAndDate.replace(dateRegex, "").trim();
       console.log("Fallback Parser - Text after removing explicit date:", textWithoutAmountAndDate); // DEBUG LOG
   }


  // --- Final Description Assignment from Cleaned Text ---
  let finalDesc = textWithoutAmountAndDate.trim();
  console.log("Fallback Parser - Cleaned text before final processing:", finalDesc); // DEBUG LOG

  // Remove common trailing keywords/prepositions that might be left after cleaning
  const trailingKeywordsRegex = /\s+(?:at|for|on|paid|spent|bought|received)$/i;
  finalDesc = finalDesc.replace(trailingKeywordsRegex, "").trim();
  console.log("Fallback Parser - Cleaned text after removing trailing keywords:", finalDesc); // DEBUG LOG

  // Capitalize
  if (finalDesc) {
    const lowerDesc = finalDesc.toLowerCase();
    fallbackData.description = lowerDesc.charAt(0).toUpperCase() + lowerDesc.slice(1);
  } else {
      // If somehow everything got removed, use default
       fallbackData.description = "Unknown Transaction";
  }
  console.log("Fallback Parser - Final Description Assigned:", fallbackData.description); // DEBUG LOG

  // Determine Category Name
  for (const category of patterns.categories) {
    if (category.patterns.test(lowerText)) {
      fallbackData.category_name = category.name;
      // Adjust type for specific categories if needed
      if (["Salary", "Gift"].includes(category.name) && fallbackData.category_type === "EXPENSE" && !patterns.expense.test(lowerText)) {
          fallbackData.category_type = "INCOME";
      }
      if (category.name === "Transfer" && !isTransfer) {
        if (patterns.income.test(lowerText)) {
          fallbackData.category_type = "INCOME";
        } else if (patterns.expense.test(lowerText)) {
          fallbackData.category_type = "EXPENSE";
        }
      }
      break; // Stop after first match
    }
  }

  // Log the process and result
  console.log("Fallback Parser - Input:", text);
  console.log("Fallback Parser - Result:", fallbackData);

  // Return the parsed data as a JSON response
  return new Response(JSON.stringify(fallbackData), { headers: corsHeaders });
}

// --- Groq API Call Function ---
// Calls the Groq API to parse the transaction text using an LLM.
async function callGroqAPI(apiKey: string, text: string): Promise<Response> {
  // Updated prompt with more specific category guidance and examples
  const prompt = `
    You are a transaction parser that outputs ONLY raw JSON.
    Parse the following transaction text strictly into this JSON format:
    {
      "description": "Brief description of the item/service (e.g., 'Groceries from Shoprite', 'Salary for March', 'Transfer between accounts')",
      "amount": 1234.56,
      "category_name": "Appropriate category (e.g., 'Groceries', 'Salary', 'Transport', 'Dining', 'Utilities', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Housing', 'Insurance', 'Gift', 'Transfer', 'Uncategorized')",
      "category_type": "INCOME, EXPENSE, or TRANSFER",
      "is_transfer": false,
      "source_account": null,
      "destination_account": null
    }

    RULES:
    1. Output ONLY the JSON object. No introductory text, explanations, apologies, or markdown code blocks (like \`\`\`json).
    2. 'amount' MUST be a positive number (integer or float). Do not include currency symbols.
    3. 'category_type' MUST be exactly "INCOME", "EXPENSE", or "TRANSFER". 
       - Use "TRANSFER" for moving money between accounts.
       - Use "INCOME" for receiving money, salary, etc.
       - Use "EXPENSE" for spending money.
    4. For transfers:
       - Set "is_transfer" to true
       - Set "category_name" to "Transfer"
       - Extract "source_account" and "destination_account" from the text if available
       - Example: "I transferred 500 from my savings account to my checking account" should extract "savings" as source_account and "checking" as destination_account
    5. 'category_name' should be one of the suggested categories if possible. Use 'Transfer' for money movements between accounts.
    6. 'description' should be concise. For transfers, indicate the source and destination when possible.
    7. DO NOT include a 'date' field in the JSON output.

    EXAMPLES:
    Text: "Payment for Netflix subscription yesterday"
    JSON: { "description": "Netflix subscription", "amount": 15.00, "category_name": "Entertainment", "category_type": "EXPENSE", "is_transfer": false, "source_account": null, "destination_account": null }

    Text: "Received ₦500,000 salary for May from Work Inc"
    JSON: { "description": "Salary for May from Work Inc", "amount": 500000.00, "category_name": "Salary", "category_type": "INCOME", "is_transfer": false, "source_account": null, "destination_account": null }

    Text: "I transferred 5000 from my savings account to my checking account"
    JSON: { "description": "Transfer from savings to checking", "amount": 5000.00, "category_name": "Transfer", "category_type": "TRANSFER", "is_transfer": true, "source_account": "savings", "destination_account": "checking" }

    Text: "Moved 2500 from my Stanbic account to Providus account"
    JSON: { "description": "Transfer from Stanbic to Providus", "amount": 2500.00, "category_name": "Transfer", "category_type": "TRANSFER", "is_transfer": true, "source_account": "Stanbic", "destination_account": "Providus" }

    Transaction Text: "${text}"
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    // Make the API call to Groq
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-70b-8192", // Specify the model
          messages: [
            {
              role: "system",
              content:
                "You are a financial assistant that extracts transaction details from text into a specific JSON format, outputting ONLY the raw JSON.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1, // Low temperature for deterministic output
          max_tokens: 150, // Limit response length
          // response_format: { type: "json_object" }, // Enable if Groq supports and requires it for guaranteed JSON
        }),
        signal: controller.signal, // Link to abort controller
      },
    );

    clearTimeout(timeoutId); // Clear timeout if response received

    // --- Handle API Errors ---
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json(); // Try to get JSON error details
      } catch {
        errorData = await response.text(); // Fallback to text error
      }
      console.error("Groq API returned an error:", response.status, errorData);
      // Throw an error to be caught by the main catch block, triggering fallback
      throw new Error(`Groq API Error (${response.status}): ${JSON.stringify(errorData)}`);
    }

    // --- Process Successful Response ---
    const rawContent = await response.text();
    console.log("Raw Groq Response:", rawContent);

    // Nested try-catch for parsing and validation of the successful response
    try {
        // Step 1: Parse the entire Groq API response
        const groqResponseObject = JSON.parse(rawContent);

        // Step 2: Extract the nested content string
        const contentString = groqResponseObject?.choices?.[0]?.message?.content;

        if (!contentString || typeof contentString !== 'string') {
            console.error("Error: Groq response content string not found or invalid.", groqResponseObject);
            throw new Error("Groq response content string not found or invalid.");
        }
        console.log("Groq Parser - Extracted Content String:", contentString); // DEBUG LOG

        // Step 3: Clean up potential markdown code blocks from the *content string*
        const cleanContent = contentString.includes('```json')
            ? contentString.split('```json')[1].split('```')[0].trim()
            : contentString.includes('```')
                ? contentString.split('```')[1].split('```')[0].trim()
                : contentString.trim(); // Trim whitespace regardless
         console.log("Groq Parser - Cleaned Content String:", cleanContent); // DEBUG LOG

        // Step 4: Parse the *cleaned content string* into the transaction data object
        const parsedData: Partial<LocalParsedTransaction> = JSON.parse(cleanContent);
        console.log("Groq Parser - Parsed final transaction data:", parsedData); // Renamed previous log

        // --- Validate and structure the data ---

        // Validate Amount: Check if number or string, parse if string, ensure positive
        let validatedAmount = 0;
        console.log(`Groq Parser - Checking amount: Type=${typeof parsedData.amount}, Value=${parsedData.amount}`); // DEBUG LOG
        if (typeof parsedData.amount === 'number') {
            validatedAmount = Math.abs(parsedData.amount); // Ensure positive
            console.log("Groq Parser - Amount validated (Number):", validatedAmount); // DEBUG LOG
        } else if (typeof parsedData.amount === 'string') {
            console.log("Groq Parser - Amount is string, attempting parse:", parsedData.amount); // DEBUG LOG
            // *** FIX START ***
            // Assign to a new variable after type check to ensure TS narrows the type correctly.
            const amountString: string = parsedData.amount;
            // Now call replace on the explicitly typed string variable.
            const numericString = amountString.replace(/,/g, ''); // Remove commas
            // *** FIX END ***
            const parsedFloat = parseFloat(numericString);
            if (!isNaN(parsedFloat)) {
                validatedAmount = Math.abs(parsedFloat); // Ensure positive
                console.log("Groq Parser - Amount validated (String Parsed):", validatedAmount); // DEBUG LOG
            }
        }
        // If parsing failed or type was wrong, validatedAmount remains 0
        if (validatedAmount === 0 && parsedData.amount !== 0) {
             console.warn("Groq Parser - Amount validation failed or resulted in 0, original was:", parsedData.amount); // DEBUG LOG
        }

        // Validate description and apply sentence case
        let validatedDescription = "Unknown Transaction";
        console.log(`Groq Parser - Checking description: Type=${typeof parsedData.description}, Value='${parsedData.description}'`); // DEBUG LOG
        if (typeof parsedData.description === 'string' && parsedData.description.trim()) {
            const trimmedDesc = parsedData.description.trim();
            // Force lowercase then capitalize first letter
            const lowerDesc = trimmedDesc.toLowerCase();
            validatedDescription = lowerDesc.charAt(0).toUpperCase() + lowerDesc.slice(1);
            console.log("Groq Parser - Description validated:", validatedDescription); // DEBUG LOG
        }
         if (validatedDescription === "Unknown Transaction" && parsedData.description) {
             console.warn("Groq Parser - Description validation failed, original was:", parsedData.description); // DEBUG LOG
        }

        const validatedData: LocalParsedTransaction = {
            description: validatedDescription, // Use validated & sentence-cased description
            amount: validatedAmount,
            category_name: typeof parsedData.category_name === 'string' && parsedData.category_name.trim()
                ? parsedData.category_name.trim()
                : "Uncategorized",
            category_type: parsedData.category_type === "INCOME" || (typeof parsedData.category_type === 'string' && parsedData.category_type.toUpperCase() === "INCOME")
                ? "INCOME"
                : "EXPENSE", // Default to EXPENSE
            // Date is added later in the main handler
        };

        console.log("Parsed & Validated Groq Data:", validatedData);

        // Return the successfully parsed and validated data
        return new Response(
            JSON.stringify(validatedData),
            { headers: corsHeaders }
        );

    } catch (parseError: unknown) {
        console.error("Error parsing or validating Groq JSON response:", parseError);
        console.error("Raw content received:", rawContent);
        // Throw an error to be caught by the outer catch block, triggering fallback
        const message = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`Failed to process Groq response: ${message}`);
    }

  } catch (error: unknown) {
    // --- Handle Network Errors, Timeouts, API Errors, and Parsing Errors ---
    let errorMessage = "An unexpected error occurred";

    if (error instanceof Error) {
      errorMessage = error.message; // Use the error message directly
      if (error.name === "AbortError") {
        console.error("Groq API request timed out.");
        errorMessage = "Groq API request timeout";
      } else if (errorMessage.startsWith("Groq API Error")) {
          console.error("Groq API Error:", errorMessage);
          // Status code is embedded in the message if available
      } else if (errorMessage.startsWith("Failed to process Groq response")) {
          console.error("Processing Error:", errorMessage);
      } else {
          // General network or other unexpected errors
          console.error("Error calling Groq API:", error);
      }
    } else {
      // Handle non-Error objects thrown
      console.error("Unknown error calling Groq API:", error);
      errorMessage = String(error);
    }

    // Re-throw the error. The main `serve` function's catch block will handle this
    // and decide whether to use the fallback parser.
    throw new Error(`Groq API call failed: ${errorMessage}`); // Re-throw standardized error
  }
}

// --- Main Request Handler ---
async function serve(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Read API Key from environment variables (secure method)
  const apiKey = Deno.env.get("GROQ_API_KEY");

  let text: string | undefined; // Define text variable outside try block

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: corsHeaders },
      );
    }

    // Parse the request body
    const requestData = await req.json();
    text = requestData.text; // Assign text here

    // Validate required parameters
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid transaction text" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // If API key is provided, attempt to use Groq API
    if (apiKey && typeof apiKey === "string") {
        try {
            const groqResponse = await callGroqAPI(apiKey, text);

            // If callGroqAPI returns a Response, it was successful
            const responseData: LocalParsedTransaction = await groqResponse.json();

            // Add the parsed date to the successful response data
            responseData.date = parseRelativeDate(text);

            console.log("Final Data (Groq):", responseData);
            return new Response(
                JSON.stringify(responseData),
                { headers: corsHeaders }
            );

        } catch (groqError: unknown) {
            // If callGroqAPI threw an error (API error, timeout, parsing error), use fallback
            console.warn("Groq API call failed, using fallback parser. Error:", groqError instanceof Error ? groqError.message : String(groqError));
            // Ensure text is defined before using fallback (should always be defined here)
            if (text) {
                return parseFallback(text); // Use fallback parser
            } else {
                 // This case should be rare, means error happened before text was assigned
                 console.error("Critical error: Fallback triggered but text is undefined.");
                 return new Response(
                    JSON.stringify({ error: "Internal server error", details: "Transaction text unavailable for fallback." }),
                    { status: 500, headers: corsHeaders },
                 );
            }
        }
    } else {
      // No API key provided, use fallback parser directly
      console.log("No Groq API key provided, using fallback parser");
      return parseFallback(text);
    }

  } catch (error: unknown) {
    // Catch errors from request parsing or unexpected issues in the handler itself
    console.error("Error in main request handler:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle specific errors like invalid JSON in request
     if (error instanceof SyntaxError && errorMessage.includes("JSON")) {
         return new Response(
             JSON.stringify({ error: 'Invalid JSON in request body', details: errorMessage }),
             { status: 400, headers: corsHeaders } // Bad Request
         );
     }

    // General internal server error
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: corsHeaders },
    );
  }
}

// --- Server Initialization ---
console.log("Transaction parser function started. Listening for requests...");
serveHttp(serve);

