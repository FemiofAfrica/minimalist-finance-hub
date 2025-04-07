import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";

export const action = async ({ request }: ActionFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );

  // Sign out the user on the server
  await supabase.auth.signOut();

  // Redirect to login page, ensuring Supabase headers are included
  // for session clearing on the client
  return redirect("/login", {
    headers: response.headers,
  });
};

// You can optionally add a loader that redirects if someone tries to GET this page
export const loader = () => redirect("/"); 