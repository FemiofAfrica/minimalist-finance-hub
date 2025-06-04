import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { verifyTurnstileToken, getTurnstileErrorMessage } from '@/utils/turnstileVerification';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string }, captchaToken?: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  resetPassword: (email: string, captchaToken?: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // getSession() can be used to potentially get session data faster
    // but the listener is the reliable source of truth.
    supabase.auth.getSession(); // Removed .then() handler

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Set loading to false once the initial state is determined
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    // If captcha token provided, verify it independently first
    if (captchaToken) {
      try {
        console.log('[Auth] Verifying Turnstile token before sign in...');
        await verifyTurnstileToken(captchaToken);
        console.log('[Auth] Turnstile verification successful, proceeding with sign in');
      } catch (error) {
        console.error('[Auth] Turnstile verification failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Captcha verification failed';
        throw new Error(errorMessage);
      }
    }

    // Proceed with Supabase auth WITHOUT passing captcha token
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata?: { firstName?: string; lastName?: string }, captchaToken?: string) => {
    try {
      // Validate input data
      if (!email || !password) {
        throw new Error('Email and password are required.');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      // If captcha token provided, verify it independently first
      if (captchaToken) {
        try {
          console.log('[Auth] Verifying Turnstile token before sign up...');
          await verifyTurnstileToken(captchaToken);
          console.log('[Auth] Turnstile verification successful, proceeding with sign up');
        } catch (error) {
          console.error('[Auth] Turnstile verification failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Captcha verification failed';
          throw new Error(errorMessage);
        }
      }

      // Format user metadata
      const userMetadata = {
        first_name: metadata?.firstName?.trim() || '',
        last_name: metadata?.lastName?.trim() || '',
        full_name: metadata ? `${metadata.firstName} ${metadata.lastName}`.trim() : '',
        avatar_url: '',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Proceed with Supabase auth WITHOUT passing captcha token
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: userMetadata
        }
      });

      if (error) {
        console.error('Signup error:', error);
        if (error.message.includes('User already registered')) {
          throw new Error('This email is already registered. Please try logging in instead.');
        } else if (error.message.includes('valid email')) {
          throw new Error('Please enter a valid email address.');
        } else if (error.message.includes('Database error')) {
          throw new Error('There was an error creating your account. Please try again later.');
        } else {
          throw error;
        }
      }

      // Double check for identityId - when this is undefined it can indicate an existing user
      // in some Supabase versions even when no error is returned
      if (data?.user && !data.user.identities?.some(identity => identity.identity_data?.email === email)) {
        throw new Error('This email is already registered. Please try logging in instead.');
      }

      if (!data?.user) {
        throw new Error('No user data returned from signup. Please try again.');
      }

      return data;
    } catch (error) {
      console.error('Signup process error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // First check if a session exists to prevent AuthSessionMissingError
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        // No session exists, manually clean up local state
        setUser(null);
        setSession(null);
        return;
      }
      
      // Proceed with normal signOut if session exists
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if logout fails, clear local state to allow user to "escape"
      setUser(null);
      setSession(null);
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw error;
  };

  const signInWithTwitter = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string, captchaToken?: string) => {
    try {
      if (!email) {
        throw new Error('Email is required.');
      }
      
      console.log('[Auth] Sending password reset email to:', email);
      
      // If captcha token provided, verify it independently first
      if (captchaToken) {
        try {
          console.log('[Auth] Verifying Turnstile token before password reset...');
          await verifyTurnstileToken(captchaToken);
          console.log('[Auth] Turnstile verification successful, proceeding with password reset');
        } catch (error) {
          console.error('[Auth] Turnstile verification failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Captcha verification failed';
          throw new Error(errorMessage);
        }
      }
      
      // Simple redirect URL
      const redirectTo = `${window.location.origin}/reset-password`;
      
      // Send reset email WITHOUT captcha token to avoid Supabase issues
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });
      
      if (error) {
        console.error('[Auth] Reset password error:', error);
        
        // Provide user-friendly error messages
        if (error.message.includes('Email rate limit exceeded') || error.status === 429) {
          throw new Error('Too many password reset attempts. Please wait a few minutes before trying again.');
        } else if (error.status === 504 || error.status === 502 || error.status === 503) {
          throw new Error('Service temporarily unavailable. Please try again in a moment.');
        } else if (error.message.includes('not found') || error.message.includes('invalid')) {
          throw new Error('Email address not found. Please check your email and try again.');
        } else {
          throw new Error('Unable to send reset email. Please try again or contact support.');
        }
      }
      
      console.log('[Auth] Reset email sent successfully');
      return { success: true, message: 'Password reset email sent successfully.' };
      
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      if (!email) {
        throw new Error('Email is required.');
      }
      
      // Supabase doesn't have a direct "resend verification" API
      // The recommended approach is to re-signup with the same email
      const { error } = await supabase.auth.signUp({
        email,
        password: '', // This will be ignored when the user already exists
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });
      
      if (error && !error.message.includes('User already registered')) {
        throw error;
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signIn, 
      signUp, 
      signOut,
      signInWithGoogle,
      signInWithTwitter,
      resetPassword,
      resendVerificationEmail
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
