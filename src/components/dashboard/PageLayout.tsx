import { ReactNode } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";

interface PageLayoutProps {
  children: ReactNode;
}

const PageLayout = ({ children }: PageLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-neutral-950">
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