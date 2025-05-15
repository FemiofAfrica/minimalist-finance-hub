import React from 'react';
import { Button } from '@/components/ui/button';
import { FinanceEvents } from '@/integrations/mixpanel/events';

export function MixpanelFinanceExample() {
  // Example handlers for finance-specific tracking
  const handleSignUp = () => {
    FinanceEvents.trackSignUp({
      method: 'email',
      source: 'homepage'
    });
  };

  const handleAddTransaction = () => {
    FinanceEvents.trackAddTransaction({
      transactionType: 'expense',
      category: 'Food & Dining',
      amount: 42.99,
      currency: 'USD',
      paymentMethod: 'Credit Card'
    });
  };

  const handleAddSubscription = () => {
    FinanceEvents.trackAddSubscription({
      subscriptionName: 'Netflix',
      amount: 15.99,
      currency: 'USD',
      billingCycle: 'monthly',
      category: 'Entertainment'
    });
  };

  const handleCreateBankAccount = () => {
    FinanceEvents.trackCreateBankAccount({
      accountType: 'Checking',
      bank: 'Chase',
      currency: 'USD',
      initialBalance: 1000
    });
  };

  const handleViewCurrency = () => {
    FinanceEvents.trackLiveCurrency({
      currencies: ['USD', 'EUR', 'GBP'],
      baseCurrency: 'USD',
      viewType: 'conversion'
    });
  };

  return (
    <div className="p-4 border rounded-md space-y-4">
      <h2 className="text-lg font-medium mb-4">Finance Events Tracking</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Button onClick={handleSignUp}>
          Track Sign Up
        </Button>
        
        <Button onClick={handleViewCurrency} variant="outline">
          Track Currency View
        </Button>
        
        <Button onClick={handleAddTransaction} variant="secondary">
          Track Add Transaction
        </Button>
        
        <Button onClick={handleAddSubscription} variant="outline">
          Track Add Subscription
        </Button>
        
        <Button onClick={handleCreateBankAccount} className="md:col-span-2">
          Track Create Bank Account
        </Button>
      </div>
    </div>
  );
} 