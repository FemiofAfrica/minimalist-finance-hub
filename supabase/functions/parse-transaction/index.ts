
// Follow imports from Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define the required transaction properties
interface ParsedTransaction {
  description: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  date: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

function parseTransaction(text: string): ParsedTransaction {
  // Default values
  let description = "Transaction";
  let amount = 0;
  let type: "EXPENSE" | "INCOME" = "EXPENSE";
  let date = new Date().toISOString();
  
  const lowerText = text.toLowerCase();
  
  // Check for expense/income indicators
  if (lowerText.includes("earned") || 
      lowerText.includes("received") || 
      lowerText.includes("income") ||
      lowerText.includes("salary") ||
      lowerText.includes("paid")) {
    type = "INCOME";
  }
  
  // Extract amount
  const amountMatch = text.match(/[₦$]?\s?(\d+([,.]\d+)?)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(',', ''));
  }
  
  // Extract description
  if (type === "EXPENSE") {
    if (lowerText.includes("spent") && lowerText.includes("on")) {
      const parts = lowerText.split("on ");
      if (parts.length > 1) {
        const firstWord = parts[1].split(" ")[0];
        description = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
        description = description.replace(/[.,!?]$/, '');
      }
    } else if (lowerText.includes("bought")) {
      const parts = lowerText.split("bought ");
      if (parts.length > 1) {
        const firstWord = parts[1].split(" ")[0];
        description = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
        description = description.replace(/[.,!?]$/, '');
      }
    } else if (lowerText.includes("paid") && lowerText.includes("for")) {
      const parts = lowerText.split("for ");
      if (parts.length > 1) {
        const firstWord = parts[1].split(" ")[0];
        description = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
        description = description.replace(/[.,!?]$/, '');
      }
    } else {
      description = "Expense";
    }
  } else {
    description = "Income";
    if (lowerText.includes("salary")) {
      description = "Salary";
    } else if (lowerText.includes("earned")) {
      description = "Earnings";
    }
  }
  
  // Extract date if specified
  if (lowerText.includes("yesterday")) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    date = yesterday.toISOString();
  } else if (lowerText.includes("today")) {
    date = new Date().toISOString();
  } else if (lowerText.includes("last week")) {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    date = lastWeek.toISOString();
  }
  
  return {
    description,
    amount,
    type,
    date
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }
    
    // Parse the request body
    const body = await req.json();
    const { text } = body;
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request. Text field is required' }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Parse the transaction from the text
    const parsedTransaction = parseTransaction(text);
    
    // Return the parsed transaction
    return new Response(
      JSON.stringify(parsedTransaction),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error parsing transaction:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to parse transaction' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
