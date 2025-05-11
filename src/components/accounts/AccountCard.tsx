import { formatNaira } from "@/utils/formatters";
import { Account } from "@/types/account";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PencilIcon, TrashIcon, CreditCardIcon, StarIcon, BuildingIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBankNameById } from "@/components/BankSelector";

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onViewCards: (accountId: string) => void;
}

const AccountCard = ({ account, onEdit, onDelete, onViewCards }: AccountCardProps) => {
  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'savings':
        return 'bg-blue-100 text-blue-800';
      case 'checking':
        return 'bg-green-100 text-green-800';
      case 'investment':
        return 'bg-purple-100 text-purple-800';
      case 'credit':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Function to format balance with appropriate currency
  const formatBalance = (amount: number, currency = 'NGN') => {
    if (currency === 'NGN') {
      return formatNaira(amount);
    } else if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `${amount.toLocaleString()} ${currency}`;
    }
  };

  // Get the bank name (either from bank_name field or by looking up the institution ID)
  const getBankName = () => {
    if (account.bank_name) {
      return account.bank_name;
    } else if (account.institution) {
      return getBankNameById(account.institution);
    }
    return "Unknown Bank"; // Always show some bank name as a fallback
  };

  const bankName = getBankName();

  return (
    <Card className={`overflow-hidden ${account.is_default ? 'ring-2 ring-primary/30' : ''}`}>
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">{account.name}</CardTitle>
            {account.is_default && (
              <StarIcon className="h-4 w-4 text-amber-500 fill-amber-500" />
            )}
          </div>
          <div className="flex gap-1 flex-wrap justify-end">
            <Badge className={`${getAccountTypeColor(account.type)}`}>
              {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
            </Badge>
            {account.currency && account.currency !== 'NGN' && (
              <Badge variant="outline" className="bg-secondary/10">
                {account.currency}
              </Badge>
            )}
            {account.is_default && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Default
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className="bg-muted/50 text-muted-foreground text-xs px-2.5 py-1 rounded-md flex items-center">
            <BuildingIcon className="h-3 w-3 mr-1.5" />
            {bankName}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="mt-2">
          <p className="text-2xl font-bold">{formatBalance(account.balance, account.currency)}</p>
          {account.account_number && (
            <p className="text-sm text-muted-foreground mt-1">
              ••••{account.account_number.slice(-4)}
            </p>
          )}
        </div>
        
        {account.custom_tags && account.custom_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {account.custom_tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex gap-1 items-center"
          onClick={() => onViewCards(account.account_id)}
        >
          <CreditCardIcon className="h-4 w-4" />
          Cards
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onEdit(account)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onDelete(account.account_id)}
          >
            <TrashIcon className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default AccountCard;
