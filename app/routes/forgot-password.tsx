import ForgotPasswordPage from "@/pages/ForgotPassword";
import { redirect, json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";

// Loader: Redirect logged-in users away
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
  return json(null, { headers: response.headers });
};

// Action: Handle password reset request
export const action = async ({ request }: ActionFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const formData = await request.formData();
  const email = String(formData.get("email"));

  if (!email) {
    return json({ error: "Email is required." }, { status: 400, headers: response.headers });
  }

  // Construct the redirect URL for the password update page
  // This URL is where Supabase will send the user after they click the link in the email.
  // It needs to point to a page in your app where they can enter a new password.
  // We haven't created this page yet, but let's define the path.
  const resetPasswordRedirectTo = `${new URL(request.url).origin}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetPasswordRedirectTo,
  });

  if (error) {
    console.error("Password Reset Error:", error);
    // Avoid leaking info about whether the email exists
    // Return a generic success message even if the email isn't found
    // or if there was some other error (like rate limiting).
    // Log the actual error server-side for debugging.
    // return json({ error: error.message }, { status: 400, headers: response.headers });
  }

  // IMPORTANT: Always return success to prevent email enumeration attacks,
  // even if the email doesn't exist in Supabase or an error occurred.
  return json({ success: true }, { headers: response.headers });
};

export default function ForgotPasswordRoute() {
  return <ForgotPasswordPage />;
} 