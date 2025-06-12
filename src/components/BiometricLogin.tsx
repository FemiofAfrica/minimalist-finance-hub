import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Eye, FaceIcon as Face, Shield, Loader2 } from 'lucide-react';
import { biometricAuthService } from '@/services/biometricAuth';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface BiometricLoginProps {
  onSuccess?: () => void;
  className?: string;
}

export function BiometricLogin({ onSuccess, className = '' }: BiometricLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [deviceType, setDeviceType] = useState<'desktop' | 'mobile' | 'unknown'>('unknown');
  
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkBiometricSupport = async () => {
      const supported = biometricAuthService.isSupported();
      const available = supported ? await biometricAuthService.isAvailable() : false;
      const registered = available ? await biometricAuthService.isRegistered() : false;
      
      setIsSupported(supported);
      setIsAvailable(available);
      setIsRegistered(registered);
      
      // Detect device type for appropriate icon
      const userAgent = navigator.userAgent;
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        setDeviceType('mobile');
      } else {
        setDeviceType('desktop');
      }
    };

    checkBiometricSupport();
  }, []);

  const handleBiometricLogin = async () => {
    if (!isAvailable || !isRegistered) {
      toast({
        title: 'Biometric login not available',
        description: 'Please set up biometric authentication in settings first.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await biometricAuthService.authenticateAndSignIn();
      
      if (result.success && result.credential) {
        // Check if this was a true passwordless login (has encrypted password)
        if (result.credential.encryptedCredentials.encryptedPassword) {
          // True passwordless login - user is already signed in via Supabase
          toast({
            title: 'Biometric login successful! 🎉',
            description: 'Welcome back! Redirecting to your dashboard...',
          });
          
          // Call onSuccess callback if provided
          onSuccess?.();
          
          // Redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        } else {
          // Fallback to auto-fill mode for credentials without stored password
          toast({
            title: 'Email auto-filled! 🔐',
            description: 'Enter your password and click "Sign In" to continue.',
          });
          
          // This would be handled by parent component for auto-fill
          // But since we want passwordless, this shouldn't happen
        }
      } else {
        toast({
          title: 'Biometric authentication failed',
          description: result.error || 'Please try again or use manual login.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      toast({
        title: 'Authentication error',
        description: 'Something went wrong. Please try again or use manual login.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (deviceType === 'mobile') {
      // On mobile, could be fingerprint or face recognition
      return <Fingerprint className="h-5 w-5" />;
    } else {
      // On desktop, usually fingerprint scanner or Windows Hello
      return <Fingerprint className="h-5 w-5" />;
    }
  };

  const getBiometricText = () => {
    return 'Sign in with biometrics';
  };

  // Don't render if biometric authentication is not supported or available
  if (!isSupported || !isAvailable) {
    return null;
  }

  // If not registered, show a subtle hint
  if (!isRegistered) {
    return (
      <div className={`text-center ${className}`}>
        <p className="text-sm text-muted-foreground">
          <Shield className="inline h-4 w-4 mr-1" />
          Set up biometric login in settings for faster access
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      
      <Button
        type="button"
        variant="outline"
        onClick={handleBiometricLogin}
        disabled={isLoading}
        className="w-full h-12 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border-primary/20 transition-all duration-200"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            {getBiometricIcon()}
            <span className="ml-2 font-medium">{getBiometricText()}</span>
          </>
        )}
      </Button>
      
      <p className="text-xs text-center text-muted-foreground">
        Use your fingerprint, face, or device security to sign in instantly
      </p>
    </div>
  );
} 