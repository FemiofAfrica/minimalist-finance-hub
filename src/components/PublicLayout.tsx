import React, { ReactNode, useState, useEffect } from 'react';
import { SupportBanner } from '@/components/ui/SupportBanner';
import { useLocation } from 'react-router-dom';

interface PublicLayoutProps {
  children: ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  const location = useLocation();
  
  // Check if current page is an authentication page
  const isAuthPage = 
    location.pathname.includes('/login') || 
    location.pathname.includes('/signup') || 
    location.pathname.includes('/reset-password');
  
  // Listen for banner visibility changes
  useEffect(() => {
    // Don't show banner on auth pages
    if (isAuthPage) {
      setIsBannerVisible(false);
      return;
    }
    
    // Initialize from localStorage if available
    const storedVisibility = localStorage.getItem('support-banner-visible');
    if (storedVisibility !== null) {
      setIsBannerVisible(storedVisibility === 'true');
    }
    
    // Listen for visibility change events
    const handleVisibilityChange = (e: CustomEvent<{visible: boolean}>) => {
      setIsBannerVisible(e.detail.visible);
    };
    
    document.addEventListener('banner-visibility-change', 
      handleVisibilityChange as EventListener);
    
    return () => {
      document.removeEventListener('banner-visibility-change', 
        handleVisibilityChange as EventListener);
    };
  }, [isAuthPage, location.pathname]);

  return (
    <div 
      className={`min-h-screen flex flex-col ${isAuthPage ? 'safe-top' : 'top-offset'}`}
    >
      {!isAuthPage && <SupportBanner />}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

export default PublicLayout; 