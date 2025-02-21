
import { useState } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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
      // First, parse the natural language input using our Edge Function
      const { data, error: parseError } = await supabase.functions.invoke('parse-transaction', {
        body: { text: input },
      });

      if (parseError) throw parseError;
      if (data.error) throw new Error(data.error);

      // Format the data according to our database schema
      const transaction = {
        description: data.description,
        amount: Math.abs(data.amount), // Store amount as positive number
        type: data.type,
        date: new Date(data.date).toISOString(),
        category_id: data.category_id,
        source: 'chat'
      };

      // Then, insert the parsed transaction into the database
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([transaction]);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to save transaction');
      }

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
