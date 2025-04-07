import { useState, useEffect } from "react";
// Remove navigation imports if Link is used or navigate isn't needed
// import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountsList from "@/components/accounts/AccountsList";
import CardsList from "@/components/cards/CardsList";
// Remove useAuth import
// import { useAuth } from "@/contexts/AuthContext";
// Remove useToast if not used for other purposes
// import { useToast } from "@/hooks/use-toast"; 

const AccountsAndCards = () => {
  const [activeTab, setActiveTab] = useState("accounts");
  // Remove useAuth hook
  // const { user } = useAuth();
  // const navigate = useNavigate();
  // const { toast } = useToast();

  // REMOVE useEffect for authentication check - Loader handles this
  /*
  useEffect(() => {
    if (!user) {
      toast({ ... });
      navigate("/login");
    }
  }, [user, navigate, toast]);
  */

  // Component now assumes user is authenticated because the loader ensures it
  return (
    // DashboardLayout is now applied by the route component
    // <DashboardLayout> 
      <div className="flex flex-col gap-8 container mx-auto px-4 pb-8 max-w-7xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Accounts & Cards</h1>
          <p className="text-muted-foreground">
            Manage your bank accounts and cards to better track your finances.
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
          </TabsList>
          <TabsContent value="accounts" className="mt-6">
            <AccountsList />
          </TabsContent>
          <TabsContent value="cards" className="mt-6">
            <CardsList />
          </TabsContent>
        </Tabs>
      </div>
    // </DashboardLayout>
  );
};

export default AccountsAndCards;
