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
  
  // Securely get the authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // If no user or error getting user, redirect to login
  if (userError || !user) {
    console.error("Error getting user or no user in loader:", userError);
    return redirect("/login", { headers: response.headers });
  }

  // Extract first name from user metadata
  const firstName = user.user_metadata?.first_name || null;

  // Return the authenticated user along with headers
  return { user, headers: response.headers };
};

// Action function to handle profile updates
export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("Starting settings action handler");
  
  try {
    // Verify environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables:", {
        hasUrl: !!process.env.SUPABASE_URL,
        hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      throw new Error("Missing required Supabase environment variables");
    }

    const response = new Response();
    console.log("Creating Supabase clients");
    
    // Create clients with error handling
    let supabase;
    let serviceRoleClient;
    try {
      supabase = createServerClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { request, response }
      );

      // Create service role client with explicit RLS bypass
      serviceRoleClient = createServerClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { 
          request, 
          response,
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );
    } catch (error) {
      console.error("Error creating Supabase clients:", error);
      throw new Error("Failed to initialize Supabase clients");
    }

    console.log("Getting user session");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Error getting user:", userError);
      return redirect("/login", { headers: response.headers });
    }

    if (!user) {
      console.error("No user found in session");
      return redirect("/login", { headers: response.headers });
    }

    console.log("Processing form data");
    const formData = await request.formData();
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    console.log("Updating user metadata");
    const { error: updateError } = await supabase.auth.updateUser({
      data: { 
        first_name: firstName,
        last_name: lastName
      }
    });

    if (updateError) {
      console.error("Error updating user metadata:", updateError);
      return json({ 
        error: "Failed to update profile",
        details: updateError.message 
      }, { status: 500 });
    }

    // First, try to update the profile
    console.log("Attempting to update profile");
    const { error: profileUpdateError } = await serviceRoleClient
      .from("profiles")
      .update({ 
        first_name: firstName,
        last_name: lastName,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (profileUpdateError) {
      // If update fails, try to insert
      console.log("Update failed, attempting to insert new profile");
      const { error: insertError } = await serviceRoleClient
        .from("profiles")
        .insert([{ 
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error("Error creating profile:", insertError);
        return json({ 
          error: "Failed to create profile",
          details: insertError.message,
          code: insertError.code
        }, { status: 500 });
      }
    }

    console.log("Profile update successful");
    return json({ success: true }, { headers: response.headers });
  } catch (error) {
    console.error("Unexpected error in settings action:", error);
    return json({ 
      error: "An unexpected error occurred",
      details: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
};

// Route component renders the actual page
export default function SettingsRoute() {
  return <SettingsPage />;
} 