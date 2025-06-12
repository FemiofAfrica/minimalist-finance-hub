import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Fingerprint, 
  Shield, 
  Trash2, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2 
} from 'lucide-react';
import { biometricAuthService, BiometricCredential } from '@/services/biometricAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function BiometricSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkBiometricCapabilities();
    loadCredentials();
  }, []);

  const checkBiometricCapabilities = async () => {
    const supported = biometricAuthService.isSupported();
    const available = supported ? await biometricAuthService.isAvailable() : false;
    
    setIsSupported(supported);
    setIsAvailable(available);
  };

  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      const creds = await biometricAuthService.getRegisteredCredentials();
      setCredentials(creds);
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    setIsEnabling(true);
    
    try {
      const result = await biometricAuthService.register('Primary Device');
      
      if (result.success) {
        toast({
          title: 'Biometric authentication enabled! 🎉',
          description: 'You can now use biometric login for quick and secure access.',
        });
        await loadCredentials();
      } else {
        toast({
          title: 'Failed to enable biometric authentication',
          description: result.error || 'Please try again or check your device settings.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to enable biometric auth:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const handleRemoveCredential = async (credentialId: string, credentialName: string) => {
    try {
      const success = await biometricAuthService.removeCredential(credentialId);
      
      if (success) {
        toast({
          title: 'Biometric credential removed',
          description: `${credentialName} has been removed from your account.`,
        });
        await loadCredentials();
      } else {
        toast({
          title: 'Failed to remove credential',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to remove credential:', error);
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      return { type: 'iOS', icon: '📱', method: 'Face ID or Touch ID' };
    } else if (/Android/i.test(userAgent)) {
      return { type: 'Android', icon: '📱', method: 'Fingerprint or Face Unlock' };
    } else if (/Windows/i.test(userAgent)) {
      return { type: 'Windows', icon: '💻', method: 'Windows Hello' };
    } else if (/Mac/i.test(userAgent)) {
      return { type: 'macOS', icon: '💻', method: 'Touch ID' };
    } else {
      return { type: 'Desktop', icon: '🖥️', method: 'Biometric Authentication' };
    }
  };

  const deviceInfo = getDeviceInfo();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Secure your account with biometric authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <XCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Not Available</p>
              <p className="text-sm text-muted-foreground">
                Biometric authentication is not supported on this device or browser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Secure your account with biometric authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium">Device Setup Required</p>
              <p className="text-sm text-muted-foreground">
                Please set up {deviceInfo.method} on your device to use biometric authentication.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Biometric Authentication
        </CardTitle>
        <CardDescription>
          Secure your account with {deviceInfo.method} for quick and secure access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Fingerprint className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {deviceInfo.icon} {deviceInfo.type} Biometric Login
              </p>
              <p className="text-sm text-muted-foreground">
                {credentials.length > 0 
                  ? `${credentials.length} device${credentials.length === 1 ? '' : 's'} registered`
                  : 'Not set up'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {credentials.length > 0 ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
        </div>

        {/* Enable/Add Button */}
        {credentials.length === 0 ? (
          <Button 
            onClick={handleEnableBiometric}
            disabled={isEnabling}
            className="w-full"
          >
            {isEnabling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Enable Biometric Login
              </>
            )}
          </Button>
        ) : (
          <Button 
            onClick={handleEnableBiometric}
            disabled={isEnabling}
            variant="outline"
            className="w-full"
          >
            {isEnabling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Another Device
              </>
            )}
          </Button>
        )}

        {/* Registered Devices */}
        {credentials.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Registered Devices</h4>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              credentials.map((credential) => (
                <div key={credential.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{credential.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {formatDate(credential.created_at)}
                        {credential.last_used_at && (
                          <span> • Last used {formatDate(credential.last_used_at)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove biometric credential?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove "{credential.name}" from your account. You won't be able to use this device for biometric login anymore.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveCredential(credential.id, credential.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-blue-900">Secure & Private</p>
              <p className="text-sm text-blue-700">
                Your biometric data never leaves your device. We only store an encrypted key that works with your biometric authentication.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 