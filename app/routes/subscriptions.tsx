import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import SubscriptionsPage from "@/pages/Subscriptions";

// Loader function to enforce authentication (same as other routes)
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
  return { headers: response.headers }; 
};

// Route component renders the actual page
export default function SubscriptionsRoute() {
  return <SubscriptionsPage />;
} 