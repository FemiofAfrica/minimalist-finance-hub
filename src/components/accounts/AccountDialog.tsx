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
import { Account, AccountType } from "@/types/account";
import { createAccount, updateAccount, deleteAccount } from "@/services/accountService";
import { Wallet, Building } from "lucide-react";
import { BankSelector, getBankNameById } from "@/components/BankSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { FinanceEvents } from "@/integrations/mixpanel/events";

interface AccountDialogProps {
  isOpen: boolean;
  onClose: (refresh?: boolean) => void;
  account: Account | null;
}

const AccountDialog = ({ isOpen, onClose, account }: AccountDialogProps) => {
  const [formData, setFormData] = useState<Partial<Account>>({
    name: '',
    type: 'checking', // Fix: should be lowercase to match AccountType
    institution: '',
    bank_name: '',
    account_number: '',
    balance: 0,
    currency: 'NGN',
    is_active: true,
    is_default: false,
    custom_tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        institution: account.institution || '',
        bank_name: account.bank_name || getBankNameById(account.institution || ''),
        account_number: account.account_number || '',
        balance: account.balance,
        currency: account.currency || 'NGN',
        is_active: account.is_active,
        is_default: account.is_default,
        custom_tags: account.custom_tags || []
      });
    } else {
      setFormData({
        name: '',
        type: 'checking', // Fix: should be lowercase to match AccountType
        institution: '',
        bank_name: '',
        account_number: '',
        balance: 0,
        currency: 'NGN',
        is_active: true,
        is_default: false,
        custom_tags: []
      });
    }
    setTagInput('');
    setShowDeleteConfirm(false);
  }, [account, isOpen]);

  const handleChange = (field: keyof Account, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberChange = (field: keyof Account, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleBankChange = (bankId: string, bankName?: string) => {
    setFormData(prev => ({
      ...prev,
      institution: bankId,
      bank_name: bankName || getBankNameById(bankId)
    }));
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
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Account name is required",
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
      const normalizedFormData = { ...formData, type: formData.type?.toLowerCase() };
      if (account) {
        await updateAccount(account.account_id, normalizedFormData);
        toast({
          title: "Success",
          description: "Account updated successfully",
        });
      } else {
        await createAccount(normalizedFormData as Omit<Account, 'account_id'>);
        // Track bank account creation
        FinanceEvents.trackCreateBankAccount({
          accountType: normalizedFormData.type || 'unknown',
          bank: normalizedFormData.bank_name || 'unknown',
          currency: normalizedFormData.currency || 'NGN',
          initialBalance: normalizedFormData.balance || 0
        });
        toast({
          title: "Success",
          description: "Account created successfully",
        });
      }
      onClose(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save account",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    
    setDeleting(true);
    try {
      await deleteAccount(account.account_id);
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
      onClose(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account",
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
          <DialogTitle>{account ? 'Edit Account' : 'Add New Account'}</DialogTitle>
          <DialogDescription>
            {account 
              ? 'Update your account details below' 
              : 'Enter the details of your new account'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-center">
              Account Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="col-span-3"
              placeholder="e.g., Main Savings, Investment Fund"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-center">
              Account Type
            </Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => handleChange('type', value as AccountType)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="institution" className="text-center">
              Institution
            </Label>
            <div className="col-span-3">
              <BankSelector
                value={formData.institution || ''}
                onChange={handleBankChange}
                placeholder="Select your bank..."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="account_number" className="text-center">
              Account Number
            </Label>
            <Input
              id="account_number"
              value={formData.account_number}
              onChange={(e) => handleChange('account_number', e.target.value)}
              className="col-span-3"
              placeholder="e.g., 1234567890"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currency" className="text-center">
              Currency
            </Label>
            <Select 
              value={formData.currency || 'NGN'} 
              onValueChange={(value) => handleChange('currency', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {/* African Currencies */}
                <SelectItem value="NGN">🇳🇬 Nigerian Naira (NGN)</SelectItem>
                <SelectItem value="ZAR">🇿🇦 South African Rand (ZAR)</SelectItem>
                <SelectItem value="GHS">🇬🇭 Ghanaian Cedi (GHS)</SelectItem>
                <SelectItem value="KES">🇰🇪 Kenyan Shilling (KES)</SelectItem>
                <SelectItem value="EGP">🇪🇬 Egyptian Pound (EGP)</SelectItem>
                <SelectItem value="MAD">🇲🇦 Moroccan Dirham (MAD)</SelectItem>
                <SelectItem value="TND">🇹🇳 Tunisian Dinar (TND)</SelectItem>
                <SelectItem value="UGX">🇺🇬 Ugandan Shilling (UGX)</SelectItem>
                <SelectItem value="TZS">🇹🇿 Tanzanian Shilling (TZS)</SelectItem>
                <SelectItem value="ETB">🇪🇹 Ethiopian Birr (ETB)</SelectItem>
                <SelectItem value="XOF">🌍 West African CFA Franc (XOF)</SelectItem>
                <SelectItem value="XAF">🌍 Central African CFA Franc (XAF)</SelectItem>
                <SelectItem value="BWP">🇧🇼 Botswana Pula (BWP)</SelectItem>
                <SelectItem value="ZMW">🇿🇲 Zambian Kwacha (ZMW)</SelectItem>
                <SelectItem value="AOA">🇦🇴 Angolan Kwanza (AOA)</SelectItem>
                <SelectItem value="MZN">🇲🇿 Mozambican Metical (MZN)</SelectItem>
                <SelectItem value="RWF">🇷🇼 Rwandan Franc (RWF)</SelectItem>
                <SelectItem value="MWK">🇲🇼 Malawian Kwacha (MWK)</SelectItem>
                <SelectItem value="SZL">🇸🇿 Swazi Lilangeni (SZL)</SelectItem>
                <SelectItem value="LSL">🇱🇸 Lesotho Loti (LSL)</SelectItem>
                <SelectItem value="NAD">🇳🇦 Namibian Dollar (NAD)</SelectItem>
                {/* International Currencies */}
                <SelectItem value="USD">🇺🇸 US Dollar (USD)</SelectItem>
                <SelectItem value="EUR">🇪🇺 Euro (EUR)</SelectItem>
                <SelectItem value="GBP">🇬🇧 British Pound (GBP)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balance" className="text-center">
              Balance
            </Label>
            <Input
              id="balance"
              type="number"
              value={formData.balance}
              onChange={(e) => handleNumberChange('balance', e.target.value)}
              className="col-span-3"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-center">
              <Label htmlFor="is_default" className="mr-2">Default Account</Label>
            </div>
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox 
                id="is_default" 
                checked={formData.is_default} 
                onCheckedChange={(checked) => handleChange('is_default', checked === true)}
              />
              <Label htmlFor="is_default" className="text-sm leading-none">
                Set as default account for transactions
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="custom_tags" className="text-center">
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
                    <div key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md 
text-xs flex items-center gap-1">
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
          {account ? (
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
                : account ? "Update Account" : "Add Account"
              }
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AccountDialog;
