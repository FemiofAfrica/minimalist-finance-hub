import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount: number) => string;
  formatPossiblyConvertedCurrency: (amount: number) => string;
  exchangeRates: { [key: string]: number } | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [currency, setCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState<{[key: string]: number} | null>(null);

  useEffect(() => {
    // Fetch exchange rates from Supabase (or any other source)
    const fetchExchangeRates = async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('from_currency, to_currency, rate');

      if (error) {
        console.error('Error fetching exchange rates:', error);
        return;
      }

      // Transform the data into a more usable format
      const rates = data.reduce((acc: any, rate: any) => {
        acc[rate.from_currency] = rate.rate;
        return acc;
      }, {});

      setExchangeRates(rates);
    };

    fetchExchangeRates();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatPossiblyConvertedCurrency = (amount: number) => {
    // get the amount in NGN
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: "NGN",
    }).format(amount);
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, formatPossiblyConvertedCurrency, exchangeRates }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
