// Vercel serverless function for Turnstile verification
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      success: false 
    });
  }

  try {
    console.log('Turnstile verification request received');

    // Get Turnstile secret from environment variables
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    
    if (!turnstileSecret) {
      console.error('TURNSTILE_SECRET_KEY environment variable not set');
      return res.status(500).json({
        error: 'Turnstile secret not configured. Please set TURNSTILE_SECRET_KEY in Vercel environment variables.',
        success: false
      });
    }

    const { token, remoteip } = req.body;

    if (!token) {
      console.log('No token provided in request');
      return res.status(400).json({
        error: 'Token is required',
        success: false
      });
    }

    console.log('Verifying token with Cloudflare, token length:', token.length);

    // Verify with Cloudflare's Turnstile API
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const verifyData = new URLSearchParams();
    verifyData.append('secret', turnstileSecret);
    verifyData.append('response', token);
    
    // Add remote IP if provided (optional but recommended)
    if (remoteip) {
      verifyData.append('remoteip', remoteip);
      console.log('Added remote IP to verification request');
    }

    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: verifyData,
    });

    console.log('Cloudflare response status:', verifyResponse.status);

    if (!verifyResponse.ok) {
      console.error('Cloudflare verification failed with status:', verifyResponse.status);
      return res.status(500).json({
        error: 'Failed to verify with Turnstile service',
        success: false
      });
    }

    const verifyResult = await verifyResponse.json();
    console.log('Cloudflare verification result:', verifyResult);

    // Return the verification result
    return res.status(200).json({
      success: verifyResult.success,
      errorCodes: verifyResult['error-codes'] || [],
      challengeTs: verifyResult.challenge_ts,
      hostname: verifyResult.hostname,
      action: verifyResult.action
    });

  } catch (error) {
    console.error('Turnstile verification error:', error);
    return res.status(500).json({
      error: 'Internal server error during verification',
      success: false,
      details: error.message
    });
  }
} 