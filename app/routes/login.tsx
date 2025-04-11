import LoginPage from "@/pages/Login";
import { redirect, json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";

// Loader: Redirect logged-in users away from login
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    throw redirect("/");
  }
  return json(null, { headers: response.headers }); // Must return something
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error("Sign-in error:", signInError);
    return json({ error: signInError.message }, { status: 400, headers: response.headers });
  }

  // Check if user exists after successful sign-in
  if (signInData.user) {
    // Check if profile exists for this user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', signInData.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = row not found
        console.error("❌ Error checking for profile:", profileError);
        // Log error but proceed, maybe profile creation will fix it or maybe it's another issue.
    }

    // If profile doesn't exist, create it
    if (!profile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: signInData.user.id, // Link to the auth user
          user_id: signInData.user.id, // Ensure user_id is also set
          email: signInData.user.email, // Pre-fill email
          // first_name, last_name will be null initially, user updates in settings
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("❌ Error creating profile during login:", insertError);
        // Log the error, but still redirect the user. They might face issues later.
        // Consider returning an error message if profile creation is critical.
      }
    }
  }
  else {
    console.warn("⚠️ Sign-in successful but no user data returned? This shouldn't happen.");
  }

  // On success, redirect to dashboard, preserving Supabase session cookies
  return redirect("/", { headers: response.headers });
};

export default function LoginRoute() {
  // Render the login page component
  return <LoginPage />;
} 