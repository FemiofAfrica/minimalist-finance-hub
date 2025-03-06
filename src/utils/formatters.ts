
import type { Currency } from "@/contexts/CurrencyContext";

// Format number to the user's selected currency
export const formatCurrency = (amount: number, currency: Currency) => {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency.code,
  }).format(amount);
};

// Legacy formatter for backward compatibility
export const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};
