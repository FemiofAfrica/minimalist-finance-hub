/**
 * Example of migrating a component from Remix to Vite SPA
 * This shows how to convert from useFetcher to standard React hooks with API calls
 */

import { useState, useEffect } from "react";
import axios from "axios"; // Added axios for API calls
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
import { useToast } from "@/components/ui/use-toast";
import { fetchAccounts, getDefaultAccount } from "@/services/accountService";
import { fetchCards } from "@/services/cardService";
import { Account } from "@/types/account";
import { Card } from "@/types/card";
import { TransactionInput, Transaction, TransactionType } from "@/types/transaction";
import { TransactionCreationResponse } from "@/types/api-responses";
import { useAuth } from "@/contexts/useAuth"; // Added to get user ID

interface AddTransactionDialogProps {
  onTransactionAdded?: (transaction: Transaction) => void;
}

const AddTransactionDialog = ({ onTransactionAdded }: AddTransactionDialogProps = {}) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); // Get user from auth context
  
  // Added loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<TransactionInput>>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    account_id: '',
    category_name: '',
    description: '',
    notes: '',
    currency: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle date input changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, date: value }));
  };

  // Replaced useFetcher with standard form submission using axios
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to add a transaction",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Call the API endpoint directly
      const response = await axios.post('/api/transactions', {
        userId: user.id,
        transaction: formData
      });
      
      // Handle success
      toast({
        title: "Success",
        description: "Transaction added successfully!",
      });
      
      setOpen(false);
      setFormData({
        type: 'expense',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        account_id: '',
        category_name: '',
        description: '',
        notes: '',
        currency: ''
      });
      
      // Call the callback if provided
      if (onTransactionAdded && response.data) {
        onTransactionAdded(response.data);
      }
      
      // Trigger a refresh event for other components to update
      document.dispatchEvent(new Event('refresh-transactions'));
      
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Add Manually</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogDescription>
            Enter the details for your new transaction.
          </DialogDescription>
        </DialogHeader>
        {/* Changed from fetcher.Form to standard form */}
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type</Label>
            <Select name="type" value={formData.type} onValueChange={(value) => setFormData(prev => ({...prev, type: value as TransactionType}))}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="amount" className="text-right">Amount</Label>
             <Input id="amount" name="amount" type="number" step="0.01" value={formData.amount} onChange={handleInputChange} required className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label htmlFor="date" className="text-right">Date</Label>
             <Input id="date" name="date" type="date" value={formData.date} onChange={handleDateChange} required className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="account_id" className="text-right">Account</Label>
            <Select name="account_id" value={formData.account_id} onValueChange={(value) => setFormData(prev => ({...prev, account_id: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {/* TODO: Populate from fetched accounts */}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category_name" className="text-right">Category</Label>
            <Select name="category_name" value={formData.category_name} onValueChange={(value) => setFormData(prev => ({...prev, category_name: value}))}>
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Input id="description" name="description" value={formData.description} onChange={handleInputChange} required className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">Notes</Label>
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currency" className="text-right">Currency</Label>
            <Input id="currency" name="currency" value={formData.currency} onChange={handleInputChange} className="col-span-3" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;