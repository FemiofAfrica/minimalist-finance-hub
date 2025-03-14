
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
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-lg text-slate-700 dark:text-slate-300 text-left">Welcome back, {userEmail}</p>
      </div>
      <CurrencySelector />
    </header>
  );
};

export default DashboardHeader;
