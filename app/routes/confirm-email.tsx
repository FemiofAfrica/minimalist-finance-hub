import ConfirmEmailPage from "@/pages/ConfirmEmail";
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { createServerClient } from "@supabase/auth-helpers-remix";

// Optional: Loader to prevent logged-in users from seeing this page unnecessarily
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { request, response }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // If they are somehow logged in and hit this, send them to dashboard
    // although the signup action shouldn't let this happen.
    // throw redirect("/"); 
    // Or just let them see the page, it's harmless.
  }
  return json(null, { headers: response.headers });
};

export default function ConfirmEmailRoute() {
  return <ConfirmEmailPage />;
} 