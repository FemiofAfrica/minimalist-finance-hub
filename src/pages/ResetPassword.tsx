import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import PublicLayout from '@/components/PublicLayout';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if the URL contains a valid hash fragment
    const hash = window.location.hash;
    const type = new URLSearchParams(hash.substring(1)).get('type');
    
    if (type !== 'recovery') {
      toast({
        title: "Invalid reset link",
        description: "This page should only be accessed from a valid password reset link.",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password
      });
      
      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been reset successfully. Please log in with your new password.",
      });

      // Redirect to login page
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to reset password");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center bg-[#004D40] w-screen h-screen m-0 p-0 overflow-hidden auth-page">
        <div className="w-full max-w-md space-y-6 px-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-6">
              <h1 className="text-4xl font-bold text-white">SayFin</h1>
            </div>
            <h2 className="text-2xl font-bold text-white">Reset Password</h2>
            <p className="text-gray-200">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 bg-[#00695C] rounded-lg p-6">
            {error && (
              <div className="bg-red-500/20 text-white p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-200">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                  placeholder="Enter your new password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                  placeholder="Confirm your new password"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent"
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-gray-200 hover:text-white"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
};

export default ResetPassword; 