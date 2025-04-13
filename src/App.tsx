import { Routes, Route } from 'react-router-dom';

// Import route protection components
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

// Import pages
import Index from '@/pages/Index';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConfirmEmail from './pages/ConfirmEmail';
import Transactions from './pages/Transactions';
import Insights from './pages/Insights';
import AccountsAndCards from './pages/AccountsAndCards';
import Subscriptions from './pages/Subscriptions';
import NotFound from './pages/NotFound';

// Analytics components
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
  // No need for inline route components as we now have dedicated components

  return (
    <>
      <Routes>
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
        <Route path="/accounts" element={<ProtectedRoute><AccountsAndCards /></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
        
        {/* Public Routes */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
        <Route path="/confirm-email" element={<PublicRoute><ConfirmEmail /></PublicRoute>} />
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Analytics */}
      <Analytics />
      <SpeedInsights />
    </>
  );
}

export default App;