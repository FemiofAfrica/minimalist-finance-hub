
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
      Extract transaction details from the following text. Return ONLY a JSON object with the following fields:
      - description: a brief description of the transaction
      - amount: the amount as a NUMBER (not a string) in NGN (Nigerian Naira)
      - category_name: the expense category (e.g., Food, Transport, Shopping, etc.)
      - category_type: either "INCOME" or "EXPENSE"
      - date: the transaction date in ISO format (YYYY-MM-DD). If no date is provided, use today's date.

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
            content: 'You are a financial assistant that extracts transaction details from text. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
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
      console.log('Parsed transaction data:', parsedData)
      
      return new Response(
        JSON.stringify(parsedData),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } catch (error) {
      console.error('Error parsing JSON from Groq response:', error)
      console.error('Raw content:', content)
      
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
