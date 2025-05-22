// Proxy API route for Azure Document Intelligence
// This avoids CORS issues by proxying requests from the client to Supabase

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
    
    // Call Supabase Edge Function directly from the server
    // This avoids CORS issues since it's server-to-server communication
    const response = await fetch(
      'https://idcgvnwatraddbsppxzl.supabase.co/functions/v1/analyze-document',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any Supabase authorization if needed
          // 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ base64Source }),
      }
    );
    
    // Forward the response status and body
    const data = await response.json();
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Error proxying to document analysis service:', error);
    return res.status(500).json({
      error: 'Failed to process document',
      details: error.message
    });
  }
} 