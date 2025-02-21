
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const defaultCategories = {
  'groceries': 'c1f7a875-dc5d-4d82-a1c7-ebca2c6de43b',
  'salary': 'd2f7b985-e36d-4d92-b1c8-fbca3c7de54c',
  'entertainment': 'e3f8c195-f47d-4da2-c1c9-gbca4c8de65d',
  'utilities': 'f4f9d305-g58d-4eb2-d1d0-hbca5c9de76e',
  'transport': 'g5f0e415-h69d-4fc2-e1e1-ibca6c0de87f'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables are not set');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
                - category: string (one of: groceries, salary, entertainment, utilities, transport)
                
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
    console.log('Initial parsed transaction:', parsedTransaction);

    // Map the category to a valid UUID
    const categoryId = defaultCategories[parsedTransaction.category?.toLowerCase() || ''] || null;
    
    // Prepare the final transaction data
    const processedTransaction = {
      description: parsedTransaction.description,
      amount: parsedTransaction.amount,
      type: parsedTransaction.type,
      date: parsedTransaction.date,
      category_id: categoryId
    };

    console.log('Processed transaction:', processedTransaction);

    // Validate the response structure
    if (!processedTransaction.description || !processedTransaction.amount || 
        !processedTransaction.type || !processedTransaction.date) {
      throw new Error('Invalid transaction format returned by AI');
    }

    return new Response(JSON.stringify(processedTransaction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
