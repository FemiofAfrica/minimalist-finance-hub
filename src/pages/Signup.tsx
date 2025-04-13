import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts';
import { ApiError, createApiError } from '@/types/error';



const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Signup Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Client-side password match check
  useEffect(() => {
    setPasswordMatchError(password !== confirmPassword && confirmPassword !== '');
  }, [password, confirmPassword]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (password !== confirmPassword) {
      setPasswordMatchError(true);
      setError("Passwords do not match.");
      return;
    }
    
    if (!firstName || !lastName) {
      setError("First name and last name are required.");
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      await signUp(email, password, firstName, lastName);
      toast({
        title: "Success",
        description: "Account created successfully! Please check your email to verify your account.",
      });
      navigate('/confirm-email');
    } catch (err: unknown) {
      const apiError = createApiError(err);
      setError(apiError.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#004D40]">
      <div className="w-full max-w-md space-y-6 px-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">SayFin</h1>
          <h2 className="text-2xl font-bold text-white">Create Account</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-[#00695C] rounded-lg p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-200">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                  placeholder="First name"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-200">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-200">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-200">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                placeholder="Enter your password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-200">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={`mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300 ${passwordMatchError ? 'border-red-500' : ''}`}
                placeholder="Confirm your password"
              />
              {passwordMatchError && (
                <p className="mt-1 text-xs text-red-400">Passwords do not match.</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent disabled:opacity-50"
            disabled={isLoading || passwordMatchError || !email || !password || !confirmPassword || !firstName || !lastName}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          <Link to="/login" className="font-medium text-gray-200 hover:text-white">
            Already have an account? Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;