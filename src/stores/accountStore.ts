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

// Create the store with stable function references
export const useAccountStore = create<AccountState>()((set, get) => ({
  accounts: [],
  isLoading: false,
  lastUpdated: 0,
  
  // Refresh accounts completely
  refreshAccounts: async () => {
    const state = get();
    if (state.isLoading) {
      console.log('AccountStore: Already loading, skipping refresh');
      return;
    }
    
    try {
      console.log('AccountStore: Starting refresh accounts');
      set({ isLoading: true });
      const accounts = await fetchAccounts();
      console.log(`AccountStore: Refreshed ${accounts.length} accounts`);
      set({ 
        accounts, 
        isLoading: false,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('AccountStore: Error refreshing accounts:', error);
      set({ isLoading: false });
    }
  },
  
  // Just fetch balances for all existing accounts
  fetchBalances: async () => {
    try {
      const { accounts, isLoading } = get();
      
      // Skip if already loading or no accounts
      if (isLoading || !accounts.length) {
        console.log('AccountStore: Skipping balance fetch - loading or no accounts');
        return;
      }
      
      // Get all account IDs
      const accountIds = accounts.map(acc => acc.account_id);
      
      console.log(`AccountStore: Fetching balances for ${accountIds.length} accounts`);
      
      // Fetch latest balances directly from database
      const { data, error } = await supabase
        .from('accounts')
        .select('account_id, balance')
        .in('account_id', accountIds);
        
      if (error) {
        console.error('AccountStore: Error fetching account balances:', error);
        return;
      }
      
      if (!data || !data.length) {
        console.warn('AccountStore: No account balances returned from database');
        return;
      }
      
      // Update accounts with new balances
      let hasUpdates = false;
      const updatedAccounts = accounts.map(account => {
        const updatedAccount = data.find(a => a.account_id === account.account_id);
        if (updatedAccount && updatedAccount.balance !== account.balance) {
          console.log(`AccountStore: Updated ${account.name} balance from ${account.balance} to ${updatedAccount.balance}`);
          hasUpdates = true;
          return {
            ...account,
            balance: updatedAccount.balance
          };
        }
        return account;
      });
      
      // Only update state if there were actual changes
      if (hasUpdates) {
        console.log('AccountStore: Applying balance updates');
        set({ 
          accounts: updatedAccounts,
          lastUpdated: Date.now()
        });
      } else {
        console.log('AccountStore: No balance changes detected');
      }
    } catch (error) {
      console.error('AccountStore: Error fetching account balances:', error);
    }
  },
  
  // Get a single account by ID
  getAccount: (accountId: string) => {
    return get().accounts.find(account => account.account_id === accountId);
  }
})); 