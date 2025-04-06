import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createServerClient, type User } from "@supabase/auth-helpers-remix";

import IndexPage from "@/pages/Index";

// Loader function runs on the server before rendering
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


export default function IndexRoute() {
  // Use loader data if needed, or just render the page
  // const { user } = useLoaderData<typeof loader>();

  // Render the main application page component
  // The loader ensures this only renders if authenticated
  return <IndexPage />;
} 