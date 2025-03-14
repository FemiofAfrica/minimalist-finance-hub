import { Link, useLocation } from "react-router-dom";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";

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
  /* Accounts & Cards functionality temporarily hidden from public access
  { 
    href: "/accounts", 
    label: "Accounts & Cards", 
    icon: <Wallet className="mr-2 h-4 w-4" />
  },
  */
  { 
    href: "/budgeting", 
    label: "Budgeting", 
    icon: <PiggyBank className="mr-2 h-4 w-4" />
  },
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
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  
  const navigation = (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Wallet className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">MoneyWise</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-6">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Button
                key={link.href}
                variant={location.pathname === link.href ? "secondary" : "ghost"}
                className="justify-start pl-2"
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
      </div>
      <div className="border-t border-border p-3">
        <div className="flex flex-col gap-2">
          <Button 
            className="w-full justify-start" 
            variant="ghost" 
            onClick={toggleTheme} 
            size="sm"
          >
            {theme === "light" ? (
              <>
                <Moon className="mr-2 h-4 w-4" />
                Dark Mode
              </>
            ) : (
              <>
                <Sun className="mr-2 h-4 w-4" />
                Light Mode
              </>
            )}
          </Button>
          <Button className="w-full justify-start" variant="ghost" onClick={signOut} size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
  
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button size="sm" variant="outline">
            Menu
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SheetHeader className="p-6 text-left">
            <SheetTitle className="text-2xl tracking-tight">MoneyWise</SheetTitle>
          </SheetHeader>
          <Separator />
          <ScrollArea className="h-[calc(100vh-10rem)]">
            <nav className="flex flex-col gap-1 p-4">
              {links.map((link) => (
                <Button
                  key={link.href}
                  variant={location.pathname === link.href ? "secondary" : "ghost"}
                  className="justify-start"
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
          <Separator />
          <div className="p-4">
            <div className="flex flex-col gap-2">
              <Button 
                className="w-full justify-start" 
                variant="ghost" 
                onClick={toggleTheme} 
                size="sm"
              >
                {theme === "light" ? (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Light Mode
                  </>
                )}
              </Button>
              <Button className="w-full justify-start" variant="ghost" onClick={signOut} size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <div className="hidden border-r bg-background w-64 h-[calc(100vh-20px)] overflow-hidden md:flex flex-col fixed top-0 left-0">
      {navigation}
    </div>
  );
}
