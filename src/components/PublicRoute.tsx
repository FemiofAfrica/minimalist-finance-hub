import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts';

interface PublicRouteProps {
  children: ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // If still loading auth state, show a loading spinner
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#004D40]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    </div>;
  }

  // If authenticated, redirect to home page
  // Use the 'from' location if available (user was redirected to login from a protected route)
  if (user) {
    const state = location.state as { from?: Location };
    const from = state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  // If not authenticated, render the public component
  return <>{children}</>;
};

export default PublicRoute;