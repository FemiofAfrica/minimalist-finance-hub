import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceEvents } from '@/integrations/mixpanel/events';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import PublicLayout from '@/components/PublicLayout';
import { Eye, EyeOff } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isSignUp, setIsSignUp] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newPasswordsMatch, setNewPasswordsMatch] = useState(true);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isCodeResetView, setIsCodeResetView] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  // Captcha token state
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  
  const { signIn, signUp, resetPassword, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Environment check
  const isDev = import.meta.env.DEV;

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length > 0) strength += 20;
    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    calculatePasswordStrength(newPassword);
    
    // Check if passwords match when password changes
    if (confirmPassword) {
      setPasswordsMatch(newPassword === confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    setPasswordsMatch(password === newConfirmPassword);
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPasswordValue = e.target.value;
    setNewPassword(newPasswordValue);
    
    // Check if passwords match when new password changes
    if (confirmNewPassword) {
      setNewPasswordsMatch(newPasswordValue === confirmNewPassword);
    }
  };
  
  const handleConfirmNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmNewPassword(newConfirmPassword);
    setNewPasswordsMatch(newPassword === newConfirmPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate captcha token
    if (!captchaToken) {
      toast({
        title: "Captcha required",
        description: "Please complete the captcha verification to continue.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      if (isSignUp) {
        // Validate passwords
        if (password !== confirmPassword) {
          throw new Error("Passwords don't match");
        }
        
        await signUp(email, password, { firstName, lastName }, captchaToken);
        
        // Track signup event
        FinanceEvents.trackSignUp({
          method: 'email',
          source: 'signup_form'
        });
        
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      } else {
        await signIn(email, password, captchaToken);
        navigate('/dashboard');
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      
      // Reset captcha token on error so user needs to complete it again
      setCaptchaToken(undefined);
      
      // Check if error is about existing user
      if (errorMessage.includes("already registered") || errorMessage.includes("already exists") || errorMessage.includes("try logging in")) {
        // Switch to login mode
        setIsSignUp(false);
        
        toast({
          title: "Account already exists",
          description: "This email is already registered. Please login instead.",
        });
      }
      // Show verification dialog if the error is about unverified email
      else if (errorMessage.includes("Email not confirmed")) {
        setVerificationEmail(email);
        setIsVerifyDialogOpen(true);
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    try {
      setIsProcessing(true);
      await resetPassword(resetEmail);
      toast({
        title: "Password reset email sent",
        description: "Please check your email for password reset instructions.",
      });
      setIsResetDialogOpen(false);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "Failed to send reset email");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCodeBasedReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    // Validate passwords
    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords don't match");
      return;
    }

    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters long");
      return;
    }

    try {
      setIsProcessing(true);
      
      // Verify the OTP code and reset password
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: resetCode,
        type: 'recovery',
      });
      
      if (error) throw error;
      
      // If code verification succeeds, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) throw updateError;

      toast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
      });
      
      setIsResetDialogOpen(false);
      
      // Clear fields
      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsCodeResetView(false);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "Failed to reset password");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password with code",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      await resendVerificationEmail(verificationEmail);
      toast({
        title: "Verification email sent",
        description: "Please check your email to verify your account.",
      });
      setIsVerifyDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend verification email",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PublicLayout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e8f1df] w-screen h-screen m-0 p-0 overflow-auto auth-page">
        <div className="flex flex-col items-center justify-center mt-16 mb-6 w-full">
          <img src="/kpege-logo.svg" alt="Kpege Logo" className="h-14 w-auto mx-auto" style={{ maxHeight: 96 }} />
        </div>
        <div className="w-full max-w-xl space-y-6 px-4 sm:px-8 mx-auto">
          <div className="text-center space-y-0">
            <h2 className="text-2xl font-semibold text-center text-black mb-3">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </h2>
            <p className="text-black">
              {isSignUp ? 'Please enter your details to create an account' : 'Please enter your details to sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-0 sm:p-6 w-full">
            <div className="space-y-4">
              {isSignUp ? (
                <>
                  <div>
                    <Label htmlFor="firstName" className="text-base font-medium text-black text-center w-full">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black w-full"
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-base font-medium text-black text-center w-full">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black w-full"
                      placeholder="Enter your last name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-base font-medium text-black text-center w-full">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black w-full"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-base font-medium text-black text-center w-full">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={handlePasswordChange}
                        required
                        className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black pr-10 w-full"
                        placeholder="Enter your password"
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
                    <div className="mt-2">
                      <Progress value={passwordStrength} className={`h-2 ${passwordStrength === 0 ? 'bg-red-400' : passwordStrength <= 40 ? 'bg-yellow-400' : passwordStrength <= 80 ? 'bg-blue-400' : 'bg-green-500'}`} />
                      <div className="flex justify-between text-xs mt-1 text-black">
                        <span style={{ color: passwordStrength === 0 ? '#dc2626' : passwordStrength <= 40 ? '#ca8a04' : passwordStrength <= 80 ? '#2563eb' : '#15803d' }}>
                          {passwordStrength === 0 ? 'Weak' : passwordStrength <= 40 ? 'Fair' : passwordStrength <= 80 ? 'Good' : 'Strong'}
                        </span>
                        <span>{passwordStrength}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-base font-medium text-black text-center w-full">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        required
                        className={`mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black pr-10 ${!passwordsMatch && confirmPassword.length > 0 ? 'border-red-500' : ''} w-full`}
                        placeholder="Confirm your password"
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
                    {!passwordsMatch && confirmPassword.length > 0 && (
                      <p className="text-red-400 text-xs mt-1">Passwords don't match</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="email" className="text-base font-medium text-black text-center w-full">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black w-full"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-base font-medium text-black text-center w-full">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black pr-10 w-full"
                        placeholder="Enter your password"
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
                </>
              )}
            </div>

            {!isSignUp && (
              <div className="flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setIsResetDialogOpen(true);
                  }}
                  className="text-sm text-[#217a39] hover:text-black transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Cloudflare Turnstile Captcha */}
            <div className="flex justify-center mb-4">
              <Turnstile
                siteKey={import.meta.env.TURNSTILE_SITE_KEY}
                onSuccess={(token) => {
                  console.log('[Turnstile] Success - token received');
                  setCaptchaToken(token);
                }}
                onError={(error) => {
                  console.warn('[Turnstile] Error:', error);
                  setCaptchaToken(undefined);
                  // Show user-friendly error if needed
                  if (isDev) {
                    toast({
                      title: "Captcha Error",
                      description: "Please refresh the page and try again. If the issue persists, contact support.",
                      variant: "destructive",
                    });
                  }
                }}
                onExpire={() => {
                  console.log('[Turnstile] Token expired');
                  setCaptchaToken(undefined);
                }}
                onTimeout={() => {
                  console.warn('[Turnstile] Timeout');
                  setCaptchaToken(undefined);
                }}
              />
            </div>

            <Button 
              type="submit" 
              className="px-8 py-2 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent rounded-md mx-auto block text-base min-w-[120px] w-full sm:w-auto"
              disabled={isProcessing || !captchaToken || (isSignUp && (!passwordsMatch || confirmPassword.length === 0))}
            >
              {isProcessing ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  // Reset captcha when switching modes
                  setCaptchaToken(undefined);
                }}
                className="text-sm text-[#217a39] hover:text-black transition-colors"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
              
              {!isSignUp && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setVerificationEmail(email);
                      setIsVerifyDialogOpen(true);
                    }}
                    className="text-sm text-[#217a39] hover:text-black block mx-auto mt-2 transition-colors"
                  >
                    Need to verify your email?
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Password Reset Dialog */}
        <Dialog open={isResetDialogOpen} onOpenChange={(open) => {
          setIsResetDialogOpen(open);
          if (!open) {
            // Reset state when dialog closes
            setIsCodeResetView(false);
            setResetCode('');
            setNewPassword('');
            setConfirmNewPassword('');
            setResetError(null);
          }
        }}>
          <DialogContent className="bg-white text-black border-none sm:max-w-[500px] font-sans">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-black font-sans">Reset Password</DialogTitle>
              <DialogDescription className="text-black font-sans">
                {isCodeResetView 
                  ? "Enter the code from your email and your new password" 
                  : "Enter your email address and we'll send you a password reset link."}
              </DialogDescription>
            </DialogHeader>
            
            {resetError && (
              <div className="bg-red-500/20 text-black p-3 rounded-md text-sm">
                {resetError}
              </div>
            )}
            
            {isCodeResetView ? (
              <form onSubmit={handleCodeBasedReset}>
                <div className="grid gap-4 py-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="resetEmail2" className="text-black">Email</Label>
                      <Input
                        id="resetEmail2"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        placeholder="your@email.com"
                        className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="resetCode" className="text-black">Reset Code</Label>
                      <Input
                        id="resetCode"
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        required
                        placeholder="Enter the code"
                        className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="newPassword" className="text-black">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={handleNewPasswordChange}
                        required
                        placeholder="Enter your new password"
                        className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#217a39] hover:text-black"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="confirmNewPassword" className="text-black">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmNewPassword"
                        type={showConfirmNewPassword ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={handleConfirmNewPasswordChange}
                        required
                        placeholder="Confirm your new password"
                        className={`mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black pr-10 ${!newPasswordsMatch && confirmNewPassword.length > 0 ? 'border-red-500' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#217a39] hover:text-black"
                        tabIndex={-1}
                      >
                        {showConfirmNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {!newPasswordsMatch && confirmNewPassword.length > 0 && (
                      <p className="text-red-400 text-xs mt-1">Passwords don't match</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCodeResetView(false)}
                    className="bg-transparent text-black border-black hover:bg-[#e8f1df]"
                  >
                    Back to Email Reset
                  </Button>
                </div>

                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsResetDialogOpen(false)}
                    className="bg-transparent text-black border-black hover:bg-[#e8f1df]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#217a39] hover:bg-black text-white"
                    disabled={isProcessing || !newPasswordsMatch || confirmNewPassword.length === 0}
                  >
                    {isProcessing ? 'Processing...' : 'Reset Password'}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="resetEmail" className="text-black">Email</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCodeResetView(true)}
                    className="bg-transparent text-black border-black hover:bg-[#e8f1df]"
                  >
                    I have a reset code
                  </Button>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsResetDialogOpen(false)}
                    className="bg-transparent text-black border-black hover:bg-[#e8f1df]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#217a39] hover:bg-black text-white"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Email Verification Dialog */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent className="bg-white text-black border-none sm:max-w-[500px] font-sans">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold text-black font-sans">Resend Verification Email</DialogTitle>
              <DialogDescription className="text-black font-sans">
                Enter your email address and we'll send you a new verification link.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResendVerification}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="verificationEmail" className="text-black">Email</Label>
                  <Input
                    id="verificationEmail"
                    type="email"
                    value={verificationEmail}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="mt-1 h-11 bg-transparent border-gray-200 text-black placeholder-black"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVerifyDialogOpen(false)}
                  className="bg-transparent text-black border-black hover:bg-[#e8f1df]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#217a39] hover:bg-black text-white"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Sending...' : 'Resend Verification'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PublicLayout>
  );
};

export default Login;
