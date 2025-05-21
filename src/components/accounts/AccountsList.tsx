import { useState, useEffect } from "react";
import { Account } from "@/types/account";
import AccountCard from "./AccountCard";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AccountDialog from "./AccountDialog";
import TransferDialog from "./TransferDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { deleteAccount } from "@/services/accountService";
import { useAccountStore } from "@/stores/accountStore";

const AccountsList = () => {
  // Account store for global state
  const { accounts, isLoading, refreshAccounts, fetchBalances } = useAccountStore();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Load accounts on mount and set up polling for balance updates
  useEffect(() => {
    // Initial load
    refreshAccounts();
    
    // Set up polling for balances - every 2 seconds
    const balanceInterval = setInterval(() => {
      fetchBalances();
    }, 2000);
    
    // Set up event listeners
    const handleRefresh = () => {
      console.log("Refresh event received in AccountsList - refreshing accounts");
      refreshAccounts();
    };
    
    document.addEventListener('refresh', handleRefresh);
    document.addEventListener('refresh-transactions', handleRefresh);
    
    return () => {
      clearInterval(balanceInterval);
      document.removeEventListener('refresh', handleRefresh);
      document.removeEventListener('refresh-transactions', handleRefresh);
    };
  }, [refreshAccounts, fetchBalances]);

  const handleEditAccount = (account: Account) => {
    console.log("Editing account:", account);
    setSelectedAccount(account);
    setIsDialogOpen(true);
  };

  const handleDeleteAccount = (accountId: string) => {
    console.log("Delete requested for account:", accountId);
    // Set the account ID to delete and open the confirmation dialog
    setAccountToDelete(accountId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log(`Deleting account ${accountToDelete}`);
      await deleteAccount(accountToDelete);
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      // Refresh accounts list after deletion
      refreshAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleViewCards = (accountId: string) => {
    // Navigate to cards tab with the account ID
    console.log(`Navigating to cards for account ${accountId}`);
    navigate(`/accounts?tab=cards&accountId=${accountId}`);
  };

  const handleAddAccount = () => {
    console.log("Adding new account");
    setSelectedAccount(null);
    setIsDialogOpen(true);
  };

  const handleTransfer = () => {
    console.log("Opening transfer dialog");
    setIsTransferDialogOpen(true);
  };

  const handleDialogClose = (refresh: boolean = false) => {
    setIsDialogOpen(false);
    if (refresh) {
      console.log("Refreshing accounts after dialog closed");
      refreshAccounts();
    }
  };

  const handleTransferDialogClose = (refresh: boolean = false) => {
    setIsTransferDialogOpen(false);
    if (refresh) {
      console.log("Refreshing accounts after transfer");
      refreshAccounts();
    }
  };

  const handleRefresh = () => {
    console.log("Manual refresh requested");
    refreshAccounts();
  };

  if (isLoading) {
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            className="flex items-center gap-2"
            title="Refresh accounts data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {accounts.length > 1 && (
            <Button 
              variant="outline" 
              onClick={handleTransfer} 
              className="flex items-center gap-2"
              title="Transfer between accounts"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Button>
          )}
          <Button onClick={handleAddAccount} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
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
          {[...accounts]
            .sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0))
            .map((account) => (
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

      <TransferDialog
        isOpen={isTransferDialogOpen}
        onClose={handleTransferDialogClose}
        initialSourceAccountId={selectedAccount?.account_id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the account and all associated data.
              Any cards linked to this account will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteAccount} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountsList;
