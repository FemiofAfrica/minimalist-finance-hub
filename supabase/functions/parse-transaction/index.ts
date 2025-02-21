
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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const { text } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a financial transaction parser for Nigerian Naira transactions. Extract transaction details from the following input and return ONLY a JSON object (no other text) with:
                - description: string (what the transaction was for)
                - amount: number (positive for income, negative for expenses)
                - type: "income" | "expense"
                - date: ISO string (default to today if not specified)
                - category_id: string (map to common categories like "groceries", "salary", "entertainment", etc.)
                
                Parse this transaction: ${text}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          topK: 40
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini');
    }

    // Extract the JSON from the response text
    const responseText = data.candidates[0].content.parts[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not find JSON in response');
    }

    const parsedTransaction = JSON.parse(jsonMatch[0]);
    console.log('Parsed transaction:', parsedTransaction);

    // Validate the response structure
    if (!parsedTransaction.description || !parsedTransaction.amount || !parsedTransaction.type || !parsedTransaction.date) {
      throw new Error('Invalid transaction format returned by AI');
    }

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
