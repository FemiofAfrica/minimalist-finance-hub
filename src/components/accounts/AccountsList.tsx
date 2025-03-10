
import { useState, useEffect } from "react";
import { Account } from "@/types/account";
import { fetchAccounts } from "@/services/accountService";
import AccountCard from "./AccountCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AccountDialog from "./AccountDialog";

const AccountsList = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const { toast } = useToast();

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await fetchAccounts();
      setAccounts(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setIsDialogOpen(true);
  };

  const handleDeleteAccount = (accountId: string) => {
    // Will be implemented in AccountDialog.tsx
  };

  const handleViewCards = (accountId: string) => {
    // Navigate to cards page for this account
  };

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (refresh: boolean = false) => {
    setIsDialogOpen(false);
    if (refresh) {
      loadAccounts();
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Accounts</h2>
        <Button onClick={handleAddAccount} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>
      
      {accounts.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <h3 className="text-lg font-medium mb-2">No accounts found</h3>
          <p className="text-muted-foreground mb-4">Add your first account to get started</p>
          <Button onClick={handleAddAccount} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          {accounts.map((account) => (
            <AccountCard
              key={account.account_id}
              account={account}
              onEdit={handleEditAccount}
              onDelete={handleDeleteAccount}
              onViewCards={handleViewCards}
            />
          ))}
        </div>
      )}
      
      <AccountDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        account={selectedAccount}
      />
    </div>
  );
};

export default AccountsList;
