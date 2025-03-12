
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CurrencySelector } from "@/components/CurrencySelector";

interface DashboardHeaderProps {
  userEmail?: string | null;
}

const DashboardHeader = ({ userEmail }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  
  return (
    <header className="flex items-center justify-start gap-4">
      <div className="flex-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-left">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-left">Welcome back, {userEmail}</p>
      </div>
      <CurrencySelector />
    </header>
  );
};

export default DashboardHeader;
