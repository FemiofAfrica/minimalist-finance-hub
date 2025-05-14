/**
 * Format a number as Naira currency (₦)
 */
export const formatNaira = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return '₦0.00';
  }
  
  // Format with thousand separators and 2 decimal places
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format date to DD/MM/YYYY
export const formatDate = (date: string | Date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
