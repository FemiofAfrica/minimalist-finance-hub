
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountsList from "@/components/accounts/AccountsList";
import CardsList from "@/components/cards/CardsList";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const AccountsAndCards = () => {
  const [activeTab, setActiveTab] = useState("accounts");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 container mx-auto pb-8">
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
    </DashboardLayout>
  );
};

export default AccountsAndCards;
