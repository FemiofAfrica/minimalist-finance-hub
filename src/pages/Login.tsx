import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
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

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isCodeResetView, setIsCodeResetView] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  
  const { signIn, signUp, resetPassword, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      if (isSignUp) {
        await signUp(email, password, { firstName, lastName });
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
      } else {
        await signIn(email, password);
        navigate('/');
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      
      // Show verification dialog if the error is about unverified email
      if (errorMessage.includes("Email not confirmed")) {
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
    <div className="min-h-screen flex items-center justify-center bg-[#004D40] w-screen h-screen m-0 p-0 overflow-hidden auth-page">
      <div className="w-full max-w-md space-y-6 px-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <h1 className="text-4xl font-bold text-white">SayFin</h1>
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isSignUp ? 'Create an account' : 'Welcome Back!'}
          </h2>
          <p className="text-gray-200">
            Please enter your details to sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-[#00695C] rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-200">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-200">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                placeholder="Enter your password"
              />
            </div>
            {isSignUp && (
              <>
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-200">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-200">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                    placeholder="Enter your last name"
                  />
                </div>
              </>
            )}
          </div>

          {!isSignUp && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setIsResetDialogOpen(true);
                }}
                className="text-sm text-gray-200 hover:text-white"
              >
                Forgot password?
              </button>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-gray-200 hover:text-white"
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
                  className="text-sm text-gray-200 hover:text-white block mx-auto mt-2"
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
        <DialogContent className="bg-[#00695C] text-white border-none">
          <DialogHeader>
            <DialogTitle className="text-white">Reset Password</DialogTitle>
            <DialogDescription className="text-gray-200">
              {isCodeResetView 
                ? "Enter the code from your email and your new password" 
                : "Enter your email address and we'll send you a password reset link."}
            </DialogDescription>
          </DialogHeader>
          
          {resetError && (
            <div className="bg-red-500/20 text-white p-3 rounded-md text-sm">
              {resetError}
            </div>
          )}
          
          {isCodeResetView ? (
            <form onSubmit={handleCodeBasedReset}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="resetEmail2" className="text-white">Email</Label>
                  <Input
                    id="resetEmail2"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="resetCode" className="text-white">Reset Code</Label>
                  <Input
                    id="resetCode"
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    placeholder="Enter the code from your email"
                    className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="newPassword" className="text-white">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter your new password"
                    className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="confirmNewPassword" className="text-white">Confirm Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    placeholder="Confirm your new password"
                    className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCodeResetView(false)}
                  className="text-white hover:bg-[#004D40]/50"
                >
                  Back to Email Reset
                </Button>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetDialogOpen(false)}
                  className="bg-transparent text-white border-white hover:bg-[#004D40]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#004D40] hover:bg-[#003D30] text-white"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="resetEmail" className="text-white">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCodeResetView(true)}
                  className="text-white hover:bg-[#004D40]/50"
                >
                  I have a reset code
                </Button>
              </div>
              
              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetDialogOpen(false)}
                  className="bg-transparent text-white border-white hover:bg-[#004D40]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#004D40] hover:bg-[#003D30] text-white"
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
        <DialogContent className="bg-[#00695C] text-white border-none">
          <DialogHeader>
            <DialogTitle className="text-white">Resend Verification Email</DialogTitle>
            <DialogDescription className="text-gray-200">
              Enter your email address and we'll send you a new verification link.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResendVerification}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="verificationEmail" className="text-white">Email</Label>
                <Input
                  id="verificationEmail"
                  type="email"
                  value={verificationEmail}
                  onChange={(e) => setVerificationEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVerifyDialogOpen(false)}
                className="bg-transparent text-white border-white hover:bg-[#004D40]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#004D40] hover:bg-[#003D30] text-white"
                disabled={isProcessing}
              >
                {isProcessing ? 'Sending...' : 'Resend Verification'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
