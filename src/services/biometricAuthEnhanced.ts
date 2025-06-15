import { supabase } from '@/integrations/supabase/client';

export interface BiometricCredential {
  id: string;
  publicKey: string;
  name: string;
  created_at: string;
  last_used_at?: string;
  user_email: string; // Required for login
  // Store encrypted credentials for full auto-login
  encryptedCredentials: {
    email: string;
    encryptedPassword: string; // AES encrypted password
    salt: string; // For encryption
  };
}

// Enhanced interface for database-stored credentials
export interface DatabaseBiometricCredential {
  id: number; // Database primary key
  user_id: string;
  credential_id: string; // WebAuthn credential ID
  public_key: string;
  name: string;
  device_info: {
    userAgent: string;
    platform: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
  };
  attestation_type: 'direct' | 'indirect' | 'none';
  aaguid: string;
  transports: string[];
  encrypted_credentials?: {
    email: string;
    encryptedPassword: string;
    salt: string;
  };
  created_at: string;
  last_used_at?: string;
  updated_at: string;
  is_active: boolean;
}

export interface BiometricAuthService {
  isSupported: () => boolean;
  isAvailable: () => Promise<boolean>;
  register: (name?: string) => Promise<{ success: boolean; credential?: BiometricCredential; error?: string }>;
  authenticate: () => Promise<{ success: boolean; credential?: BiometricCredential; error?: string }>;
  getRegisteredCredentials: () => Promise<BiometricCredential[]>;
  removeCredential: (credentialId: string) => Promise<boolean>;
  isRegistered: () => Promise<boolean>;
  clearAllCredentials: () => Promise<void>;
  // New methods for cross-device sync
  syncCredentials: () => Promise<void>;
  getAllDevices: () => Promise<DatabaseBiometricCredential[]>;
  removeDevice: (credentialId: string) => Promise<boolean>;
  updateDeviceName: (credentialId: string, newName: string) => Promise<boolean>;
}

export class EnhancedBiometricAuthService implements BiometricAuthService {
  private readonly storageKey = 'biometric-credentials';
  
  /**
   * Check if Web Authentication API is supported by the browser
   */
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'navigator' in window &&
      'credentials' in navigator &&
      'create' in navigator.credentials &&
      'get' in navigator.credentials &&
      typeof PublicKeyCredential !== 'undefined'
    );
  }

  /**
   * Check if biometric authentication is available on the device
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // Check if platform authenticator is available (biometric sensors)
      if (!window.PublicKeyCredential || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        console.warn('PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable not available');
        return false;
      }
      
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.warn('Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Detect device information for better credential management
   */
  private detectDeviceInfo(): { userAgent: string; platform: string; deviceType: 'mobile' | 'desktop' | 'tablet' } {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    
    if (/iPhone|iPod/.test(userAgent)) {
      deviceType = 'mobile';
    } else if (/iPad/.test(userAgent)) {
      deviceType = 'tablet';
    } else if (/Android/.test(userAgent)) {
      if (/Mobile/.test(userAgent)) {
        deviceType = 'mobile';
      } else {
        deviceType = 'tablet';
      }
    }
    
    return { userAgent, platform, deviceType };
  }

  /**
   * Generate a user-friendly device name based on device info
   */
  private generateDeviceName(): string {
    const deviceInfo = this.detectDeviceInfo();
    const { userAgent, deviceType } = deviceInfo;
    
    if (/iPhone/.test(userAgent)) {
      return 'iPhone';
    } else if (/iPad/.test(userAgent)) {
      return 'iPad';
    } else if (/Android/.test(userAgent)) {
      return deviceType === 'mobile' ? 'Android Phone' : 'Android Tablet';
    } else if (/Mac/.test(userAgent)) {
      return 'Mac';
    } else if (/Windows/.test(userAgent)) {
      return 'Windows PC';
    } else if (/Linux/.test(userAgent)) {
      return 'Linux PC';
    }
    
    return `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Device`;
  }

  /**
   * Store credential in database for cross-device sync
   */
  private async storeCredentialInDatabase(credential: BiometricCredential): Promise<void> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const deviceInfo = this.detectDeviceInfo();
      
      // First, check if credential already exists
      const { data: existingCredential } = await supabase
        .from('biometric_credentials')
        .select('id')
        .eq('credential_id', credential.id)
        .eq('user_id', user.data.user.id)
        .single();

      if (existingCredential) {
        // Update existing credential
        const { error } = await supabase
          .from('biometric_credentials')
          .update({
            public_key: credential.publicKey,
            name: credential.name,
            device_info: deviceInfo,
            encrypted_credentials: credential.encryptedCredentials,
            last_used_at: credential.last_used_at || null,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('credential_id', credential.id)
          .eq('user_id', user.data.user.id);

        if (error) {
          console.error('Failed to update credential in database:', error);
        } else {
          console.log('Updated existing credential in database:', credential.id);
        }
      } else {
        // Insert new credential
        const { error } = await supabase
          .from('biometric_credentials')
          .insert({
            user_id: user.data.user.id,
            credential_id: credential.id,
            public_key: credential.publicKey,
            name: credential.name,
            device_info: deviceInfo,
            attestation_type: 'none',
            aaguid: '00000000-0000-0000-0000-000000000000',
            transports: ['internal'],
            encrypted_credentials: credential.encryptedCredentials,
            last_used_at: credential.last_used_at || null
          });

        if (error) {
          console.error('Failed to insert credential in database:', error);
        } else {
          console.log('Inserted new credential in database:', credential.id);
        }
      }
    } catch (error) {
      console.error('Database storage failed:', error);
      // Don't throw - allow localStorage fallback
    }
  }

  /**
   * Update credential last used time in database
   */
  private async updateCredentialLastUsed(credentialId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('biometric_credentials')
        .update({ 
          last_used_at: new Date().toISOString() 
        })
        .eq('credential_id', credentialId);

      if (error) {
        console.error('Failed to update credential last used:', error);
      }
    } catch (error) {
      console.error('Database update failed:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Sync credentials between localStorage and database
   */
  async syncCredentials(): Promise<void> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        console.log('User not authenticated, skipping sync');
        return;
      }

      // Get credentials from database
      const { data: dbCredentials, error } = await supabase
        .from('biometric_credentials')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch credentials from database:', error);
        return;
      }

      // Get local credentials
      const localCredentials = await this.getLocalCredentials();
      
      // Convert database credentials to local format for compatibility
      const syncedCredentials: BiometricCredential[] = [];
      
      if (dbCredentials) {
        for (const dbCred of dbCredentials) {
          const localFormat: BiometricCredential = {
            id: dbCred.credential_id,
            publicKey: dbCred.public_key,
            name: dbCred.name,
            created_at: dbCred.created_at,
            last_used_at: dbCred.last_used_at || undefined,
            user_email: dbCred.encrypted_credentials?.email || '',
            encryptedCredentials: dbCred.encrypted_credentials || {
              email: '',
              encryptedPassword: '',
              salt: ''
            }
          };
          syncedCredentials.push(localFormat);
        }
      }

      // Merge with local credentials (prioritize database)
      const mergedCredentials = [...syncedCredentials];
      
      for (const localCred of localCredentials) {
        const existsInDb = syncedCredentials.find(dbCred => dbCred.id === localCred.id);
        if (!existsInDb) {
          // Local credential not in database - add it to database
          console.log('Uploading local credential to database:', localCred.id);
          await this.storeCredentialInDatabase(localCred);
          mergedCredentials.push(localCred);
        } else {
          console.log('Credential already exists in database:', localCred.id);
        }
      }

      // Update localStorage with merged credentials
      localStorage.setItem(this.storageKey, JSON.stringify(mergedCredentials));
      
      console.log(`Synced ${mergedCredentials.length} biometric credentials`);
    } catch (error) {
      console.error('Credential sync failed:', error);
    }
  }

  /**
   * Get all devices for the current user
   */
  async getAllDevices(): Promise<DatabaseBiometricCredential[]> {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        return [];
      }

      const { data, error } = await supabase
        .from('biometric_credentials')
        .select('*')
        .eq('is_active', true)
        .order('last_used_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Failed to fetch devices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Get devices failed:', error);
      return [];
    }
  }

  /**
   * Remove a device (credential) from database
   */
  async removeDevice(credentialId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('biometric_credentials')
        .update({ is_active: false })
        .eq('credential_id', credentialId);

      if (error) {
        console.error('Failed to remove device:', error);
        return false;
      }

      // Also remove from localStorage
      await this.removeCredential(credentialId);
      
      return true;
    } catch (error) {
      console.error('Remove device failed:', error);
      return false;
    }
  }

  /**
   * Update device name
   */
  async updateDeviceName(credentialId: string, newName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('biometric_credentials')
        .update({ name: newName })
        .eq('credential_id', credentialId);

      if (error) {
        console.error('Failed to update device name:', error);
        return false;
      }

      // Also update localStorage
      const credentials = await this.getLocalCredentials();
      const updatedCredentials = credentials.map(cred => 
        cred.id === credentialId ? { ...cred, name: newName } : cred
      );
      localStorage.setItem(this.storageKey, JSON.stringify(updatedCredentials));
      
      return true;
    } catch (error) {
      console.error('Update device name failed:', error);
      return false;
    }
  }

  /**
   * Get credentials from localStorage only
   */
  private async getLocalCredentials(): Promise<BiometricCredential[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const credentials = JSON.parse(stored) as BiometricCredential[];
      if (!Array.isArray(credentials)) return [];
      
      // Migrate old credentials that might not have encryptedCredentials property
      const migratedCredentials = credentials.map(credential => {
        if (!credential.encryptedCredentials || typeof credential.encryptedCredentials !== 'object') {
          console.log('Migrating old credential:', credential.id);
          return {
            ...credential,
            encryptedCredentials: {
              email: credential.user_email || '',
              encryptedPassword: '',
              salt: '',
            }
          };
        }
        // Ensure all required properties exist
        if (!credential.encryptedCredentials.email) {
          credential.encryptedCredentials.email = credential.user_email || '';
        }
        if (!credential.encryptedCredentials.encryptedPassword) {
          credential.encryptedCredentials.encryptedPassword = '';
        }
        if (!credential.encryptedCredentials.salt) {
          credential.encryptedCredentials.salt = '';
        }
        return credential;
      });
      
      return migratedCredentials;
    } catch (error) {
      console.error('Failed to get local credentials:', error);
      return [];
    }
  }

  /**
   * Helper method to convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Helper method to convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate a consistent user ID for WebAuthn
   */
  private async getUserId(): Promise<Uint8Array> {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || 'anonymous';
    const encoder = new TextEncoder();
    return encoder.encode(userId);
  }

  /**
   * Store credential in localStorage
   */
  private async storeCredential(credential: BiometricCredential): Promise<void> {
    const credentials = await this.getLocalCredentials();
    
    // Remove any existing credential with the same ID
    const filteredCredentials = credentials.filter(c => c.id !== credential.id);
    
    // Add the new credential
    filteredCredentials.push(credential);
    
    localStorage.setItem(this.storageKey, JSON.stringify(filteredCredentials));
  }

  /**
   * Register a new biometric credential
   */
  async register(name: string = 'Biometric Login'): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    try {
      if (!this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      if (!(await this.isAvailable())) {
        return { success: false, error: 'Biometric authentication is not available on this device' };
      }

      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        return { success: false, error: 'User must be logged in to register biometric authentication' };
      }

      // Generate a unique user ID for WebAuthn
      const userId = await this.getUserId();
      const userName = user.data.user.email || 'user';

      // Use auto-generated device name if none provided
      const deviceName = name === 'Biometric Login' ? this.generateDeviceName() : name;

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'Kpege Finance Tracker',
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: userName,
            displayName: deviceName,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: 'direct',
        },
      }) as PublicKeyCredential;

      if (!credential) {
        return { success: false, error: 'Failed to create biometric credential' };
      }

      // Extract public key from credential response
      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKeyBuffer = response.getPublicKey();

      // Store credential info
      const credentialData: BiometricCredential = {
        id: this.arrayBufferToBase64(credential.rawId),
        publicKey: publicKeyBuffer ? this.arrayBufferToBase64(publicKeyBuffer) : '',
        name: deviceName,
        created_at: new Date().toISOString(),
        user_email: userName,
        encryptedCredentials: {
          email: userName,
          encryptedPassword: '',
          salt: '',
        },
      };

      // Store in both localStorage and database
      await this.storeCredential(credentialData);
      await this.storeCredentialInDatabase(credentialData);

      return { success: true, credential: credentialData };
    } catch (error) {
      console.error('Biometric registration failed:', error);
      
      let errorMessage = 'Failed to register biometric authentication';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Biometric registration was cancelled or denied';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Biometric authentication is not supported on this device';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Security error during biometric registration';
        } else if (error.name === 'InvalidStateError') {
          errorMessage = 'A biometric credential already exists for this device';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Authenticate using biometric credential
   */
  async authenticate(): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    try {
      if (!this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      if (!(await this.isAvailable())) {
        return { success: false, error: 'Biometric authentication is not available on this device' };
      }

      // Sync credentials first to get latest from database
      await this.syncCredentials();

      const credentials = await this.getLocalCredentials();
      if (credentials.length === 0) {
        return { success: false, error: 'No biometric credentials found. Please register first.' };
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Get credential IDs for authentication
      const allowCredentials = credentials.map(cred => ({
        id: this.base64ToArrayBuffer(cred.id),
        type: 'public-key' as const,
        transports: ['internal'] as AuthenticatorTransport[],
      }));

      // Authenticate
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials,
          userVerification: 'required',
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!assertion) {
        return { success: false, error: 'Authentication failed' };
      }

      // Find the matching credential
      const credentialId = this.arrayBufferToBase64(assertion.rawId);
      const matchingCredential = credentials.find(cred => cred.id === credentialId);

      if (!matchingCredential) {
        return { success: false, error: 'Credential not found' };
      }

      // Update last used time
      matchingCredential.last_used_at = new Date().toISOString();
      await this.storeCredential(matchingCredential);
      await this.updateCredentialLastUsed(credentialId);

      return { success: true, credential: matchingCredential };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      let errorMessage = 'Authentication failed';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Authentication was cancelled or denied';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Security error during authentication';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get all registered credentials (synced from database)
   */
  async getRegisteredCredentials(): Promise<BiometricCredential[]> {
    await this.syncCredentials();
    return this.getLocalCredentials();
  }

  /**
   * Remove a specific credential
   */
  async removeCredential(credentialId: string): Promise<boolean> {
    try {
      const credentials = await this.getLocalCredentials();
      const filteredCredentials = credentials.filter(cred => cred.id !== credentialId);
      
      localStorage.setItem(this.storageKey, JSON.stringify(filteredCredentials));
      
      return true;
    } catch (error) {
      console.error('Failed to remove credential:', error);
      return false;
    }
  }

  /**
   * Check if any biometric credentials are registered
   */
  async isRegistered(): Promise<boolean> {
    const credentials = await this.getRegisteredCredentials();
    return credentials.length > 0;
  }

  /**
   * Authenticate and sign in (placeholder for future implementation)
   */
  async authenticateAndSignIn(): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    const result = await this.authenticate();
    if (result.success && result.credential) {
      // In the future, this could automatically sign in the user
      // For now, it just returns the credential for manual sign-in
      console.log('Biometric authentication successful. Credential:', result.credential.user_email);
    }
    return result;
  }

  /**
   * Register with password encryption (placeholder for future implementation)
   */
  async registerWithPassword(email: string, password: string, name?: string): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    // This would encrypt the password and store it with the credential
    // For now, just register normally
    return this.register(name);
  }

  /**
   * Clear all credentials
   */
  async clearAllCredentials(): Promise<void> {
    localStorage.removeItem(this.storageKey);
    
    // Also mark all database credentials as inactive
    try {
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        await supabase
          .from('biometric_credentials')
          .update({ is_active: false })
          .eq('user_id', user.data.user.id);
      }
    } catch (error) {
      console.error('Failed to clear database credentials:', error);
    }
  }
}

// Export singleton instance
export const enhancedBiometricAuthService = new EnhancedBiometricAuthService(); 