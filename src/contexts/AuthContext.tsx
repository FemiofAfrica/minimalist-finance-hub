import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata?: { firstName?: string; lastName?: string }) => {
    try {
      // Validate input data
      if (!email || !password) {
        throw new Error('Email and password are required.');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) throw error;
  };

  const signInWithTwitter = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    if (error) throw error;
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
      signInWithTwitter
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
