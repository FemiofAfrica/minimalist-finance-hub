import { supabase } from '@/integrations/supabase/client';

export interface BiometricCredential {
  id: string;
  publicKey: string;
  name: string;
  created_at: string;
  last_used_at?: string;
}

export interface BiometricAuthService {
  isSupported: () => boolean;
  isAvailable: () => Promise<boolean>;
  register: (name?: string) => Promise<{ success: boolean; credential?: BiometricCredential; error?: string }>;
  authenticate: () => Promise<{ success: boolean; credential?: BiometricCredential; error?: string }>;
  getRegisteredCredentials: () => Promise<BiometricCredential[]>;
  removeCredential: (credentialId: string) => Promise<boolean>;
  isRegistered: () => Promise<boolean>;
}

class BiometricAuthServiceImpl implements BiometricAuthService {
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
        id: credential.id,
        publicKey: this.arrayBufferToBase64(credential.response.publicKey || new ArrayBuffer(0)),
        name,
        created_at: new Date().toISOString(),
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
   * Authenticate using biometric credential
   */
  async authenticate(): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
    try {
      if (!this.isSupported()) {
        return { success: false, error: 'Biometric authentication is not supported on this device' };
      }

      const credentials = await this.getRegisteredCredentials();
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
      const usedCredential = credentials.find(cred => cred.id === assertion.id);
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
   * Get all registered biometric credentials
   */
  async getRegisteredCredentials(): Promise<BiometricCredential[]> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const credentials = JSON.parse(stored) as BiometricCredential[];
      return Array.isArray(credentials) ? credentials : [];
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
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Create and export the singleton instance
export const biometricAuthService = new BiometricAuthServiceImpl(); 