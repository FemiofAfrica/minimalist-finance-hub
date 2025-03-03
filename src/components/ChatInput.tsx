import { useState } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onTransactionAdded?: () => void;
}

interface ParsedTransaction {
  description: string;
  amount: number;
  category_type: string;
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

// More sophisticated transaction parser with category inference
const parseTransaction = (text: string): ParsedTransaction => {
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
  
  // Try to find description
  if (text.toLowerCase().includes('on')) {
    const parts = text.toLowerCase().split('on ');
    if (parts.length > 1) {
      description = parts[1].split(' ')[0];
      description = description.replace(/[.,!?]$/, '');
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }
  } else if (amountMatch && amountMatch.index !== undefined) {
    // If "on" pattern isn't found, try to extract description from words after amount
    const afterAmount = text.substring(amountMatch.index + amountMatch[0].length).trim();
    const firstWordMatch = afterAmount.match(/^(on|for)?\s*(\w+)/i);
    if (firstWordMatch && firstWordMatch[2]) {
      description = firstWordMatch[2];
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }
  }
  
  // Infer category based on keywords in text
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
  let date = new Date();
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('yesterday')) {
    date = new Date();
    date.setDate(date.getDate() - 1);
    console.log("Setting date to yesterday:", date.toISOString());
  } else if (lowerText.includes('today')) {
    date = new Date();
    console.log("Setting date to today:", date.toISOString());
  } else if (lowerText.includes('last week')) {
    date = new Date();
    date.setDate(date.getDate() - 7);
    console.log("Setting date to last week:", date.toISOString());
  } else if (lowerText.includes('last month')) {
    date = new Date();
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

const ChatInput = ({ onTransactionAdded }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      console.log('Sending text to parse:', input);
      
      // Parse the transaction from the input text
      const parsedData = parseTransaction(input);
      console.log('Parsed transaction data:', parsedData);

      // Validate the parsed data
      if (!parsedData.description || !parsedData.amount) {
        throw new Error('Could not extract transaction details from your message');
      }

      console.log('Processing transaction with category:', parsedData.category_name);

      // Check if the category exists
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('category_name', parsedData.category_name)
        .eq('category_type', parsedData.category_type)
        .maybeSingle();

      if (categoryError) {
        console.error('Category lookup error:', categoryError);
        throw categoryError;
      }

      let categoryId;

      // If category doesn't exist, create it
      if (!existingCategory) {
        console.log('Creating new category:', parsedData.category_name);
        
        // Make sure category_type is exactly "INCOME" or "EXPENSE"
        const validCategoryType = parsedData.category_type === "INCOME" || 
                                 parsedData.category_type === "EXPENSE" ? 
                                 parsedData.category_type : "EXPENSE";
        
        const { data: newCategory, error: insertCategoryError } = await supabase
          .from('categories')
          .insert([{
            category_name: parsedData.category_name,
            category_type: validCategoryType
          }])
          .select();

        if (insertCategoryError) {
          console.error('Category creation error:', insertCategoryError);
          throw insertCategoryError;
        }

        categoryId = newCategory?.[0]?.category_id;
        console.log('Created new category with ID:', categoryId);
      } else {
        categoryId = existingCategory.category_id;
        console.log('Found existing category with ID:', categoryId);
      }

      // Insert the transaction with the category ID
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert([{
          description: parsedData.description,
          amount: parsedData.amount,
          category_type: parsedData.category_type,
          category_id: categoryId,
          date: parsedData.date
        }])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Transaction inserted successfully:', data);

      toast({
        title: "Transaction added",
        description: `Your ${parsedData.category_type.toLowerCase()} transaction of ${parsedData.amount} NGN (${parsedData.category_name}) has been recorded.`,
      });

      setInput("");
      
      // Manually trigger a global refresh event to update all transaction components
      console.log("Dispatching refresh event");
      const refreshEvent = new Event('refresh');
      document.dispatchEvent(refreshEvent);
      
      // Also call the onTransactionAdded callback if provided
      if (onTransactionAdded) {
        onTransactionAdded();
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process transaction",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Describe your transaction... (e.g., 'Spent ₦5000 on groceries yesterday')"
        disabled={isProcessing}
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={isProcessing}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};

export default ChatInput;
