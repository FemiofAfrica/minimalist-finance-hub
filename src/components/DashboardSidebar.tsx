
import { Home, ChevronDown, PieChart, LogOut, Menu, ArrowRight, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import AddTransactionDialog from "@/components/AddTransactionDialog";

export default function DashboardSidebar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/" className="flex items-center text-lg font-bold">
          FinTrack <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
      <div className="px-4 py-2">
        <AddTransactionDialog />
      </div>
      <div className="p-4 pt-0">
        <Separator className="my-2" />
        <nav className="grid gap-1">
          <Link to="/">
            <Button
              variant={location.pathname === "/" ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link to="/transactions">
            <Button
              variant={location.pathname === "/transactions" ? "secondary" : "ghost"}
              className="w-full justify-start"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Transactions
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-1">
            <PieChart className="mr-2 h-4 w-4" />
            Reports
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
          <Separator className="my-2" />
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </nav>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute left-4 top-4 lg:hidden">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <ScrollArea className="h-full">
            {sidebarContent}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden border-r bg-background lg:block">
      <div className="w-72">
        <ScrollArea className="h-screen">
          {sidebarContent}
        </ScrollArea>
      </div>
    </div>
  );
}
