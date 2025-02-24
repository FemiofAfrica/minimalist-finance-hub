
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
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category_id: string;
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
      // Parse the natural language input
      const { data: parsedData, error: parseError } = await supabase.functions.invoke<ParsedTransaction>('parse-transaction', {
        body: { text: input },
      });

      if (parseError) throw parseError;
      if (!parsedData) throw new Error('No data returned from parser');

      // Validate the parsed data
      if (!parsedData.description || !parsedData.amount || !parsedData.type || !parsedData.date || !parsedData.category_id) {
        throw new Error('Invalid transaction format returned by AI');
      }

      // Insert the transaction
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{
          description: parsedData.description,
          amount: parsedData.amount,
          type: parsedData.type,
          date: parsedData.date,
          category_id: parsedData.category_id
        }]);

      if (insertError) throw insertError;

      toast({
        title: "Transaction added",
        description: "Your transaction has been successfully recorded.",
      });

      setInput("");
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
