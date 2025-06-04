import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TurnstileVerifyRequest {
  token: string;
  remoteip?: string;
}

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get Turnstile secret from environment
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (!turnstileSecret) {
      return new Response(
        JSON.stringify({ 
          error: 'Turnstile secret not configured',
          success: false 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { token, remoteip }: TurnstileVerifyRequest = await req.json()

    if (!token) {
      return new Response(
        JSON.stringify({ 
          error: 'Token is required',
          success: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify with Cloudflare's Turnstile API
    const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    const verifyData = new FormData()
    verifyData.append('secret', turnstileSecret)
    verifyData.append('response', token)
    
    // Add remote IP if provided (optional but recommended)
    if (remoteip) {
      verifyData.append('remoteip', remoteip)
    }

    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      body: verifyData,
    })

    if (!verifyResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify with Turnstile service',
          success: false 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const verifyResult: TurnstileVerifyResponse = await verifyResponse.json()

    // Return the verification result
    return new Response(
      JSON.stringify({
        success: verifyResult.success,
        errorCodes: verifyResult['error-codes'] || [],
        challengeTs: verifyResult.challenge_ts,
        hostname: verifyResult.hostname,
        action: verifyResult.action
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Turnstile verification error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during verification',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 