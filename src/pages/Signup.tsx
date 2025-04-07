import { useState, useEffect } from 'react';
import { Form, Link, useActionData } from '@remix-run/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Type for action data
type ActionData = {
  error?: string;
};

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const { toast } = useToast();
  const actionData = useActionData<ActionData>();

  // Show error toast if action returns an error
  useEffect(() => {
    if (actionData?.error) {
      toast({
        title: "Signup Error",
        description: actionData.error,
        variant: "destructive",
      });
    }
  }, [actionData, toast]);

  // Client-side password match check
  useEffect(() => {
    setPasswordMatchError(password !== confirmPassword && confirmPassword !== '');
  }, [password, confirmPassword]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (password !== confirmPassword) {
      event.preventDefault(); // Prevent form submission
      setPasswordMatchError(true);
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#004D40]">
      <div className="w-full max-w-md space-y-6 px-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">SayFin</h1>
          <h2 className="text-2xl font-bold text-white">Create Account</h2>
        </div>

        <Form method="post" onSubmit={handleSubmit} className="space-y-4 bg-[#00695C] rounded-lg p-6">
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
            disabled={passwordMatchError || !email || !password || !confirmPassword}
          >
            Sign Up
          </Button>
        </Form>
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