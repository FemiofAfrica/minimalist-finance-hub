import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fetchAccounts, getDefaultAccount } from "@/services/accountService";
import { fetchCards } from "@/services/cardService";
import { Account } from "@/types/account";
import { Card } from "@/types/card";
import { createTransaction } from "@/services/transactionService";
import { TransactionFlowType, TransactionType } from "@/types/transaction";
import { supabase } from "@/integrations/supabase/client";
import { useAccountStore } from "@/stores/accountStore";
import { FinanceEvents } from "@/integrations/mixpanel/events";
import AccountDialog from "@/components/accounts/AccountDialog";

interface AddTransactionDialogProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onTransactionAdded?: () => void;
}

const AddTransactionDialog = ({ open, setOpen, onTransactionAdded }: AddTransactionDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [formData, setFormData] = useState<{
    description: string;
    amount: string;
    type: string;
    category: string;
    date: string;
    account_id: string;
    transaction_type: TransactionFlowType;
  }>({
    description: '',
    amount: '',
    type: 'expense',
    category: 'uncategorized',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    transaction_type: 'REGULAR' as TransactionFlowType
  });
  
  // Get accounts from global store - using individual selectors to prevent function recreation
  const accounts = useAccountStore(state => state.accounts);
  const refreshAccounts = useAccountStore(state => state.refreshAccounts);
  const isLoading = useAccountStore(state => state.isLoading);
  const { toast } = useToast();

  // Use either controlled (from props) or internal state
  const dialogOpen = open !== undefined ? open : internalOpen;
  const setDialogOpen = setOpen || setInternalOpen;

  const setDefaultAccount = useCallback(() => {
    if (Array.isArray(accounts) && accounts.length > 0) {
      console.log(`Found ${accounts.length} accounts`);
      
      // Get the default account or first account
      const defaultAccount = accounts.find(acc => acc.is_default) || accounts[0];
      
      if (defaultAccount) {
        console.log("Using account:", defaultAccount.name);
        
        // Update formData with the default account
        setFormData(prev => {
          // Get current transaction type from previous state
          const currentType = prev.type;
          
          // Re-evaluate flow type now that we have a concrete account
          let transactionType: TransactionFlowType = 'REGULAR';
          if (currentType === 'expense') {
            transactionType = 'ACCOUNT_TO_EXTERNAL';
          }
          
          return {
            ...prev,
            account_id: defaultAccount.account_id,
            transaction_type: transactionType
          };
        });
      } else {
        console.error("No accounts available despite array having length");
        setFormData(prev => ({ ...prev, account_id: '' })); 
      }
    } else {
      console.error("No accounts found or accounts store is empty");
      setFormData(prev => ({ ...prev, account_id: '' }));
      // Don't show toast here - we'll handle this in the UI
    }
  }, [accounts]);

  useEffect(() => {
    if (dialogOpen) {
      if (!accounts.length && !isLoading) {
        console.log('AddTransactionDialog: Loading accounts');
        refreshAccounts();
      } else if (accounts.length > 0) {
        setDefaultAccount();
      }
    }
  }, [dialogOpen, accounts.length, isLoading]);

  const handleAccountDialogClose = async (refresh: boolean = false) => {
    setShowAccountDialog(false);
    if (refresh) {
      // Refresh accounts and set default
      await refreshAccounts();
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Update transaction_type based on selected options
    if (field === 'account_id' || field === 'type') {
      const accountSelected = field === 'account_id' ? value : formData.account_id;
      const transactionType = field === 'type' ? value : formData.type;
      
      updateTransactionType(accountSelected, transactionType);
    }
  };

  const updateTransactionType = (accountId: string, type: string) => {
    let transactionType: TransactionFlowType = 'REGULAR';

    if (accountId) {
      if (type === 'expense') {
        transactionType = 'ACCOUNT_TO_EXTERNAL';
      } else {
        transactionType = 'REGULAR';
      }
    }

    setFormData(prev => ({
      ...prev,
      transaction_type: transactionType
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNumber = parseFloat(formData.amount.replace(/,/g, ''));
    if (
      !formData.description ||
      isNaN(amountNumber) ||
      !formData.date ||
      !formData.type
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      let accountId = formData.account_id;
      // If no account_id is specified, fetch the default account
      if (!accountId) {
        const defaultAccount = await getDefaultAccount();
        if (!defaultAccount) {
          toast({
            title: "No Account Found",
            description: "You must have at least one account to add a transaction.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        accountId = defaultAccount.account_id;
      }
      
      // Calculate the appropriate transaction_type based on current transaction and account
      let transactionType: TransactionFlowType = formData.transaction_type;
      if (accountId && formData.type === 'expense') {
        transactionType = 'ACCOUNT_TO_EXTERNAL';
      } else if (accountId) {
        transactionType = 'REGULAR';
      }
      
      const transaction = {
        description: formData.description,
        // Always send a positive amount; backend will apply sign based on type
        amount: Math.abs(parseFloat(formData.amount)),
        type: formData.type as TransactionType,
        category: formData.category || 'uncategorized',
        date: new Date(formData.date).toISOString(),
        account_id: accountId,
        transaction_type: transactionType,
        user_id: null, // Will be set by the service
        currency: 'NGN' // Default currency
      };
      
      // Create the transaction using the service
      await createTransaction(transaction);
      
      // Track the transaction event
      FinanceEvents.trackAddTransaction({
        transactionType: formData.type as 'income' | 'expense' | 'transfer',
        category: formData.category,
        amount: parseFloat(formData.amount),
        paymentMethod: 'manual',
        recurring: false
      });
      
      toast({
        title: "Success",
        description: "Transaction added successfully"
      });
      
      // Simply refresh accounts once after transaction is created
      await refreshAccounts();
      
      // Reset form data
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        category: 'uncategorized',
        date: new Date().toISOString().split('T')[0],
        account_id: '',
        transaction_type: 'REGULAR' as TransactionFlowType
      });
      
      // Call the onTransactionAdded callback if provided
      if (onTransactionAdded) {
        onTransactionAdded();
      }
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Render either controlled or uncontrolled component based on props
  if (open !== undefined && setOpen) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
            <DialogDescription>
              Enter the details of your transaction below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Transaction Name</Label>
              <Input 
                id="description" 
                placeholder="Enter transaction name"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input 
                id="amount" 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" value={formData.type} onValueChange={(value) => handleChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">None</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date" 
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                required
              />
            </div>
            
            {/* Account Selection */}
            <div className="pt-2 border-t border-gray-200">
              <h4 className="text-sm font-medium mb-2">Link to Account</h4>
              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                {accounts.length === 0 ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        You need to create an account first to track your transactions.
                      </p>
                      <Button 
                        type="button"
                        onClick={() => setShowAccountDialog(true)}
                        size="sm"
                        className="w-full"
                      >
                        Create Your First Account
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select name="account_id" value={formData.account_id} onValueChange={(value) => handleChange('account_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.account_id} value={account.account_id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={loading || accounts.length === 0}>
                {loading ? 'Adding...' : 'Add Transaction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Uncontrolled version for backward compatibility
  return (
    <Dialog open={internalOpen} onOpenChange={setInternalOpen}>
      <DialogTrigger asChild>
        <Button className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors">
          Add Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Enter the details of your transaction below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Transaction Name</Label>
            <Input 
              id="description" 
              placeholder="Enter transaction name"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input 
              id="amount" 
              type="number" 
              step="0.01" 
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" value={formData.type} onValueChange={(value) => handleChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">None</SelectItem>
                <SelectItem value="salary">Salary</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
                <SelectItem value="entertainment">Entertainment</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="utilities">Utilities</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input 
              id="date" 
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              required
            />
          </div>
          
          {/* Account Selection */}
          <div className="pt-2 border-t border-gray-200">
            <h4 className="text-sm font-medium mb-2">Link to Account</h4>
            <div className="space-y-2">
              <Label htmlFor="account">Account</Label>
              {accounts.length === 0 ? (
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      You need to create an account first to track your transactions.
                    </p>
                    <Button 
                      type="button"
                      onClick={() => setShowAccountDialog(true)}
                      size="sm"
                      className="w-full"
                    >
                      Create Your First Account
                    </Button>
                  </div>
                </div>
              ) : (
                <Select name="account_id" value={formData.account_id} onValueChange={(value) => handleChange('account_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.account_id} value={account.account_id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={loading || accounts.length === 0}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Account Dialog for creating accounts */}
      <AccountDialog
        isOpen={showAccountDialog}
        onClose={handleAccountDialogClose}
        account={null}
      />
    </Dialog>
  );
};

export default AddTransactionDialog;
