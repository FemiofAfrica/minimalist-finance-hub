
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
  category_id: string;
}

// Mock transaction parser to use when edge function fails
const mockParseTransaction = (text: string): ParsedTransaction => {
  const isExpense = !text.toLowerCase().includes('earned') && 
                    !text.toLowerCase().includes('received') &&
                    !text.toLowerCase().includes('income');
                    
  const amountMatch = text.match(/[₦$]?\s?(\d+([,.]\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
  
  let description = text;
  if (text.toLowerCase().includes('on')) {
    description = text.toLowerCase().split('on ')[1].split(' ')[0];
  }
  
  // Get current date in ISO format
  const today = new Date().toISOString();
  
  return {
    description: description.charAt(0).toUpperCase() + description.slice(1),
    amount,
    type: isExpense ? "EXPENSE" : "INCOME",
    date: today,
    category_id: isExpense ? "groceries" : "income"
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
      
      let parsedData: ParsedTransaction;
      
      try {
        // Try to use the edge function first
        const { data, error } = await supabase.functions.invoke<ParsedTransaction>('parse-transaction', {
          body: { text: input },
        });

        console.log('Parsed response:', data, error);

        if (error || !data) {
          throw new Error('Edge function failed');
        }
        
        parsedData = data;
      } catch (parseError) {
        console.warn('Edge function failed, using fallback parser', parseError);
        // Use mock parser as fallback
        parsedData = mockParseTransaction(input);
      }

      // Validate the parsed data
      if (!parsedData.description || !parsedData.amount || !parsedData.type || !parsedData.date || !parsedData.category_id) {
        throw new Error('Invalid transaction format');
      }

      // Ensure type is valid
      if (parsedData.type !== "EXPENSE" && parsedData.type !== "INCOME") {
        parsedData.type = "EXPENSE"; // Default to expense if type is invalid
      }

      console.log('Inserting transaction:', parsedData);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to add transactions');
      }

      // Insert the transaction with user_id
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{
          description: parsedData.description,
          amount: parsedData.amount,
          type: parsedData.type,
          date: parsedData.date,
          category_id: parsedData.category_id,
          user_id: user.id
        }]);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      toast({
        title: "Transaction added",
        description: "Your transaction has been successfully recorded.",
      });

      setInput("");
      
      // Dispatch refresh event to update table
      const event = new Event('refresh');
      document.dispatchEvent(event);
      
      onTransactionAdded?.();
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
