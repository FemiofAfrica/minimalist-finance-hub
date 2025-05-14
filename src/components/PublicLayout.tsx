import React, { ReactNode, useState, useEffect } from 'react';
import { SupportBanner, BANNER_HEIGHT } from '@/components/ui/SupportBanner';

interface PublicLayoutProps {
  children: ReactNode;
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  
  // Listen for banner visibility changes
  useEffect(() => {
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
  }, []);

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        paddingTop: isBannerVisible ? `${BANNER_HEIGHT}px` : '0',
        transition: 'padding-top 0.2s ease-in-out'
      }}
    >
      <SupportBanner />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

export default PublicLayout; 