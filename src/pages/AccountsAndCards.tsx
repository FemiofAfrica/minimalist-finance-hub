import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountsList from "@/components/accounts/AccountsList";
import CardsList from "@/components/cards/CardsList";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Building, CreditCard } from "lucide-react";
import AccountDialog from "@/components/accounts/AccountDialog";

const AccountsAndCards = () => {
  const [activeTab, setActiveTab] = useState("accounts");
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocation();

  // This effect runs when the location changes
  useEffect(() => {
    // Extract the query parameters from the URL
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    const accountId = searchParams.get("accountId");
    
    // Update active tab if specified in URL
    if (tabParam === "cards" || tabParam === "accounts") {
      setActiveTab(tabParam);
    }
    
    // Update current account ID
    setCurrentAccountId(accountId);
    
    // Log for debugging
    console.log(`URL changed: tab=${tabParam}, accountId=${accountId}`);
    
  }, [location.search]);

  // This effect handles user authentication
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to view accounts and cards",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [user, navigate, toast]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Preserve the accountId when changing tabs
    const url = new URL(window.location.toString());
    url.searchParams.set("tab", value);
    
    // If we're switching to cards tab and have an accountId, keep it
    // If we're switching to accounts tab, remove the accountId
    if (value === "accounts") {
      url.searchParams.delete("accountId");
    }
    
    window.history.pushState({}, "", url.toString());
  };

  const handleAccountDialogClose = (refresh: boolean = false) => {
    setIsAccountDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 md:mb-8">
            <TabsTrigger value="accounts" className="flex items-center gap-2 text-sm md:text-base">
              <Building className="h-4 w-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2 text-sm md:text-base">
              <CreditCard className="h-4 w-4" />
              Cards
            </TabsTrigger>
          </TabsList>
          <TabsContent value="accounts" className="mt-0">
            <AccountsList />
          </TabsContent>
          <TabsContent value="cards" className="mt-0">
            {/* Key prop forces the component to re-render when accountId changes */}
            <CardsList 
              key={`cards-list-${currentAccountId || 'all'}`} 
              accountId={currentAccountId || undefined} 
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Account Dialog */}
      <AccountDialog
        isOpen={isAccountDialogOpen}
        onClose={handleAccountDialogClose}
        account={null}
      />
    </DashboardLayout>
  );
};

export default AccountsAndCards;
