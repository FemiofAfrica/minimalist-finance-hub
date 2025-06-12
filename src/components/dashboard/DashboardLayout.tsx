import { ReactNode, useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { SupportBanner, BANNER_HEIGHT } from "@/components/ui/SupportBanner";
import { InstallPrompt } from "@/components/InstallPrompt";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
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
      className={`flex flex-col min-h-screen w-full bg-slate-50 dark:bg-neutral-950`}
      style={{ 
        paddingTop: isBannerVisible ? `${BANNER_HEIGHT}px` : '0',
        transition: 'padding-top 0.2s ease-in-out'
      }}
    >
      {/* Banner will be fixed at the top of the viewport */}
      <SupportBanner />
      
      {/* Main content with sidebar */}
      <SidebarProvider>
        <div className="flex flex-1 w-full">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col w-full overflow-x-hidden">
            <header className="flex h-[57px] w-full items-center justify-between border-b bg-background px-3 md:px-4 shadow-sm">
              <DashboardHeader userEmail={user?.email} />
            </header>
            <main className="flex-1 p-2 md:p-4 w-full max-w-full">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
      
      {/* Install prompt for mobile app functionality */}
      <InstallPrompt />
    </div>
  );
};

export default DashboardLayout;
