
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
      <div className="flex flex-col gap-4 mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Accounts & Cards</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">
          Manage your bank accounts and cards to better track your finances.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/50 p-1 text-slate-500 dark:text-slate-400">
          <TabsTrigger 
            value="accounts"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
          >
            Accounts
          </TabsTrigger>
          <TabsTrigger 
            value="cards"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
          >
            Cards
          </TabsTrigger>
        </TabsList>
        <TabsContent value="accounts" className="mt-6">
          <AccountsList />
        </TabsContent>
        <TabsContent value="cards" className="mt-6">
          <CardsList />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AccountsAndCards;
