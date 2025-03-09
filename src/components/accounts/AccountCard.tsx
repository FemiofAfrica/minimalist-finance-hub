
import { formatNaira } from "@/utils/formatters";
import { Account } from "@/types/account";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PencilIcon, TrashIcon, CreditCardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onViewCards: (accountId: string) => void;
}

const AccountCard = ({ account, onEdit, onDelete, onViewCards }: AccountCardProps) => {
  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'SAVINGS':
        return 'bg-blue-100 text-blue-800';
      case 'CHECKING':
        return 'bg-green-100 text-green-800';
      case 'INVESTMENTS':
        return 'bg-purple-100 text-purple-800';
      case 'DEBT_SERVICING':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">{account.account_name}</CardTitle>
            {account.institution && (
              <CardDescription className="text-sm text-muted-foreground">
                {account.institution}
              </CardDescription>
            )}
          </div>
          <Badge className={`${getAccountTypeColor(account.account_type)}`}>
            {account.account_type.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="mt-2">
          <p className="text-2xl font-bold">{formatNaira(account.current_balance)}</p>
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
