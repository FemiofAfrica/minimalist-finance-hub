
import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VoiceInput from "@/components/VoiceInput";

interface ChatInputProps {
  onTransactionAdded?: () => void;
}

const ChatInput = ({ onTransactionAdded }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewTimeLeft, setPreviewTimeLeft] = useState(3);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Clear any existing timers when component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Handle voice input
  const handleVoiceInput = (text: string) => {
    // Set the input field with the recognized text
    setInput(text);
    setIsPreviewMode(true);
    setPreviewTimeLeft(3);
    
    // Focus on the input field to allow user to edit if needed
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Start countdown timer
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      countdown -= 1;
      setPreviewTimeLeft(countdown);
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        setIsPreviewMode(false);
        // Auto-submit after countdown
        handleSubmit(new Event('submit') as unknown as React.FormEvent);
      }
    }, 1000);
    
    // Save the timer reference for cleanup
    timerRef.current = countdownInterval as unknown as NodeJS.Timeout;
    
    toast({
      title: "Voice Input Captured",
      description: `Text will be submitted in ${countdown} seconds. Click the input to edit.`,
    });
  };
  
  // Cancel auto-submit when user interacts with input
  const handleInputFocus = () => {
    if (isPreviewMode && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      setIsPreviewMode(false);
      toast({
        title: "Auto-submit Cancelled",
        description: "You can now edit the text before submitting.",
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      console.log('Sending text to parse:', input);
      
      // Call the Groq-powered edge function to parse the transaction
      const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-transaction-groq', {
        body: { text: input }
      });
      
      if (parseError) {
        console.error('Parse error:', parseError);
        throw new Error('Failed to parse transaction: ' + parseError.message);
      }
      
      console.log('Parsed transaction data:', parsedData);

      // Validate the parsed data
      if (!parsedData.description || parsedData.amount === undefined || parsedData.amount === null) {
        throw new Error('Could not extract transaction details from your message. Please try being more specific about the amount and type of transaction.');
      }
      
      // Ensure category_name is properly set based on the description
      if (!parsedData.category_name && parsedData.description) {
        // For food-related items, categorize as "Food"
        if (parsedData.description.toLowerCase().includes('fruit') || 
            parsedData.description.toLowerCase().includes('food') || 
            parsedData.description.toLowerCase().includes('grocery') || 
            parsedData.description.toLowerCase().includes('meal') || 
            parsedData.description.toLowerCase().includes('lunch') || 
            parsedData.description.toLowerCase().includes('dinner') || 
            parsedData.description.toLowerCase().includes('breakfast')) {
          parsedData.category_name = "Food";
          // If the description specifically mentions fruits, update it to be more specific
          if (parsedData.description.toLowerCase().includes('fruit')) {
            parsedData.description = "Fruits";
          }
        } else {
          // Default to using the description as category if no better match
          parsedData.category_name = parsedData.description;
        }
      }
      
      // Set the name field based on the description without hard-coding prefixes
      if (!parsedData.name && parsedData.description) {
        // Let the AI parser determine the appropriate name based on context
        // This allows for more natural and varied transaction naming
        parsedData.name = parsedData.description;
        
        // If needed, we can enhance the name with additional context from the original input
        // This lets the AI parser be more intelligent in interpretation
        if (input.toLowerCase().includes(parsedData.description.toLowerCase())) {
          // Use the original input context to create a more descriptive name
          const contextWords = input.split(' ').slice(0, 5).join(' ');
          if (contextWords.length > parsedData.description.length) {
            parsedData.name = contextWords;
          }
        }
      }

      // Ensure amount is a number
      if (typeof parsedData.amount !== 'number') {
        parsedData.amount = parseFloat(parsedData.amount);
        if (isNaN(parsedData.amount)) {
          throw new Error('Could not determine the transaction amount. Please specify a clear amount, like "5000 naira".');
        }
      }

      console.log('Processing transaction with category:', parsedData.category_name);

      // Check if the category exists
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('name', parsedData.category_name)
        .eq('type', parsedData.category_type === 'INCOME' ? 'income' : 'expense')
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
            name: parsedData.category_name,
            type: validCategoryType.toLowerCase(),
            user_id: (await supabase.auth.getUser()).data.user?.id
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

      // Format the date correctly
      let transactionDate = parsedData.date;
      if (!transactionDate) {
        // Default to current date
        transactionDate = new Date().toISOString();
      } else if (typeof transactionDate === 'string' && transactionDate.toLowerCase().includes('yesterday')) {
        // Handle 'yesterday' in the date field
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        transactionDate = yesterday.toISOString();
        console.log('Setting date to yesterday:', transactionDate);
      } else if (!transactionDate.includes('T')) {
        // Convert YYYY-MM-DD to ISO format
        transactionDate = new Date(transactionDate).toISOString();
      }

      // Get or create default account
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      let accountId;
      const { data: defaultAccount, error: accountError } = await supabase
        .from('accounts')
        .select('account_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (accountError) {
        // Create default account if none exists
        const { data: newAccount, error: createAccountError } = await supabase
          .from('accounts')
          .insert([{
            name: 'Default Account',
            type: 'checking',
            balance: 0,
            currency: 'NGN',
            is_active: true,
            user_id: userId
          }])
          .select('account_id')
          .single();

        if (createAccountError) throw createAccountError;
        accountId = newAccount.account_id;
      } else {
        accountId = defaultAccount.account_id;
      }

      // Insert the transaction with the category ID and account ID
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert([{
          description: parsedData.description,
          amount: parsedData.amount,
          type: parsedData.category_type?.toLowerCase() === 'income' ? 'income' : 'expense',
          category_id: categoryId,
          date: transactionDate,
          user_id: userId,
          currency: 'NGN',
          account_id: accountId
        }])
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Transaction inserted successfully:', data);

      toast({
        title: `${parsedData.category_type === "INCOME" ? "Income" : "Expense"} added`,
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
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Speak or type in your transaction... (e.g., 'Spent ₦5000 on groceries yesterday')"
          disabled={isProcessing}
          className={`flex-1 ${isPreviewMode ? 'border-blue-500 pr-16' : ''}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
        />
        {isPreviewMode && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
            {previewTimeLeft}s
          </div>
        )}
      </div>
      <VoiceInput onTextCaptured={handleVoiceInput} disabled={isProcessing} />
      <Button type="submit" size="icon" disabled={isProcessing}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};

export default ChatInput;
