import { serve as serveHttp } from "https://deno.land/std@0.201.0/http/server.ts";

// Define the ParsedTransaction interface locally instead of importing it
import { ParsedTransaction } from "./../../../../src/utils/transactionParser.ts";

interface ParsedTransaction {
  description: string;
  amount: number;
  category_type: string;
  category_name: string;
  date: string;
}

// --- CORS Headers ---
// Define reusable CORS headers for responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow requests from any origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Allowed headers
  'Content-Type': 'application/json' // Default content type for responses
};

// --- Groq API Connection Verification ---
// Function to test the connection to the Groq API using the provided API key.
async function verifyGroqConnection(apiKey: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    // Send a minimal test request to the Groq chat completions endpoint
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192', // Use a valid model
        messages: [{ role: 'user', content: 'Test connection' }],
        temperature: 0.1,
        max_tokens: 5 // Limit response size for test
      }),
      signal: controller.signal // Link request to the abort controller
    });

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
      console.error(`Groq API connection test failed (${response.status}):`, errorText);
      return false; // Connection failed
    }

    // Check if the response body is valid JSON and has the expected structure
    try {
      const data = await response.json();
      // Basic validation of the response structure
      if (!data || typeof data !== 'object' || !Array.isArray(data.choices)) {
        console.error('Invalid response format from Groq API during connection test:', data);
        return false;
      }
      // Check if we received a valid message content string
      return typeof data.choices?.[0]?.message?.content === 'string';
    } catch (parseError) {
      console.error('Error parsing Groq API response during connection test:', parseError);
      return false; // Parsing failed
    }
  } catch (error: unknown) {
    // Handle specific errors like timeouts or general network issues
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Groq API connection timeout during test.');
    } else {
      console.error('Error verifying Groq connection:', error);
    }
    return false; // Connection failed due to error
  }
}

// --- Date Parsing Utility ---
// Parses relative date terms ("yesterday", "last week", "today") or YYYY-MM-DD format from text.
// Defaults to the baseDate (or current date if not provided).
function parseRelativeDate(text: string, baseDate: Date = new Date()): string {
  // Create a date object representing the start of the baseDate (local time) to avoid DST issues
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const lowerText = text.toLowerCase(); // Case-insensitive matching

  if (lowerText.includes('yesterday')) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  if (lowerText.includes('last week')) {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return lastWeek.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  if (lowerText.includes('last month')) {
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    // Adjust day if necessary (e.g., March 31st -> Feb 28th/29th)
    if (lastMonth.getDate() < today.getDate()) {
        lastMonth.setDate(0); // Go to the last day of the previous month
    }
    return lastMonth.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  // Check for explicit date format YYYY-MM-DD using regex
  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) {
    // Validate the matched date parts
    const [_, year, month, day] = dateMatch[0].match(/(\d{4})-(\d{2})-(\d{2})/)!;
    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    // Ensure the parsed date is valid (e.g., not 2023-02-30)
    if (!isNaN(parsedDate.getTime()) &&
        parsedDate.getFullYear() === parseInt(year) &&
        parsedDate.getMonth() === parseInt(month) - 1 &&
        parsedDate.getDate() === parseInt(day)) {
      return dateMatch[0];
    }
  }

  // Default to today's date if no other date is found
  if (lowerText.includes('today')) {
      return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }


  // Default to the base date (usually today) if no specific date is found
  return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// --- Fallback Parser ---
// A simple rule-based parser used when the Groq API key is missing or the API call fails.
// Extracts transaction details using regular expressions and keyword matching.
function useFallbackParser(text: string): Response {
  const lowerText = text.toLowerCase();
  const fallbackData = {
    description: "Unknown Transaction",
    amount: 0,
    category_name: "Uncategorized",
    category_type: "EXPENSE", // Default to EXPENSE
    date: parseRelativeDate(text) // Determine date using the utility function
  };

  // --- Regex Patterns for Extraction ---
  const patterns = {
    // Try to capture description (text not related to amount or common prepositions/dates)
    description: /(?:for|on|spent|paid|bought|received)\s+([^₦$0-9]+?)(?:\s+₦|\$|\d|yesterday|today|last week|last month|on|in|at|$)/i,
    // Capture amount, allowing for currency symbols (optional) and commas/dots
    amount: /[₦$]?\s*(\d+(?:[,.]\d{1,2})?)/,
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
      { name: "Utilities", patterns: /(?:utilities|electricity|water|gas bill|internet|data|airtime|nep[ha]|ikedc|ekedc)/i },
      { name: "Entertainment", patterns: /(?:movie|cinema|concert|show|game|entertainment|netflix|spotify)/i },
      { name: "Shopping", patterns: /(?:shopping|clothes|shoes|accessories|mall|amazon|jumia|konga)/i },
      { name: "Healthcare", patterns: /(?:medical|doctor|hospital|pharmacy|healthcare|chemist)/i },
      { name: "Education", patterns: /(?:tuition|course|books|school fees|education)/i },
      { name: "Housing", patterns: /(?:rent|mortgage|housing|accommodation)/i },
      { name: "Gift", patterns: /(?:gift|present)/i },
      { name: "Transfer", patterns: /(?:transfer|sent money|received money)/i },
    ]
  };

  // --- Extraction Logic ---
  // Extract Amount
  const amountMatch = text.match(patterns.amount);
  if (amountMatch) {
    // Remove commas and parse as float
    fallbackData.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
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
    // Capitalize first letter of each word in the extracted description
    fallbackData.description = descriptionMatch[1].trim()
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  } else {
      // Basic fallback if regex fails: use the first few words as description
      fallbackData.description = text.split(' ').slice(0, 5).join(' ');
      // Attempt to remove amount part if it's in the fallback description
      if (amountMatch && amountMatch[0]) {
          fallbackData.description = fallbackData.description.replace(amountMatch[0], '').trim();
      }
  }


  // Determine Category Name
  for (const category of patterns.categories) {
    if (category.patterns.test(lowerText)) {
      fallbackData.category_name = category.name;
      // If it's Salary or Gift, ensure type is INCOME
       if (["Salary", "Gift"].includes(category.name) && fallbackData.category_type === "EXPENSE") {
           fallbackData.category_type = "INCOME";
       }
      break; // Stop after first match
    }
  }

  // Log the process and result
  console.log('Fallback Parser - Input:', text);
  console.log('Fallback Parser - Result:', fallbackData);

  // Return the parsed data as a JSON response
  return new Response(
    JSON.stringify(fallbackData),
    { headers: corsHeaders } // Include CORS headers
  );
}

// --- Groq API Call Function ---
// Calls the Groq API to parse the transaction text using an LLM.
async function callGroqAPI(apiKey: string, text: string): Promise<Response> {
  // Define the prompt for the LLM, instructing it to output only JSON
  const prompt = `
    You are a transaction parser that outputs ONLY raw JSON.
    Parse the following transaction text strictly into this JSON format:
    {
      "description": "Brief capitalized description of the item/service (e.g., 'Groceries from Shoprite', 'Salary for March')",
      "amount": 1234.56,
      "category_name": "Appropriate category (e.g., 'Groceries', 'Salary', 'Transport', 'Dining', 'Utilities', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Housing', 'Gift', 'Transfer', 'Uncategorized')",
      "category_type": "INCOME or EXPENSE"
    }

    RULES:
    1. Output ONLY the JSON object. No introductory text, explanations, apologies, or markdown code blocks (like \`\`\`json).
    2. 'amount' MUST be a positive number (integer or float). Do not include currency symbols.
    3. 'category_type' MUST be exactly "INCOME" or "EXPENSE". Determine this based on keywords like 'spent', 'paid', 'bought' (EXPENSE) or 'received', 'salary', 'deposit' (INCOME). Default to EXPENSE if unsure.
    4. 'category_name' should be one of the suggested categories if possible, otherwise use a sensible alternative or 'Uncategorized'.
    5. 'description' should be concise and capitalized.
    6. DO NOT include a 'date' field in the JSON output.

    Transaction Text: "${text}"
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

    // Make the API call to Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192', // Specify the model
        messages: [
          // System message defining the role (optional but good practice)
          {
            role: 'system',
            content: 'You are a financial assistant that extracts transaction details from text into a specific JSON format.'
          },
          // User message containing the instructions and the text to parse
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for more deterministic output
        max_tokens: 150, // Limit response length
        // Enforce JSON output if the model/API supports it (check Groq docs)
        // response_format: { type: "json_object" }, // Uncomment if supported
      }),
      signal: controller.signal // Link to abort controller
    });

    clearTimeout(timeoutId); // Clear timeout if response received

    // Check for non-OK HTTP status from Groq
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json(); // Try to get JSON error details
      } catch {
        errorData = await response.text(); // Fallback to text error
      }
      console.error('Groq API returned an error:', response.status, errorData);
      // Return an error response to the client
      return new Response(
        JSON.stringify({ error: 'Groq API error', details: errorData }),
        { status: response.status, headers: corsHeaders }
      );
    }

    // Return the successful response object (the body will be processed by the main handler)
    return response;

  } catch (error) {
    // Handle network errors or timeouts
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Groq API request timed out.');
      return new Response(
        JSON.stringify({ error: 'Groq API request timeout' }),
        { status: 504, headers: corsHeaders } // Gateway Timeout
      );
    }

    // Handle other unexpected errors during the API call
    console.error('Failed to call Groq API:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to call Groq API', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders } // Internal Server Error
    );
  }
}


// --- Main Request Handler ---
// This function handles incoming HTTP requests.
export const serve = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests (OPTIONS method)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Ensure the request method is POST
  if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: corsHeaders });
  }

  try {
    // --- Input Validation ---
    let text: string;
    try {
        const body = await req.json();
        text = body.text;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
          throw new Error('Input text must be a non-empty string.');
        }
        text = text.trim(); // Trim whitespace
    } catch (e) {
        console.error('Invalid request body:', e);
        return new Response(
          JSON.stringify({
            error: 'Invalid request body',
            details: e instanceof Error ? e.message : 'Request body must be JSON with a non-empty "text" property.'
          }),
          { status: 400, headers: corsHeaders } // Bad Request
        );
    }

    console.log(`Received request to parse: "${text}"`);

    // --- API Key and Connection Check ---
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    let useGroq = false; // Flag to determine whether to use Groq or fallback

    if (GROQ_API_KEY) {
      console.log("GROQ_API_KEY found. Verifying connection...");
      const isConnected = await verifyGroqConnection(GROQ_API_KEY);
      if (isConnected) {
        console.log("Groq API connection successful.");
        useGroq = true;
      } else {
        console.warn('Failed to connect to Groq API. Using fallback parser.');
        // Optionally return an error here if Groq is essential,
        // but current logic falls back gracefully.
        // return new Response(JSON.stringify({ error: 'Failed to connect to Groq API' }), { status: 503, headers: corsHeaders });
      }
    } else {
      console.log('GROQ_API_KEY not found. Using fallback parser.');
    }

    // --- Determine Date ---
    // Parse the date from the *original* input text, regardless of parser used.
    const transactionDate = parseRelativeDate(text);
    // Apply constraints: not in the future, not older than 90 days (configurable)
    const now = new Date();
    const currentLocalStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let finalDate = new Date(transactionDate + 'T00:00:00Z'); // Treat YYYY-MM-DD as UTC start of day initially

    // Clamp date to be not in the future
    if (finalDate > currentLocalStartOfDay) {
        finalDate = new Date(currentLocalStartOfDay);
    }

    // Clamp date to be not older than 90 days (adjust as needed)
    const oldestAllowedDate = new Date(currentLocalStartOfDay);
    oldestAllowedDate.setDate(oldestAllowedDate.getDate() - 90);
    if (finalDate < oldestAllowedDate) {
        finalDate = new Date(oldestAllowedDate);
    }

    const formattedDate = finalDate.toISOString().split('T')[0]; // Final date in YYYY-MM-DD format
    console.log(`Determined transaction date: ${formattedDate}`);


    // --- Parsing Logic ---
    let parsedContent: ParsedTransaction; // To hold the parsed JSON data {description, amount, category_name, category_type}

    if (useGroq && GROQ_API_KEY) {
      // --- Use Groq API ---
      console.log("Calling Groq API...");
      const groqResponseObj = await callGroqAPI(GROQ_API_KEY, text);

      // Check if the callGroqAPI function itself returned an error response
      if (!groqResponseObj.ok) {
        // The callGroqAPI function already logged the error and created a Response object
        // We just need to return it.
        return groqResponseObj;
      }

      // --- Process Successful Groq Response ---
      try {
        const groqResult = await groqResponseObj.json();
        console.log('Raw Groq API response body:', groqResult);

        const content = groqResult.choices?.[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          console.error('No valid content string found in Groq response:', groqResult);
          // Fallback gracefully if Groq response is unusable
          console.log("Groq response unusable, falling back to local parser.");
          return useFallbackParser(text);
          // Or return an error:
          // throw new Error('Invalid content structure in Groq response');
        }

        console.log('Raw content string from Groq:', content);

        // --- Robust JSON Parsing from Groq Content ---
        let cleanContent = content.trim();
        try {
          // Attempt 1: Direct parse (ideal case)
          // Remove potential markdown backticks first
          cleanContent = cleanContent.replace(/^```(json)?\s*|\s*```$/g, '');
          parsedContent = JSON.parse(cleanContent);
          console.log('Successfully parsed JSON directly from Groq content.');

        } catch (directParseError) {
          console.warn('Direct JSON parse failed. Attempting extraction...', directParseError);
          // Attempt 2: Extract JSON object using regex (handles surrounding text)
          const jsonMatch = cleanContent.match(/\{[\s\S]*?\}/);
          if (jsonMatch && jsonMatch[0]) {
            try {
              parsedContent = JSON.parse(jsonMatch[0]);
              console.log('Successfully parsed JSON extracted via regex.');
            } catch (regexParseError) {
              console.error('Failed to parse JSON extracted via regex:', regexParseError);
              // If even extraction fails, fallback might be best
              console.log("Groq JSON extraction failed, falling back to local parser.");
              return useFallbackParser(text);
              // Or throw: throw new Error('Failed to parse JSON content from Groq response');
            }
          } else {
            console.error('Could not find any JSON object within Groq content.');
            // Fallback if no JSON is found
            console.log("No JSON found in Groq response, falling back to local parser.");
            return useFallbackParser(text);
            // Or throw: throw new Error('No JSON object found in Groq response content');
          }
        }

        // --- Validation of Parsed Groq Data ---
        if (!parsedContent || typeof parsedContent !== 'object') {
           console.error('Parsed content is not a valid object:', parsedContent);
           console.log("Groq result not a valid object, falling back to local parser.");
           return useFallbackParser(text);
           // Or throw: throw new Error('Parsed Groq content is not a valid JSON object');
        }

        // Coerce and validate fields (even from LLM)
        parsedContent = {
            description: String(parsedContent.description || 'Unknown Transaction').trim(),
            amount: Math.abs(parseFloat(String(parsedContent.amount || '0').replace(/[^0-9.-]/g, '')) || 0),
            category_name: String(parsedContent.category_name || 'Uncategorized').trim(),
            category_type: String(parsedContent.category_type || 'EXPENSE').toUpperCase(),
            date: formattedDate // Add the date field from the parsed date
        };

        // Final check on critical fields
        if (!parsedContent.description) parsedContent.description = 'Unknown Transaction';
        if (isNaN(parsedContent.amount)) parsedContent.amount = 0;
        if (!parsedContent.category_name) parsedContent.category_name = 'Uncategorized';
        if (!['INCOME', 'EXPENSE'].includes(parsedContent.category_type)) {
            parsedContent.category_type = 'EXPENSE'; // Default if invalid type
        }

        console.log("Successfully parsed and validated data from Groq:", parsedContent);

      } catch (processingError) {
        console.error('Error processing Groq response:', processingError);
        // Fallback if any error occurs during processing the successful Groq response
        console.log("Error processing Groq response, falling back to local parser.");
        return useFallbackParser(text);
        // Or return a specific error:
        // return new Response(
        //   JSON.stringify({ error: 'Failed to process Groq response', details: processingError.message }),
        //   { status: 500, headers: corsHeaders }
        // );
      }

    } else {
      // --- Use Fallback Parser ---
      // If no API key or connection failed, call the fallback directly.
      // The fallback function returns a complete Response object.
      return useFallbackParser(text);
    }

    // --- Final Data Assembly ---
    // Combine parsed data with the determined date.
    const finalTransactionData = {
      description: parsedContent.description,
      amount: parsedContent.amount,
      category_name: parsedContent.category_name,
      category_type: parsedContent.category_type, // Should be INCOME or EXPENSE
      date: formattedDate // Use the calculated YYYY-MM-DD date
    };

    console.log('Final validated transaction data:', finalTransactionData);

    // --- Return Success Response ---
    return new Response(
      JSON.stringify(finalTransactionData),
      { headers: corsHeaders } // Include CORS headers
    );

  } catch (error: unknown) {
    // --- Global Error Handler ---
    // Catch any unexpected errors during the request handling.
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    console.error('Unhandled error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
};

// --- Server Initialization ---
// Start the HTTP server using the defined handler.
console.log("Transaction parser function started. Listening for requests...");
serveHttp(serve);
