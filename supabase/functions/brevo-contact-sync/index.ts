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

    // Sync all users (remove filter)
    const brevoContacts = profiles.map((profile) => ({
      email: profile.email,
      attributes: {
        FIRSTNAME: profile.first_name,
        LASTNAME: profile.last_name,
        USER_ID: profile.id
      }
    }));

    const brevoPayload = { contacts: brevoContacts };
    console.log('Payload sent to Brevo:', JSON.stringify(brevoPayload, null, 2));

    // Instead of batch, loop through each contact and call /contacts endpoint
    const results = [];
    for (const contact of brevoContacts) {
      try {
        const res = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY
          },
          body: JSON.stringify(contact)
        });
        let resText = await res.text();
        let resJson;
        try {
          resJson = JSON.parse(resText);
        } catch (e) {
          resJson = resText;
        }
        results.push({
          email: contact.email,
          status: res.status,
          statusText: res.statusText,
          response: resJson
        });
      } catch (err) {
        results.push({
          email: contact.email,
          error: err.message
        });
      }
    }

    return withCORS(new Response(JSON.stringify({
      message: 'Contacts processed individually',
      results,
      brevoPayload,
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