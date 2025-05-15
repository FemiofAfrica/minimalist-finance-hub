import { MixpanelService } from './index';

/**
 * Finance-specific event tracking for Mixpanel
 */
export const FinanceEvents = {
  /**
   * Track when a user signs up
   */
  trackSignUp: (properties?: {
    method?: string;
    source?: string;
    referrer?: string;
    [key: string]: any;
  }) => {
    MixpanelService.trackEvent('Sign Up', properties);
  },

  /**
   * Track when a user views live currency information
   */
  trackLiveCurrency: (properties?: {
    currencies?: string[];
    baseCurrency?: string;
    viewType?: string;
    [key: string]: any;
  }) => {
    MixpanelService.trackEvent('Live Currency', properties);
  },

  /**
   * Track when a user adds a transaction
   */
  trackAddTransaction: (properties?: {
    transactionType?: 'income' | 'expense' | 'transfer';
    category?: string;
    amount?: number;
    currency?: string;
    paymentMethod?: string;
    recurring?: boolean;
    [key: string]: any;
  }) => {
    MixpanelService.trackEvent('Add Transaction', properties);
  },

  /**
   * Track when a user adds a subscription
   */
  trackAddSubscription: (properties?: {
    subscriptionName?: string;
    amount?: number;
    currency?: string;
    billingCycle?: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
    category?: string;
    [key: string]: any;
  }) => {
    MixpanelService.trackEvent('Add Subscription', properties);
  },

  /**
   * Track when a user creates a bank account
   */
  trackCreateBankAccount: (properties?: {
    accountType?: string;
    bank?: string;
    currency?: string;
    initialBalance?: number;
    [key: string]: any;
  }) => {
    MixpanelService.trackEvent('Create Bank Account', properties);
  }
}; 