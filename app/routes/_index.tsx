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

  const { data: { session } } = await supabase.auth.getSession();

  // If no session, redirect to login
  if (!session) {
    return redirect("/login", { headers: response.headers });
  }

  // Return the user if session exists
  return { user: session.user, headers: response.headers };
};


export default function IndexRoute() {
  // Use loader data if needed, or just render the page
  // const { user } = useLoaderData<typeof loader>();

  // Render the main application page component
  // The loader ensures this only renders if authenticated
  return <IndexPage />;
} 