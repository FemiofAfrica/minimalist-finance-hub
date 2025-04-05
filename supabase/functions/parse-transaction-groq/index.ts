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
  category_type: "INCOME" | "EXPENSE"; // Use literal types for better type safety
  date?: string; // Optional date field added by the main handler
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
function useFallbackParser(text: string): Response {
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
    description: /(?:for|on|at|:|bought|paid|spent|received)\\s+(.+?)(?:\\s+(?:₦|\\$|[\\d.,]+)|yesterday|today|last week|last month|$)/i,
    // Capture amount, allowing for currency symbols (optional) and commas/dots
    amount: /[₦$]?\\s*(\\d+(?:[,.]\\d{1,2})?)/,
    // Keywords indicating income
    income: /(?:received|earned|got paid|salary|bonus|gift|refund|income|deposit)/i,
    // Keywords indicating expense (used if income keywords aren't found)
    expense: /(?:spent|bought|paid|purchased|payment|withdrawal|charge|fee)/i,
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
        { name: "Transfer", patterns: /(?:transfer|sent money|received money)/i },
      ]
  };

  // --- Extraction Logic ---
  // Extract Amount
  const amountMatch = text.match(patterns.amount);
  if (amountMatch && amountMatch[1]) {
    // Remove commas and parse as float, ensure positive
    fallbackData.amount = Math.abs(parseFloat(amountMatch[1].replace(/,/g, "")));
  }

  // Determine Category Type (Income/Expense)
  if (patterns.income.test(lowerText)) {
    fallbackData.category_type = "INCOME";
  } else if (patterns.expense.test(lowerText)) {
    fallbackData.category_type = "EXPENSE";
  } // Defaults to EXPENSE if neither is strongly indicated

  // Extract Description
  const descriptionMatch = text.match(patterns.description);
  if (descriptionMatch && descriptionMatch[1]) {
    let desc = descriptionMatch[1].trim();
    if (amountMatch && amountMatch[0]) {
        desc = desc.replace(amountMatch[0].trim(), '').trim();
    }
    desc = desc.replace(/(?:yesterday|today|last week|last month|on \\d{4}-\\d{2}-\\d{2})/i, '').trim();
    // Force lowercase then capitalize first letter
    const lowerDesc = desc.toLowerCase();
    fallbackData.description = lowerDesc.charAt(0).toUpperCase() + lowerDesc.slice(1);
  } else {
    // Basic fallback: use the first few words, removing amount/date if possible
    let desc = text.split(" ").slice(0, 5).join(" ");
    if (amountMatch && amountMatch[0]) {
      desc = desc.replace(amountMatch[0].trim(), "").trim();
    }
     desc = desc.replace(/(?:yesterday|today|last week|last month|on \\d{4}-\\d{2}-\\d{2})/i, '').trim();
    // Force lowercase then capitalize first letter
    const lowerDescElse = desc.toLowerCase();
    fallbackData.description = desc ? lowerDescElse.charAt(0).toUpperCase() + lowerDescElse.slice(1) : "Unknown Transaction"; // Ensure not empty
  }

  // Determine Category Name
  for (const category of patterns.categories) {
    if (category.patterns.test(lowerText)) {
      fallbackData.category_name = category.name;
      // Adjust type for specific categories if needed
      if (["Salary", "Gift", "Transfer"].includes(category.name) && fallbackData.category_type === "EXPENSE" && !patterns.expense.test(lowerText)) {
          fallbackData.category_type = "INCOME";
      }
      if (category.name === "Transfer" && patterns.income.test(lowerText)) {
          fallbackData.category_type = "INCOME";
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
      "description": "Brief description of the item/service (e.g., 'Groceries from Shoprite', 'Salary for March', 'Netflix subscription')",
      "amount": 1234.56,
      "category_name": "Appropriate category (e.g., 'Groceries', 'Salary', 'Transport', 'Dining', 'Utilities', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Housing', 'Insurance', 'Gift', 'Transfer', 'Uncategorized')",
      "category_type": "INCOME or EXPENSE"
    }

    RULES:
    1. Output ONLY the JSON object. No introductory text, explanations, apologies, or markdown code blocks (like \`\`\`json).
    2. 'amount' MUST be a positive number (integer or float). Do not include currency symbols.
    3. 'category_type' MUST be exactly "INCOME" or "EXPENSE". Determine this based on keywords like 'spent', 'paid', 'bought' (EXPENSE) or 'received', 'salary', 'deposit' (INCOME). Default to EXPENSE if unsure.
    4. 'category_name' should be one of the suggested categories if possible. Use 'Utilities' for electricity, water, internet, phone bills, airtime/data recharge. Use 'Transport' for fuel, ride-sharing, public transit. Use 'Shopping' for general goods, clothes, electronics. Use 'Insurance' for premium payments. If unsure, use a sensible alternative or 'Uncategorized'.
    5. 'description' should be concise. Extract the core item/service, omitting generic phrases like 'payment for', 'spent on', 'bought at' unless essential for clarity. Do not include dates (like 'yesterday') in the description. Capitalize only the first letter unless it's a proper noun.
    6. DO NOT include a 'date' field in the JSON output.

    EXAMPLES:
    Text: "Payment for Netflix subscription yesterday"
    JSON: { "description": "Netflix subscription", "amount": 15.00, "category_name": "Entertainment", "category_type": "EXPENSE" }

    Text: "Received ₦500,000 salary for May from Work Inc"
    JSON: { "description": "Salary for May from Work Inc", "amount": 500000.00, "category_name": "Salary", "category_type": "INCOME" }

    Text: "Bolt ride home 500"
    JSON: { "description": "Bolt ride home", "amount": 500.00, "category_name": "Transport", "category_type": "EXPENSE" }

    Text: "Bought airtime recharge online 1000 NGN"
    JSON: { "description": "Airtime recharge online", "amount": 1000.00, "category_name": "Utilities", "category_type": "EXPENSE" }

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
        // Clean up potential markdown code blocks
        const cleanContent = rawContent.includes('```json')
            ? rawContent.split('```json')[1].split('```')[0].trim()
            : rawContent.includes('```')
                ? rawContent.split('```')[1].split('```')[0].trim()
                : rawContent.trim(); // Trim whitespace regardless

        // Parse the JSON content from the API response
        const parsedData: Partial<LocalParsedTransaction> = JSON.parse(cleanContent);

        // --- Validate and structure the data ---

        // Validate Amount: Check if number or string, parse if string, ensure positive
        let validatedAmount = 0;
        if (typeof parsedData.amount === 'number') {
            validatedAmount = Math.abs(parsedData.amount); // Ensure positive
        } else if (typeof parsedData.amount === 'string') {
            // *** FIX START ***
            // Assign to a new variable after type check to ensure TS narrows the type correctly.
            const amountString: string = parsedData.amount;
            // Now call replace on the explicitly typed string variable.
            const numericString = amountString.replace(/,/g, ''); // Remove commas
            // *** FIX END ***
            const parsedFloat = parseFloat(numericString);
            if (!isNaN(parsedFloat)) {
                validatedAmount = Math.abs(parsedFloat); // Ensure positive
            }
        }
        // If parsing failed or type was wrong, validatedAmount remains 0

        // Validate description and apply sentence case
        let validatedDescription = "Unknown Transaction";
        if (typeof parsedData.description === 'string' && parsedData.description.trim()) {
            const trimmedDesc = parsedData.description.trim();
            // Force lowercase then capitalize first letter
            const lowerDesc = trimmedDesc.toLowerCase();
            validatedDescription = lowerDesc.charAt(0).toUpperCase() + lowerDesc.slice(1);
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
    const { apiKey } = requestData;
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
                return useFallbackParser(text); // Use fallback parser
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
      return useFallbackParser(text);
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

