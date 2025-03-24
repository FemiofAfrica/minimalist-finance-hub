
import { ReCaptchaV3 } from '@/components/auth/ReCaptchaV3';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [recaptchaScore, setRecaptchaScore] = useState(0);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#004D40]">
      <div className="w-full max-w-md space-y-6 px-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <img src="/assets/logo.svg" alt="Logo" className="h-12 w-12" />
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
            <ReCaptchaV3
              action="login"
              threshold={0.5}
              onVerify={(token, score) => {
                setRecaptchaToken(token);
                setRecaptchaScore(score);
              }}
              onError={(error) => {
                toast({
                  title: "Security Verification Failed",
                  description: error.message,
                  variant: "destructive",
                });
                setRecaptchaToken('');
                setRecaptchaScore(0);
              }}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent"
            disabled={!recaptchaToken}
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-gray-200 hover:text-white"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
