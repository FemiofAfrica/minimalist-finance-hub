import { Link } from '@remix-run/react';
import { MailCheck } from 'lucide-react';

const ConfirmEmail = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#004D40]">
      <div className="w-full max-w-md space-y-6 px-8 text-center bg-[#00695C] rounded-lg p-8">
        <div className="flex justify-center mb-4">
          <MailCheck className="w-16 h-16 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Check Your Email</h1>
        <p className="text-gray-200">
          Thank you for signing up! We've sent a confirmation link to your email address.
        </p>
        <p className="text-gray-200">
          Please click the link in the email to verify your account and complete the registration process.
        </p>
        <div className="mt-6">
          <Link 
            to="/login"
            className="inline-block px-6 py-2 bg-[#004D40] hover:bg-teal-800 text-white font-medium rounded border-2 border-gray-200 hover:border-transparent"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail; 