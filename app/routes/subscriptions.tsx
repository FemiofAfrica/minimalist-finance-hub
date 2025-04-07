import { redirect, type LoaderFunctionArgs, json } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import SubscriptionsPage from "@/pages/Subscriptions";
import { useLoaderData } from "@remix-run/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

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
    throw redirect("/login");
  }

  // Return user with firstName
  return json({ 
    user, 
    firstName: user.user_metadata?.first_name || null 
  }, { headers: response.headers });
};

// Route component renders the actual page
export default function SubscriptionsRoute() {
  const { firstName } = useLoaderData<typeof loader>();
  return (
    <DashboardLayout firstName={firstName}>
      <SubscriptionsPage />
    </DashboardLayout>
  );
} 