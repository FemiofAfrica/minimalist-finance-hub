
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import Login from '@/pages/Login';
import Index from '@/pages/Index';
import Transactions from '@/pages/Transactions';
import Subscriptions from '@/pages/Subscriptions';
import AccountsAndCards from '@/pages/AccountsAndCards';
import Budgeting from '@/pages/Budgeting';
import NotFound from '@/pages/NotFound';
import LandingPage from '@/pages/LandingPage';
import './App.css';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <ThemeProvider>
          <Router>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Index />
                </PrivateRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <PrivateRoute>
                  <Transactions />
                </PrivateRoute>
              }
            />
            <Route
              path="/subscriptions"
              element={
                <PrivateRoute>
                  <Subscriptions />
                </PrivateRoute>
              }
            />
            <Route
              path="/budgeting"
              element={
                <PrivateRoute>
                  <Budgeting />
                </PrivateRoute>
              }
            />
            {/* Accounts & Cards functionality temporarily hidden from public access */}
            {/* 
            <Route
              path="/accounts"
              element={
                <PrivateRoute>
                  <AccountsAndCards />
                </PrivateRoute>
              }
            /> 
            */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </ThemeProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
