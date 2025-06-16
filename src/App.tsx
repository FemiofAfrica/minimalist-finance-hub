import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

import { MixpanelService } from '@/integrations/mixpanel';
import initializeClientEnvironment from '@/utils/env';
import errorNotificationService from '@/services/errorNotificationService';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import { NotificationProvider } from '@/contexts/NotificationContext';
import Login from '@/pages/Login';
import ResetPassword from '@/pages/ResetPassword';
import TestResetPassword from '@/pages/TestResetPassword';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Subscriptions from '@/pages/Subscriptions';
import AccountsAndCards from '@/pages/AccountsAndCards';
import Budgeting from '@/pages/Budgeting';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';
import LandingPage from '@/pages/LandingPage';
import AboutUs from '@/pages/AboutUs';
import Blog from '@/pages/Blog';
import KpegeCompleteGuide from '@/pages/KpegeCompleteGuide';
import WhyMoneyManagementMatters from '@/pages/WhyMoneyManagementMatters';
import Unsubscribe from '@/pages/Unsubscribe';
import './App.css';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { Onboarding } from '@/components/onboarding/Onboarding';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useEffect } from 'react';
import { TopOffsetProvider } from '@/contexts/TopOffsetContext';

// Initialize client environment variables with error handling
try {
  initializeClientEnvironment();
  console.log('Client environment initialized successfully');
} catch (error) {
  console.error('Failed to initialize client environment:', error);
}

// Initialize error reporting service
try {
  // This will start capturing global errors
  errorNotificationService.getInstance();
  console.log('Error notification service initialized successfully');
} catch (error) {
  console.error('Failed to initialize error notification service:', error);
}

// Error boundary wrapper for analytics components
const SafeAnalytics = () => {
  try {
    return <Analytics />;
  } catch (error) {
    console.warn('[Analytics] Failed to load - likely blocked by ad blocker:', error);
    return null;
  }
};

const SafeSpeedInsights = () => {
  try {
    return <SpeedInsights />;
  } catch (error) {
    console.warn('[Speed Insights] Failed to load - likely blocked by ad blocker:', error);
    return null;
  }
};

// Component to conditionally show onboarding for authenticated users only
const OnboardingWrapper = () => {
  const { user } = useAuth();
  const { hasCompletedOnboarding } = useOnboarding();
  
  // Only show onboarding if user is authenticated and hasn't completed it
  if (user && !hasCompletedOnboarding) {
    return <Onboarding />;
  }
  
  return null;
};

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {/* Show onboarding for authenticated users who haven't completed it */}
      <OnboardingWrapper />
      {children}
    </>
  );
}

// Separate component for Mixpanel tracking that uses the auth context
function MixpanelInit() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      MixpanelService.identify(user.id);
      MixpanelService.setUserProfile({
        $email: user.email,
        $name: user.user_metadata?.full_name || '',
      });
      MixpanelService.trackEvent('App Launched', { 
        loggedIn: true 
      });
    } else {
      MixpanelService.trackEvent('App Launched', { 
        loggedIn: false 
      });
    }
  }, [user]);

  return null;
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <TopOffsetProvider>
          <AuthProvider>
            {/* MixpanelInit must be inside AuthProvider to use useAuth hook */}
            <MixpanelInit />
            <CurrencyProvider>
              <OnboardingProvider>
                <NotificationProvider>
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/test-reset-password" element={<TestResetPassword />} />
                    <Route path="/about" element={<AboutUs />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/kpege-complete-guide" element={<KpegeCompleteGuide />} />
                    <Route path="/blog/why-money-management-matters" element={<WhyMoneyManagementMatters />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
                    <Route path="/subscriptions" element={<PrivateRoute><Subscriptions /></PrivateRoute>} />
                    <Route path="/accounts" element={<PrivateRoute><AccountsAndCards /></PrivateRoute>} />
                    <Route path="/budgeting" element={<PrivateRoute><Budgeting /></PrivateRoute>} />
                    <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Toaster />
                  <SafeAnalytics />
                  <SafeSpeedInsights />
                </NotificationProvider>
              </OnboardingProvider>
            </CurrencyProvider>
          </AuthProvider>
        </TopOffsetProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
