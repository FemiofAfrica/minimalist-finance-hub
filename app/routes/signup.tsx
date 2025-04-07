import SignupPage from "@/pages/Signup";
import { redirect, json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";

// Loader: Redirect logged-in users away from signup
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

// Action: Handle signup form submission
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

  // Basic server-side validation
  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400, headers: response.headers });
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error("Signup Error:", error);
    // Consider more specific error messages based on error.code
    return json({ error: error.message || "Could not sign up user." }, { status: 400, headers: response.headers });
  }

  // IMPORTANT: Supabase sends a confirmation email by default.
  // You might want to redirect to a page informing the user to check their email.
  // For simplicity here, we redirect to login, but they can't log in until confirmed.
  // Alternatively, disable email confirmation in Supabase settings if not needed.
  return redirect("/confirm-email", { headers: response.headers });
};

export default function SignupRoute() {
  return <SignupPage />;
} 