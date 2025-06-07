import { createContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type OnboardingContextType = {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboardingState: () => void;
};

export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);

  // Check if user has completed onboarding on initial load and when user changes
  useEffect(() => {
    if (user) {
      const onboardingStatus = localStorage.getItem(`onboarding-completed-${user.id}`);
      setHasCompletedOnboarding(onboardingStatus === 'true');
    } else {
      // Reset to false when no user (logged out)
      setHasCompletedOnboarding(false);
    }
  }, [user]);

  const completeOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding-completed-${user.id}`, 'true');
      setHasCompletedOnboarding(true);
    }
  };

  const resetOnboardingState = () => {
    if (user) {
      localStorage.removeItem(`onboarding-completed-${user.id}`);
      setHasCompletedOnboarding(false);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        completeOnboarding,
        resetOnboardingState,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
} 