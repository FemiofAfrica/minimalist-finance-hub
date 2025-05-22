// Follow Deno's import syntax for Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Define CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Handle OPTIONS requests for CORS
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // No Content
      headers: corsHeaders
    });
  }
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    // Read environment variables from Supabase (set in the dashboard)
    const endpoint = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT');
    const apiKey = Deno.env.get('AZURE_DOCUMENT_INTELLIGENCE_KEY');

    if (!endpoint || !apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Azure Document Intelligence credentials not configured on the server',
          details: 'Please set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY environment variables in the Supabase dashboard'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { base64Source } = requestData;

    if (!base64Source) {
      return new Response(
        JSON.stringify({ error: 'Missing document data' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Call Azure Document Intelligence API
    const analyzeUrl = `${endpoint}/documentModels/prebuilt-layout:analyze?api-version=2023-07-31`;
    const response = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey
      },
      body: JSON.stringify({
        base64Source
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ 
          error: 'Error calling Azure Document Intelligence API',
          details: errorData
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Get operation location for polling
    const operationLocation = response.headers.get('Operation-Location');
    if (!operationLocation) {
      return new Response(
        JSON.stringify({ 
          error: 'Azure Document Intelligence API did not return an Operation-Location header'
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Poll for results
    let result;
    let retries = 0;
    const maxRetries = 10;
    
    while (retries < maxRetries) {
      // Wait between polling attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(operationLocation, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey
        }
      });
      
      if (!pollResponse.ok) {
        retries++;
        continue;
      }
      
      const pollData = await pollResponse.json();
      
      if (pollData.status === 'succeeded') {
        result = pollData;
        break;
      } else if (pollData.status === 'failed') {
        return new Response(
          JSON.stringify({
            error: 'Document analysis failed',
            details: pollData.error
          }),
          { status: 500, headers: corsHeaders }
        );
      }
      
      retries++;
    }
    
    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Document analysis timed out' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Extract text from results
    let extractedText = '';
    
    if (result.analyzeResult?.pages) {
      for (const page of result.analyzeResult.pages) {
        if (page.lines) {
          for (const line of page.lines) {
            extractedText += line.content + '\n';
          }
        }
        extractedText += '\n'; // Add extra line between pages
      }
    }
    
    return new Response(
      JSON.stringify({ text: extractedText.trim() }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Error processing document',
        details: error.message || String(error)
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}); 