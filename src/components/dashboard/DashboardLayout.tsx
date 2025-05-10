import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50 dark:bg-neutral-950">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col w-full overflow-x-hidden">
          <header className="sticky top-0 z-10 flex h-[57px] w-full items-center justify-between border-b bg-background px-3 md:px-4 shadow-sm">
            <DashboardHeader userEmail={user?.email} />
          </header>
          <main className="flex-1 p-2 md:p-4 w-full max-w-full">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
