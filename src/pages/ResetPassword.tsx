import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ApiError, createApiError } from '@/types/error';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get token from URL hash or query parameters
  const location = useLocation();
  
  useEffect(() => {
    // Check if token is present in URL hash or query parameters
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const queryParams = new URLSearchParams(location.search);
    
    const token = hashParams.get('access_token') || queryParams.get('token');
    
    if (token) {
      console.log('Reset token found in URL');
      // Store token in session storage for the API request
      sessionStorage.setItem('resetToken', token);
    } else {
      console.warn('No reset token found in URL. Password reset might fail.');
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [location]);

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
    
    // Get token from session storage
    const token = sessionStorage.getItem('resetToken');
    
    if (!token) {
      setError("Reset token not found. Please request a new password reset link.");
      setIsUpdating(false);
      return;
    }

    try {
      // Call the Express API endpoint to reset password
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to update password. The link may have expired or been used already.");
      }
      
      // Clear the token from session storage
      sessionStorage.removeItem('resetToken');
      
      toast({ title: "Success", description: "Password updated successfully! Redirecting to login..." });
      // Redirect to login page after successful update
      setTimeout(() => navigate('/login?reset=success'), 2000);
    } catch (err: unknown) {
      const apiError = createApiError(err);
      console.error("Password Update Error:", apiError);
      setError(apiError.message || "Failed to update password. The link may have expired or been used already.");
      toast({ title: "Update Failed", description: apiError.message || "Could not update password.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
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