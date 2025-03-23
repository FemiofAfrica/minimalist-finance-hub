import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { token, action } = await request.json();
    
    if (!token || !action) {
      return new Response(JSON.stringify({ error: 'Missing token or action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
    if (!RECAPTCHA_SECRET_KEY) {
      console.error('reCAPTCHA secret key not configured');
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the token with Google's reCAPTCHA API
    const verificationURL = 'https://www.google.com/recaptcha/api/siteverify';
    const formData = new URLSearchParams();
    formData.append('secret', RECAPTCHA_SECRET_KEY);
    formData.append('response', token);

    const response = await fetch(verificationURL, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      console.error('reCAPTCHA verification request failed:', response.status);
      return new Response(JSON.stringify({ error: 'Failed to verify reCAPTCHA' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();

    if (!result.success) {
      console.warn('reCAPTCHA verification failed:', result['error-codes']);
      return new Response(JSON.stringify({ 
        error: 'Invalid reCAPTCHA token',
        details: result['error-codes'] 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify that the action matches
    if (result.action !== action) {
      console.warn(`Action mismatch: expected ${action}, got ${result.action}`);
      return new Response(JSON.stringify({ error: 'Action mismatch' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add timestamp validation (optional)
    const challengeTime = new Date(result.challenge_ts).getTime();
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (currentTime - challengeTime > fiveMinutes) {
      console.warn('reCAPTCHA token expired');
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      score: result.score,
      action: result.action,
      challenge_ts: result.challenge_ts
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}