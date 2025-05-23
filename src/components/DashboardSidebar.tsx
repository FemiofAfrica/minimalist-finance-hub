import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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
import { BANNER_HEIGHT } from "@/components/ui/SupportBanner";

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
  const [isBannerVisible, setIsBannerVisible] = useState(true);
  
  // Listen for banner visibility changes
  useEffect(() => {
    // Initialize from localStorage if available
    const storedVisibility = localStorage.getItem('support-banner-visible');
    if (storedVisibility !== null) {
      setIsBannerVisible(storedVisibility === 'true');
    }
    
    // Listen for visibility change events
    const handleVisibilityChange = (e: CustomEvent<{visible: boolean}>) => {
      setIsBannerVisible(e.detail.visible);
    };
    
    document.addEventListener('banner-visibility-change', 
      handleVisibilityChange as EventListener);
    
    return () => {
      document.removeEventListener('banner-visibility-change', 
        handleVisibilityChange as EventListener);
    };
  }, []);
  
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
      <div className="flex items-center p-4 border-b border-slate-200 dark:border-neutral-700">
        <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white">
          {/* <img src="/assets/logo.svg" alt="EvryFin Logo" className="h-6 w-6" /> */}
          <span className="text-xl font-semibold">EvryFin</span>
        </Link>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-6 pb-4">
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
        <div className={cn("border-t border-border p-3 mt-auto", isMobile && "mt-2 p-6 pt-4")}>
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
  
  return (
    <div style={{ 
      position: 'relative', 
      zIndex: 40 
    }}>
      <Sidebar>
        {navigation}
      </Sidebar>
      {/* Add CSS to adjust sidebar position */}
      <style jsx="true" global="true">{`
        /* For Mobile Sidebar (SheetContent) */
        [data-sidebar="sidebar"][data-mobile="true"],
        /* For Desktop Sidebar (the fixed panel inside the data-state container) */
        div[data-state][data-variant="sidebar"] > div.fixed.inset-y-0 {
          top: ${isBannerVisible ? `${BANNER_HEIGHT}px` : '0'} !important;
          height: ${isBannerVisible ? `calc(100svh - ${BANNER_HEIGHT}px)` : '100svh'} !important;
          transition: top 0.2s ease-in-out, height 0.2s ease-in-out !important;
        }
      `}</style>
    </div>
  );
}
