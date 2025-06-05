import { useState, useEffect, useRef } from 'react';
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
  const [hasSession, setHasSession] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isDev = import.meta.env.DEV;

  // Capture the original URL immediately when component mounts
  const originalUrl = useRef(window.location.href);
  const originalHash = useRef(window.location.hash);
  const originalSearch = useRef(window.location.search);

  // Add immediate URL capture outside React lifecycle
  useEffect(() => {
    // Store immediate URL capture in localStorage for persistence
    const immediateCapture = {
      captureTime: new Date().toISOString(),
      href: window.location.href,
      hash: window.location.hash,
      search: window.location.search,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };
    
    try {
      localStorage.setItem('kpege_immediate_url_capture', JSON.stringify(immediateCapture));
      console.log('[ResetPassword] Immediate URL capture:', immediateCapture);
    } catch (e) {
      console.warn('[ResetPassword] Could not store immediate capture:', e);
    }
    
    console.log('[ResetPassword] Component mounted with original URL:', {
      href: originalUrl.current,
      hash: originalHash.current,
      search: originalSearch.current
    });
  }, []);

  // Helper function to store debug information persistently
  const storeDebugInfo = (info: any) => {
    const debugData = {
      timestamp: new Date().toISOString(),
      ...info
    };
    
    try {
      localStorage.setItem('kpege_password_reset_debug', JSON.stringify(debugData));
      setDebugInfo(debugData);
      console.log('[ResetPassword] Debug info stored:', debugData);
    } catch (e) {
      console.warn('[ResetPassword] Could not store debug info:', e);
    }
  };

  // Helper function to clear debug information
  const clearDebugInfo = () => {
    try {
      localStorage.removeItem('kpege_password_reset_debug');
      setDebugInfo(null);
      console.log('[ResetPassword] Debug info cleared');
    } catch (e) {
      console.warn('[ResetPassword] Could not clear debug info:', e);
    }
  };

  useEffect(() => {
    const initializeResetPage = async () => {
      console.log('[ResetPassword] Initializing reset page...');
      
      // Load any previous debug info from localStorage
      try {
        const savedDebugInfo = localStorage.getItem('kpege_password_reset_debug');
        if (savedDebugInfo) {
          const parsed = JSON.parse(savedDebugInfo);
          setDebugInfo(parsed);
          console.log('[ResetPassword] Loaded previous debug info:', parsed);
        }
      } catch (e) {
        console.warn('[ResetPassword] Could not load previous debug info:', e);
      }
      
      // Add a small delay to ensure URL fragments are fully loaded
      // This helps with timing issues when users click email links
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const currentLocationInfo = {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        windowHash: window.location.hash,
        windowSearch: window.location.search,
        fullUrl: window.location.href
      };
      
      console.log('[ResetPassword] Current location:', currentLocationInfo);
      
      // Additional debugging: show exactly what we're parsing
      const rawUrlInfo = {
        'window.location.href': window.location.href,
        'window.location.pathname': window.location.pathname,
        'window.location.search': window.location.search,
        'window.location.hash': window.location.hash,
        'React Router location.pathname': location.pathname,
        'React Router location.search': location.search,
        'React Router location.hash': location.hash
      };
      
      console.log('[ResetPassword] Raw URL components:', rawUrlInfo);
      
      // In development mode, always allow the form to show
      if (isDev) {
        console.log('[ResetPassword] Development mode - allowing password reset');
        storeDebugInfo({
          mode: 'development',
          action: 'allowing_form',
          ...currentLocationInfo,
          ...rawUrlInfo
        });
        setValidResetLink(true);
        return;
      }

      // For production, handle the URL properly
      // Check both location.hash (React Router) and window.location.hash (direct)
      let hash = window.location.hash || location.hash;
      let search = window.location.search || location.search;
      
      // If current URL doesn't have tokens, check if pageLoadCapture has them
      // This handles cases where tokens are stripped between page load and React processing
      if ((!hash || !hash.includes('access_token')) && typeof window !== 'undefined') {
        try {
          const pageLoadData = localStorage.getItem('kpege_page_load_url');
          if (pageLoadData) {
            const parsed = JSON.parse(pageLoadData);
            if (parsed.hash && parsed.hash.includes('access_token')) {
              console.log('[ResetPassword] Using tokens from pageLoadCapture since current URL lacks them');
              hash = parsed.hash;
              search = parsed.search || search;
            }
          }
        } catch (e) {
          console.warn('[ResetPassword] Could not parse pageLoadCapture data:', e);
        }
      }
      
      const urlParams = new URLSearchParams(search);
      
      // Parse URL parameters from hash  
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const searchParams = new URLSearchParams(search);
      
      const urlAnalysis = {
        reactRouterHash: location.hash,
        windowHash: window.location.hash,
        finalHash: hash,
        reactRouterSearch: location.search,
        windowSearch: window.location.search,
        finalSearch: search,
        usingPageLoadCapture: hash !== (window.location.hash || location.hash),
        hasTokens: hashParams.has('access_token') || searchParams.has('access_token'),
        hasRecoveryType: hashParams.has('type') && hashParams.get('type') === 'recovery' ||
                        searchParams.has('type') && searchParams.get('type') === 'recovery',
        hasError: hashParams.has('error') || searchParams.has('error'),
        // Check for valid tokens (Supabase password reset provides access_token without type=recovery)
        hasValidTokens: hashParams.has('access_token') || searchParams.has('access_token'),
        hasLegacyToken: searchParams.has('token') && searchParams.get('type') === 'recovery',
        isValid: (hashParams.has('access_token') || searchParams.has('access_token') || 
                 (searchParams.has('token') && searchParams.get('type') === 'recovery')) &&
                 !(hashParams.has('error') || searchParams.has('error'))
      };
      
      console.log('[ResetPassword] URL analysis:', urlAnalysis);

      // Store comprehensive debug info
      storeDebugInfo({
        mode: 'production',
        action: 'url_analysis',
        originalUrl: originalUrl.current,
        originalHash: originalHash.current,
        originalSearch: originalSearch.current,
        ...currentLocationInfo,
        ...rawUrlInfo,
        ...urlAnalysis
      });

      // Check for Supabase errors first
      if (hash.includes('error=')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const errorDescription = hashParams.get('error_description');
        
        const errorInfo = { error, errorCode, errorDescription };
        console.error('[ResetPassword] Supabase error detected:', errorInfo);
        
        storeDebugInfo({
          mode: 'production',
          action: 'supabase_error_detected',
          ...currentLocationInfo,
          ...rawUrlInfo,
          ...urlAnalysis,
          errorInfo
        });
        
        setValidResetLink(false);
        setError('This reset link has expired or is invalid. Please request a new one.');
        setTimeout(() => navigate('/login'), 5000);
        return;
      }

      // Use the already computed validation from urlAnalysis
      const tokenValidation = {
        hasValidTokens: urlAnalysis.hasValidTokens,
        hasLegacyToken: urlAnalysis.hasLegacyToken,
        isValid: urlAnalysis.isValid
      };
      
      console.log('[ResetPassword] Token validation:', tokenValidation);
      
      if (urlAnalysis.hasValidTokens || urlAnalysis.hasLegacyToken) {
        console.log('[ResetPassword] Valid reset tokens found');
        
        storeDebugInfo({
          mode: 'production',
          action: 'valid_tokens_found',
          ...currentLocationInfo,
          ...rawUrlInfo,
          ...urlAnalysis,
          ...tokenValidation
        });
        
        // If we have tokens in the hash, try to set the session
        if (urlAnalysis.hasValidTokens) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          const extractedTokens = {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenLength: accessToken?.length,
            refreshTokenLength: refreshToken?.length
          };
          
          console.log('[ResetPassword] Extracted tokens:', extractedTokens);
          
          if (accessToken && refreshToken) {
            try {
              console.log('[ResetPassword] Setting session with extracted tokens...');
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              
              if (error) {
                console.error('[ResetPassword] Session error:', error);
                
                storeDebugInfo({
                  mode: 'production',
                  action: 'session_error',
                  ...currentLocationInfo,
                  ...rawUrlInfo,
                  ...urlAnalysis,
                  ...tokenValidation,
                  ...extractedTokens,
                  sessionError: error
                });
                
                setValidResetLink(false);
                setError('Invalid reset link. Please request a new one.');
                setTimeout(() => navigate('/login'), 5000);
                return;
              }
              
              console.log('[ResetPassword] Session set successfully:', data);
              
              storeDebugInfo({
                mode: 'production',
                action: 'session_success',
                ...currentLocationInfo,
                ...rawUrlInfo,
                ...urlAnalysis,
                ...tokenValidation,
                ...extractedTokens,
                sessionData: data
              });
              
              setHasSession(true);
            } catch (err) {
              console.error('[ResetPassword] Error setting session:', err);
              
              storeDebugInfo({
                mode: 'production',
                action: 'session_exception',
                ...currentLocationInfo,
                ...rawUrlInfo,
                ...urlAnalysis,
                ...tokenValidation,
                ...extractedTokens,
                exception: err instanceof Error ? err.message : 'Unknown error'
              });
              
              setValidResetLink(false);
              setError('Failed to authenticate. Please request a new reset link.');
              setTimeout(() => navigate('/login'), 5000);
              return;
            }
          } else {
            console.error('[ResetPassword] Missing access or refresh token');
            
            storeDebugInfo({
              mode: 'production',
              action: 'missing_tokens',
              ...currentLocationInfo,
              ...rawUrlInfo,
              ...urlAnalysis,
              ...tokenValidation,
              ...extractedTokens
            });
            
            setValidResetLink(false);
            setError('Incomplete reset link. Please request a new one.');
            setTimeout(() => navigate('/login'), 5000);
            return;
          }
        }
        
        setValidResetLink(true);
      } else {
        // No reset tokens found - this could be a direct visit
        console.log('[ResetPassword] No reset tokens found - treating as direct visit');
        console.log('[ResetPassword] Final decision: showing blue info message for direct visit');
        
        storeDebugInfo({
          mode: 'production',
          action: 'no_tokens_found_direct_visit',
          ...currentLocationInfo,
          ...rawUrlInfo,
          ...urlAnalysis,
          ...tokenValidation
        });
        
        setValidResetLink(false);
        setError('To reset your password, please click the reset link from your email. If you haven\'t received an email, request a new password reset.');
        // Don't auto-redirect for direct visits - let user choose
      }
    };

    initializeResetPage();
  }, [location, navigate, isDev]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
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
      
      // Development mode: simulate success
      if (isDev) {
        console.log('[ResetPassword] Development mode - simulating password update');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        toast({
          title: "Password Updated Successfully! 🎉",
          description: "Development mode: This simulates a successful password reset. In production, your actual password would be updated.",
        });
        
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }

      // Production mode: actual password update
      console.log('[ResetPassword] Attempting to update password...');
      
      // First, ensure we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[ResetPassword] Session error:', sessionError);
        throw new Error('Authentication error. Please click the reset link from your email again.');
      }

      if (!session) {
        console.error('[ResetPassword] No session found');
        throw new Error('No active session. Please click the reset link from your email again.');
      }

      console.log('[ResetPassword] Valid session found, updating password...');

      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('[ResetPassword] Password update error:', updateError);
        throw new Error(updateError.message || 'Failed to update password');
      }

      console.log('[ResetPassword] Password updated successfully');

      // Show success message
      toast({
        title: "Password Updated Successfully! 🎉",
        description: "Your password has been reset. You can now log in with your new password.",
      });

      // Clear debug info on success
      clearDebugInfo();

      // Sign out to clear the reset session and redirect to login
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reset password";
      console.error('[ResetPassword] Reset error:', errorMessage);
      
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

  // Loading state
  if (validResetLink === null) {
    return (
      <PublicLayout>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8f1df]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#217a39] mx-auto"></div>
            <p className="mt-4 text-black">Setting up password reset...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Error state or direct visit guidance
  if (validResetLink === false) {
    const isDirectVisit = !window.location.hash && !location.search;
    
    return (
      <PublicLayout>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8f1df]">
          <div className="w-full max-w-md space-y-6 px-8 text-center">
            <img src="/kpege-logo.svg" alt="Kpege Logo" className="h-14 w-auto mx-auto" style={{ maxHeight: 96 }} />
            <div className={`p-6 rounded-md ${isDirectVisit ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-500/10 text-red-700'}`}>
              <h2 className="text-xl font-semibold mb-2">
                {isDirectVisit ? 'Password Reset Required' : 'Reset Link Problem'}
              </h2>
              <p className="mb-4">{error}</p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/login')}
                  className="bg-[#217a39] hover:bg-black text-white w-full"
                >
                  {isDirectVisit ? 'Go to Login & Request Reset' : 'Request New Reset Link'}
                </Button>
                {isDirectVisit && (
                  <div className="text-sm text-blue-600 mt-3">
                    <p>💡 <strong>How to reset your password:</strong></p>
                    <p>1. Go to the login page</p>
                    <p>2. Click "Forgot Password?"</p>
                    <p>3. Check your email for the reset link</p>
                    <p>4. Click the link in your email</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Debug Information Display */}
            {debugInfo && (
              <div className="mt-6 p-4 bg-gray-100 rounded-md text-left text-xs">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-700">Debug Info</h3>
                  <div className="space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const immediateCapture = localStorage.getItem('kpege_immediate_url_capture');
                        const pageLoadCapture = localStorage.getItem('kpege_page_load_url');
                        const fullDebugData = {
                          currentDebugInfo: debugInfo,
                          immediateUrlCapture: immediateCapture ? JSON.parse(immediateCapture) : null,
                          pageLoadCapture: pageLoadCapture ? JSON.parse(pageLoadCapture) : null
                        };
                        navigator.clipboard.writeText(JSON.stringify(fullDebugData, null, 2));
                        toast({
                          title: "Copied!",
                          description: "Full debug info copied to clipboard",
                        });
                      }}
                      className="text-xs"
                    >
                      Copy All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        localStorage.removeItem('kpege_password_reset_debug');
                        localStorage.removeItem('kpege_immediate_url_capture');
                        setDebugInfo(null);
                        toast({
                          title: "Cleared!",
                          description: "Debug info cleared",
                        });
                      }}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-gray-600">
                  <p><strong>Time:</strong> {debugInfo.timestamp}</p>
                  <p><strong>Action:</strong> {debugInfo.action}</p>
                  <p><strong>Mode:</strong> {debugInfo.mode}</p>
                  <p><strong>Full URL:</strong> {debugInfo.fullUrl}</p>
                  <p><strong>Original URL:</strong> {debugInfo.originalUrl || 'Not captured'}</p>
                  <p><strong>Window Hash:</strong> {debugInfo.windowHash || 'None'}</p>
                  <p><strong>React Hash:</strong> {debugInfo.hash || 'None'}</p>
                  <p><strong>Original Hash:</strong> {debugInfo.originalHash || 'None'}</p>
                  <p><strong>Has Tokens:</strong> {debugInfo.hasTokens ? 'Yes' : 'No'}</p>
                  <p><strong>Has Recovery Type:</strong> {debugInfo.hasRecoveryType ? 'Yes' : 'No'}</p>
                  <p><strong>Has Valid Tokens:</strong> {debugInfo.hasValidTokens ? 'Yes' : 'No'}</p>
                  <p><strong>Has Legacy Token:</strong> {debugInfo.hasLegacyToken ? 'Yes' : 'No'}</p>
                  <p><strong>Is Valid:</strong> {debugInfo.isValid ? 'Yes' : 'No'}</p>
                  <p><strong>Using Page Load Capture:</strong> {debugInfo.usingPageLoadCapture ? 'Yes' : 'No'}</p>
                  {debugInfo.errorInfo && (
                    <div className="mt-2 p-2 bg-red-50 rounded">
                      <p><strong>Error:</strong> {debugInfo.errorInfo.error}</p>
                      <p><strong>Error Code:</strong> {debugInfo.errorInfo.errorCode}</p>
                    </div>
                  )}
                </div>
                
                {/* Show immediate capture info if available */}
                {(() => {
                  try {
                    const immediateCapture = localStorage.getItem('kpege_immediate_url_capture');
                    const pageLoadCapture = localStorage.getItem('kpege_page_load_url');
                    
                    if (immediateCapture || pageLoadCapture) {
                      return (
                        <div className="mt-3 space-y-2">
                          {pageLoadCapture && (() => {
                            const parsed = JSON.parse(pageLoadCapture);
                            return (
                              <div className="p-2 bg-green-50 rounded text-gray-600">
                                <p className="font-semibold">Page Load Capture (HTML Script):</p>
                                <p><strong>Time:</strong> {parsed.timestamp}</p>
                                <p><strong>Full URL:</strong> {parsed.href}</p>
                                <p><strong>Hash:</strong> {parsed.hash || 'None'}</p>
                                <p><strong>Referrer:</strong> {parsed.referrer || 'None'}</p>
                              </div>
                            );
                          })()}
                          
                          {immediateCapture && (() => {
                            const parsed = JSON.parse(immediateCapture);
                            return (
                              <div className="p-2 bg-blue-50 rounded text-gray-600">
                                <p className="font-semibold">React Mount Capture:</p>
                                <p><strong>Time:</strong> {parsed.captureTime}</p>
                                <p><strong>Full URL:</strong> {parsed.href}</p>
                                <p><strong>Hash:</strong> {parsed.hash || 'None'}</p>
                                <p><strong>Referrer:</strong> {parsed.referrer || 'None'}</p>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    }
                  } catch (e) {
                    return null;
                  }
                  return null;
                })()}
              </div>
            )}
            
            {/* Instructions for viewing full debug info */}
            <div className="mt-4 p-3 bg-yellow-50 rounded-md text-sm text-yellow-700">
              <p><strong>Troubleshooting:</strong></p>
              <p>Debug information has been saved. If you need technical support, use the "Copy" button above to copy the debug details.</p>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Password reset form
  return (
    <PublicLayout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8f1df] w-screen h-screen m-0 p-0 overflow-auto auth-page">
        <div className="flex flex-col items-center justify-center mt-20 mb-6">
          <img src="/kpege-logo.svg" alt="Kpege Logo" className="h-14 w-auto" style={{ maxHeight: 96 }} />
        </div>
        <div className="w-full max-w-md space-y-6 px-8">
          <div className="text-center space-y-0">
            <h2 className="text-2xl font-semibold text-center text-black mb-3">Reset Your Password</h2>
            <p className="text-black">
              Enter your new password below
            </p>
            {isDev && (
              <div className="bg-blue-50 text-blue-700 p-2 rounded mt-2 text-sm">
                Development Mode: Password reset will be simulated
              </div>
            )}
            {!isDev && hasSession && (
              <div className="bg-green-50 text-green-700 p-2 rounded mt-2 text-sm">
                ✅ Reset link verified - you can update your password
              </div>
            )}
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
                    minLength={6}
                    className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black pr-10"
                    placeholder="Enter your new password (min. 6 characters)"
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
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-black">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
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
              className="px-8 py-2 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent rounded-md mx-auto block text-base min-w-[120px] w-full"
              disabled={loading || password.length < 6 || password !== confirmPassword}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Password...
                </div>
              ) : 'Update Password'}
            </Button>

            <div className="text-center mt-4">
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