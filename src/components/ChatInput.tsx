
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
  type: "EXPENSE" | "INCOME";
  date: string;
}

// More sophisticated transaction parser to handle date parsing
const parseTransaction = (text: string): ParsedTransaction => {
  // Check if it's an expense or income
  const isExpense = !text.toLowerCase().includes('earned') && 
                    !text.toLowerCase().includes('received') &&
                    !text.toLowerCase().includes('income');
                    
  // Extract amount
  const amountMatch = text.match(/[₦$]?\s*(\d+([,.]\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
  
  // Extract description
  let description = "Transaction";
  if (text.toLowerCase().includes('on')) {
    const parts = text.toLowerCase().split('on ');
    if (parts.length > 1) {
      const words = parts[1].split(' ');
      if (words.length > 0) {
        description = words[0];
        // Remove trailing punctuation if any
        description = description.replace(/[.,!?]$/, '');
        // Capitalize first letter
        description = description.charAt(0).toUpperCase() + description.slice(1);
      }
    }
  } else if (amountMatch && amountMatch.index !== undefined) {
    // If "on" pattern isn't found, try to extract description from words after amount
    const afterAmount = text.substring(amountMatch.index + amountMatch[0].length).trim();
    const firstWordMatch = afterAmount.match(/^(on|for)?\s*(\w+)/i);
    if (firstWordMatch && firstWordMatch[2]) {
      description = firstWordMatch[2];
      // Capitalize first letter
      description = description.charAt(0).toUpperCase() + description.slice(1);
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
    type: isExpense ? "EXPENSE" : "INCOME",
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

      console.log('Inserting transaction with parsed data:', parsedData);

      // Insert the transaction into the database
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert([{
          description: parsedData.description,
          amount: parsedData.amount,
          type: parsedData.type,
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
        description: `Your ${parsedData.type.toLowerCase()} transaction of ${parsedData.amount} NGN has been recorded.`,
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
