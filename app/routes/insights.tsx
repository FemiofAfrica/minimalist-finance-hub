import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";
import InsightsPage from "@/pages/Insights";
import type { MetaFunction } from "@remix-run/node";

// Loader function to enforce authentication (same as other routes)
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  if (!session || !user) {
    throw redirect("/login");
  }

  return { user, headers: response.headers };
};

export const meta: MetaFunction = () => {
  return [
    { title: "Insights - FinTrack" },
    { name: "description", content: "View detailed insights into your financial activities" },
  ];
};

export default function InsightsRoute() {
  return <InsightsPage />;
} 