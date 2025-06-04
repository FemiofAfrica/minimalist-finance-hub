import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import PublicLayout from '@/components/PublicLayout';
import { Eye, EyeOff } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validResetLink, setValidResetLink] = useState<boolean | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isDev = import.meta.env.DEV;

  useEffect(() => {
    // Enhanced URL parsing for reset tokens
    const parseResetUrl = () => {
      const urlParams = new URLSearchParams(location.search);
      const hash = window.location.hash;
      
      // Debug information
      const debugData = {
        fullUrl: window.location.href,
        pathname: location.pathname,
        search: location.search,
        hash: hash,
        urlParams: Object.fromEntries(urlParams),
        hashParams: {}
      };

      // Parse hash fragment (modern Supabase format)
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        debugData.hashParams = Object.fromEntries(hashParams);
        
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (isDev) {
          console.log('[ResetPassword] Hash analysis:', {
            type,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            allHashParams: debugData.hashParams
          });
        }
        
        // Check for recovery type OR valid tokens
        if (type === 'recovery' || (accessToken && refreshToken)) {
          setValidResetLink(true);
          
          // Handle mock tokens for development testing
          if (isDev && (accessToken?.includes('mock_token') || refreshToken?.includes('mock_refresh'))) {
            console.log('[ResetPassword] Mock token detected - development testing mode');
            setValidResetLink(true);
            return;
          }
          
          // If we have tokens, set the session
          if (accessToken && refreshToken) {
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            }).then(({ data, error }) => {
              if (error) {
                console.error('[ResetPassword] Error setting session:', error);
                setError('Invalid reset link. Please request a new password reset.');
                setValidResetLink(false);
              } else {
                console.log('[ResetPassword] Session set successfully');
              }
            });
          }
          
          return;
        }
      }
      
      // Parse URL parameters (legacy format or alternative)
      const token = urlParams.get('token') || urlParams.get('access_token');
      const type = urlParams.get('type');
      
      if (type === 'recovery' || token) {
        setValidResetLink(true);
        return;
      }
      
      // Check if we have any authentication-related parameters
      const hasAuthParams = urlParams.has('token') || 
                           urlParams.has('access_token') || 
                           urlParams.has('refresh_token') ||
                           hash.includes('access_token') ||
                           hash.includes('recovery');
      
      if (isDev) {
        setDebugInfo(JSON.stringify(debugData, null, 2));
        console.log('[ResetPassword] URL analysis:', debugData);
        console.log('[ResetPassword] Has auth params:', hasAuthParams);
      }
      
      if (!hasAuthParams) {
        setValidResetLink(false);
        setError('Invalid reset link. This page should only be accessed from a valid password reset email link.');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        // Assume it's valid if we have some auth params but couldn't parse them
        setValidResetLink(true);
      }
    };

    parseResetUrl();
  }, [location, navigate, isDev, toast]);

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
      
      // Check if we're in mock mode for development testing
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const isMockMode = isDev && accessToken?.includes('mock_token');
      
      if (isMockMode) {
        console.log('[ResetPassword] Mock mode: simulating password update');
        
        // Simulate a delay for realism
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast({
          title: "Password updated (Mock)",
          description: "In development mode, this would update your real password. Mock password reset completed successfully.",
        });
        
        // Simulate redirect
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        
        return;
      }
      
      // Get current session to ensure we're authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[ResetPassword] Session error:', sessionError);
        throw new Error('Authentication error. Please try clicking the reset link again.');
      }
      
      if (!session) {
        console.error('[ResetPassword] No active session found');
        throw new Error('No active session. Please click the reset link in your email again.');
      }
      
      console.log('[ResetPassword] Updating password with valid session');
      
      const { error } = await supabase.auth.updateUser({
        password
      });
      
      if (error) {
        console.error('[ResetPassword] Password update error:', error);
        throw error;
      }

      toast({
        title: "Password updated",
        description: "Your password has been reset successfully. Please log in with your new password.",
      });

      // Clear the session and redirect to login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reset password";
      console.error('[ResetPassword] Error:', errorMessage);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while validating the link
  if (validResetLink === null) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8f1df]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#217a39] mx-auto"></div>
            <p className="mt-4 text-black">Validating reset link...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Show error if link is invalid
  if (validResetLink === false) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8f1df]">
          <div className="w-full max-w-md space-y-6 px-8 text-center">
            <img src="/kpege-logo.svg" alt="Kpege Logo" className="h-14 w-auto mx-auto" style={{ maxHeight: 96 }} />
            <div className="bg-red-500/10 text-red-700 p-6 rounded-md">
              <h2 className="text-xl font-semibold mb-2">Invalid Reset Link</h2>
              <p className="mb-4">{error || 'This password reset link is invalid or has expired.'}</p>
              <Button 
                onClick={() => navigate('/login')}
                className="bg-[#217a39] hover:bg-black text-white"
              >
                Back to Login
              </Button>
            </div>
            {isDev && debugInfo && (
              <details className="text-left">
                <summary className="text-sm text-gray-600 cursor-pointer">Debug Info (Dev Mode)</summary>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">{debugInfo}</pre>
              </details>
            )}
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8f1df] w-screen h-screen m-0 p-0 overflow-auto auth-page">
        <div className="flex flex-col items-center justify-center mt-20 mb-6">
          <img src="/kpege-logo.svg" alt="Kpege Logo" className="h-14 w-auto" style={{ maxHeight: 96 }} />
        </div>
        <div className="w-full max-w-md space-y-6 px-8">
          <div className="text-center space-y-0">
            <h2 className="text-2xl font-semibold text-center text-black mb-3">Reset Password</h2>
            <p className="text-black">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {error && (
              <div className="bg-red-500/10 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-black">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black pr-10"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#217a39] hover:text-black"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-black">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black pr-10"
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#217a39] hover:text-black"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="px-8 py-2 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent rounded-md mx-auto block text-base min-w-[120px]"
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </Button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-[#217a39] hover:text-black transition-colors"
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