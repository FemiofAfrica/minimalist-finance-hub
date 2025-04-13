import { createContext } from 'react';

export type User = {
  id: string;
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
};

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  isLoading: boolean; // Add isLoading property to match usage in App.tsx
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
};

// Create the context with undefined as default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);