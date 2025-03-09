
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  LineChart, 
  CreditCard as CreditCardIcon, 
  Settings, 
  LogOut, 
  BookOpenText,
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useMobile } from "@/hooks/use-mobile";

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
  const { isMobile } = useMobile();
  
  const navigation = (
    <div className="flex h-full flex-col">
      <div className="flex-1">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            <span className="text-xl font-semibold">Finance Tracker</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-3">
          <nav className="flex flex-col gap-1">
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
      </div>
      <div className="border-t border-border p-3">
        <Button className="w-full justify-start" variant="ghost" onClick={signOut} size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
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
            <SheetTitle>Finance Tracker</SheetTitle>
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
            <Button className="w-full justify-start" variant="ghost" onClick={signOut} size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  
  return (
    <div className="hidden border-r bg-background w-64 md:flex flex-col">
      {navigation}
    </div>
  );
}
