import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { fetchAccounts, createAccount } from "@/services/accountService";
import { Account } from "@/types/account";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BankSelector } from "@/components/BankSelector";

export function DefaultAccountSetup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(true);
  const [formData, setFormData] = useState<Partial<Account>>({
    name: 'My Primary Account',
    type: 'checking',
    institution: '',
    account_number: '',
    balance: 0,
    is_active: true,
    is_default: true,
    custom_tags: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user has any accounts
  useEffect(() => {
    const checkAccounts = async () => {
      try {
        setIsLoading(true);
        const accounts = await fetchAccounts();
        setHasAccounts(accounts.length > 0);
        
        // If user has no accounts, show the dialog
        if (accounts.length === 0) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Error checking accounts:", error);
        toast({
          title: "Error",
          description: "Could not check if you have any accounts",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAccounts();
  }, [toast]);

  const handleChange = <K extends keyof Account>(field: K, value: Account[K]) => {
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

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Account name is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const normalizedFormData = { ...formData, type: formData.type?.toLowerCase() };
      await createAccount(normalizedFormData as Omit<Account, 'account_id'>);
      toast({
        title: "Success",
        description: "Default account created successfully",
      });
      setIsOpen(false);
      setHasAccounts(true);
    } catch (error) {
      console.error("Error creating account:", error);
      toast({
        title: "Error",
        description: "Failed to create default account",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user already has accounts, don't render anything
  if (hasAccounts || isLoading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only allow closing if user has accounts
      if (open === false && !hasAccounts) {
        // Prevent closing
        toast({
          title: "Account Required",
          description: "Please create an account to continue. This is required to track your finances.",
          variant: "destructive",
        });
        return;
      }
      setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Your First Account</DialogTitle>
          <DialogDescription>
            Let's set up your first account to track your finances. You can add more accounts later.
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
              onChange={(e) => handleChange('name', e.target.value as Account['name'])}
              className="col-span-3"
              placeholder="e.g., Main Savings, Primary Account"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-center">
              Account Type
            </Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => handleChange('type', value as Account['type'])}
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
                onChange={(value) => handleChange('institution', value as Account['institution'])}
                placeholder="Select your bank..."
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="balance" className="text-center">
              Balance
            </Label>
            <Input
              id="balance"
              type="number"
              value={formData.balance?.toString() || '0'}
              onChange={(e) => handleNumberChange('balance', e.target.value)}
              className="col-span-3"
              placeholder="Current balance"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Creating..." : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 