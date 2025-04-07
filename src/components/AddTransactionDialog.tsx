import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
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
import { TransactionInput } from "@/types/transaction";
import { TransactionFlowType } from "@/types/transaction";

const AddTransactionDialog = () => {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  const { toast } = useToast();

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

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
    }
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        toast({
          title: "Success",
          description: "Transaction added successfully!",
        });
        setOpen(false);
        setFormData({ });
      } else if (fetcher.data.error) {
        toast({
          title: "Error",
          description: fetcher.data.error,
          variant: "destructive",
        });
      }
    }
  }, [fetcher.state, fetcher.data, toast]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault(); 
    console.log("Submitting transaction via fetcher:", formData);

    const submitData = new FormData();
    submitData.append("intent", "createTransaction"); 
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
          submitData.append(key, String(value));
      }
    });

    fetcher.submit(submitData, { 
        method: "post", 
        action: "/"
    });
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
        <fetcher.Form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type</Label>
            <Select name="type" value={formData.type} onValueChange={(value) => setFormData(prev => ({...prev, type: value as any}))}>
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
            <Select name="account_id" value={formData.account_id} onValueChange={(value) => setFormData(prev => ({...prev, account_id: value as any}))}>
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
            <Select name="category_name" value={formData.category_name} onValueChange={(value) => setFormData(prev => ({...prev, category_name: value as any}))}>
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
            <Button type="submit" disabled={fetcher.state !== 'idle'}>
              {fetcher.state !== 'idle' ? "Adding..." : "Add Transaction"}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
