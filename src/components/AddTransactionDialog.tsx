
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
import { fetchAccounts } from "@/services/accountService";
import { fetchCards } from "@/services/cardService";
import { Account } from "@/types/account";
import { Card } from "@/types/card";
import { createTransaction } from "@/services/transactionService";
import { TransactionFlowType } from "@/types/transaction";

const AddTransactionDialog = () => {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    card_id: '',
    transaction_type: 'REGULAR' as TransactionFlowType
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadAccountsAndCards();
    }
  }, [open]);

  const loadAccountsAndCards = async () => {
    try {
      setLoading(true);
      const [accountsData, cardsData] = await Promise.all([
        fetchAccounts(),
        fetchCards()
      ]);
      setAccounts(accountsData);
      setCards(cardsData);
    } catch (error) {
      console.error('Error loading accounts and cards:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts and cards",
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
    if (field === 'account_id' || field === 'card_id' || field === 'type') {
      const accountSelected = field === 'account_id' ? value : formData.account_id;
      const cardSelected = field === 'card_id' ? value : formData.card_id;
      const transactionType = field === 'type' ? value : formData.type;
      
      updateTransactionType(accountSelected, cardSelected, transactionType);
    }
  };

  const updateTransactionType = (accountId: string, cardId: string, type: string) => {
    let transactionType: TransactionFlowType = 'REGULAR';

    if (accountId && cardId) {
      // Both account and card are selected
      if (type === 'expense') {
        transactionType = 'CARD_TO_EXTERNAL';
      } else {
        // For income, it's regular since money usually comes from external source
        transactionType = 'REGULAR';
      }
    } else if (accountId && !cardId) {
      if (type === 'expense') {
        transactionType = 'ACCOUNT_TO_EXTERNAL';
      } else {
        transactionType = 'REGULAR';
      }
    } else if (!accountId && cardId) {
      if (type === 'expense') {
        transactionType = 'CARD_TO_EXTERNAL';
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
    
    if (!formData.description || !formData.amount || !formData.date) {
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
        account_id: formData.account_id || null,
        card_id: formData.card_id || null,
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
        category: '',
        date: new Date().toISOString().split('T')[0],
        account_id: '',
        card_id: '',
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
        <Button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
          Add Transaction
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
            <Select 
              value={formData.type}
              onValueChange={(value) => handleChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
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
          
          {/* Account and Card Selection */}
          <div className="pt-2 border-t border-gray-200">
            <h4 className="text-sm font-medium mb-2">Link to Account or Card</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) => handleChange('account_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {accounts.map(account => (
                      <SelectItem key={account.account_id} value={account.account_id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="card">Card</Label>
                <Select
                  value={formData.card_id}
                  onValueChange={(value) => handleChange('card_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select card (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {cards.map(card => (
                      <SelectItem key={card.card_id} value={card.card_id}>
                        {card.card_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
