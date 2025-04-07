import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { useLocation } from 'react-router-dom';

interface DashboardHeaderProps {
  firstName?: string | null;
  userEmail?: string | null;
}

// List of greeting templates
const GREETING_TEMPLATES = [
  "Hope you're having a great day, {name}!",
  "Good to see you again, {name}!",
  "Welcome back, {name}!",
  "Hello {name}, ready to manage your finances?",
  "Hey {name}, let's check your dashboard!",
  "Hi {name}, what's new?",
  "Glad you're here, {name}!",
];

const DashboardHeader = ({ firstName, userEmail }: DashboardHeaderProps) => {
  const [greeting, setGreeting] = useState('');
  const [isLoadingGreeting, setIsLoadingGreeting] = useState(!firstName);
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const location = useLocation();

  // Function to get page title from path
  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
        return 'Dashboard';
      case '/transactions':
        return 'Transactions';
      case '/subscriptions':
        return 'Subscriptions';
      case '/insights':
        return 'Insights';
      case '/settings':
        return 'Settings';
      // Add other paths as needed
      default:
        // Attempt to capitalize the path segment
        const pathSegment = pathname.substring(1).split('/')[0];
        return pathSegment
          ? pathSegment.charAt(0).toUpperCase() + pathsegment.slice(1)
          : 'Page';
    }
  };

  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    if (firstName) {
      const randomIndex = Math.floor(Math.random() * GREETING_TEMPLATES.length);
      const selectedTemplate = GREETING_TEMPLATES[randomIndex];
      setGreeting(selectedTemplate.replace('{name}', firstName));
      setIsLoadingGreeting(false);
    } else {
      // Fallback if no first name is provided
      setGreeting("Welcome!"); 
      setIsLoadingGreeting(false);
    }
  }, [firstName]);

  return (
    <>
      <div className="flex items-center">
        {isMobile && (
          <Button
            variant="outline"
            size="icon"
            className="mr-2"
            onClick={toggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-xl font-semibold">{pageTitle}</h1>
          {/* Display greeting */} 
          <p className="text-sm text-muted-foreground">
            {isLoadingGreeting ? 'Loading...' : greeting}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <CurrencySelector />
        {/* Logout button is in Sidebar, no need for signOut here */}
      </div>
    </>
  );
};

export default DashboardHeader;
