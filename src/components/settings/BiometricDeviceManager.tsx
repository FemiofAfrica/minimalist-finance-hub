import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Smartphone, Monitor, Tablet, Edit2, Trash2, Shield, Clock, Wifi, WifiOff } from 'lucide-react';
import { enhancedBiometricAuthService, DatabaseBiometricCredential } from '@/services/biometricAuthEnhanced';
import { toast } from 'sonner';

interface BiometricDeviceManagerProps {
  onDeviceChange?: () => void;
}

const BiometricDeviceManager: React.FC<BiometricDeviceManagerProps> = ({ onDeviceChange }) => {
  const [devices, setDevices] = useState<DatabaseBiometricCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDevice, setEditingDevice] = useState<DatabaseBiometricCredential | null>(null);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      await enhancedBiometricAuthService.syncCredentials();
      const deviceList = await enhancedBiometricAuthService.getAllDevices();
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to load devices:', error);
      toast.error('Failed to load biometric devices');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'desktop':
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getDeviceTypeColor = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'tablet':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'desktop':
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
  };

  const formatLastUsed = (lastUsed?: string) => {
    if (!lastUsed) return 'Never used';
    
    const date = new Date(lastUsed);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    
    return date.toLocaleDateString();
  };

  const getCurrentDeviceId = () => {
    const currentUserAgent = navigator.userAgent;
    return devices.find(device => 
      device.device_info?.userAgent === currentUserAgent
    )?.credential_id;
  };

  const isCurrentDevice = (device: DatabaseBiometricCredential) => {
    return device.credential_id === getCurrentDeviceId();
  };

  const handleEditDevice = (device: DatabaseBiometricCredential) => {
    setEditingDevice(device);
    setNewDeviceName(device.name);
    setIsEditDialogOpen(true);
  };

  const handleSaveDeviceName = async () => {
    if (!editingDevice || !newDeviceName.trim()) return;

    try {
      const success = await enhancedBiometricAuthService.updateDeviceName(
        editingDevice.credential_id,
        newDeviceName.trim()
      );

      if (success) {
        toast.success('Device name updated successfully');
        await loadDevices();
        onDeviceChange?.();
        setIsEditDialogOpen(false);
        setEditingDevice(null);
        setNewDeviceName('');
      } else {
        toast.error('Failed to update device name');
      }
    } catch (error) {
      console.error('Failed to update device name:', error);
      toast.error('Failed to update device name');
    }
  };

  const handleRemoveDevice = async (device: DatabaseBiometricCredential) => {
    try {
      const success = await enhancedBiometricAuthService.removeDevice(device.credential_id);

      if (success) {
        toast.success('Device removed successfully');
        await loadDevices();
        onDeviceChange?.();
      } else {
        toast.error('Failed to remove device');
      }
    } catch (error) {
      console.error('Failed to remove device:', error);
      toast.error('Failed to remove device');
    }
  };

  const handleSyncDevices = async () => {
    try {
      setLoading(true);
      await enhancedBiometricAuthService.syncCredentials();
      await loadDevices();
      toast.success('Devices synced successfully');
    } catch (error) {
      console.error('Failed to sync devices:', error);
      toast.error('Failed to sync devices');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Biometric Devices
          </CardTitle>
          <CardDescription>
            Loading your registered biometric devices...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Biometric Devices ({devices.length})
            </CardTitle>
            <CardDescription>
              Manage biometric authentication across all your devices
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncDevices}
            className="flex items-center gap-2"
          >
            <Wifi className="h-4 w-4" />
            Sync Devices
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <WifiOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Biometric Devices</h3>
            <p className="text-muted-foreground mb-4">
              You haven't registered any biometric devices yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to the Biometric Settings above to register your first device.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device.credential_id}
                className={`p-4 border rounded-lg transition-colors ${
                  isCurrentDevice(device)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getDeviceIcon(device.device_info?.deviceType || 'desktop')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{device.name}</h4>
                        {isCurrentDevice(device) && (
                          <Badge variant="secondary" className="text-xs">
                            Current Device
                          </Badge>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getDeviceTypeColor(device.device_info?.deviceType || 'desktop')}`}
                        >
                          {device.device_info?.deviceType || 'Desktop'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatLastUsed(device.last_used_at)}
                        </div>
                        <div>
                          Added {new Date(device.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {device.device_info && (
                        <div className="text-xs text-muted-foreground">
                          <div className="truncate">
                            Platform: {device.device_info.platform}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDevice(device)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          disabled={isCurrentDevice(device)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Biometric Device</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove "{device.name}"? This will disable biometric authentication on that device.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveDevice(device)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove Device
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Device Name</DialogTitle>
              <DialogDescription>
                Choose a name that helps you identify this device.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Device Name</Label>
                <Input
                  id="device-name"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="Enter device name"
                  maxLength={50}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingDevice(null);
                  setNewDeviceName('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveDeviceName}
                disabled={!newDeviceName.trim()}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BiometricDeviceManager;
 