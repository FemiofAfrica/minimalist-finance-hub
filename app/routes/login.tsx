import LoginPage from "@/pages/Login";
import { redirect, json, type ActionFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";

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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Sign-in error:", error);
    // Return error message to display on the form (optional enhancement)
    return json({ error: error.message }, { status: 400, headers: response.headers });
  }

  // On success, redirect to dashboard, preserving Supabase session cookies
  return redirect("/", { headers: response.headers });
};

export default function LoginRoute() {
  // Render the login page component
  return <LoginPage />;
} 