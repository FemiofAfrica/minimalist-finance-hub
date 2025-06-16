import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { SupportBanner } from "@/components/ui/SupportBanner";
import { InstallPrompt } from "@/components/InstallPrompt";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  return (
    <div 
      className="dashboard-layout flex flex-col min-h-screen w-full bg-slate-50 dark:bg-neutral-950 top-offset"
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
