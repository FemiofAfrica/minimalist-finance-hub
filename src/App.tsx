
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Toaster } from '@/components/ui/toaster';
import Login from '@/pages/Login';
import Index from '@/pages/Index';
import Transactions from '@/pages/Transactions';
import Subscriptions from '@/pages/Subscriptions';
import AccountsAndCards from '@/pages/AccountsAndCards';
import NotFound from '@/pages/NotFound';
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
        <Router>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
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
            path="/accounts"
            element={
              <PrivateRoute>
                <AccountsAndCards />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
