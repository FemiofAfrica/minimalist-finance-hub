
import { TransactionType } from "@/types/transaction";

export interface ParsedTransaction {
  description: string;
  amount: number;
  category_type: TransactionType;
  category_name: string;
  date: string;
}

// Common expense categories
const EXPENSE_CATEGORIES = [
  "Food", "Groceries", "Dining", "Restaurant", "Rent", "Housing", "Utilities", 
  "Transportation", "Fuel", "Gas", "Car", "Entertainment", "Shopping", "Clothing",
  "Health", "Medical", "Insurance", "Education", "Travel", "Subscription", 
  "Bills", "Maintenance", "Gifts", "Charity", "Electronics", "Personal", 
  "Household", "Phone", "Internet", "Fitness"
];

// Common income categories
const INCOME_CATEGORIES = [
  "Salary", "Wages", "Bonus", "Freelance", "Investment", "Dividend", 
  "Interest", "Rental", "Gift", "Refund", "Commission", "Business", 
  "Royalties", "Pension", "Grant", "Allowance"
];

/**
 * Parses a natural language transaction description into structured data
 * @param text The natural language description of a transaction
 * @returns A structured representation of the transaction
 */
export const parseTransaction = (text: string): ParsedTransaction => {
  // Check if it's an expense or income
  const isExpense = !text.toLowerCase().includes('earned') && 
                    !text.toLowerCase().includes('received') &&
                    !text.toLowerCase().includes('income');
                    
  // Extract amount
  const amountMatch = text.match(/[₦$]?\s*(\d+([,.]\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
  
  // Extract description and infer category
  let description = "Transaction";
  let inferredCategory = isExpense ? "Uncategorized" : "Income";

  // Extract words from the text for category inference
  const words = text.toLowerCase()
    .replace(/[.,!?]/g, '')
    .split(' ')
    .map(word => word.trim())
    .filter(word => word.length > 2);
  
  // Improved description extraction with special handling for "as a" pattern
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('as a gift') || lowerText.includes('as gift')) {
    description = "Gift";
  } else if (lowerText.includes('gift')) {
    description = "Gift";
  } else if (lowerText.includes('on')) {
    const parts = lowerText.split('on ');
    if (parts.length > 1) {
      // Skip prepositions and articles when extracting description
      const skipWords = ['a', 'an', 'the', 'as', 'for', 'on', 'to', 'at', 'in', 'my', 'your', 'their'];
      const words = parts[1].split(' ');
      
      for (const word of words) {
        const cleanWord = word.replace(/[.,!?]$/, '').trim();
        if (cleanWord.length > 1 && !skipWords.includes(cleanWord)) {
          description = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
          break;
        }
      }
    }
  } else if (amountMatch && amountMatch.index !== undefined) {
    // If "on" pattern isn't found, try to extract description from words after amount
    const afterAmount = text.substring(amountMatch.index + amountMatch[0].length).trim();
    
    // Handle cases like "received X as Y" or "spent X on Y"
    if (afterAmount.toLowerCase().includes(' as ')) {
      const parts = afterAmount.toLowerCase().split(' as ');
      if (parts.length > 1) {
        const potentialDescription = parts[1].split(' ')[0].replace(/[.,!?]$/, '');
        if (potentialDescription.length > 1 && potentialDescription !== 'a') {
          description = potentialDescription.charAt(0).toUpperCase() + potentialDescription.slice(1);
        } else if (parts[1].includes('gift')) {
          description = "Gift";
        }
      }
    } else {
      // Skip prepositions and articles when extracting the first meaningful word
      const skipWords = ['a', 'an', 'the', 'as', 'for', 'on', 'to', 'at', 'in', 'my', 'your', 'their'];
      const words = afterAmount.split(' ');
      
      for (const word of words) {
        const cleanWord = word.replace(/[.,!?]$/, '').trim();
        if (cleanWord.length > 1 && !skipWords.includes(cleanWord.toLowerCase())) {
          description = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
          break;
        }
      }
    }
  }
  
  // Special case handling for common transaction types
  if (lowerText.includes('salary') || lowerText.includes('wage') || lowerText.includes('pay')) {
    description = "Salary";
  } else if (lowerText.includes('food') || lowerText.includes('lunch') || 
            lowerText.includes('dinner') || lowerText.includes('breakfast')) {
    description = "Food";
  } else if (lowerText.includes('transport') || lowerText.includes('uber') || 
            lowerText.includes('taxi') || lowerText.includes('fare')) {
    description = "Transport";
  }
  
  // Infer category based on keywords in text and the determined description
  if (isExpense) {
    // Look for expense categories in the text
    for (const category of EXPENSE_CATEGORIES) {
      if (text.toLowerCase().includes(category.toLowerCase())) {
        inferredCategory = category;
        break;
      }
      
      // Check if the description matches a category
      if (description.toLowerCase() === category.toLowerCase()) {
        inferredCategory = category;
        break;
      }
    }
    
    // Additional heuristics for common expenses
    if (inferredCategory === "Uncategorized") {
      if (text.toLowerCase().includes('food') || text.toLowerCase().includes('eat') || 
          text.toLowerCase().includes('restaurant') || text.toLowerCase().includes('lunch') || 
          text.toLowerCase().includes('dinner') || text.toLowerCase().includes('breakfast')) {
        inferredCategory = "Food";
      } else if (text.toLowerCase().includes('transport') || text.toLowerCase().includes('uber') || 
                text.toLowerCase().includes('taxi') || text.toLowerCase().includes('fare')) {
        inferredCategory = "Transportation";
      } else if (text.toLowerCase().includes('shop') || text.toLowerCase().includes('buy') || 
                text.toLowerCase().includes('purchase')) {
        inferredCategory = "Shopping";
      }
    }
  } else {
    // Look for income categories in the text
    for (const category of INCOME_CATEGORIES) {
      if (text.toLowerCase().includes(category.toLowerCase())) {
        inferredCategory = category;
        break;
      }
    }
    
    // Additional heuristics for income
    if (inferredCategory === "Income") {
      if (text.toLowerCase().includes('salary') || text.toLowerCase().includes('wage') || 
          text.toLowerCase().includes('pay')) {
        inferredCategory = "Salary";
      } else if (text.toLowerCase().includes('freelance') || text.toLowerCase().includes('gig')) {
        inferredCategory = "Freelance";
      } else if (text.toLowerCase().includes('bonus')) {
        inferredCategory = "Bonus";
      }
    }
  }
  
  // Parse date from text
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to start of day
  let date = new Date(now);
  
  if (lowerText.includes('yesterday')) {
    date = new Date(now.getTime() - 86400000); // Subtract one day in milliseconds
    console.log("Setting date to yesterday:", date.toISOString());
  } else if (lowerText.includes('today')) {
    // date is already set to today at start of day
    console.log("Setting date to today:", date.toISOString());
  } else if (lowerText.includes('last week')) {
    date = new Date(now.getTime() - 7 * 86400000); // Subtract seven days
    console.log("Setting date to last week:", date.toISOString());
  } else if (lowerText.includes('last month')) {
    date = new Date(now);
    date.setMonth(date.getMonth() - 1);
    console.log("Setting date to last month:", date.toISOString());
  }
  
  return {
    description,
    amount,
    category_type: isExpense ? "EXPENSE" : "INCOME",
    category_name: inferredCategory,
    date: date.toISOString()
  };
};
