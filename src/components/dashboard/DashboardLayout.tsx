
import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-b from-emerald-50 to-white dark:from-neutral-900 dark:to-neutral-950">
        <DashboardSidebar />
        <main className="flex-1 p-6 flex flex-col md:ml-64">
          <div className="max-w-7xl mx-auto space-y-6 flex-1 w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
