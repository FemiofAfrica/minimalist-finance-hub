import { MixpanelService } from './index';

/**
 * Finance-specific event tracking for Mixpanel
 */
export const FinanceEvents = {
  /**
   * Track when a user signs up
   */
  trackSignUp: async (properties?: {
    method?: string;
    source?: string;
    referrer?: string;
    [key: string]: any;
  }) => {
    await MixpanelService.trackEvent('Sign Up', properties);
  },

  /**
   * Track when a user views live currency information
   */
  trackLiveCurrency: async (properties?: {
    currencies?: string[];
    baseCurrency?: string;
    viewType?: string;
    [key: string]: any;
  }) => {
    await MixpanelService.trackEvent('Live Currency', properties);
  },

  /**
   * Track when a user adds a transaction
   */
  trackAddTransaction: async (properties?: {
    transactionType?: 'income' | 'expense' | 'transfer';
    category?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    recurring?: boolean;
    [key: string]: any;
  }) => {
    await MixpanelService.trackEvent('Add Transaction', properties);
  },

  /**
   * Track when a user adds a subscription
   */
  trackAddSubscription: async (properties?: {
    subscriptionName?: string;
    amount?: number;
    currency?: string;
    billingCycle?: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
    category?: string;
    [key: string]: any;
  }) => {
    await MixpanelService.trackEvent('Add Subscription', properties);
  },

  /**
   * Track when a user creates a bank account
   */
  trackCreateBankAccount: async (properties?: {
    accountType?: string;
    bank?: string;
    currency?: string;
    initialBalance?: number;
    [key: string]: any;
  }) => {
    await MixpanelService.trackEvent('Create Bank Account', properties);
  }
}; 