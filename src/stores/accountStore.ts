import { create } from 'zustand';
import { Account } from '@/types/account';
import { supabase } from '@/integrations/supabase/client';
import { fetchAccounts } from '@/services/accountService';

// Type for the account store
interface AccountState {
  accounts: Account[];
  isLoading: boolean;
  lastUpdated: number;
  refreshAccounts: () => Promise<void>;
  fetchBalances: () => Promise<void>;
  getAccount: (accountId: string) => Account | undefined;
}

// Create the store
export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  isLoading: false,
  lastUpdated: 0,
  
  // Refresh accounts completely
  refreshAccounts: async () => {
    try {
      set({ isLoading: true });
      const accounts = await fetchAccounts();
      console.log(`AccountStore: Refreshed ${accounts.length} accounts`);
      set({ 
        accounts, 
        isLoading: false,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error refreshing accounts:', error);
      set({ isLoading: false });
    }
  },
  
  // Just fetch balances for all existing accounts
  fetchBalances: async () => {
    try {
      const { accounts } = get();
      if (!accounts.length) {
        // If no accounts in store, do a full refresh
        await get().refreshAccounts();
        return;
      }
      
      // Get all account IDs
      const accountIds = accounts.map(acc => acc.account_id);
      
      // Fetch latest balances directly from database
      const { data, error } = await supabase
        .from('accounts')
        .select('account_id, balance')
        .in('account_id', accountIds);
        
      if (error) {
        console.error('Error fetching account balances:', error);
        return;
      }
      
      if (!data || !data.length) {
        console.warn('No account balances returned from database');
        return;
      }
      
      // Update accounts with new balances
      const updatedAccounts = accounts.map(account => {
        const updatedAccount = data.find(a => a.account_id === account.account_id);
        if (updatedAccount && updatedAccount.balance !== account.balance) {
          console.log(`AccountStore: Updated ${account.name} balance from ${account.balance} to ${updatedAccount.balance}`);
          return {
            ...account,
            balance: updatedAccount.balance
          };
        }
        return account;
      });
      
      set({ 
        accounts: updatedAccounts,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('Error fetching account balances:', error);
    }
  },
  
  // Get a single account by ID
  getAccount: (accountId: string) => {
    return get().accounts.find(account => account.account_id === accountId);
  }
})); 