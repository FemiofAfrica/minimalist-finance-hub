import { useState } from 'react';
import { Form, Link, useActionData } from '@remix-run/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useEffect } from 'react';

// Type for action data (optional error message)
type ActionData = {
  error?: string;
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const actionData = useActionData<ActionData>();

  // Show error toast if action returns an error
  useEffect(() => {
    if (actionData?.error) {
      toast({
        title: "Error",
        description: actionData.error,
        variant: "destructive",
      });
    }
  }, [actionData, toast]);

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

        <Form method="post" className="space-y-4 bg-[#00695C] rounded-lg p-6">
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
          >
            Sign In
          </Button>
        </Form>

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
