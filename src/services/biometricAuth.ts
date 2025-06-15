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

export interface SecureBiometricStore {
  credentials: BiometricCredential[];
  // In production, you'd encrypt sensitive data
  userSession?: {
    email: string;
    encryptedToken: string; // This would be encrypted user session token
  };
}

export interface BiometricAuthService {
  isSupported: () => boolean;
  isAvailable: () => Promise<boolean>;
  register: (name?: string) => Promise<{ success: boolean; credential?: BiometricCredential; error?: string }>;
  authenticate: () => Promise<{ success: boolean; credential?: BiometricCredential; error?: string }>;
  getRegisteredCredentials: () => Promise<BiometricCredential[]>;
  removeCredential: (credentialId: string) => Promise<boolean>;
  isRegistered: () => Promise<boolean>;
  authenticateAndSignIn: () => Promise<{ success: boolean; credential?: BiometricCredential; error?: string }>;
  registerWithPassword: (email: string, password: string, name?: string) => Promise<{ success: boolean; credential?: BiometricCredential; error?: string }>;
  clearAllCredentials: () => Promise<void>;
  clearInvalidCredentials: () => Promise<number>;
  // New methods for cross-device sync
  syncCredentials: () => Promise<void>;
  getAllDevices: () => Promise<DatabaseBiometricCredential[]>;
  removeDevice: (credentialId: string) => Promise<boolean>;
  updateDeviceName: (credentialId: string, newName: string) => Promise<boolean>;
}

class BiometricAuthServiceImpl implements BiometricAuthService {
  private readonly storageKey = 'biometric-credentials';
  private readonly CREDENTIAL_STORAGE_KEY = 'biometric_credentials';
  
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
      // Add extra checks for browser compatibility
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
      
      const { error } = await supabase
        .from('biometric_credentials')
        .insert({
          user_id: user.data.user.id,
          credential_id: credential.id,
          public_key: credential.publicKey,
          name: credential.name,
          device_info: deviceInfo,
          attestation_type: 'none', // Default for now
          aaguid: '00000000-0000-0000-0000-000000000000',
          transports: ['internal'], // Default for platform authenticators
          encrypted_credentials: credential.encryptedCredentials,
          last_used_at: credential.last_used_at || null
        });

      if (error) {
        console.error('Failed to store credential in database:', error);
        throw error;
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
          await this.storeCredentialInDatabase(localCred);
          mergedCredentials.push(localCred);
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

      const user = supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User must be logged in to register biometric authentication' };
      }

      // Generate a unique user ID for WebAuthn
      const userId = await this.getUserId();
      const userName = (await user).data.user?.email || 'user';

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

      // Store credential info
      const credentialData: BiometricCredential = {
        id: this.arrayBufferToBase64(credential.rawId),
        publicKey: this.arrayBufferToBase64(credential.response.publicKey || new ArrayBuffer(0)),
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
   * Register biometric authentication with password storage for passwordless login
   */
  async registerWithPassword(email: string, password: string, name: string = 'Biometric Login'): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    try {
      if (!this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      if (!(await this.isAvailable())) {
        return { success: false, error: 'Biometric authentication is not available on this device' };
      }

      // Generate a unique user ID for WebAuthn
      const userId = await this.getUserId();
      const userName = email;

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
            displayName: name,
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

      // Encrypt the password using device-specific secret
      const createdAt = new Date().toISOString();
      const credentialIdBase64 = this.arrayBufferToBase64(credential.rawId);
      const deviceSecret = credentialIdBase64 + createdAt; // Use credential ID + timestamp as encryption key
      const encryptedPasswordData = await this.encryptPassword(password, deviceSecret);

      // Store credential info with encrypted password
      const credentialData: BiometricCredential = {
        id: credentialIdBase64,
        publicKey: this.arrayBufferToBase64(credential.response.publicKey || new ArrayBuffer(0)),
        name,
        created_at: createdAt,
        user_email: userName,
        encryptedCredentials: {
          email: userName,
          encryptedPassword: encryptedPasswordData.encryptedPassword,
          salt: encryptedPasswordData.salt,
        },
      };

      await this.storeCredential(credentialData);

      return { success: true, credential: credentialData };
    } catch (error) {
      console.error('Biometric registration with password failed:', error);
      
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

      const credentials = await this.getRegisteredCredentials();
      console.log('Stored credentials:', credentials.map(c => ({ id: c.id, idLength: c.id.length, hasPassword: !!c.encryptedCredentials?.encryptedPassword })));
      
      if (credentials.length === 0) {
        return { success: false, error: 'No biometric credentials registered. Please set up biometric authentication first.' };
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Get credential
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: credentials.map(cred => ({
            id: this.base64ToArrayBuffer(cred.id),
            type: 'public-key',
          })),
          userVerification: 'required',
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!assertion) {
        return { success: false, error: 'Biometric authentication failed' };
      }

      // Find and update the used credential
      const assertionIdBase64 = this.arrayBufferToBase64(assertion.rawId);
      const usedCredential = credentials.find(cred => cred.id === assertionIdBase64);
      if (usedCredential) {
        usedCredential.last_used_at = new Date().toISOString();
        await this.updateCredential(usedCredential);
      }

      return { success: true, credential: usedCredential };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      let errorMessage = 'Biometric authentication failed';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Biometric authentication was cancelled or denied';
        } else if (error.name === 'InvalidStateError') {
          errorMessage = 'No biometric credentials found';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Biometric authentication is not supported on this device';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Authenticate using biometric credential and perform automatic sign-in
   */
  async authenticateAndSignIn(): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    try {
      if (!this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      const credentials = await this.getRegisteredCredentials();
      console.log('Stored credentials:', credentials.map(c => ({ 
        id: c.id, 
        idLength: c.id.length, 
        hasPassword: !!c.encryptedCredentials?.encryptedPassword,
        passwordLength: c.encryptedCredentials?.encryptedPassword?.length || 0,
        hasSalt: !!c.encryptedCredentials?.salt,
        saltLength: c.encryptedCredentials?.salt?.length || 0,
        isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(c.id)
      })));
      
      if (credentials.length === 0) {
        return { success: false, error: 'No biometric credentials registered. Please set up biometric authentication first.' };
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Get credential
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: credentials.map(cred => {
            console.log('Converting credential ID for WebAuthn:', cred.id);
            try {
              const arrayBuffer = this.base64ToArrayBuffer(cred.id);
              console.log('Successfully converted to ArrayBuffer, length:', arrayBuffer.byteLength);
              return {
                id: arrayBuffer,
                type: 'public-key',
              };
            } catch (error) {
              console.error('Failed to convert credential ID:', cred.id, error);
              throw error;
            }
          }),
          userVerification: 'required',
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!assertion) {
        return { success: false, error: 'Biometric authentication failed' };
      }

      // Find and update the used credential
      const assertionIdBase64 = this.arrayBufferToBase64(assertion.rawId);
      console.log('Assertion ID (base64):', assertionIdBase64);
      
      const usedCredential = credentials.find(cred => cred.id === assertionIdBase64);
      if (usedCredential) {
        usedCredential.last_used_at = new Date().toISOString();
        await this.updateCredential(usedCredential);
        
        // Check if we have valid encrypted credentials for passwordless login
        console.log('Checking credential for auto-login:', {
          hasEncryptedCredentials: !!usedCredential.encryptedCredentials,
          hasEncryptedPassword: !!usedCredential.encryptedCredentials?.encryptedPassword,
          encryptedPasswordLength: usedCredential.encryptedCredentials?.encryptedPassword?.length || 0,
          hasSalt: !!usedCredential.encryptedCredentials?.salt,
          saltLength: usedCredential.encryptedCredentials?.salt?.length || 0,
        });

        const hasValidEncryption = usedCredential.encryptedCredentials?.encryptedPassword && 
                                   usedCredential.encryptedCredentials?.salt &&
                                   typeof usedCredential.encryptedCredentials.encryptedPassword === 'string' &&
                                   typeof usedCredential.encryptedCredentials.salt === 'string' &&
                                   usedCredential.encryptedCredentials.encryptedPassword.trim().length > 0 &&
                                   usedCredential.encryptedCredentials.salt.trim().length > 0;

        console.log('Has valid encryption:', hasValidEncryption);

        if (hasValidEncryption) {
          try {
            // Decrypt the password using the device secret
            const deviceSecret = usedCredential.id + usedCredential.created_at;
            console.log('Attempting decryption with:', {
              credentialId: usedCredential.id,
              createdAt: usedCredential.created_at,
              deviceSecretLength: deviceSecret.length,
              encryptedPasswordLength: usedCredential.encryptedCredentials.encryptedPassword.length,
              saltLength: usedCredential.encryptedCredentials.salt.length
            });
            
            const decryptedPassword = await this.decryptPassword(
              usedCredential.encryptedCredentials.encryptedPassword,
              usedCredential.encryptedCredentials.salt,
              deviceSecret
            );

            // Automatically sign in with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
              email: usedCredential.encryptedCredentials.email,
              password: decryptedPassword,
            });

            if (error) {
              console.error('Supabase sign-in failed:', error);
              return { success: false, error: `Login failed: ${error.message}` };
            }

            if (data.user) {
              return { success: true, credential: usedCredential };
            } else {
              return { success: false, error: 'Login failed: No user returned' };
            }
          } catch (decryptError) {
            console.error('Password decryption failed:', decryptError);
            return { success: false, error: 'Failed to decrypt stored credentials. Please re-register biometric authentication.' };
          }
        } else {
          // Fallback to auto-fill mode for credentials without stored password
          return { success: true, credential: usedCredential };
        }
      }

      return { success: false, error: 'Credential not found' };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      let errorMessage = 'Biometric authentication failed';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Biometric authentication was cancelled or denied';
        } else if (error.name === 'InvalidStateError') {
          errorMessage = 'No biometric credentials found';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Biometric authentication is not supported on this device';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get all registered biometric credentials
   */
  async getRegisteredCredentials(): Promise<BiometricCredential[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const credentials = JSON.parse(stored) as BiometricCredential[];
      if (!Array.isArray(credentials)) return [];
      
      // Migrate old credentials that might not have encryptedCredentials property
      const migratedCredentials = credentials.map(credential => {
        if (!credential.encryptedCredentials || typeof credential.encryptedCredentials !== 'object') {
          console.log('Migrating old credential (no password storage):', credential.id);
          return {
            ...credential,
            encryptedCredentials: {
              email: credential.user_email || '',
              encryptedPassword: '', // Empty - will be used for auto-fill only
              salt: '',
            }
          };
        }
        // Ensure all required properties exist
        if (!credential.encryptedCredentials.email) {
          credential.encryptedCredentials.email = credential.user_email || '';
        }
        // Don't set empty strings for encryptedPassword and salt if they don't exist
        // This allows the validation logic to properly detect missing encryption data
        return credential;
      });
      
      // Save migrated credentials back to localStorage if migration occurred
      const needsMigration = migratedCredentials.some((cred, index) => 
        !credentials[index].encryptedCredentials
      );
      
      if (needsMigration) {
        localStorage.setItem(this.storageKey, JSON.stringify(migratedCredentials));
        console.log('Migrated', migratedCredentials.length, 'biometric credentials');
      }
      
      return migratedCredentials;
    } catch (error) {
      console.error('Failed to get credentials:', error);
      return [];
    }
  }

  /**
   * Remove a biometric credential
   */
  async removeCredential(credentialId: string): Promise<boolean> {
    try {
      const credentials = await this.getRegisteredCredentials();
      const updatedCredentials = credentials.filter(cred => cred.id !== credentialId);
      
      localStorage.setItem(this.storageKey, JSON.stringify(updatedCredentials));
      return true;
    } catch (error) {
      console.error('Failed to remove credential:', error);
      return false;
    }
  }

  /**
   * Check if user has any registered biometric credentials
   */
  async isRegistered(): Promise<boolean> {
    const credentials = await this.getRegisteredCredentials();
    return credentials.length > 0;
  }

  /**
   * Clear all stored biometric credentials (for debugging)
   */
  async clearAllCredentials(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Clear credentials that don't have valid encryption (migration cleanup)
   */
  async clearInvalidCredentials(): Promise<number> {
    const credentials = await this.getRegisteredCredentials();
    const validCredentials = credentials.filter(cred => {
      const hasValidEncryption = cred.encryptedCredentials?.encryptedPassword && 
                                 cred.encryptedCredentials?.salt &&
                                 typeof cred.encryptedCredentials.encryptedPassword === 'string' &&
                                 typeof cred.encryptedCredentials.salt === 'string' &&
                                 cred.encryptedCredentials.encryptedPassword.trim().length > 0 &&
                                 cred.encryptedCredentials.salt.trim().length > 0;
      return hasValidEncryption;
    });

    const removedCount = credentials.length - validCredentials.length;
    if (removedCount > 0) {
      localStorage.setItem(this.storageKey, JSON.stringify(validCredentials));
      console.log(`Removed ${removedCount} invalid biometric credentials`);
    }

    return removedCount;
  }

  // Private helper methods
  private async getUserId(): Promise<Uint8Array> {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id || 'anonymous';
    return new TextEncoder().encode(userId);
  }

  private async storeCredential(credential: BiometricCredential): Promise<void> {
    const credentials = await this.getRegisteredCredentials();
    credentials.push(credential);
    localStorage.setItem(this.storageKey, JSON.stringify(credentials));
  }

  private async updateCredential(updatedCredential: BiometricCredential): Promise<void> {
    const credentials = await this.getRegisteredCredentials();
    const index = credentials.findIndex(cred => cred.id === updatedCredential.id);
    
    if (index !== -1) {
      credentials[index] = updatedCredential;
      localStorage.setItem(this.storageKey, JSON.stringify(credentials));
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
      // Handle case where the string might not be base64 encoded
      if (!base64 || typeof base64 !== 'string') {
        throw new Error('Invalid base64 string provided');
      }
      
      // Check if it's already a valid base64 string
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(base64)) {
        // If it's not base64, it might be a raw string - convert it
        console.warn('Converting non-base64 credential ID:', base64);
        base64 = btoa(base64);
      }
      
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
    } catch (error) {
      console.error('Failed to convert base64 to ArrayBuffer:', error, 'Input:', base64);
      throw error;
    }
  }

  // Encryption utilities for secure password storage
  private async generateKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async encryptPassword(password: string, userSecret: string): Promise<{ encryptedPassword: string; salt: string }> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.generateKey(userSecret, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(password)
    );

    // Combine iv + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return {
      encryptedPassword: btoa(String.fromCharCode(...combined)),
      salt: btoa(String.fromCharCode(...salt)),
    };
  }

  private async decryptPassword(encryptedPassword: string, salt: string, userSecret: string): Promise<string> {
    // Validate inputs
    if (!encryptedPassword || !salt || !userSecret) {
      throw new Error('Missing required parameters for decryption');
    }

    if (encryptedPassword.length === 0 || salt.length === 0) {
      throw new Error('Empty encrypted password or salt - credential may not have been properly encrypted');
    }

    try {
      console.log('Decryption step 1: Parsing salt');
      const decoder = new TextDecoder();
      const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
      console.log('Salt bytes length:', saltBytes.length);

      console.log('Decryption step 2: Generating key');
      const key = await this.generateKey(userSecret, saltBytes);
      console.log('Key generated successfully');

      console.log('Decryption step 3: Parsing encrypted data');
      // Decode the combined iv + encrypted data
      const combined = Uint8Array.from(atob(encryptedPassword), c => c.charCodeAt(0));
      console.log('Combined data length:', combined.length);
      
      // Validate that we have enough data (at least 12 bytes for IV)
      if (combined.length < 12) {
        throw new Error('Invalid encrypted data - too short');
      }

      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      console.log('IV length:', iv.length, 'Encrypted data length:', encrypted.length);

      // Validate that we have actual encrypted data
      if (encrypted.length === 0) {
        throw new Error('No encrypted data found');
      }

      console.log('Decryption step 4: Attempting crypto.subtle.decrypt');
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      console.log('Decryption successful, decrypted data length:', decrypted.byteLength);

      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed at step:', error);
      throw new Error(`Password decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Create and export the singleton instance
export const biometricAuthService = new BiometricAuthServiceImpl(); 