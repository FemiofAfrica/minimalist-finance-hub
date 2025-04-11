
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Define the required transaction properties
interface ParsedTransaction {
  description: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  date: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:8080',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

function parseTransaction(text: string): ParsedTransaction {
    // Default values
    let description = 'Transaction';
    let amount = 0;
    let type: 'EXPENSE' | 'INCOME' = 'EXPENSE';
    let date = new Date().toISOString();

    const lowerText = text.toLowerCase();

    // Check for expense/income indicators
    const incomeIndicators = [
        'earned',
        'received',
        'income',
        'salary',
        'paid',
        'ingreso',
        'recibido', // Spanish
        'salario', // Spanish
        'pago', // Spanish
        'recebido', // Portuguese
        'salário', // Portuguese
        'renda' // Portuguese
    ];
    if (incomeIndicators.some((indicator) => lowerText.includes(indicator))) {
        type = 'INCOME';
    }

    // Extract amount
    const amountMatch = text.match(
        /([€$£¥₹₦]\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/
    );
    if (amountMatch) {
        const amountStr = amountMatch[2].replace(/[.,]/g, (match) =>
            match === ',' ? '' : '.'
        );
        amount = parseFloat(amountStr);
    }

    // Extract description
    if (type === 'EXPENSE') {
        const expensePatterns = [
            /spent\s+on\s+(.+?)(?:\s+(?:on|at|in)|$)/,
            /bought\s+(.+?)(?:\s+(?:on|at|in)|$)/,
            /paid\s+for\s+(.+?)(?:\s+(?:on|at|in)|$)/,
            /paid\s+(.+?)(?:\s+(?:on|at|in)|$)/,
            /gasto\s+en\s+(.+?)(?:\s+(?:en|a|)|$)/, // Spanish
            /comprado\s+(.+?)(?:\s+(?:en|a|)|$)/, // Spanish
            /pagado\s+por\s+(.+?)(?:\s+(?:en|a|)|$)/, // Spanish
            /pago\s+(.+?)(?:\s+(?:en|a|)|$)/, // Spanish
            /gasto\s+(.+?)(?:\s+(?:en|a|)|$)/, // Spanish
            /gastou\s+em\s+(.+?)(?:\s+(?:em|no|na)|$)/, // Portuguese
            /comprou\s+(.+?)(?:\s+(?:em|no|na)|$)/, // Portuguese
            /pago\s+por\s+(.+?)(?:\s+(?:em|no|na)|$)/, // Portuguese
            /pagou\s+(.+?)(?:\s+(?:em|no|na)|$)/, // Portuguese
            /gasto\s+(.+?)(?:\s+(?:em|no|na)|$)/ // Portuguese
        ];
        for (const pattern of expensePatterns) {
            const match = lowerText.match(pattern);
            if (match && match.length > 1) {
                description = match[1].trim();
                description = description.charAt(0).toUpperCase() +
                    description.slice(1).replace(/[.,!?]$/, '');
                break;
            }
        }
        if (description === 'Transaction') {
            description = 'Expense';
        }
    } else {
        const incomePatterns = [
            /salary\s+(?:from|of)\s+(.+?)(?:\s+(?:on|at|in)|$)/,
            /earned\s+from\s+(.+?)(?:\s+(?:on|at|in)|$)/,
            /salario\s+(?:de|del)\s+(.+?)(?:\s+(?:en|a|)|$)/, // Spanish
            /ganado\s+de\s+(.+?)(?:\s+(?:en|a|)|$)/, // Spanish
            /salário\s+(?:de|do)\s+(.+?)(?:\s+(?:em|no|na)|$)/, // Portuguese
            /ganhou\s+de\s+(.+?)(?:\s+(?:em|no|na)|$)/ // Portuguese
        ];
        for (const pattern of incomePatterns) {
            const match = lowerText.match(pattern);
            if (match && match.length > 1) {
                description = match[1].trim();
                description = description.charAt(0).toUpperCase() +
                    description.slice(1).replace(/[.,!?]$/, '');
                break;
            }
        }

        if (description === 'Transaction') {
            if (lowerText.includes('salary') || lowerText.includes('salario') || lowerText.includes('salário')) { // Spanish and Portuguese
                description = 'Salary';
            } else if (lowerText.includes('earned') || lowerText.includes('ganado') || lowerText.includes('ganhou')) { // Spanish and Portuguese
                description = 'Earnings';
            } else {
                description = 'Income';
            }
        }
    }

    // Extract date if specified
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const datePatterns = {
        yesterday: yesterday.toISOString(),
        today: today.toISOString(),
        'last week': lastWeek.toISOString(),
        'last month': lastMonth.toISOString(),
        'this month': thisMonth.toISOString(),
        'ayer': yesterday.toISOString(), // Spanish
        'hoy': today.toISOString(), // Spanish
        'la semana pasada': lastWeek.toISOString(), // Spanish
        'el mes pasado': lastMonth.toISOString(), // Spanish
        'este mes': thisMonth.toISOString(), // Spanish
        'ontem': yesterday.toISOString(), // Portuguese
        'hoje': today.toISOString(), // Portuguese
        'semana passada': lastWeek.toISOString(), // Portuguese
        'mês passado': lastMonth.toISOString(), // Portuguese
        'esse mês': thisMonth.toISOString() // Portuguese
    };
    for (const [pattern, isoDate] of Object.entries(datePatterns)) {
        if (lowerText.includes(pattern)) {
            date = isoDate;
            break;
        }
    }

    const dateMatch = text.match(/\d{1,2}[/-]\d{1,2}[/-]\d{4}/);
    if (dateMatch) {
        date = new Date(dateMatch[0].replace(/[/]/g, '-')).toISOString();
    }

    return {
        description,
        amount,
        type,
        date
    };
}

serve(async (req: Request) => {
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
