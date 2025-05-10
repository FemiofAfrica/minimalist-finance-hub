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
  Sun
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

const links = [
  { 
    href: "/", 
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
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2">
          {/* Remove the logo image */}
          {/* <img src="/assets/logo.svg" alt="SayFin Logo" className="h-6 w-6" /> */}
          <span className="text-xl font-semibold">SayFin</span>
        </Link>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-6">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Button
                key={link.href}
                variant={location.pathname === link.href ? "secondary" : "ghost"}
                className={cn(
                  "justify-start pl-2 hover:bg-primary hover:text-primary-foreground",
                  isMobile && "h-12 text-base py-6 my-1" // Taller buttons on mobile for easier tapping
                )}
                asChild
              >
                <Link to={link.href}>
                  {link.icon}
                  {link.label}
                </Link>
              </Button>
            ))}
          </nav>
        </ScrollArea>
        <div className={cn("border-t border-border p-3", isMobile && "mt-2")}>
          <div className="flex flex-col gap-2">
            <Button 
              className={cn(
                "w-full justify-start",
                isMobile && "h-12 text-base py-6" // Taller buttons on mobile for easier tapping
              )}
              variant="ghost" 
              onClick={toggleTheme} 
              size={isMobile ? "default" : "sm"}
            >
              {theme === "light" ? (
                <>
                  <Moon className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")} />
                  Dark Mode
                </>
              ) : (
                <>
                  <Sun className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")} />
                  Light Mode
                </>
              )}
            </Button>
            <Button 
              className={cn(
                "w-full justify-start",
                isMobile && "h-12 text-base py-6" // Taller buttons on mobile for easier tapping
              )}
              variant="ghost" 
              onClick={handleSignOut} 
              disabled={isLoggingOut}
              size={isMobile ? "default" : "sm"}
            >
              <LogOut className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")} />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <Sidebar>
      {navigation}
    </Sidebar>
  );
}
