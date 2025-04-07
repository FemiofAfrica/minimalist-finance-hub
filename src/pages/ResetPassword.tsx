import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@remix-run/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@supabase/supabase-js'; // Use standard client for client-side

// IMPORTANT: Client-side Supabase instance
// We need environment variables exposed client-side for this
// Ensure SUPABASE_URL and SUPABASE_ANON_KEY are prefixed with VITE_ (or your framework's prefix)
// and loaded correctly in your client-side environment.
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

// Create a separate client-side Supabase client instance
// DO NOT use auth helpers here, as we need the standard client behavior for hash parsing
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Listen for Supabase auth events (specifically PASSWORD_RECOVERY)
  // This confirms Supabase JS has processed the tokens from the URL hash
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Supabase PASSWORD_RECOVERY event received. Session:', session);
        // You could potentially pre-fill email or do other actions here if needed
        // The main purpose is knowing Supabase is ready
      } 
      // Handle other events if necessary
    });

    // Check if tokens are present in hash immediately (Supabase might process fast)
    if (window.location.hash.includes('access_token')) {
      console.log('Access token found in URL hash.');
    } else {
       console.warn('No access token found in URL hash. Password reset might fail.');
       // Optionally redirect or show error if no token found after a short delay
    }

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  // Client-side password match check
  useEffect(() => {
    setPasswordMatchError(password !== confirmPassword && confirmPassword !== '');
  }, [password, confirmPassword]);

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setPasswordMatchError(true);
      setError("Passwords do not match.");
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (!password) {
       setError("Password cannot be empty.");
       toast({ title: "Error", description: "Password cannot be empty.", variant: "destructive" });
       return;
    }

    setIsUpdating(true);
    console.log('Attempting password update...');

    // Update password using client-side Supabase
    // Supabase JS automatically uses the tokens from the URL hash fragment
    const { data, error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    setIsUpdating(false);

    if (updateError) {
      console.error("Password Update Error:", updateError);
      setError(updateError.message || "Failed to update password. The link may have expired or been used already.");
      toast({ title: "Update Failed", description: updateError.message || "Could not update password.", variant: "destructive" });
    } else {
      console.log("Password updated successfully:", data);
      toast({ title: "Success", description: "Password updated successfully! Redirecting to login..." });
      // Redirect to login page after successful update
      setTimeout(() => navigate('/login?reset=success'), 2000); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#004D40]">
      <div className="w-full max-w-md space-y-6 px-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">SayFin</h1>
          <h2 className="text-2xl font-bold text-white">Set New Password</h2>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4 bg-[#00695C] rounded-lg p-6">
          <p className="text-sm text-gray-200 text-center mb-4">Enter your new password below.</p>
          {error && (
            <p className="text-center text-red-400 text-sm">{error}</p>
          )}
          <div className="space-y-4">
             <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-200">New Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={`mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300 ${passwordMatchError ? 'border-red-500' : ''}`}
                placeholder="Confirm new password"
              />
              {passwordMatchError && (
                <p className="mt-1 text-xs text-red-400">Passwords do not match.</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent disabled:opacity-50"
            disabled={isUpdating || passwordMatchError || !password || !confirmPassword}
          >
            {isUpdating ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="font-medium text-gray-200 hover:text-white">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword; 