import { useState, useEffect } from 'react';
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Type for action data
type ActionData = {
  error?: string;
  success?: boolean;
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Show toast for errors or success
  useEffect(() => {
    if (actionData?.error) {
      toast({
        title: "Error",
        description: actionData.error,
        variant: "destructive",
      });
      setShowSuccessMessage(false);
    } else if (actionData?.success) {
       toast({
        title: "Success",
        description: "Password reset email sent. Please check your inbox.",
      });
      setShowSuccessMessage(true);
      setEmail(''); // Clear email field on success
    }
  }, [actionData, toast]);

  // Check for reset message from URL (after successful reset)
  useEffect(() => {
    if (searchParams.get('reset') === 'success') {
      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. You can now log in.",
      });
    }
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#004D40]">
      <div className="w-full max-w-md space-y-6 px-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">SayFin</h1>
          <h2 className="text-2xl font-bold text-white">Reset Password</h2>
        </div>

        {showSuccessMessage ? (
          <div className="bg-[#00695C] rounded-lg p-6 text-center text-white">
            <p className="mb-4">Password reset instructions have been sent to your email address.</p>
            <Link to="/login" className="font-medium text-gray-200 hover:text-white">
              Back to Login
            </Link>
          </div>
        ) : (
          <Form method="post" className="space-y-4 bg-[#00695C] rounded-lg p-6">
            <p className="text-sm text-gray-200 text-center mb-4">Enter your email address and we'll send you a link to reset your password.</p>
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
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[#004D40] hover:bg-[#00695C] text-white border-2 border-gray-200 hover:border-transparent disabled:opacity-50"
              disabled={!email}
            >
              Send Reset Link
            </Button>
          </Form>
        )}

        {!showSuccessMessage && (
           <div className="mt-4 text-center text-sm">
            <Link to="/login" className="font-medium text-gray-200 hover:text-white">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword; 