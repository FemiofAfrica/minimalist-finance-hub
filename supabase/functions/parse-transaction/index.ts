
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const defaultCategories = {
  'groceries': 'c1f7a875-dc5d-4d82-a1c7-ebca2c6de43b',
  'salary': 'd2f7b985-e36d-4d92-b1c8-fbca3c7de54c',
  'entertainment': 'e3f8c195-f47d-4da2-c1c9-1bca4c8de65d',
  'utilities': 'f4f9d305-158d-4eb2-91d0-2bca5c9de76e',
  'transport': '55f0e415-168d-4fc2-a1e1-3bca6c0de87f'
};

serve(async (req) => {
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

    const prompt = `Parse this financial transaction into a structured format: "${text}"
    
    Rules:
    - For expenses, amount should be negative
    - For income, amount should be positive
    - Categories must be one of: groceries, salary, entertainment, utilities, transport
    - If no date is specified, use today's date
    - Description should be clear and concise
    
    Return ONLY a JSON object with this exact structure:
    {
      "description": "string",
      "amount": number,
      "type": "income" or "expense",
      "date": "ISO date string",
      "category": "one of the allowed categories"
    }`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
        }
      })
    });

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from AI');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    console.log('AI Response:', aiResponse); // Add logging
    const parsedTransaction = JSON.parse(jsonMatch[0]);
    console.log('Parsed transaction:', parsedTransaction); // Add logging

    // Validate all required fields
    if (!parsedTransaction.description || 
        typeof parsedTransaction.amount !== 'number' ||
        !['income', 'expense'].includes(parsedTransaction.type) ||
        !parsedTransaction.date ||
        !parsedTransaction.category) {
      throw new Error('Missing or invalid fields in parsed transaction');
    }

    // Map the category to a valid UUID
    const categoryId = defaultCategories[parsedTransaction.category.toLowerCase()];
    if (!categoryId) {
      throw new Error(`Invalid category. Must be one of: ${Object.keys(defaultCategories).join(', ')}`);
    }

    // Return the formatted transaction data
    const processedTransaction = {
      description: parsedTransaction.description,
      amount: Math.abs(parsedTransaction.amount), // Store as positive
      type: parsedTransaction.type,
      date: new Date(parsedTransaction.date).toISOString(),
      category_id: categoryId
    };

    console.log('Processed transaction:', processedTransaction); // Add logging

    return new Response(JSON.stringify(processedTransaction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
