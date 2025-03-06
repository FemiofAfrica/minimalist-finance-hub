import React, { createContext, useContext, useState, useEffect } from "react";

type Currency = {
  code: string;
  symbol: string;
  name: string;
};

type CurrencyContextType = {
  currentCurrency: Currency;
  exchangeRates: Record<string, number>;
  setCurrentCurrency: (currency: Currency) => void;
  convertAmount: (amount: number, fromCurrency: string, toCurrency: string) => number;
};

const defaultCurrency: Currency = {
  code: "NGN",
  symbol: "₦",
  name: "Nigerian Naira"
};

const supportedCurrencies: Currency[] = [
  defaultCurrency,
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
];

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>(defaultCurrency);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        // Note: Replace with your actual API key and preferred exchange rate API
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${currentCurrency.code}`
        );
        const data = await response.json();
        setExchangeRates(data.rates);
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
      }
    };

    fetchExchangeRates();
  }, [currentCurrency.code]);

  const convertAmount = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (!exchangeRates || !exchangeRates[toCurrency]) return amount;
    
    // Convert to base currency first (if not already)
    const inBaseCurrency = fromCurrency === currentCurrency.code
      ? amount
      : amount / exchangeRates[fromCurrency];
    
    // Convert to target currency
    return inBaseCurrency * exchangeRates[toCurrency];
  };

  return (
    <CurrencyContext.Provider
      value={{
        currentCurrency,
        exchangeRates,
        setCurrentCurrency,
        convertAmount,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

export const formatCurrency = (amount: number, currency: Currency) => {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.code,
  }).format(amount);
};