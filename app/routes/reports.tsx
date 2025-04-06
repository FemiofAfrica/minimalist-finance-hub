import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import ReportsPage from "@/pages/Reports";

// Loader function to enforce authentication (same as other routes)
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // If no user or error getting user, redirect to login
  if (userError || !user) {
    return redirect("/login", { headers: response.headers });
  }

  // Return the authenticated user along with headers
  return { user, headers: response.headers };
};

// Route component renders the actual page
export default function ReportsRoute() {
  return <ReportsPage />;
} 