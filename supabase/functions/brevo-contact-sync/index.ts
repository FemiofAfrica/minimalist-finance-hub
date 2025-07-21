import { createClient } from 'jsr:@supabase/supabase-js@^2';

// Helper to add CORS headers
function withCORS(response: Response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*'); // You can restrict this to your domain in production
  newHeaders.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

Deno.serve(async (req) => {
  // Handle preflight OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return withCORS(new Response(null, { status: 204 }));
  }

  // Ensure authorization
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return withCORS(new Response(JSON.stringify({
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  }

  // Brevo API configuration
  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
  if (!BREVO_API_KEY) {
    return withCORS(new Response(JSON.stringify({
      error: 'Brevo API key not configured'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  }

  // Initialize Supabase client with service role key to bypass RLS
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  );

  try {
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name');

    if (profilesError) {
      throw profilesError;
    }

    // Log all profiles returned from Supabase
    console.log('All profiles returned:', JSON.stringify(profiles, null, 2));

    const brevoContacts = profiles
      .filter(profile => profile.email === 'femifakayejo@gmail.com')
      .map((profile) => ({
        email: profile.email,
        attributes: {
          FIRSTNAME: profile.first_name,
          LASTNAME: profile.last_name,
          USER_ID: profile.id
        }
      }));

    const brevoPayload = { contacts: brevoContacts };
    console.log('Payload sent to Brevo:', JSON.stringify(brevoPayload, null, 2));

    // Brevo API call to create/update contacts
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(brevoPayload)
    });

    // Always log the payload for debugging
    console.log('Brevo payload sent:', JSON.stringify(brevoPayload, null, 2));

    // Handle 204 No Content as success, but include payload
    if (brevoResponse.status === 204) {
      return withCORS(new Response(JSON.stringify({
        message: 'Contacts synced successfully (no content returned by Brevo)',
        brevoStatus: brevoResponse.status,
        brevoStatusText: brevoResponse.statusText,
        brevoPayload,
        allProfiles: profiles
      }), {
        headers: {
          'Content-Type': 'application/json'
        }
      }));
    }

    let result;
    let rawText = '';
    try {
      rawText = await brevoResponse.text();
      result = JSON.parse(rawText);
    } catch (e) {
      result = null;
    }

    console.log('Brevo API raw response:', rawText);

    if (!result) {
      return withCORS(new Response(JSON.stringify({
        error: 'Contact sync failed',
        details: 'Brevo API did not return valid JSON',
        brevoStatus: brevoResponse.status,
        brevoStatusText: brevoResponse.statusText,
        brevoRawResponse: rawText,
        brevoPayload,
        allProfiles: profiles
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }));
    }

    return withCORS(new Response(JSON.stringify({
      message: 'Contacts synced successfully',
      brevoStatus: brevoResponse.status,
      brevoStatusText: brevoResponse.statusText,
      brevoPayload,
      brevoResponse: result,
      allProfiles: profiles
    }), {
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  } catch (error) {
    return withCORS(new Response(JSON.stringify({
      error: 'Contact sync failed',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    }));
  }
}); 