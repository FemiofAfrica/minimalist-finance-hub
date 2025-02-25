
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface ParsedTransaction {
  description: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  date: string;
  category_id: string;
}

// Categories mapping
const CATEGORIES: Record<string, string> = {
  "groceries": "groceries",
  "food": "groceries",
  "restaurant": "eating_out",
  "dining": "eating_out",
  "transportation": "transportation",
  "transport": "transportation",
  "travel": "travel",
  "healthcare": "healthcare",
  "health": "healthcare",
  "utilities": "utilities",
  "utility": "utilities",
  "bills": "utilities",
  "entertainment": "entertainment",
  "shopping": "shopping",
  "education": "education",
  "school": "education",
  "salary": "income",
  "income": "income",
  "revenue": "income",
  "interest": "income",
  "gift": "income",
  "rent": "housing",
  "housing": "housing",
  "mortgage": "housing",
  "general": "general"
};

// Function to determine category from text
function determineCategory(text: string): string {
  const lowerText = text.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORIES)) {
    if (lowerText.includes(keyword)) {
      return category;
    }
  }
  return "general";
}

function parseTransaction(text: string): ParsedTransaction {
  const lowerText = text.toLowerCase();
  
  // Determine transaction type
  const isIncome = lowerText.includes("earned") || 
                   lowerText.includes("received") || 
                   lowerText.includes("income") ||
                   lowerText.includes("salary") ||
                   lowerText.includes("revenue");
  
  const type = isIncome ? "INCOME" : "EXPENSE";
  
  // Extract amount
  const amountRegex = /[₦$]?\s?(\d+([,.]\d+)?)/;
  const amountMatch = text.match(amountRegex);
  let amount = 0;
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(',', ''));
  }
  
  // Extract description
  let description = "";
  if (type === "EXPENSE") {
    if (lowerText.includes("spent") && lowerText.includes("on")) {
      const afterOn = lowerText.split("on ")[1];
      if (afterOn) {
        description = afterOn.split(" ")[0];
        if (description.endsWith('.')) {
          description = description.slice(0, -1);
        }
      }
    } else if (lowerText.includes("bought")) {
      const afterBought = lowerText.split("bought ")[1];
      if (afterBought) {
        description = afterBought.split(" ")[0];
        if (description.endsWith('.')) {
          description = description.slice(0, -1);
        }
      }
    }
  } else {
    if (lowerText.includes("earned") || lowerText.includes("received")) {
      description = "Income payment";
    } else {
      description = "Income";
    }
  }
  
  // Default description if nothing is found
  if (!description) {
    description = type === "EXPENSE" ? "General expense" : "Income";
  }
  
  // Capitalize first letter
  description = description.charAt(0).toUpperCase() + description.slice(1);
  
  // Extract date (default to today)
  const today = new Date();
  let date = today.toISOString();
  
  // Check for time indicators
  if (lowerText.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    date = yesterday.toISOString();
  } else if (lowerText.includes("today")) {
    date = today.toISOString();
  } else if (lowerText.includes("last week")) {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    date = lastWeek.toISOString();
  }
  
  // Determine category
  const category_id = determineCategory(lowerText);
  
  return {
    description,
    amount,
    type,
    date,
    category_id
  };
}

serve(async (req) => {
  try {
    // Check for proper HTTP method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid request. 'text' field is required and must be a string" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse the transaction
    const transaction = parseTransaction(text);

    // Return the parsed transaction
    return new Response(
      JSON.stringify(transaction),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Log the error and return a 500 response
    console.error("Error parsing transaction:", error);
    return new Response(
      JSON.stringify({ error: "Failed to parse transaction" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
