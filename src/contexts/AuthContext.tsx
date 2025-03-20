
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    console.log('AuthContext: Initializing and checking for existing session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Initial session check complete', { hasSession: !!session });
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    }).catch(error => {
      console.error('AuthContext: Error getting initial session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    console.log('AuthContext: Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthContext: Auth state changed', { event: _event, hasSession: !!session });
      setSession(session);
      setUser(session?.user || null);
      
      // Add a guard to prevent redirect loops
      const currentPath = window.location.pathname;
      console.log('AuthContext: Current path during auth change:', currentPath);
      
      if (!session && currentPath !== '/login' && currentPath !== '/') {
        console.log('AuthContext: No session, navigating to login');
        navigate('/login');
      }
      setLoading(false);
    });

    return () => {
      console.log('AuthContext: Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
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
