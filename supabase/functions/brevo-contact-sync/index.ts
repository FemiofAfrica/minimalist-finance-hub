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

    // Sync all users (remove filter)
    const brevoContacts = profiles.map((profile) => ({
      email: profile.email,
      attributes: {
        FIRSTNAME: profile.first_name,
        LASTNAME: profile.last_name,
        USER_ID: profile.id
      }
    }));

    // No logging of user data or emails

    // Instead of logging or returning emails or user data, just track status counts
    let created = 0;
    let updated = 0;
    let failed = 0;
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
        if (res.status === 201) created++;
        else if (res.status === 200) updated++;
        else failed++;
      } catch (err) {
        failed++;
      }
    }

    return withCORS(new Response(JSON.stringify({
      message: 'Contacts processed',
      created,
      updated,
      failed,
      total: brevoContacts.length
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