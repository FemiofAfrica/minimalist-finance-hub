
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";

interface DashboardHeaderProps {
  userEmail?: string | null;
}

const DashboardHeader = ({ userEmail }: DashboardHeaderProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="flex items-center justify-start gap-4">
      <div className="flex-1">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 text-left">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-left">Welcome back, {userEmail}</p>
      </div>
      <Button variant="outline" onClick={handleSignOut}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </header>
  );
};

export default DashboardHeader;
