// This is a local proxy API endpoint to avoid CORS issues when calling Supabase functions
// It forwards requests from the client to Supabase Edge Functions
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64Source } = req.body;
    
    if (!base64Source) {
      return res.status(400).json({ error: 'Missing document data' });
    }

    // Get Supabase URL from header or environment variable
    const supabaseUrl = req.headers['x-supabase-url'] || 
                        process.env.VITE_SUPABASE_URL || 
                        'https://idcgvnwatraddbsppxzl.supabase.co';
    
    // Get Supabase API key from header or environment variable
    const apiKey = req.headers['apikey'] || 
                   process.env.VITE_SUPABASE_ANON_KEY;
    
    const functionsUrl = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1');
    const functionEndpoint = `${functionsUrl}/analyze-document`;
    
    console.log(`Proxying request to Supabase function: ${functionEndpoint}`);
    
    // Call the Supabase Edge Function
    const response = await fetch(functionEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the API key for authentication if available
        ...(apiKey ? { 'apikey': apiKey } : {})
      },
      body: JSON.stringify({ base64Source }),
    });
    
    // Get response status and data
    const status = response.status;
    const data = await response.json().catch(() => null);
    
    if (data) {
      // Forward the response
      return res.status(status).json(data);
    } else {
      // Handle non-JSON responses
      const text = await response.text().catch(() => 'Unknown error');
      return res.status(status).send(text);
    }
    
  } catch (error) {
    console.error('Error proxying to Supabase function:', error);
    return res.status(500).json({
      error: 'Failed to proxy request to Supabase function',
      details: error.message || 'Unknown error'
    });
  }
} 