import { useState, useEffect } from "react";
import { formatNaira } from "@/utils/formatters";
import { Account } from "@/types/account";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PencilIcon, TrashIcon, CreditCardIcon, StarIcon, BuildingIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBankNameById } from "@/components/BankSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAccountStore } from "@/stores/accountStore";

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
  onViewCards: (accountId: string) => void;
}

const AccountCard = ({ account: initialAccount, onEdit, onDelete, onViewCards }: AccountCardProps) => {
  // Use the account ID to get the latest data from global store
  const globalAccount = useAccountStore(state => 
    state.accounts.find(a => a.account_id === initialAccount.account_id)
  );
  
  // Use global account if available, otherwise use initial prop
  const account = globalAccount || initialAccount;
  
  const [refreshing, setRefreshing] = useState(false);
  const [lastKnownBalance, setLastKnownBalance] = useState<number>(account.balance);
  const [isBalanceUpdated, setIsBalanceUpdated] = useState<boolean>(false);
  
  // Balance animation effect when balance changes
  useEffect(() => {
    if (lastKnownBalance !== account.balance) {
      console.log(`AccountCard: Balance changed for ${account.name}: ${lastKnownBalance} -> ${account.balance}`);
      setIsBalanceUpdated(true);
      const timeout = setTimeout(() => {
        setIsBalanceUpdated(false);
        setLastKnownBalance(account.balance);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [account.balance, lastKnownBalance, account.name]);
  
  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Use the global store to refresh account balances
      await useAccountStore.getState().fetchBalances();
    } catch (e) {
      console.error(`Error in manual refresh for ${account.name}:`, e);
    } finally {
      setRefreshing(false);
    }
  };

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

  // Get bank icon based on bank name  
  const getBankIcon = () => {
    return <BuildingIcon className="h-4 w-4 inline mr-1" />;
  };
  
  // Get bank name
  const bankName = account.bank_name || (account.institution ? getBankNameById(account.institution) : null);

  return (
    <Card className={`overflow-hidden ${account.is_default ? 'ring-2 ring-primary/30' : ''}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center">
            {account.name}
            {account.is_default && (
              <span title="Default Account">
                <StarIcon className="h-4 w-4 ml-1 text-yellow-500" />
              </span>
            )}
          </CardTitle>
          <div className="flex items-center">
            <CardDescription className="inline-flex items-center">
              {getBankIcon()}
              {bankName || account.type.charAt(0).toUpperCase() + account.type.slice(1)}
            </CardDescription>
            
            {account.type && (
              <Badge variant="outline" className={`ml-2 ${getAccountTypeColor(account.type)}`}>
                {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            className="h-8 w-8 p-0" 
            title="Refresh Account"
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
          >
            <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            className="h-8 w-8 p-0" 
            title="Edit Account"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            className="h-8 w-8 p-0" 
            title="Delete Account"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(account.account_id);
            }}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        <div 
          className={`text-3xl font-bold transition-colors duration-500 ${
            isBalanceUpdated 
              ? account.balance > lastKnownBalance 
                ? 'text-emerald-500' 
                : account.balance < lastKnownBalance 
                  ? 'text-red-500' 
                  : ''
              : ''
          }`}
        >
          {formatNaira(account.balance)}
        </div>
        <div className="text-sm mt-1 text-muted-foreground">
          {account.account_number ? `····${account.account_number.slice(-4)}` : null}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/20 px-4 py-2 flex justify-between items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-1.5 pl-1 hover:bg-background/80"
          onClick={() => onViewCards(account.account_id)}
        >
          <CreditCardIcon className="h-4 w-4" />
          Cards
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AccountCard;
