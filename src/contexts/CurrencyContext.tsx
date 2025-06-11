import React, { createContext, useContext, useState, useEffect } from "react";

type Currency = {
  code: string;
  symbol: string;
  name: string;
};

// Base currency for fetching rates and for input amounts to conversion functions
const BASE_CURRENCY_CODE = "USD"; 

type CurrencyContextType = {
  currentCurrency: Currency;
  supportedCurrencies: Currency[];
  exchangeRates: Record<string, number>; // Rates relative to BASE_CURRENCY_CODE
  isLiveConversionEnabled: boolean;
  setCurrentCurrency: (currency: Currency) => void;
  toggleLiveConversion: () => void;
  // Converts an amount FROM BASE_CURRENCY_CODE (USD) TO the targetCurrency code
  convertFromBase: (amountInBase: number, targetCurrencyCode: string) => number; 
  // Formats an amount (assumed to be in BASE_CURRENCY_CODE), 
  // optionally converting to currentCurrency if live conversion is enabled
  formatPossiblyConvertedCurrency: (amountInBase: number) => string; 
};

// Default currency is now USD
const defaultCurrency: Currency = {
  code: BASE_CURRENCY_CODE, 
  symbol: "$", // Make sure this matches BASE_CURRENCY_CODE
  name: "US Dollar"
};

// Add NGN, CAD, AUD
const supportedCurrencies: Currency[] = [
  defaultCurrency, // USD
  { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
];

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Local storage key for the preference
const LIVE_CONVERSION_STORAGE_KEY = 'liveCurrencyConversionEnabled';

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Initialize currency from localStorage or default
  const [currentCurrency, setCurrentCurrencyInternal] = useState<Currency>(() => {
      const storedCurrencyCode = localStorage.getItem('selectedCurrencyCode');
      return supportedCurrencies.find(c => c.code === storedCurrencyCode) || defaultCurrency;
  });
  
  // Initialize rates relative to BASE_CURRENCY_CODE (USD)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ [BASE_CURRENCY_CODE]: 1 }); 
  
  // Initialize live conversion preference from localStorage or default (true)
  const [isLiveConversionEnabled, setIsLiveConversionEnabled] = useState<boolean>(() => {
      const storedValue = localStorage.getItem(LIVE_CONVERSION_STORAGE_KEY);
      return storedValue !== null ? storedValue === 'true' : true; // Default to true if not found
  });

  // Fetch rates relative to BASE_CURRENCY_CODE on initial load
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        console.log(`Fetching exchange rates relative to ${BASE_CURRENCY_CODE}...`);
        // Always fetch rates based on the BASE_CURRENCY_CODE
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${BASE_CURRENCY_CODE}` 
        );
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (data && data.rates) {
             setExchangeRates(data.rates);
             console.log("Exchange rates loaded:", data.rates);
        } else {
             throw new Error("Invalid data format received from API");
        }
       
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
        // Keep default rate (1.0 for base) in case of error
         setExchangeRates({ [BASE_CURRENCY_CODE]: 1 });
      }
    };

    fetchExchangeRates();
    // Run only once on mount as base currency doesn't change
  }, []); 

  // Function to set currency and save to localStorage
  const setCurrentCurrency = (currency: Currency) => {
      setCurrentCurrencyInternal(currency);
      localStorage.setItem('selectedCurrencyCode', currency.code);
  };

  // Function to toggle live conversion setting and save to localStorage
  const toggleLiveConversion = () => {
      setIsLiveConversionEnabled(prev => {
          const newValue = !prev;
          localStorage.setItem(LIVE_CONVERSION_STORAGE_KEY, String(newValue));
          console.log("Live conversion toggled:", newValue);
          return newValue;
      });
  };

  // Simplified conversion function: assumes amountInBase is in BASE_CURRENCY_CODE (USD)
  const convertFromBase = (amountInBase: number, targetCurrencyCode: string): number => {
    // If target is base or rates are missing/invalid, return original amount
    if (targetCurrencyCode === BASE_CURRENCY_CODE || !exchangeRates || typeof exchangeRates[targetCurrencyCode] !== 'number' || exchangeRates[targetCurrencyCode] <= 0) {
        // console.warn(`Conversion rate unavailable or invalid for ${targetCurrencyCode}. Returning original amount.`);
        return amountInBase;
    }
    // Convert from base using the rate
    const rate = exchangeRates[targetCurrencyCode];
    return amountInBase * rate;
  };

   // Helper to format amount, converting if needed
   // IMPORTANT: amountInBase is assumed to be in BASE_CURRENCY_CODE (USD)
   const formatPossiblyConvertedCurrency = (amountInBase: number): string => {
       const amountToFormat = isLiveConversionEnabled 
         ? convertFromBase(amountInBase, currentCurrency.code) 
         : amountInBase;
       
       // Use Intl.NumberFormat for proper formatting
       return new Intl.NumberFormat(undefined, { // Use locale default or specify e.g., "en-US"
           style: "currency",
           currency: currentCurrency.code,
           // Add options like minimumFractionDigits if needed
       }).format(amountToFormat);
   };


  return (
    <CurrencyContext.Provider
      value={{
        currentCurrency,
        supportedCurrencies,
        exchangeRates,
        isLiveConversionEnabled,
        setCurrentCurrency,
        toggleLiveConversion,
        convertFromBase,
        formatPossiblyConvertedCurrency // Provide the new formatter
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

// Keep useCurrency hook
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

// Remove old formatCurrency helper, use formatPossiblyConvertedCurrency from context instead
// export const formatCurrency = (amount: number, currency: Currency) => { ... }