import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts';
import { ApiError, createApiError } from '@/types/error';



const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  
  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#004D40]">
      <div className="w-full max-w-md space-y-6 px-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <h1 className="text-4xl font-bold text-white">SayFin</h1>
          </div>
          <h2 className="text-2xl font-bold text-white">
            Welcome Back!
          </h2>
          <p className="text-gray-200">
            Please enter your details to sign in to your account
          </p>
        </div>

        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setIsLoading(true);
            
            try {
              await signIn(email, password);
              // Navigation is handled in the AuthContext after successful login
            } catch (err: unknown) {
              const apiError = createApiError(err);
              setError(apiError.message || 'Failed to login. Please check your credentials.');
            } finally {
              setIsLoading(false);
            }
          }} 
          className="space-y-4 bg-[#00695C] rounded-lg p-6"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-200">Email</Label>
              <Input
                id="email"
                name="email"
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
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 h-11 bg-[#004D40] border-gray-200 text-white placeholder-gray-300"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        {/* Add Sign Up and Forgot Password links */}
        <div className="mt-4 text-center text-sm space-x-2">
          <Link to="/signup" className="font-medium text-gray-200 hover:text-white">
            Don't have an account? Sign Up
          </Link>
          <span className="text-gray-300">|</span>
          <Link to="/forgot-password" className="font-medium text-gray-200 hover:text-white">
            Forgot Password?
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
