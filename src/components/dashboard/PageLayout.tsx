import { ReactNode } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-neutral-900 dark:to-neutral-950">
      <DashboardSidebar />
      <main className="flex-1 p-6 flex flex-col md:ml-64">
        <div className="max-w-7xl mx-auto space-y-6 flex-1 w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PageLayout;