
import { useState } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseTransaction, ParsedTransaction } from "@/utils/transactionParser";

interface ChatInputProps {
  onTransactionAdded?: () => void;
}

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
