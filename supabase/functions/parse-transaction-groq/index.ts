// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - This file uses Deno modules which TypeScript doesn't recognize in Node.js context
import { serve as serveHttp } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Add a check for development mode at the beginning of the file and skip auth check

// Skip auth check in development - detect local Supabase environment
const isDevelopment = Deno.env.get("ENVIRONMENT") === "development" || 
                      Deno.env.get("SUPABASE_URL")?.includes("localhost") ||
                      Deno.env.get("SUPABASE_URL")?.includes("127.0.0.1") ||
                      Deno.env.get("SUPABASE_URL") === undefined ||
                      // Default to development if no production indicators
                      !Deno.env.get("SUPABASE_URL")?.includes("supabase.co");

console.log("Development mode check:", { 
  environment: Deno.env.get("ENVIRONMENT"),
  supabaseUrl: Deno.env.get("SUPABASE_URL"),
  isDevelopment 
});

// Define standard CORS headers for responses
const corsHeaders = {
  "Access-Control-Allow-Origin": isDevelopment ? "http://localhost:5173" : "https://www.kpege.com", // Allow kpege.com in production
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-requested-with", // Allowed headers
  "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
  "Content-Type": "application/json", // Default content type for responses
};

console.log("CORS headers being set:", corsHeaders);

// Initialize Supabase client with service role key (for user lookup)
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

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
  account_name?: string; // Optional field for account name in regular transactions
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
  console.log(`Parsing date from text: "${text}"`);
  
  // Create a date object representing the start of the baseDate (local time)
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const lowerText = text.toLowerCase(); // Case-insensitive matching

  // First, try to extract DD Month YYYY format
  const monthNamePattern = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i;
  const monthMatch = text.match(monthNamePattern);
  if (monthMatch) {
    try {
      const day = parseInt(monthMatch[1]);
      const monthName = monthMatch[2].toLowerCase();
      const year = parseInt(monthMatch[3]);
      
      // Map month names to their numeric values
      const monthMap: {[key: string]: number} = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3,
        'may': 4, 'june': 5, 'july': 6, 'august': 7,
        'september': 8, 'october': 9, 'november': 10, 'december': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3,
        'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 
        'oct': 9, 'nov': 10, 'dec': 11
      };
      
      if (monthMap[monthName] !== undefined && day >= 1 && day <= 31 && year > 2000) {
        const parsedDate = new Date(year, monthMap[monthName], day);
        if (!isNaN(parsedDate.getTime())) {
          const result = parsedDate.toLocaleDateString('en-CA');
          console.log(`Parsed "${text}" as "${result}" using month name format`);
          return result;
        }
      }
    } catch (e) {
      console.error("Error parsing month name date format:", e);
    }
  }

  // Check for relative terms
  if (lowerText.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD
  }

  if (lowerText.includes("last week")) {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return lastWeek.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD
  }

  if (lowerText.includes("last month")) {
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    // Adjust day if necessary (e.g., March 31st -> Feb 28th/29th)
    if (lastMonth.getDate() < today.getDate()) {
      lastMonth.setDate(0); // Go to the last day of the previous month
    }
    return lastMonth.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD
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
      return parsedDate.toLocaleDateString('en-CA'); // Return the valid YYYY-MM-DD string
    }
  }

  // Default to today's date if "today" is mentioned or no other date is found
  if (lowerText.includes('today')) {
      return today.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD
  }

  // Default to the base date (usually today) if no specific date is found
  return today.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD
}

// Dedicated function to parse date strings with complex formats
function parseFormattedDate(dateStr: string): string | null {
  // Don't process empty or very short strings
  if (!dateStr || dateStr.length < 5) return null;
  
  console.log(`Attempting to parse formatted date: "${dateStr}"`);
  
  // Handle complex date formats with day of week, month name, day with suffix, and time
  // Example: "Tuesday, May 20th, 2025 | 3:55 PM"
  const complexDatePattern = /(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?:\s*\|?\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?/i;
  
  const complexMatch = dateStr.match(complexDatePattern);
  if (complexMatch) {
    try {
      const fullText = complexMatch[0];
      const day = parseInt(complexMatch[1]);
      const year = parseInt(complexMatch[2]);
      
      // Extract month name from the full matched text
      const monthPattern = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;
      const monthMatch = fullText.match(monthPattern);
      
      if (monthMatch && day && year) {
        const monthName = monthMatch[1].toLowerCase();
        
        // Map month names to their numeric values (0-indexed for JS Date)
        const monthMap: {[key: string]: number} = {
          'january': 0, 'february': 1, 'march': 2, 'april': 3,
          'may': 4, 'june': 5, 'july': 6, 'august': 7,
          'september': 8, 'october': 9, 'november': 10, 'december': 11,
          'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4,
          'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 
          'oct': 9, 'nov': 10, 'dec': 11
        };
        
        if (monthMap[monthName] !== undefined) {
          const month = monthMap[monthName];
          const parsedDate = new Date(year, month, day);
          
          if (!isNaN(parsedDate.getTime())) {
            // Format as YYYY-MM-DD
            const formattedMonth = (month + 1).toString().padStart(2, '0');
            const formattedDay = day.toString().padStart(2, '0');
            const formattedDate = `${year}-${formattedMonth}-${formattedDay}`;
            
            console.log(`Successfully parsed complex date "${dateStr}" as "${formattedDate}"`);
            return formattedDate;
          }
        }
      }
    } catch (e) {
      console.error(`Error parsing complex date "${dateStr}":`, e);
    }
  }
  
  // Try the DD Month YYYY pattern
  const monthNamePattern = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i;
  const monthMatch = dateStr.match(monthNamePattern);
  
  if (monthMatch) {
    try {
      const day = parseInt(monthMatch[1]);
      const monthName = monthMatch[2].toLowerCase();
      const year = parseInt(monthMatch[3]);
      
      // Map month names to their numeric values (0-indexed for JS Date)
      const monthMap: {[key: string]: number} = {
        'january': 0, 'february': 1, 'march': 2, 'april': 3,
        'may': 4, 'june': 5, 'july': 6, 'august': 7,
        'september': 8, 'october': 9, 'november': 10, 'december': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4,
        'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 
        'oct': 9, 'nov': 10, 'dec': 11
      };
      
      if (monthMap[monthName] !== undefined && day >= 1 && day <= 31 && year > 2000) {
        const parsedDate = new Date(year, monthMap[monthName], day);
        if (!isNaN(parsedDate.getTime())) {
          // Format as YYYY-MM-DD
          const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
          const paddedDay = day.toString().padStart(2, '0');
          const formattedDate = `${year}-${month}-${paddedDay}`;
          
          console.log(`Successfully parsed "${dateStr}" as "${formattedDate}"`);
          return formattedDate;
        }
      }
    } catch (e) {
      console.error(`Error parsing date "${dateStr}":`, e);
    }
  }
  
  return null;
}

// Helper function for categorizing transactions based on description/narration
function categorizeTransaction(text: string): { category: string, type: "INCOME" | "EXPENSE" | "TRANSFER" } {
  if (!text) return { category: "Uncategorized", type: "EXPENSE" };
  
  const lowerText = text.toLowerCase();
  
  // Transport category
  if (lowerText.includes("bus") || 
      lowerText.includes("taxi") || 
      lowerText.includes("uber") || 
      lowerText.includes("bolt") || 
      lowerText.includes("ride") || 
      lowerText.includes("train") || 
      lowerText.includes("transport") || 
      lowerText.includes("fare") || 
      lowerText.includes("fuel") || 
      lowerText.includes("petrol") || 
      lowerText.includes("flight") || 
      lowerText.includes("airfare")) {
    return { category: "Transport", type: "EXPENSE" };
  }
  
  // Utilities category
  if (lowerText.includes("water") || 
      lowerText.includes("electricity") || 
      lowerText.includes("power") || 
      lowerText.includes("gas") || 
      lowerText.includes("internet") || 
      lowerText.includes("wifi") || 
      lowerText.includes("bill") || 
      lowerText.includes("utility")) {
    return { category: "Utilities", type: "EXPENSE" };
  }
  
  // Food/Dining category
  if (lowerText.includes("food") || 
      lowerText.includes("restaurant") || 
      lowerText.includes("cafe") || 
      lowerText.includes("meal") || 
      lowerText.includes("lunch") || 
      lowerText.includes("dinner") || 
      lowerText.includes("breakfast")) {
    return { category: "Dining", type: "EXPENSE" };
  }
  
  // Groceries category
  if (lowerText.includes("grocery") || 
      lowerText.includes("supermarket") || 
      lowerText.includes("market") || 
      lowerText.includes("store") || 
      lowerText.includes("shopping")) {
    return { category: "Groceries", type: "EXPENSE" };
  }
  
  // Income category
  if (lowerText.includes("salary") || 
      lowerText.includes("wage") || 
      lowerText.includes("income") || 
      lowerText.includes("payment received") || 
      lowerText.includes("deposit")) {
    return { category: "Salary", type: "INCOME" };
  }
  
  // Transfer category
  if (lowerText.includes("transfer") || 
      lowerText.includes("sent") || 
      lowerText.includes("remittance")) {
    return { category: "Transfer", type: "TRANSFER" };
  }
  
  // Default
  return { category: "Uncategorized", type: "EXPENSE" };
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

  // --- Robust Narration/Purpose Extraction (line-by-line) ---
  let foundDescription = false;
  let foundDate = false;
  let explicitDate = null;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    // Description extraction
    if (!foundDescription) {
      const descMatch = line.match(/(?:narration|purpose)\s*[:\-]\s*(.+)/i);
      if (descMatch && descMatch[1]) {
        fallbackData.description = descMatch[1].trim();
        foundDescription = true;
      }
    }
    // Date extraction
    if (!foundDate) {
      const dateMatch = line.match(/(?:transaction date|date)\s*[:\-]\s*(.+)/i);
      if (dateMatch && dateMatch[1]) {
        const parsed = new Date(dateMatch[1].trim());
        if (!isNaN(parsed.getTime())) {
          explicitDate = parsed.toLocaleDateString('en-CA');
          foundDate = true;
        }
      }
    }
    if (foundDescription && foundDate) break;
  }
  if (explicitDate) {
    fallbackData.date = explicitDate;
  } else {
    fallbackData.date = parseRelativeDate(text);
  }

  // --- Regex Patterns for Extraction ---
  const patterns = {
    // Capture amount, allowing for currency symbols (optional) and commas/dots
    amount: /(?:^|\s|[^\d])(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s|$|[^\d])/g, // More comprehensive pattern to capture amounts
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
      const sourceAccountName = sourceMatch[1].trim();
      if (sourceAccountName.length > 0) {
        fallbackData.source_account = sourceAccountName;
        console.log("Fallback Parser - Extracted source account:", sourceAccountName);
      }
    }
    
    // Extract destination account
    const destMatch = lowerText.match(patterns.destAccount);
    if (destMatch && destMatch[1]) {
      const destAccountName = destMatch[1].trim();
      if (destAccountName.length > 0) {
        fallbackData.destination_account = destAccountName;
        console.log("Fallback Parser - Extracted destination account:", destAccountName);
      }
    }
  }

  // --- Extraction Logic ---
  // Extract Amount - Find all potential amounts and use the largest one
  const amountMatches = Array.from(text.matchAll(patterns.amount));
  console.log("Fallback Parser - Amount Matches:", amountMatches); // DEBUG LOG
  
  if (amountMatches && amountMatches.length > 0) {
    // Extract all potential amounts and find the largest reasonable one
    const potentialAmounts = amountMatches
      .map(match => match[1]) // Get the captured group
      .filter(amount => amount && amount.length > 0) // Filter out empty matches
      .map(amount => parseFloat(amount.replace(/,/g, ""))) // Parse to numbers
      .filter(amount => !isNaN(amount) && amount > 0); // Filter valid positive numbers
    
    console.log("Fallback Parser - Potential Amounts:", potentialAmounts); // DEBUG LOG
    
    if (potentialAmounts.length > 0) {
      // Use the largest amount (typically the transaction amount rather than account numbers)
      fallbackData.amount = Math.max(...potentialAmounts);
      console.log("Fallback Parser - Extracted Amount:", fallbackData.amount); // DEBUG LOG
    } else {
      console.log("Fallback Parser - No valid amounts found after parsing.");
    }
  } else {
    console.log("Fallback Parser - Amount pattern did not match.");
  }

  // Determine Category Type (Income/Expense/Transfer)
  if (!isTransfer) {
    if (patterns.income.test(lowerText)) {
      fallbackData.category_type = "INCOME";
    } else if (patterns.expense.test(lowerText)) {
      fallbackData.category_type = "EXPENSE";
    } // Defaults to EXPENSE if neither is strongly indicated
    
    // For non-transfer transactions, try to extract account name if mentioned
    const sourceMatch = lowerText.match(patterns.sourceAccount);
    const destMatch = lowerText.match(patterns.destAccount);
    
    // For expense, we want the source account (where money is coming from)
    if (fallbackData.category_type === "EXPENSE" && sourceMatch && sourceMatch[1]) {
      const accountName = sourceMatch[1].trim();
      if (accountName.length > 0) {
        fallbackData.account_name = accountName;
        console.log("Fallback Parser - Extracted expense account:", accountName);
      }
    }
    // For income, we want the destination account (where money is going to)
    else if (fallbackData.category_type === "INCOME" && destMatch && destMatch[1]) {
      const accountName = destMatch[1].trim();
      if (accountName.length > 0) {
        fallbackData.account_name = accountName;
        console.log("Fallback Parser - Extracted income account:", accountName);
      }
    }
  }

  // --- Refactored Description Extraction ---
  let textWithoutAmountAndDate = text;
  let matchedDateKeyword = "";

  // Remove Amount - remove all found amounts for description cleaning
  if (amountMatches && amountMatches.length > 0) {
    for (const match of amountMatches) {
      if (match[0]) {
        textWithoutAmountAndDate = textWithoutAmountAndDate.replace(match[0].trim(), "").trim();
      }
    }
    console.log("Fallback Parser - Text after removing amounts:", textWithoutAmountAndDate); // DEBUG LOG
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
async function callGroqAPI(apiKey: string, text: string, context_amount?: number, context_date?: string, context_narration?: string): Promise<Response> {
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
      "destination_account": null,
      "account_name": null
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
       - Example: "I transferred 5000 from my savings account to my checking account" should extract "savings" as source_account and "checking" as destination_account
    5. For regular transactions (not transfers):
       - Extract "account_name" if a specific account is mentioned
       - Example: "Spent 50 from my credit card on food" should extract "credit card" as account_name
       - Example: "Received 100 in my checking account" should extract "checking" as account_name
    6. 'category_name' should be one of the suggested categories if possible. Use 'Transfer' for money movements between accounts.
    7. 'description' should be concise. For transfers, indicate the source and destination when possible.
    8. If the text contains a field like 'Narration:' or 'Purpose:', use its value as the description.
    9. For the date, look for explicit fields like 'Transaction Date:' or 'Date:' and use their value if present, otherwise use your best guess.
    10. DO NOT include a 'date' field in the JSON output.

    CRITICAL INSTRUCTIONS FOR NARRATION:
    - I am providing a separate narration value that should ALWAYS be used as the description: "${context_narration || 'N/A'}"
    - IGNORE any other description you might extract and use this narration value INSTEAD
    - If the narration is N/A, extract the description from the text

    IMPROVED TRANSFER DETECTION:
    - Look for keywords like "transfer", "sent to", "beneficiary", "to account", "otherbank-transfer"
    - If the text mentions both a sender and recipient/beneficiary, it's likely a transfer
    - Look for bank names (like Providus, Moniepoint, Stanbic, Access Bank) to help identify transfers between accounts

    CATEGORY DETECTION RULES:
    - If the narration/description is "Bus", "Taxi", "Uber", "Bolt", "Ride", or any other transportation-related term, categorize as "Transport" with type "EXPENSE"
    - If it mentions "water", "electricity", "gas", "power", "internet", "wifi", or "bill", categorize as "Utilities" with type "EXPENSE"
    - If it mentions "food", "restaurant", "cafe", "dinner", "lunch", or "meal", categorize as "Dining" with type "EXPENSE"
    - If it mentions "grocery", "supermarket", "market", or "store", categorize as "Groceries" with type "EXPENSE"
    - If it mentions "salary", "paycheck", "income", "deposit", or "allowance", categorize as "Salary" with type "INCOME"
    - If it mentions "transfer", "sent", "remittance", or clearly shows money moving between accounts, categorize as "Transfer" with type "TRANSFER" and set is_transfer to true

    If you cannot confidently extract information from the text, use the following as a fallback:
    - amount: ${context_amount ?? 'N/A'}
    - date: ${context_date ?? 'N/A'}
    ${context_narration ? `- narration: "${context_narration}" (Use this as the description, and use it to help determine the category)` : ''}

    EXAMPLES:
    Text: "Payment for Netflix subscription yesterday"
    JSON: { "description": "Netflix subscription", "amount": 15.00, "category_name": "Entertainment", "category_type": "EXPENSE", "is_transfer": false, "source_account": null, "destination_account": null, "account_name": null }

    Text: "Received ₦500,000 salary for May from Work Inc"
    JSON: { "description": "Salary for May from Work Inc", "amount": 500000.00, "category_name": "Salary", "category_type": "INCOME", "is_transfer": false, "source_account": null, "destination_account": null, "account_name": null }

    Text: "I transferred 5000 from my savings account to my checking account"
    JSON: { "description": "Transfer from savings to checking", "amount": 5000.00, "category_name": "Transfer", "category_type": "TRANSFER", "is_transfer": true, "source_account": "savings", "destination_account": "checking", "account_name": null }

    Text: "Moved 2500 from my Stanbic account to Providus account"
    JSON: { "description": "Transfer from Stanbic to Providus", "amount": 2500.00, "category_name": "Transfer", "category_type": "TRANSFER", "is_transfer": true, "source_account": "Stanbic", "destination_account": "Providus", "account_name": null }
    
    Text: "Spent 100 from my credit card on groceries"
    JSON: { "description": "Groceries", "amount": 100.00, "category_name": "Groceries", "category_type": "EXPENSE", "is_transfer": false, "source_account": null, "destination_account": null, "account_name": "credit card" }

    Text: "Received 200 in my savings account for birthday gift"
    JSON: { "description": "Birthday gift", "amount": 200.00, "category_name": "Gift", "category_type": "INCOME", "is_transfer": false, "source_account": null, "destination_account": null, "account_name": "savings" }

    Text: "NARRATION Annual Water Bill Notice"
    JSON: { "description": "Annual Water Bill", "amount": 150.00, "category_name": "Utilities", "category_type": "EXPENSE", "is_transfer": false, "source_account": null, "destination_account": null, "account_name": null }

    Text: "NARRATION Bus"
    JSON: { "description": "Bus", "amount": 50.00, "category_name": "Transport", "category_type": "EXPENSE", "is_transfer": false, "source_account": null, "destination_account": null, "account_name": null }

    Text: "TRANSACTION NGN 24000.00 BENEFICIARY Access Bank Plc (Diamond) SENDER FEMI EMMANUEL FAKAYEJO Stanbic IBTC Bank"
    JSON: { "description": "Transfer to Access Bank", "amount": 24000.00, "category_name": "Transfer", "category_type": "TRANSFER", "is_transfer": true, "source_account": "Stanbic IBTC Bank", "destination_account": "Access Bank Plc", "account_name": null }

    Text: "Moniepoint DEBIT N10,000.00 Transaction Type TRANSFER Beneficiary FAKAYEJO FRANCIS DAYO"
    JSON: { "description": "Transfer to FAKAYEJO FRANCIS DAYO", "amount": 10000.00, "category_name": "Transfer", "category_type": "TRANSFER", "is_transfer": true, "source_account": "Moniepoint", "destination_account": "FAKAYEJO FRANCIS DAYO", "account_name": null }

    Text: "Amount: NGN 30,000.00 Session ID: 000023250501103632004152108368 Narration: Allowance"
    JSON: { "description": "Allowance", "amount": 30000.00, "category_name": "Salary", "category_type": "INCOME", "is_transfer": false, "source_account": null, "destination_account": null, "account_name": null }

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
                : parsedData.category_type === "TRANSFER" || (typeof parsedData.category_type === 'string' && parsedData.category_type.toUpperCase() === "TRANSFER")
                    ? "TRANSFER"
                    : "EXPENSE", // Default to EXPENSE
            // Date is added later in the main handler
        };
        
        // Set transfer flag if category type is TRANSFER
        if (validatedData.category_type === "TRANSFER") {
            validatedData.is_transfer = true;
        }
        
        // Process source and destination accounts for transfers
        if (validatedData.is_transfer) {
            if (typeof parsedData.source_account === 'string' && parsedData.source_account.trim()) {
                validatedData.source_account = parsedData.source_account.trim();
                console.log("Groq Parser - Source account validated:", validatedData.source_account);
            }
            
            if (typeof parsedData.destination_account === 'string' && parsedData.destination_account.trim()) {
                validatedData.destination_account = parsedData.destination_account.trim();
                console.log("Groq Parser - Destination account validated:", validatedData.destination_account);
            }
        } 
        // Process account name for non-transfer transactions
        else if (typeof parsedData.account_name === 'string' && parsedData.account_name.trim()) {
            validatedData.account_name = parsedData.account_name.trim();
            console.log("Groq Parser - Account name validated:", validatedData.account_name);
        }

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
  // Handle CORS preflight requests first, before any other processing
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Log headers for debugging
  console.log("Request headers:", Array.from(req.headers.entries()));

  // --- AUTHENTICATION CHECK ---
  // Skip authentication in development mode - no exception handling here
  let user = null;
  if (!isDevelopment) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing or invalid Authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
    const jwt = authHeader.replace("Bearer ", "");
    try {
      const { data, error } = await supabaseClient.auth.getUser(jwt);
      if (error || !data.user) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid JWT" }), {
          status: 401,
          headers: corsHeaders,
        });
      }
      user = data.user;
    } catch (authError) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized: JWT validation failed" }), {
        status: 401,
        headers: corsHeaders,
      });
    }
  } else {
    console.log("Running in development mode - AUTHENTICATION COMPLETELY SKIPPED");
  }
  // --- END AUTHENTICATION CHECK ---

  // Read API Key from environment variables (secure method) - try both common names
  const apiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("GROQ_OCR_KEY");
  
  // Debug: Log environment variable status (without exposing the actual key)
  console.log("Environment variables check:", {
    hasGroqApiKey: !!Deno.env.get("GROQ_API_KEY"),
    hasGroqOcrKey: !!Deno.env.get("GROQ_OCR_KEY"),
    finalApiKeyFound: !!apiKey,
    apiKeyPrefix: apiKey ? `${apiKey.substring(0, 5)}...` : 'none'
  });

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
    const context_amount = requestData.context_amount;
    const context_date = requestData.context_date;
    const context_narration = requestData.context_narration;

    // Log the input data for debugging
    console.log("Edge Function Input:", {
      text_preview: text?.substring(0, 100),
      context_amount,
      context_date,
      context_narration,
    });

    // Validate required parameters
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid transaction text" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Try to extract transaction date from the text directly
    const transactionDateMatch = text?.match(/(?:Transaction\s+Date|Date)[:\s]+([^\n]+)/i);
    if (transactionDateMatch && transactionDateMatch[1]) {
      const extractedDateText = transactionDateMatch[1].trim();
      console.log(`Found Transaction Date field: "${extractedDateText}"`);
      
      const parsedDate = parseFormattedDate(extractedDateText);
      if (parsedDate) {
        console.log(`Successfully parsed Transaction Date field to: "${parsedDate}"`);
        // Only set context_date if not already provided
        if (!context_date) {
          context_date = parsedDate;
        }
      }
    }

    // If API key is provided, attempt to use Groq API
    if (apiKey && typeof apiKey === "string") {
        try {
            // Special handling for context_date if it's in "3 April 2025" format
            if (context_date) {
              const parsedFormattedDate = parseFormattedDate(context_date);
              if (parsedFormattedDate) {
                console.log(`Converted context_date from "${context_date}" to "${parsedFormattedDate}"`);
                context_date = parsedFormattedDate;
              }
            }
            
            const groqResponse = await callGroqAPI(apiKey, text, context_amount, context_date, context_narration);
            // If callGroqAPI returns a Response, it was successful
            const responseData: LocalParsedTransaction = await groqResponse.json();
            
            // Fallback: use context values if AI returns empty/invalid
            if ((!responseData.amount || responseData.amount <= 0) && context_amount) {
              responseData.amount = context_amount;
            }
            
            // ALWAYS prefer the context_date if provided - this is a critical fix
            if (context_date) {
              console.log("Using provided context date:", context_date);
              // Don't reparse the date - use it exactly as provided from the client
              responseData.date = context_date;
            } else if (!responseData.date || responseData.date === '') {
              // If no date at all, attempt to find one in the text
              const extractedDate = parseRelativeDate(text);
              console.log("No date provided, extracted from text:", extractedDate);
              responseData.date = extractedDate;
            }
            
            // FORCED narration handling - ALWAYS use narration if provided
            if (context_narration) {
              console.log("CRITICAL: Using narration text for description:", context_narration);
              
              // ALWAYS override description with narration
              responseData.description = context_narration;
              
              // Use the categorization helper function for more comprehensive detection
              const categorization = categorizeTransaction(context_narration);
              console.log(`Auto-categorizing as ${categorization.category} based on narration "${context_narration}"`);
              responseData.category_name = categorization.category;
              responseData.category_type = categorization.type;
              
              // If it's a transfer, set the flag
              if (categorization.type === "TRANSFER") {
                responseData.is_transfer = true;
              }
            }

            // Final validation - add timestamp to log
            const timestamp = new Date().toLocaleDateString('en-CA');
            console.log(`[${timestamp}] Final Data (Groq):`, {
              description: responseData.description,
              date: responseData.date,
              amount: responseData.amount,
              category: responseData.category_name
            });
            
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

