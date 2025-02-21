
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { text } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a financial transaction parser. Extract transaction details from user input and return a JSON object with:
              - description: string (what the transaction was for)
              - amount: number (positive for income, negative for expenses)
              - type: "income" | "expense"
              - date: ISO string (default to today if not specified)
              - category_id: string (map to common categories like "groceries", "salary", "entertainment", etc.)
              
              For example, "spent $50 on groceries yesterday" should return:
              {
                "description": "Groceries",
                "amount": -50,
                "type": "expense",
                "date": "2024-02-20",
                "category_id": "groceries"
              }`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const parsedTransaction = JSON.parse(data.choices[0].message.content);
    console.log('Parsed transaction:', parsedTransaction);

    return new Response(JSON.stringify(parsedTransaction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 200, // Always return 200 to handle errors in the client
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
