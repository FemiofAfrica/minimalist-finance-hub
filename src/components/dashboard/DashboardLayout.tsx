
import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { AuthProvider } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <AuthProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-slate-50 dark:bg-neutral-950">
          <DashboardSidebar />
        <main className="flex-1 p-6 flex flex-col md:ml-64">
          <div className="max-w-7xl mx-auto space-y-6 flex-1 w-full">
            {children}
          </div>
        </main>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
};

export default DashboardLayout;
