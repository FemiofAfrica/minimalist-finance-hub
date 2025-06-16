import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  LayoutDashboard, 
  LineChart, 
  CreditCard as CreditCardIcon, 
  Settings, 
  LogOut, 
  BookOpenText,
  Wallet,
  PiggyBank,
  Moon,
  Sun,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import AddTransactionModal from "@/components/AddTransactionModal";

const links = [
  { 
    href: "/dashboard", 
    label: "Dashboard", 
    icon: <LayoutDashboard className="mr-2 h-4 w-4" />
  },
  { 
    href: "/transactions", 
    label: "Transactions", 
    icon: <LineChart className="mr-2 h-4 w-4" />
  },
  { 
    href: "/subscriptions", 
    label: "Subscriptions", 
    icon: <CreditCardIcon className="mr-2 h-4 w-4" />
  },
  { 
    href: "/accounts", 
    label: "Accounts & Cards", 
    icon: <Wallet className="mr-2 h-4 w-4" />
  },
  // Temporarily hidden for future deployment
  // { 
  //   href: "/budgeting", 
  //   label: "Budgeting", 
  //   icon: <PiggyBank className="mr-2 h-4 w-4" />
  // },
  { 
    href: "/reports", 
    label: "Reports", 
    icon: <BookOpenText className="mr-2 h-4 w-4" />
  },
  { 
    href: "/settings", 
    label: "Settings", 
    icon: <Settings className="mr-2 h-4 w-4" />
  }
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [addTransactionModalOpen, setAddTransactionModalOpen] = useState(false);
  
  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      navigate('/login'); // Redirect to login page after successful logout
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Issue",
        description: "There was a problem logging out. You've been redirected to the login page.",
        variant: "destructive",
      });
      // Even if there's an error, redirect to login
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  const navigation = (
    <div className="flex h-full flex-col">
      <div className="flex items-end h-[57px] px-4 border-b border-slate-200 dark:border-neutral-700">
        <Link to="/dashboard" className="flex items-end gap-2 text-slate-900 dark:text-white mb-2">
          <img
            src={theme === 'dark' ? '/kpege-logo-light.svg' : '/kpege-logo.svg'}
            alt="Kpege Logo"
            className="h-10 w-auto bg-white dark:bg-transparent rounded-xl p-1"
            style={{ maxHeight: 48 }}
          />
        </Link>
      </div>
      {isMobile && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-neutral-700">
        </div>
      )}
      <div className={cn("flex flex-1 flex-col overflow-hidden", isMobile && "min-h-0")}>
        {/* Prominent Add Transaction Button */}
        <div className="px-4 py-4 border-b border-slate-200 dark:border-neutral-700">
          <Button 
            onClick={() => setAddTransactionModalOpen(true)}
            className={cn(
              "w-full justify-center bg-primary hover:bg-primary/90 text-primary-foreground",
              isMobile ? "h-10 text-base py-2 rounded-lg" : "h-9 text-sm py-2 rounded-md"
            )}
            size={isMobile ? "default" : "sm"}
          >
            <Plus className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
            <span className="font-semibold">Add Transaction</span>
          </Button>
        </div>
        <ScrollArea className={cn("flex-1 px-6", isMobile ? "pb-2" : "pb-4")}>
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Button
                key={link.href}
                variant={location.pathname === link.href ? "secondary" : "ghost"}
                className={cn(
                  "justify-start pl-2 hover:bg-primary hover:text-primary-foreground",
                  isMobile && "h-12 text-base py-6 my-2 rounded-md" // Taller buttons on mobile with better spacing and rounded corners
                )}
                asChild
              >
                <Link to={link.href}>
                  {link.icon}
                  <span className={cn(isMobile && "ml-2 text-base")}>{link.label}</span>
                </Link>
              </Button>
            ))}
          </nav>
        </ScrollArea>
        {/* Bottom section with theme toggle and logout - ensure it's always visible */}
        <div className={cn("border-t border-border p-3 mt-auto flex-shrink-0", isMobile && "mt-auto p-6 pt-4")}>
          <div className="flex flex-col gap-2">
            <Button 
              className={cn(
                "w-full justify-start",
                isMobile && "h-12 text-base py-6 my-2 rounded-md" // Match the styling of navigation buttons
              )}
              variant="ghost" 
              onClick={toggleTheme} 
              size={isMobile ? "default" : "sm"}
            >
              {theme === "light" ? (
                <>
                  <Moon className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")} />
                  <span className={cn(isMobile && "ml-2")}>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")} />
                  <span className={cn(isMobile && "ml-2")}>Light Mode</span>
                </>
              )}
            </Button>
            <Button 
              className={cn(
                "w-full justify-start",
                isMobile && "h-12 text-base py-6 my-2 rounded-md" // Match the styling of navigation buttons
              )}
              variant="ghost" 
              onClick={handleSignOut} 
              disabled={isLoggingOut}
              size={isMobile ? "default" : "sm"}
            >
              <LogOut className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")} />
              <span className={cn(isMobile && "ml-2")}>{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  
  const handleTransactionAdded = () => {
    // Optionally trigger any refresh or notification
    toast({
      title: "Success",
      description: "Transaction added successfully!",
    });
  };

  return (
    <>
      <div style={{ 
        position: 'relative', 
        zIndex: 40 
      }}>
        <Sidebar className="top-offset">
          {navigation}
        </Sidebar>
      </div>
      
      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={addTransactionModalOpen}
        onOpenChange={setAddTransactionModalOpen}
        onTransactionAdded={handleTransactionAdded}
      />
    </>
  );
}
