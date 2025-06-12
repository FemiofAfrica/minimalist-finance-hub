import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Shield, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { biometricAuthService, type BiometricCredential } from '@/services/biometricAuth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export function BiometricSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ type: string; method: string }>({ type: 'unknown', method: 'biometric' });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordForRegistration, setPasswordForRegistration] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const checkSupport = async () => {
      const supported = biometricAuthService.isSupported();
      const available = supported ? await biometricAuthService.isAvailable() : false;
      
      setIsSupported(supported);
      setIsAvailable(available);
      
      // Detect device type and biometric method
      const userAgent = navigator.userAgent;
      if (/iPhone|iPad/.test(userAgent)) {
        setDeviceInfo({ type: 'iOS', method: 'Touch ID or Face ID' });
      } else if (/Android/.test(userAgent)) {
        setDeviceInfo({ type: 'Android', method: 'fingerprint or face unlock' });
      } else if (/Mac/.test(userAgent)) {
        setDeviceInfo({ type: 'Mac', method: 'Touch ID' });
      } else if (/Windows/.test(userAgent)) {
        setDeviceInfo({ type: 'Windows', method: 'Windows Hello' });
      } else {
        setDeviceInfo({ type: 'Desktop', method: 'biometric authentication' });
      }
    };

    checkSupport();
    if (isSupported && isAvailable) {
      loadCredentials();
    }
  }, [isSupported, isAvailable]);

  const loadCredentials = async () => {
    try {
      const creds = await biometricAuthService.getRegisteredCredentials();
      setCredentials(creds);
    } catch (error) {
      console.error('Failed to load biometric credentials:', error);
    }
  };

  const handleEnableBiometric = () => {
    if (!user?.email) {
      toast({
        title: 'Error',
        description: 'User email not available. Please sign in again.',
        variant: 'destructive',
      });
      return;
    }
    
    setShowPasswordDialog(true);
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForRegistration || !user?.email) {
      toast({
        title: 'Error',
        description: 'Please enter your password.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await biometricAuthService.registerWithPassword(
        user.email,
        passwordForRegistration,
        `${deviceInfo.type} Device`
      );
      
      if (result.success) {
        toast({
          title: 'Biometric login enabled! 🎉',
          description: 'You can now use biometric authentication to sign in instantly without entering your password.',
        });
        setShowPasswordDialog(false);
        setPasswordForRegistration('');
        await loadCredentials();
      } else {
        toast({
          title: 'Setup failed',
          description: result.error || 'Failed to enable biometric authentication',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Biometric registration error:', error);
      toast({
        title: 'Setup error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCredential = async (credentialId: string) => {
    try {
      const success = await biometricAuthService.removeCredential(credentialId);
      if (success) {
        toast({
          title: 'Device removed',
          description: 'Biometric credential has been removed successfully.',
        });
        await loadCredentials();
      } else {
        toast({
          title: 'Removal failed',
          description: 'Failed to remove biometric credential. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to remove credential:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while removing the credential.',
        variant: 'destructive',
      });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Biometric authentication is not supported on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            This device doesn't support WebAuthn or biometric authentication.
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
            Biometric authentication is not available on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            Please ensure your device has biometric sensors set up and enabled.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Use your device's biometric authentication to sign in instantly without entering your password.
            Your password is encrypted and stored securely on this device only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {credentials.length === 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                No biometric credentials registered for this account.
              </div>
              <Button onClick={handleEnableBiometric} disabled={isLoading}>
                <Fingerprint className="h-4 w-4 mr-2" />
                Enable Biometric Login
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Registered Devices</h4>
                {credentials.map((credential) => (
                  <div key={credential.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Fingerprint className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{credential.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(credential.created_at).toLocaleDateString()}
                          {credential.last_used_at && (
                            <span className="ml-2">
                              • Last used: {new Date(credential.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {credential.encryptedCredentials?.encryptedPassword ? 'Passwordless' : 'Auto-fill only'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCredential(credential.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button onClick={handleEnableBiometric} variant="outline" disabled={isLoading}>
                <Fingerprint className="h-4 w-4 mr-2" />
                Add Another Device
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Collection Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Biometric Login</DialogTitle>
            <DialogDescription>
              To enable passwordless biometric login, please enter your current password. 
              It will be encrypted and stored securely on this device only.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="biometric-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="biometric-password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForRegistration}
                  onChange={(e) => setPasswordForRegistration(e.target.value)}
                  placeholder="Enter your current password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
              <Shield className="h-4 w-4 inline mr-1" />
              Your password will be encrypted with device-specific keys and never transmitted or stored in plain text.
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordForRegistration('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordSubmit} 
              disabled={isLoading || !passwordForRegistration}
            >
              {isLoading ? 'Setting up...' : 'Enable Biometric Login'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 