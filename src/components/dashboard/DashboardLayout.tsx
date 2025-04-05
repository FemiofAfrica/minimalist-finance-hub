import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50 dark:bg-neutral-950">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col max-w-4xl">
          <header className="sticky top-0 z-10 flex h-[57px] w-full items-center justify-between border-b bg-background px-4">
              <DashboardHeader userEmail={user?.email} />
          </header>
          <main className="flex-1 p-2 md:p-4">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
