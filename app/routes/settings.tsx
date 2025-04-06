import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs, json } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import SettingsPage from "@/pages/Settings";

// Loader function to enforce authentication and load profile data
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return redirect("/login", { headers: response.headers });
  }

  // Fetch profile data
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', session.user.id)
    .single(); // Use single() as profile should exist for logged-in user

  if (profileError) {
    console.error("Error fetching profile in loader:", profileError);
    // Handle error appropriately - maybe return null or default name
  }

  // Return profile data along with headers
  return json({ 
    user: session.user, // Pass user object if needed by page
    firstName: profileData?.first_name || null // Pass firstName or null
  }, { headers: response.headers }); 
};

// Action function to handle profile updates
export const action = async ({ request }: ActionFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  // Get user session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // This shouldn't happen if loader protects the route, but good practice
    return json({ error: "Unauthorized" }, { status: 401, headers: response.headers });
  }

  const formData = await request.formData();
  const firstName = String(formData.get("firstName") || "");
  const lastName = String(formData.get("lastName") || "");

  // Prepare profile update data
  const profileUpdate = {
    id: session.user.id,
    email: session.user.email, // Ensure email is included if required by policy/table
    first_name: firstName,
    last_name: lastName,
    updated_at: new Date().toISOString(),
  };

  // Perform upsert on the server
  const { error } = await supabase
    .from('profiles')
    .upsert(profileUpdate, { onConflict: 'id' });

  if (error) {
    console.error("Server Profile Update Error:", error);
    return json({ error: "Failed to update profile.", detail: error.message }, { status: 500, headers: response.headers });
  }

  // Return success indication
  return json({ success: true, message: "Profile updated successfully." }, { headers: response.headers });
};

// Route component renders the actual page
export default function SettingsRoute() {
  return <SettingsPage />;
} 