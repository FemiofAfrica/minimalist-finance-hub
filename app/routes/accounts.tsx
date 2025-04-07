import { redirect, type LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createServerClient } from "@supabase/auth-helpers-remix";
import AccountsAndCardsPage from "@/pages/AccountsAndCards";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

// Loader function to enforce authentication
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

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
export default function AccountsRoute() {
  const { firstName } = useLoaderData<typeof loader>();
  return (
    <DashboardLayout firstName={firstName}>
      <AccountsAndCardsPage />
    </DashboardLayout>
  );
} 