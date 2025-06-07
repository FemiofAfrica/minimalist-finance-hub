import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase, callLocalEdgeFunction } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VoiceInput from "@/components/VoiceInput";
import { getDefaultAccount } from "@/services/accountService";
import { createTransferTransaction, createTransaction } from "@/services/transactionService";
import { useAccountStore } from "@/stores/accountStore";
import AccountDialog from "@/components/accounts/AccountDialog";

// Define types for parsed transaction data
interface ParsedTransactionData {
  description: string;
  amount: number;
  category_name: string;
  category_type: string;
  date: string;
  is_transfer?: boolean;
  source_account?: string;
  destination_account?: string;
  account_name?: string;
}

interface AccountData {
  account_id: string;
  name: string;
  currency: string;
}

interface ChatInputProps {
  onTransactionAdded?: () => void; // Optional callback after successful addition
}

const ChatInput = ({ onTransactionAdded }: ChatInputProps) => {
  // --- State ---
  const [input, setInput] = useState(""); // Current text in the input field
  const [isProcessing, setIsProcessing] = useState(false); // Tracks if a submission is in progress
  const [isPreviewMode, setIsPreviewMode] = useState(false); // True when voice input is captured and awaiting confirmation/submit
  const [previewTimeLeft, setPreviewTimeLeft] = useState(3); // Countdown timer for voice preview
  const [showAccountDialog, setShowAccountDialog] = useState(false); // For account creation

  // --- Refs ---
  // Ref for the countdown timer (using browser's setInterval ID type)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref for the input element to manage focus
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Hooks ---
  const { toast } = useToast(); // Hook to display notifications
  const accounts = useAccountStore(state => state.accounts);
  const refreshAccounts = useAccountStore(state => state.refreshAccounts);
  const isLoading = useAccountStore(state => state.isLoading);

  // --- Effects ---
  // Cleanup: Clear any active timer when the component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  // Auto-focus the input field when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Load accounts when component mounts - fix infinite loop
  useEffect(() => {
    // Only fetch if no accounts and not currently loading
    if (accounts.length === 0 && !isLoading) {
      console.log('ChatInput: Loading accounts on mount');
      refreshAccounts();
    }
  }, []); // Empty dependency array - only run once on mount

  const handleAccountDialogClose = async (refresh: boolean = false) => {
    setShowAccountDialog(false);
    if (refresh) {
      // Refresh accounts after creation
      await refreshAccounts();
    }
  };

  // --- Handlers ---

  /**
   * Handles text captured from the VoiceInput component.
   * Sets the input field, starts a preview countdown, and prepares for auto-submission.
   * @param {string} text - The text recognized from voice input.
   */
  const handleVoiceInput = (text: string) => {
    setInput(text); // Update input field state
    setIsPreviewMode(true); // Enter preview mode
    setPreviewTimeLeft(3); // Reset countdown timer display

    // Focus the input field so the user can see the text and potentially edit it
    inputRef.current?.focus();

    // Clear any previously existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start the 3-second countdown timer
    let countdown = 3;
    const countdownInterval = setInterval(() => {
      countdown -= 1;
      setPreviewTimeLeft(countdown); // Update display

      if (countdown <= 0) {
        // When timer reaches zero:
        clearInterval(countdownInterval); // Stop the timer
        timerRef.current = null;
        setIsPreviewMode(false); // Exit preview mode
        // Automatically submit the form
        // Create a synthetic event if needed, or just call the logic directly
        handleSubmit(new Event('submit') as unknown as React.FormEvent);
      }
    }, 1000); // Run every second

    // Store the interval ID so it can be cleared later
    timerRef.current = countdownInterval;

    // Notify the user about the voice input and countdown
    toast({
      title: "Voice Input Captured",
      description: `Submitting in ${countdown}s. Click input to edit.`,
    });
  };

  /**
   * Cancels the auto-submit timer if the user interacts (focuses/clicks)
   * with the input field during the voice preview countdown.
   */
  const handleInputInteraction = () => {
    if (isPreviewMode && timerRef.current) {
      clearInterval(timerRef.current); // Stop the timer
      timerRef.current = null;
      setIsPreviewMode(false); // Exit preview mode
      toast({
        title: "Auto-submit Cancelled",
        description: "Edit the text and submit manually.",
      });
    }
  };

  /**
   * Handles the form submission (manual or automatic after voice input).
   * Sends the input text to the backend function, processes the result,
   * and saves the transaction to the database.
   * @param {React.FormEvent} e - The form submission event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior
    // Ignore submission if input is empty or already processing
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true); // Set processing state
    // Clear any active preview timer if submitting manually
    handleInputInteraction();
    
    // Default currency if we can't determine it later
    let transactionCurrency = 'NGN';

    try {
      console.log('Sending text to parse-transaction-groq function:', input);

      // Call the Edge Function (using the local helper in development)
      const { data: parsedData, error: parseError } = await callLocalEdgeFunction('parse-transaction-groq', {
        text: input
      });

      // Handle errors returned directly from the function invocation (network, permissions, etc.)
      if (parseError) {
        console.error('Supabase function invocation error:', parseError);
        // Check for specific error types if needed (e.g., function not found, auth error)
        throw new Error(`Function Error: ${parseError.message}`);
      }

      // Handle errors returned *within* the function's response (e.g., parsing failed, validation error)
      // The Deno function returns { error: ..., details: ... } on failure
      if (parsedData && parsedData.error) {
          console.error('Error from parse-transaction-groq function:', parsedData);
          throw new Error(parsedData.details || parsedData.error || 'Failed to parse transaction details.');
      }

      // --- Check if this is a transfer transaction ---
      if (parsedData.is_transfer === true || parsedData.category_type === "TRANSFER") {
        console.log('Detected transfer transaction:', parsedData);
        await handleTransferTransaction(parsedData);
        return;
      }

      // --- Validate Successful Response Data ---
      // Check if the expected data structure is present after a successful call
      if (!parsedData || typeof parsedData.description !== 'string' || typeof parsedData.amount !== 'number' || typeof parsedData.category_name !== 'string' || typeof parsedData.category_type !== 'string' || typeof parsedData.date !== 'string') {
          console.error('Invalid data structure received from function:', parsedData);
          throw new Error('Received incomplete or invalid transaction data from the server.');
      }

      // Basic sanity checks (server should handle most validation, but good for robustness)
       if (!parsedData.description) throw new Error('Transaction description is missing.');
       if (isNaN(parsedData.amount) || parsedData.amount < 0) throw new Error('Invalid transaction amount received.');
       if (!parsedData.category_name) throw new Error('Transaction category is missing.');
       if (!['INCOME', 'EXPENSE'].includes(parsedData.category_type)) throw new Error('Invalid transaction type received.');
       if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedData.date)) throw new Error('Invalid date format received.');


      console.log('Successfully parsed transaction data:', parsedData);

      // --- Category Handling ---
      // Check if the category exists in the database
      const categoryTypeLower = parsedData.category_type.toLowerCase() as 'income' | 'expense' | 'transfer';
      
      // Improved category lookup with type filter
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('category_id, name, type')
        .eq('type', categoryTypeLower)
        .ilike('name', parsedData.category_name)
        .maybeSingle();
      
      if (categoryError) {
        console.error('Error checking category:', categoryError);
        // Continue even if there's an error - the backend will handle category creation
      }

      // Log category check results to help debugging
      console.log('Category check results:', { 
        existingCategory, 
        searchedFor: { 
          name: parsedData.category_name, 
          type: categoryTypeLower 
        } 
      });

      // --- Account Handling ---
      let accountId: string | null = null;
      
      // If a specific account name was mentioned, try to find it
      if (parsedData.account_name) {
        const { data: accounts, error: accountsError } = await supabase
          .from('accounts')
          .select('account_id, name, currency')
          .order('is_default', { ascending: false });
        
        if (accountsError) {
          console.error('Error fetching accounts:', accountsError);
          throw new Error('Failed to fetch accounts for transaction processing.');
        }
        
        if (accounts && accounts.length > 0) {
          // Try to find a matching account by name (case-insensitive, partial match)
          const accountNameLower = parsedData.account_name.toLowerCase();
          const matchingAccount = accounts.find(acc => 
            acc.name.toLowerCase().includes(accountNameLower)
          );
          
          if (matchingAccount) {
            accountId = matchingAccount.account_id;
            transactionCurrency = matchingAccount.currency;
            console.log(`Found matching account: ${matchingAccount.name}`);
          }
        }
      }
      
      // If no specific account found, use the default account
      if (!accountId) {
        const defaultAccount = await getDefaultAccount();
        if (defaultAccount) {
          accountId = defaultAccount.account_id;
          transactionCurrency = defaultAccount.currency;
          console.log(`Using default account: ${defaultAccount.name}`);
        }
      }
      
      if (!accountId) {
        // Instead of throwing an error, show helpful message with account creation option
        toast({
          title: 'No Account Found',
          description: 'You need to create an account first to track your transactions.',
          variant: 'destructive',
        });
        return;
      }

      // --- Create Transaction ---
      const transaction = {
        description: parsedData.description,
        amount: parsedData.amount,
        type: categoryTypeLower,
        category_id: existingCategory?.category_id, // Add category_id if found
        category_name: parsedData.category_name, // Always include category_name
        category_type: categoryTypeLower, // Use lowercase version
        date: parsedData.date,
        account_id: accountId,
        user_id: null, // Will be set by service
        currency: transactionCurrency
      };
      
      console.log('Creating transaction:', transaction);
      await createTransaction(transaction);
      
      // Track event
      if (window.mixpanel) {
        window.mixpanel.track('Transaction Added', {
          input_method: 'chat',
          transaction_type: categoryTypeLower,
          transaction_amount: parsedData.amount,
          has_category: !!parsedData.category_name
        });
      }
      
      // Show success toast
      toast({
        title: 'Transaction Added',
        description: `${parsedData.description} for ${transactionCurrency} ${parsedData.amount.toFixed(2)}`,
      });
      
      // Clear input field and reset state
      setInput('');
      
      // Trigger callback if provided
      if (onTransactionAdded) {
        onTransactionAdded();
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error processing transaction:', errorMessage);
      
      toast({
        title: 'Transaction Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Add placeholder handling for transfer transactions
  const handleTransferTransaction = async (parsedData: ParsedTransactionData) => {
    // Implementation details...
    console.log("Transfer transaction processing...", parsedData);
    
    // Call the onTransactionAdded callback if provided
    if (onTransactionAdded) {
      onTransactionAdded();
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <p className="text-sm text-muted-foreground">
        Describe your transaction in plain language. For example: "Spent ₦5000 on groceries yesterday" or "Received ₦50,000 salary on Monday".
      </p>
      
      {/* Show account creation prompt if no accounts exist */}
      {accounts.length === 0 && (
        <div className="p-3 bg-muted rounded-lg border">
          <p className="text-sm text-muted-foreground mb-2">
            You need to create an account first to track your transactions.
          </p>
          <Button 
            onClick={() => setShowAccountDialog(true)}
            size="sm"
            className="w-full"
          >
            Create Your First Account
          </Button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={handleInputInteraction}
            onClick={handleInputInteraction}
            placeholder={accounts.length === 0 ? "Create an account first to add transactions..." : "Enter your transaction here or click the microphone to use voice..."}
            disabled={isProcessing || accounts.length === 0}
            className="flex-1"
          />
          
          <Button 
            type="submit"
            size="icon"
            disabled={!input.trim() || isProcessing || accounts.length === 0}
            aria-label="Send"
            className="h-10 w-10"
          >
            <Send className="h-5 w-5" />
          </Button>
          
          <VoiceInput 
            onTextCaptured={handleVoiceInput}
            disabled={isProcessing || accounts.length === 0} 
          />
        </div>
        
        {isPreviewMode && (
          <div className="text-sm text-muted-foreground">
            Submitting in {previewTimeLeft}s... (Click input to edit)
          </div>
        )}
        
        {isProcessing && (
          <div className="text-sm text-muted-foreground">
            Processing your transaction...
          </div>
        )}
      </form>
      
      {/* Account Dialog for creating accounts */}
      <AccountDialog
        isOpen={showAccountDialog}
        onClose={handleAccountDialogClose}
        account={null}
      />
    </div>
  );
};

export default ChatInput;
