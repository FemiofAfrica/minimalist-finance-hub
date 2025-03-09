
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
  const [formData, setFormData] = useState<Partial<Card>>({
    card_name: '',
    card_type: 'DEBIT',
    card_number: '',
    expiry_date: '',
    credit_limit: undefined,
    current_balance: 0,
    is_active: true,
    account_id: accountId,
    custom_tags: []
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load accounts for the dropdown
    const getAccounts = async () => {
      try {
        const accountsData = await fetchAccounts();
        setAccounts(accountsData);
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    if (isOpen) {
      getAccounts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (card) {
      // Format date for the input (YYYY-MM-DD)
      let formattedDate = '';
      if (card.expiry_date) {
        try {
          const date = new Date(card.expiry_date);
          formattedDate = date.toISOString().split('T')[0];
        } catch {
          formattedDate = '';
        }
      }

      setFormData({
        card_name: card.card_name,
        card_type: card.card_type,
        card_number: card.card_number || '',
        expiry_date: formattedDate,
        credit_limit: card.credit_limit,
        current_balance: card.current_balance,
        is_active: card.is_active,
        account_id: card.account_id,
        custom_tags: card.custom_tags || []
      });
    } else {
      setFormData({
        card_name: '',
        card_type: 'DEBIT',
        card_number: '',
        expiry_date: '',
        credit_limit: undefined,
        current_balance: 0,
        is_active: true,
        account_id: accountId,
        custom_tags: []
      });
    }
    setTagInput('');
    setShowDeleteConfirm(false);
  }, [card, isOpen, accountId]);

  const handleChange = (field: keyof Card, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberChange = (field: keyof Card, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleAccountChange = async (accountId: string) => {
    // If "none" is selected, just update the form data without auto-populating
    if (accountId === "none") {
      handleChange('account_id', undefined);
      return;
    }
    
    // Update account_id in form data
    handleChange('account_id', accountId);
    
    // Fetch the account details to get the current balance
    try {
      const account = await getAccountById(accountId);
      if (account) {
        // Auto-populate the current balance from the linked account
        handleChange('current_balance', account.current_balance);
        
        toast({
          title: "Balance Updated",
          description: "Card balance has been updated from the linked account.",
        });
      }
    } catch (error) {
      console.error("Error fetching account details:", error);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.custom_tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        custom_tags: [...(prev.custom_tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      custom_tags: prev.custom_tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const validateForm = () => {
    if (!formData.card_name) {
      toast({
        title: "Validation Error",
        description: "Card name is required",
        variant: "destructive",
      });
      return false;
    }
    
    if (formData.card_type === 'CREDIT' && formData.credit_limit === undefined) {
      toast({
        title: "Validation Error",
        description: "Credit limit is required for credit cards",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      if (card) {
        // Update existing card
        await updateCard(card.card_id, formData);
        toast({
          title: "Success",
          description: "Card updated successfully",
        });
      } else {
        // Create new card
        await createCard(formData as Omit<Card, 'card_id'>);
        toast({
          title: "Success",
          description: "Card created successfully",
        });
      }
      onClose(true);
    } catch (error) {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{card ? 'Edit Card' : 'Add New Card'}</DialogTitle>
          <DialogDescription>
            {card 
              ? 'Update your card details below' 
              : 'Enter the details of your new card'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="card_name" className="text-right">
              Card Name
            </Label>
            <Input
              id="card_name"
              value={formData.card_name}
              onChange={(e) => handleChange('card_name', e.target.value)}
              className="col-span-3"
              placeholder="e.g., Personal Visa, Company Mastercard"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="card_type" className="text-right">
              Card Type
            </Label>
            <Select 
              value={formData.card_type} 
              onValueChange={(value) => handleChange('card_type', value as CardType)}
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
            <Label htmlFor="linked_account" className="text-right">
              Linked Account
            </Label>
            <Select 
              value={formData.account_id || 'none'}
              onValueChange={(value) => handleAccountChange(value)}
              disabled={!!accountId}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select linked account (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.account_id} value={account.account_id}>
                    {account.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="card_number" className="text-right">
              Card Number
            </Label>
            <Input
              id="card_number"
              value={formData.card_number}
              onChange={(e) => handleChange('card_number', e.target.value)}
              className="col-span-3"
              placeholder="Last 4 digits only"
              maxLength={4}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expiry_date" className="text-right">
              Expiry Date
            </Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => handleChange('expiry_date', e.target.value)}
              className="col-span-3"
            />
          </div>
          
          {(formData.card_type === 'CREDIT' || formData.credit_limit !== undefined) && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="credit_limit" className="text-right">
                Credit Limit
              </Label>
              <Input
                id="credit_limit"
                type="number"
                value={formData.credit_limit || ''}
                onChange={(e) => handleNumberChange('credit_limit', e.target.value)}
                className="col-span-3"
                placeholder="0.00"
              />
            </div>
          )}
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="current_balance" className="text-right">
              Current Balance
            </Label>
            <Input
              id="current_balance"
              type="number"
              value={formData.current_balance || 0}
              onChange={(e) => handleNumberChange('current_balance', e.target.value)}
              className="col-span-3"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="custom_tags" className="text-right">
              Tags
            </Label>
            <div className="col-span-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  id="tag_input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" onClick={handleAddTag} size="sm">
                  Add
                </Button>
              </div>
              
              {formData.custom_tags && formData.custom_tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.custom_tags.map((tag, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-secondary-foreground/70 hover:text-secondary-foreground"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between items-center">
          {card ? (
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
                : card ? "Update Card" : "Add Card"
              }
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CardDialog;
