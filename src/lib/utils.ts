import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency.
 * Defaults to NGN (Nigerian Naira) if no currency code is provided.
 * @param amount The number amount to format.
 * @param currency The 3-letter currency code (e.g., 'USD', 'NGN'). Defaults to 'NGN'.
 * @returns The formatted currency string (e.g., "₦1,234.56") or an empty string if formatting fails.
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'NGN'): string {
  if (amount == null) {
    amount = 0; // Default to 0 if amount is null or undefined
  }
  
  try {
    return new Intl.NumberFormat('en-NG', { // Use locale that fits the default currency or make dynamic
      style: 'currency',
      currency: currency,
      // minimumFractionDigits: 2, // Optional: ensure 2 decimal places
      // maximumFractionDigits: 2, // Optional: ensure 2 decimal places
    }).format(amount);
  } catch (error) {
    console.error(`Error formatting currency (${currency}):`, error);
    // Fallback for invalid currency codes or other errors
    return `${currency} ${amount.toFixed(2)}`; 
  }
}
