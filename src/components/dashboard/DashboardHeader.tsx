import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CurrencySelector } from "@/components/CurrencySelector";
import { supabase } from '@/integrations/supabase/client';
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { useLocation } from 'react-router-dom';

interface DashboardHeaderProps {
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

const DashboardHeader = ({ userEmail }: DashboardHeaderProps) => {
  const { user, signOut } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [isLoadingGreeting, setIsLoadingGreeting] = useState(true);
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
      case '/reports':
        return 'Reports';
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
    const generateGreeting = async () => {
      if (!user) {
        setGreeting('Welcome!');
        setIsLoadingGreeting(false);
        return;
      }

      setIsLoadingGreeting(true);
      let nameToUse = 'there';

      try {
        console.log('Fetching profile for user:', user.id);
        // First try to get name from user metadata
        if (user.user_metadata?.first_name) {
          console.log('Found first_name in user metadata:', user.user_metadata.first_name);
          nameToUse = user.user_metadata.first_name;
        } else {
          // If not in metadata, try profiles table
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', user.id)
            .maybeSingle();

          console.log('Profile data:', profile);
          console.log('Profile error:', error);

          if (error) {
            console.error('Error fetching profile for greeting:', error);
            nameToUse = user.email?.split('@')[0] || 'there';
          } else if (profile && profile.first_name) {
            console.log('Using first_name from profile:', profile.first_name);
            nameToUse = profile.first_name;
          } else {
            console.log('No profile or first_name found, using email fallback');
            nameToUse = user.email?.split('@')[0] || 'there';
          }
        }
      } catch (fetchError) {
        console.error('Exception fetching profile:', fetchError);
        nameToUse = user.email?.split('@')[0] || 'there';
      }

      const randomIndex = Math.floor(Math.random() * GREETING_TEMPLATES.length);
      const selectedTemplate = GREETING_TEMPLATES[randomIndex];
      console.log('Selected name for greeting:', nameToUse);

      const formattedGreeting = selectedTemplate.replace('{name}', nameToUse);
      setGreeting(formattedGreeting);
      setIsLoadingGreeting(false);
    };

    generateGreeting();
  }, [user]);

  return (
    <>
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleSidebar}
          className="shrink-0 mr-4"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      )}
      {/* Main Header Content */}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-50 text-left truncate">
          {pageTitle}
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 text-left truncate">
          {isLoadingGreeting ? 'Loading greeting...' : greeting}
        </p>
      </div>
      <CurrencySelector />
    </>
  );
};

export default DashboardHeader;
