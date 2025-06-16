import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Shield, Trash2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { biometricAuthService, type BiometricCredential } from '@/services/biometricAuth';
import { enhancedBiometricAuthService } from '@/services/biometricAuthEnhanced';
import BiometricDeviceManager from './BiometricDeviceManager';
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
  const [refreshDevices, setRefreshDevices] = useState(0);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const checkSupport = async () => {
      // Use enhanced service for better cross-device support
      const supported = enhancedBiometricAuthService.isSupported();
      const available = supported ? await enhancedBiometricAuthService.isAvailable() : false;
    
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
  }, [isSupported, isAvailable, refreshDevices]);

  const loadCredentials = async () => {
    try {
      // Use enhanced service to get synced credentials
      const creds = await enhancedBiometricAuthService.getRegisteredCredentials();
      // Ensure all credentials have proper structure
      const sanitizedCreds = creds.map(cred => ({
        ...cred,
        encryptedCredentials: cred.encryptedCredentials || {
          email: cred.user_email || '',
          encryptedPassword: '',
          salt: '',
        }
      }));
      setCredentials(sanitizedCreds);
    } catch (error) {
      console.error('Failed to load biometric credentials:', error);
      setCredentials([]); // Fallback to empty array
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
      // Use enhanced service for registration
      const result = await enhancedBiometricAuthService.register(`${deviceInfo.type} Device`);
      
      if (result.success) {
        toast({
          title: 'Biometric login enabled! 🎉',
          description: 'You can now use biometric authentication to sign in instantly. Your device has been registered and synced across all your devices.',
        });
        setShowPasswordDialog(false);
        setPasswordForRegistration('');
        await loadCredentials();
        setRefreshDevices(prev => prev + 1); // Trigger device manager refresh
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
      // Use enhanced service for removal
      const success = await enhancedBiometricAuthService.removeCredential(credentialId);
      if (success) {
        toast({
          title: 'Device removed',
          description: 'Biometric credential has been removed successfully.',
        });
        await loadCredentials();
        setRefreshDevices(prev => prev + 1); // Trigger device manager refresh
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

  const handleDeviceChange = () => {
    // Refresh local credentials when devices change
    loadCredentials();
  };

  if (!isSupported) {
    return (
      <div className="space-y-6">
      <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
              Biometric authentication is not supported on this device.
          </CardDescription>
        </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              This device doesn't support WebAuthn or biometric authentication.
          </div>
        </CardContent>
      </Card>
        
        {/* Still show device manager for users who might have other devices */}
        <BiometricDeviceManager onDeviceChange={handleDeviceChange} />
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="space-y-6">
      <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
              Biometric authentication is not available on this device.
          </CardDescription>
        </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Please ensure your device has biometric sensors set up and enabled.
          </div>
        </CardContent>
      </Card>
        
        {/* Still show device manager for users who might have other devices */}
        <BiometricDeviceManager onDeviceChange={handleDeviceChange} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
    <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Fingerprint className="h-5 w-5" />
          Biometric Authentication
        </CardTitle>
        <CardDescription>
            Use {deviceInfo.method} to sign in quickly and securely across all your devices
        </CardDescription>
      </CardHeader>
        <CardContent className="space-y-4">
          {credentials.length === 0 ? (
            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                No biometric credentials registered on this device.
        </div>
          <Button 
            onClick={handleEnableBiometric}
                disabled={isLoading}
            className="w-full"
          >
                {isLoading ? 'Setting up...' : `Enable ${deviceInfo.method}`}
          </Button>
            </div>
        ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Registered Devices ({credentials.length})
                </div>
          <Button 
            onClick={handleEnableBiometric}
                  disabled={isLoading}
            variant="outline"
                  size="sm"
          >
                  {isLoading ? 'Adding...' : 'Add This Device'}
          </Button>
              </div>
              
              <div className="space-y-2">
                {credentials.map((credential) => (
                <div key={credential.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <div className="text-sm font-medium">{credential.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Added {new Date(credential.created_at).toLocaleDateString()}
                        {credential.last_used_at && (
                            <> • Last used {new Date(credential.last_used_at).toLocaleDateString()}</>
                        )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCredential(credential.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                </div>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Cross-Device Management */}
      <BiometricDeviceManager onDeviceChange={handleDeviceChange} />

      {/* Password Dialog for Registration */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Biometric Authentication</DialogTitle>
            <DialogDescription>
              Enter your password to securely register your {deviceInfo.method} for this device.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Current Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForRegistration}
                  onChange={(e) => setPasswordForRegistration(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordForRegistration('');
              }}
              disabled={isLoading}
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
        </div>
  );
} 