import { useState, useEffect } from "react";
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
import { TransactionFlowType } from "@/types/transaction";

const AddTransactionDialog = () => {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
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
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadAccountsAndSetDefault();
    }
  }, [open]);

  const loadAccountsAndSetDefault = async () => {
    setLoading(true);
    try {
      // Fetch all accounts for the dropdown
      const accountsData = await fetchAccounts();
      if (Array.isArray(accountsData)) {
        setAccounts(accountsData);
      } else {
        console.error("fetchAccounts did not return an array.");
        setAccounts([]); // Reset accounts on error
        // Optionally throw or show toast
      }

      // Get the default account (service handles creation if needed)
      const defaultAccount = await getDefaultAccount();
      
      // Set the default account in the form state
      if (defaultAccount && defaultAccount.account_id) {
        setFormData(prev => ({
          ...prev,
          account_id: defaultAccount.account_id 
        }));
      } else {
        // Handle case where getDefaultAccount failed unexpectedly
        console.error("Failed to get or create default account from service.");
        setFormData(prev => ({ ...prev, account_id: '' })); 
        toast({
          title: "Error",
          description: "Could not set default account.",
          variant: "destructive"
        });
      }

    } catch (error) {
      // Catch errors from either fetchAccounts or getDefaultAccount
      console.error('Error loading accounts and setting default:', error);
      toast({
        title: "Error",
        description: "Failed to load account information",
        variant: "destructive"
      });
      setAccounts([]); // Clear accounts list on error
      setFormData(prev => ({ ...prev, account_id: '' })); 
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsData = await fetchAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
    
    if (!formData.description || !formData.amount || !formData.date || !formData.type) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const transaction = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category_type: formData.type.toUpperCase(),
        category_name: formData.category || 'Uncategorized',
        date: new Date(formData.date).toISOString(),
        account_id: formData.account_id === 'none' ? null : formData.account_id,

        transaction_type: formData.transaction_type
      };
      
      await createTransaction(transaction);
      
      toast({
        title: "Success",
        description: "Transaction added successfully"
      });
      
      // Reset form
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        category: 'uncategorized',
        date: new Date().toISOString().split('T')[0],
        account_id: 'none',

        transaction_type: 'REGULAR'
      });
      
      // Dispatch refresh event
      const refreshEvent = new Event('refresh');
      document.dispatchEvent(refreshEvent);
      
      setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors">
          Add Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
              <Select name="account_id" value={formData.account_id} onValueChange={(value) => handleChange('account_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
