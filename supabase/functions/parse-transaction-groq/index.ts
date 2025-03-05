
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Get the GROQ_API_KEY from environment variables
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY is not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const { text } = await req.json()
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'No text provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Received transaction text: ${text}`)

    const prompt = `
      Extract transaction details from the following text and determine if it's an income or expense. 
      Return ONLY a JSON object with the following fields:
      - description: a brief description of the transaction (capitalized properly, e.g., "Grocery Shopping" not "grocery shopping")
      - amount: the amount as a NUMBER (not a string) in NGN (Nigerian Naira), without the currency symbol
      - category_name: the expense or income category using common financial categories (e.g., Groceries, Salary, Transport, Entertainment, Food, Utilities, Housing, etc.)
      - category_type: either "INCOME" or "EXPENSE" in uppercase. Determine this based on context:
        * INCOME for: received, earned, got paid, salary, bonus, gift, refund, etc.
        * EXPENSE for: spent, bought, paid, purchased, etc.
      - date: the transaction date in ISO format (YYYY-MM-DD). 
        * If "yesterday" is mentioned, use yesterday's date
        * If "today" is mentioned, use today's date
        * If "last week" or similar is mentioned, use an approximate date
        * If no date is provided, use today's date
      
      For example:
      "I got paid my salary of 250,000 naira yesterday" → {"description": "Salary Payment", "amount": 250000, "category_name": "Salary", "category_type": "INCOME", "date": "2023-06-14"}
      "Spent 5000 on groceries last Saturday" → {"description": "Grocery Shopping", "amount": 5000, "category_name": "Groceries", "category_type": "EXPENSE", "date": "2023-06-10"}

      The text is: ${text}
    `

    // Make the API call to Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'You are a financial assistant that extracts transaction details from text. Always return valid JSON with the exact fields requested. Be precise with categorization and formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent results
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error from Groq API:', errorData)
      return new Response(
        JSON.stringify({ error: 'Error calling Groq API', details: errorData }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const groqResponse = await response.json()
    console.log('Groq API response:', groqResponse)

    // Extract the content from the Groq response
    const content = groqResponse.choices?.[0]?.message?.content
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content in Groq response' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Try to parse the content as JSON
    try {
      // Clean up the content to handle potential code blocks
      let cleanContent = content
      if (content.includes('```json')) {
        cleanContent = content.split('```json')[1].split('```')[0].trim()
      } else if (content.includes('```')) {
        cleanContent = content.split('```')[1].split('```')[0].trim()
      }

      const parsedData = JSON.parse(cleanContent)
      
      // Additional validation and formatting
      const validatedData = {
        description: parsedData.description || "Unknown Transaction",
        amount: typeof parsedData.amount === 'number' ? parsedData.amount : parseFloat(parsedData.amount) || 0,
        category_name: parsedData.category_name || "Uncategorized",
        category_type: ["INCOME", "EXPENSE"].includes(parsedData.category_type) 
          ? parsedData.category_type 
          : (parsedData.category_type?.toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE"),
        date: parsedData.date || new Date().toISOString().split('T')[0]
      }
      
      console.log('Validated transaction data:', validatedData)
      
      return new Response(
        JSON.stringify(validatedData),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      console.error('Error parsing JSON from Groq response:', error)
      console.error('Raw content:', content)
      
      // Attempt to extract key information even if JSON parsing fails
      try {
        // Simple fallback parser
        const fallbackData = {
          description: "Unknown Transaction",
          amount: 0,
          category_name: "Uncategorized",
          category_type: "EXPENSE",
          date: new Date().toISOString().split('T')[0]
        }
        
        // Try to extract amount if available
        const amountMatch = content.match(/amount["\s:]+(\d+)/i)
        if (amountMatch) {
          fallbackData.amount = parseFloat(amountMatch[1])
        }
        
        // Try to extract description if available
        const descMatch = content.match(/description["\s:]+["']([^"']+)["']/i)
        if (descMatch) {
          fallbackData.description = descMatch[1]
        }
        
        // Try to extract category if available
        const catMatch = content.match(/category_name["\s:]+["']([^"']+)["']/i)
        if (catMatch) {
          fallbackData.category_name = catMatch[1]
        }
        
        // Try to extract type if available
        const typeMatch = content.match(/category_type["\s:]+["']([^"']+)["']/i)
        if (typeMatch && typeMatch[1].toUpperCase() === "INCOME") {
          fallbackData.category_type = "INCOME"
        }
        
        console.log('Fallback parsing result:', fallbackData)
        
        return new Response(
          JSON.stringify(fallbackData),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } catch (fallbackError) {
        return new Response(
          JSON.stringify({ 
            error: 'Failed to parse JSON from Groq response',
            rawContent: content
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }
  } catch (error) {
    console.error('Error processing request:', error)
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
