import { Link, useLocation } from "react-router-dom";
import { LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { sidebarLinks } from "@/config/navigation";



export function DashboardSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  
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
            {sidebarLinks.map((link) => (
              <Button
                key={link.href}
                variant={location.pathname === link.href ? "secondary" : "ghost"}
                className="justify-start pl-2 hover:bg-primary hover:text-primary-foreground"
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
    </div>
  );
  
  return (
    <Sidebar>
      {navigation}
    </Sidebar>
  );
}
