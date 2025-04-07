import ResetPasswordPage from "@/pages/ResetPassword";

// This route doesn't need a loader or action as the password update
// happens client-side using the token from the URL hash.

export default function ResetPasswordRoute() {
  return <ResetPasswordPage />;
} 