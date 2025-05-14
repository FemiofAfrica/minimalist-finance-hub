import { useState, useEffect, useCallback } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription, 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Account } from "@/types/account";
import { fetchAccounts } from "@/services/accountService";
import { createTransferTransaction } from "@/services/transactionService";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase, getCurrentUserId } from "@/integrations/supabase/client";
import { useAccountStore } from "@/stores/accountStore";

interface TransferDialogProps {
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
  initialSourceAccountId?: string;
}

const TransferDialog = ({ isOpen, onClose, initialSourceAccountId }: TransferDialogProps) => {
  const { accounts, refreshAccounts } = useAccountStore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState<string>("");
  const [destinationAccountId, setDestinationAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());

  // Initialize account selections based on available accounts
  const initializeAccounts = useCallback(() => {
    // Set initial source account if provided
    if (initialSourceAccountId && accounts.some(a => a.account_id === initialSourceAccountId)) {
      setSourceAccountId(initialSourceAccountId);
    } else if (accounts.length > 0) {
      // Set default source account to first account
      setSourceAccountId(accounts[0].account_id);
    }
    
    // Set destination account to second account if available
    if (accounts.length > 1) {
      // Find an account that's not the source account
      const destAccount = accounts.find(a => 
        a.account_id !== (initialSourceAccountId || (accounts[0]?.account_id))
      );
      if (destAccount) {
        setDestinationAccountId(destAccount.account_id);
      }
    }
  }, [accounts, initialSourceAccountId, setDestinationAccountId, setSourceAccountId]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      
      // If account store is empty, refresh it
      if (accounts.length === 0) {
        refreshAccounts().then(() => {
          initializeAccounts();
          setLoading(false);
        });
      } else {
        initializeAccounts();
        setLoading(false);
      }
    }
  }, [isOpen, accounts.length, initializeAccounts, refreshAccounts]);

  // Update destination account when source account changes
  useEffect(() => {
    if (sourceAccountId && accounts.length > 1) {
      // If current destination is the same as source, find a different account
      if (destinationAccountId === sourceAccountId || !destinationAccountId) {
        const newDestAccount = accounts.find(a => a.account_id !== sourceAccountId);
        if (newDestAccount) {
          setDestinationAccountId(newDestAccount.account_id);
        }
      }
    }
  }, [sourceAccountId, accounts, destinationAccountId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setDescription("");
      setNotes("");
      setDate(new Date());
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    // Validate form inputs
    if (!sourceAccountId || !destinationAccountId) {
      toast({
        title: "Error",
        description: "Please select both source and destination accounts",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Format date to YYYY-MM-DD
      const formattedDate = format(date, "yyyy-MM-dd");
      const transferAmount = parseFloat(amount);
      
      console.log("Starting transfer process");
      
      // Use the service function to handle the transfer
      await createTransferTransaction(
        sourceAccountId,
        destinationAccountId,
        transferAmount,
        formattedDate,
        description || undefined,
        notes || undefined
      );
      
      toast({
        title: "Success",
        description: "Funds transferred successfully",
      });
      
      // Just refresh accounts once after successful transfer
      await refreshAccounts();
      
      // Close dialog and indicate refresh needed
      onClose(true);
    } catch (error) {
      console.error("Failed to transfer funds:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to transfer funds",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountOptions = () => {
    if (loading) {
      return <SelectItem value="loading" disabled>Loading accounts...</SelectItem>;
    }
    
    if (accounts.length === 0) {
      return <SelectItem value="none" disabled>No accounts found</SelectItem>;
    }
    
    return accounts.map(account => (
      <SelectItem key={account.account_id} value={account.account_id}>
        {account.name} ({account.currency} {account.balance.toLocaleString()})
      </SelectItem>
    ));
  };

  const getDestinationAccountOptions = () => {
    if (loading) {
      return <SelectItem value="loading" disabled>Loading accounts...</SelectItem>;
    }
    
    if (accounts.length <= 1) {
      return <SelectItem value="none" disabled>Need at least 2 accounts</SelectItem>;
    }
    
    return accounts
      .filter(account => account.account_id !== sourceAccountId)
      .map(account => (
        <SelectItem key={account.account_id} value={account.account_id}>
          {account.name} ({account.currency} {account.balance.toLocaleString()})
        </SelectItem>
      ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Transfer Funds</DialogTitle>
          <DialogDescription>
            Move money between your accounts
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sourceAccount" className="text-right">
              From Account
            </Label>
            <Select 
              value={sourceAccountId} 
              onValueChange={setSourceAccountId}
              disabled={loading || accounts.length < 1}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                {getAccountOptions()}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="destinationAccount" className="text-right">
              To Account
            </Label>
            <Select 
              value={destinationAccountId} 
              onValueChange={setDestinationAccountId}
              disabled={loading || !sourceAccountId || accounts.length < 2}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                {getDestinationAccountOptions()}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder="Amount to transfer"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Transfer description (optional)"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Additional notes (optional)"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onClose()}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={submitting || loading || !sourceAccountId || !destinationAccountId || !amount}
          >
            {submitting ? "Processing..." : "Transfer Funds"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog; 