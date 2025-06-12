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
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.warn('Biometric availability check failed:', error);
      return false;
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

      // Store credential info
      const credentialData: BiometricCredential = {
        id: this.arrayBufferToBase64(credential.rawId),
        publicKey: this.arrayBufferToBase64(credential.response.publicKey || new ArrayBuffer(0)),
        name,
        created_at: new Date().toISOString(),
        user_email: userName,
        encryptedCredentials: {
          email: userName,
          encryptedPassword: '',
          salt: '',
        },
      };

      await this.storeCredential(credentialData);

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
        
        // Check if we have encrypted credentials for passwordless login
        if (usedCredential.encryptedCredentials?.encryptedPassword && usedCredential.encryptedCredentials?.salt) {
          try {
            // Decrypt the password using the device secret
            const deviceSecret = usedCredential.id + usedCredential.created_at;
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
        if (!credential.encryptedCredentials) {
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
    const decoder = new TextDecoder();
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
    const key = await this.generateKey(userSecret, saltBytes);

    // Decode the combined iv + encrypted data
    const combined = Uint8Array.from(atob(encryptedPassword), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return decoder.decode(decrypted);
  }
}

// Create and export the singleton instance
export const biometricAuthService = new BiometricAuthServiceImpl(); 