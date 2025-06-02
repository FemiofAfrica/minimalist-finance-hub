import { useState, useEffect } from "react";
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
import { Card, CardType } from "@/types/card";
import { createCard, updateCard, deleteCard } from "@/services/cardService";
import { fetchAccounts, getAccountById } from "@/services/accountService";
import { Account } from "@/types/account";

interface CardDialogProps {
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
  card: Card | null;
  accountId?: string;
}

const CardDialog = ({ isOpen, onClose, card, accountId }: CardDialogProps) => {
  const [step, setStep] = useState(1); // Step 1: Select account, Step 2: Enter card details
  const [formData, setFormData] = useState<Partial<Card>>({    
    name: '',
    type: 'DEBIT',
    last_four: '',
    user_id: '',
    current_balance: 0
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load accounts for the dropdown
    const getAccounts = async () => {
      try {
        console.log("Fetching accounts for card form");
        const accountsData = await fetchAccounts();
        setAccounts(accountsData);
        console.log(`Fetched ${accountsData.length} accounts for selection`);
        
        // If accountId is provided, fetch and set the selected account
        if (accountId) {
          console.log(`Provided accountId: ${accountId}, fetching details`);
          const account = await getAccountById(accountId);
          if (account) {
            console.log(`Found account: ${account.name} with balance: ${account.balance}`);
            setSelectedAccount(account);
            
            // Auto-populate form with account data
            setFormData(prev => ({
              ...prev,
              account_id: account.account_id,
              current_balance: account.balance
            }));
            
            // Move to step 2 since we already have an account
            setStep(2);
          } else {
            console.error(`Account ${accountId} not found`);
          }
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    if (isOpen) {
      getAccounts();
      setStep(card || accountId ? 2 : 1); // Start at step 1 if creating a new card
    }
  }, [isOpen, accountId]);

  useEffect(() => {
    if (card) {
      console.log("Initializing form with existing card:", card);
      setFormData({
        name: card.card_name || card.name,
        type: card.card_type || card.type,
        last_four: card.card_number?.slice(-4) || card.last_four || '',
        user_id: card.user_id,
        account_id: card.account_id,
        current_balance: card.current_balance || 0
      });
      
      // If the card has an account_id, fetch and set the selected account
      if (card.account_id) {
        const fetchCardAccount = async () => {
          try {
            console.log(`Fetching account ${card.account_id} for existing card`);
            const account = await getAccountById(card.account_id!);
            if (account) {
              console.log(`Found account: ${account.name} with balance: ${account.balance}`);
              setSelectedAccount(account);
              
              // Update the card's balance from the account
              setFormData(prev => ({
                ...prev,
                current_balance: account.balance
              }));
            } else {
              console.error(`Account ${card.account_id} not found for card`);
            }
          } catch (error) {
            console.error("Error fetching card's account:", error);
          }
        };
        
        fetchCardAccount();
      }
    } else {
      console.log("Initializing form for new card");
      setFormData({
        name: '',
        type: 'DEBIT',
        last_four: '',
        user_id: '',
        current_balance: 0
      });
    }
    setShowDeleteConfirm(false);
  }, [card, isOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAccountSelect = async (accountId: string) => {
    if (accountId === "none") {
      console.log("No account selected");
      setSelectedAccount(null);
      setFormData(prev => ({
        ...prev,
        account_id: undefined,
        current_balance: 0
      }));
      return;
    }
    
    try {
      console.log(`Selected account ID: ${accountId}, fetching details`);
      const account = await getAccountById(accountId);
      if (account) {
        console.log(`Found account: ${account.name} with balance: ${account.balance}`);
        setSelectedAccount(account);
        
        // Auto-populate card name based on account name
        // and set current_balance to match the account's balance
        setFormData(prev => {
          const updatedForm = {
            ...prev,
            name: `${account.name} Card`,
            account_id: account.account_id,
            current_balance: account.balance // Set card balance to account balance
          };
          console.log("Updated form data:", updatedForm);
          return updatedForm;
        });
        
        // Move to step 2
        setStep(2);
      } else {
        console.error(`Account ${accountId} not found`);
        toast({
          title: "Error",
          description: "Selected account could not be found",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching account details:", error);
    }
  };

  const validateForm = () => {
    if (!selectedAccount && step === 1) {
      toast({
        title: "Account Required",
        description: "Please select an account to link this card to",
        variant: "destructive",
      });
      return false;
    }
    
    if (step === 2) {
      if (!formData.name) {
        toast({
          title: "Validation Error",
          description: "Card name is required",
          variant: "destructive",
        });
        return false;
      }
      
      if (!formData.last_four) {
        toast({
          title: "Validation Error",
          description: "Last four digits of the card number are required",
          variant: "destructive",
        });
        return false;
      }
      
      if (formData.last_four.length !== 4 || !/^\d{4}$/.test(formData.last_four)) {
        toast({
          title: "Validation Error",
          description: "Please enter exactly 4 digits for the card number",
          variant: "destructive",
        });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // If we're on step 1, move to step 2
    if (step === 1) {
      setStep(2);
      return;
    }
    
    setSubmitting(true);
    try {
      // Ensure we're using the account's balance
      const accountBalance = selectedAccount?.balance || 0;
      
      const cardData = {
        ...formData,
        account_id: selectedAccount?.account_id,
        current_balance: accountBalance
      };
      
      console.log("Submitting card with data:", cardData);
      
      if (card) {
        // Update existing card
        await updateCard(card.card_id, cardData);
        toast({
          title: "Success",
          description: "Card updated successfully",
        });
      } else {
        // Create new card
        await createCard(cardData as Omit<Card, 'card_id'>);
        toast({
          title: "Success",
          description: "Card created successfully",
        });
      }
      onClose(true);
    } catch (error) {
      console.error("Error saving card:", error);
      toast({
        title: "Error",
        description: "Failed to save card",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    
    setDeleting(true);
    try {
      await deleteCard(card.card_id);
      toast({
        title: "Success",
        description: "Card deleted successfully",
      });
      onClose(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const renderStep1 = () => (
    <div className="grid gap-6 py-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Step 1: Select an Account</h3>
        <p className="text-sm text-muted-foreground">
          Each card must be linked to an account. Select the account this card belongs to.
        </p>
      </div>
      
      <div className="grid gap-4">
        <Label htmlFor="linked_account">Linked Account</Label>
        <Select 
          value={selectedAccount?.account_id || 'none'}
          onValueChange={handleAccountSelect}
          disabled={!!accountId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Select an account</SelectItem>
            {accounts.map(account => (
              <SelectItem key={account.account_id} value={account.account_id}>
                {account.name} ({account.type}) - {account.balance}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedAccount && (
          <div className="bg-muted p-3 rounded-md mt-2">
            <h4 className="font-medium">Selected Account</h4>
            <p className="text-sm">Name: {selectedAccount.name}</p>
            <p className="text-sm">Type: {selectedAccount.type}</p>
            <p className="text-sm">Balance: {selectedAccount.balance}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="grid gap-6 py-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Step 2: Card Details</h3>
        <p className="text-sm text-muted-foreground">
          Enter the basic details for your card.
        </p>
      </div>
      
      {selectedAccount && (
        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm font-medium">Linked to: {selectedAccount.name}</p>
          <p className="text-sm">Balance: {selectedAccount.balance}</p>
          <p className="text-xs text-muted-foreground mt-1">
            The card will use this account's balance
          </p>
        </div>
      )}
      
      <div className="grid gap-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-center">
            Card Name
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="col-span-3"
            placeholder="e.g., Personal Visa, Company Mastercard"
          />
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-center">
            Card Type
          </Label>
          <Select 
            value={formData.type} 
            onValueChange={(value) => handleChange('type', value)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Select card type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CREDIT">Credit</SelectItem>
              <SelectItem value="DEBIT">Debit</SelectItem>
              <SelectItem value="PREPAID">Prepaid</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="last_four" className="text-center">
            Last 4 Digits
          </Label>
          <Input
            id="last_four"
            value={formData.last_four}
            onChange={(e) => handleChange('last_four', e.target.value)}
            className="col-span-3"
            placeholder="e.g., 1234"
            maxLength={4}
            pattern="[0-9]{4}"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{card ? 'Edit Card' : 'Add New Card'}</DialogTitle>
          <DialogDescription>
            {card 
              ? 'Update your card details below' 
              : 'Enter the details of your new card'
            }
          </DialogDescription>
        </DialogHeader>
        
        {step === 1 ? renderStep1() : renderStep2()}
        
        <DialogFooter className="flex justify-between items-center">
          {card && step === 2 ? (
            <div className="flex-1">
              {showDeleteConfirm ? (
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete} 
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Confirm Delete"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  Delete
                </Button>
              )}
            </div>
          ) : (
            <div></div>
          )}
          <div className="flex gap-2">
            {step === 2 && !card && (
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                disabled={submitting || deleting}
              >
                Back
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => onClose()}
              disabled={submitting || deleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || deleting}
            >
              {submitting 
                ? "Saving..." 
                : step === 1 
                  ? "Next" 
                  : card 
                    ? "Update Card" 
                    : "Add Card"
              }
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CardDialog;
