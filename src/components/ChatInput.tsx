import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input"; // Assuming shadcn/ui Input
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui Button
import { supabase } from "@/integrations/supabase/client"; // Supabase client instance
import { useToast } from "@/hooks/use-toast"; // Custom toast hook
import VoiceInput from "@/components/VoiceInput"; // Your VoiceInput component
import { Database } from "@/integrations/supabase/database.types";
import { getDefaultAccount } from "@/services/accountService";
import { createTransferTransaction } from "@/services/transactionService"; // Added import

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

  // --- Refs ---
  // Ref for the countdown timer (using browser's setInterval ID type)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref for the input element to manage focus
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Hooks ---
  const { toast } = useToast(); // Hook to display notifications

  // --- Effects ---
  // Cleanup: Clear any active timer when the component unmounts
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

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

    try {
      console.log('Sending text to parse-transaction-groq function:', input);

      // --- Call Supabase Edge Function ---
      // Invoke the Deno function deployed on Supabase
      const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-transaction-groq', {
        body: { text: input } // Pass the input text in the request body
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
      
      // Disable TypeScript error for this specific line
      // @ts-expect-error - TypeScript has issues with deep type instantiation for Supabase queries
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('category_id')
        .eq('category_name', parsedData.category_name)
        .maybeSingle();
      
      if (categoryError) {
        console.error('Error looking up category:', categoryError);
        throw new Error(`Database error checking category: ${categoryError.message}`);
      }

      let categoryId: string | null = null;

      if (existingCategory) {
        categoryId = existingCategory.category_id;
        console.log(`Found existing category ID: ${categoryId}`);
      } else {
        // Category doesn't exist, create it
        console.log(`Category "${parsedData.category_name}" (${parsedData.category_type}) not found. Creating...`);
        const { data: userResponse, error: userError } = await supabase.auth.getUser();
        if (userError || !userResponse.user) {
            throw new Error("User not authenticated. Cannot create category.");
        }

        const { data: newCategory, error: insertCategoryError } = await supabase
          .from('categories')
          .insert({
            name: parsedData.category_name, // Use name instead of category_name
            user_id: userResponse.user.id, // Associate with the current user
            color: null, // Default color
            icon: null, // Default icon
            category_type: categoryTypeLower // Add category type
          })
          .select('category_id') // Select the ID of the newly created category
          .single(); // Expect exactly one result after insertion

        if (insertCategoryError) {
          console.error('Error creating new category:', insertCategoryError);
          throw new Error(`Database error creating category: ${insertCategoryError.message}`);
        }

        categoryId = newCategory.category_id;
        console.log(`Created new category ID: ${categoryId}`);
      }

      if (!categoryId) {
          throw new Error("Failed to determine category ID for the transaction.");
      }

      // --- Transaction Insertion ---
      // Prepare data for insertion
      const { data: userResponse, error: userError } = await supabase.auth.getUser();
      if (userError || !userResponse.user) {
          throw new Error("User not authenticated.");
      }

      // Get the default account using the accountService
      try {
        const defaultAccount = await getDefaultAccount();
        
        if (!defaultAccount) {
          throw new Error('No default account found for the user.');
        }
        
        const transactionToInsert = {
          description: parsedData.description,
          amount: Number(parsedData.amount),
          type: categoryTypeLower,
          category_id: categoryId as string,
          category_name: parsedData.category_name,
          category_type: parsedData.category_type,
          date: parsedData.date,
          user_id: userResponse.user.id,
          account_id: defaultAccount.account_id,
          currency: 'USD'
        };
        
        console.log('Inserting transaction:', transactionToInsert);
        
        const { data: insertedData, error: insertError } = await supabase
          .from('transactions')
          .insert(transactionToInsert)
          .select(); // Optionally select the inserted row
        
        if (insertError) {
          console.error('Error inserting transaction:', insertError);
          throw new Error(`Database error saving transaction: ${insertError.message}`);
        }
        
        console.log('Transaction inserted successfully:', insertedData);
      } catch (error) {
        if (error instanceof Error && error.message.includes('No default account')) {
          // Provide a more helpful error message that guides the user
          throw new Error('No default account found. Please create an account first in the Accounts & Cards section.');
        }
        throw error;
      }

      // --- Post-Submission Actions ---
      toast({
        title: `${parsedData.category_type === "INCOME" ? "Income" : "Expense"} Added`,
        description: `${parsedData.description} (${parsedData.amount} NGN) recorded for ${parsedData.date}.`,
      });

      setInput(""); // Clear the input field

      // Notify other components about the new transaction
      // 1. Dispatch a global event (if used elsewhere)
      console.log("Dispatching 'refresh-transactions' event.");
      document.dispatchEvent(new CustomEvent('refresh-transactions'));
      // 2. Call the provided callback function
      if (onTransactionAdded) {
        onTransactionAdded();
      }

    } catch (error) {
      // --- Global Error Handling for handleSubmit ---
      console.error('Error processing transaction:', error);
      toast({
        title: "Transaction Error",
        // Display the specific error message caught
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive", // Use error styling for the toast
      });
    } finally {
      // --- Cleanup ---
      setIsProcessing(false); // Always reset processing state
    }
  };

  /**
   * Handles transfer transactions by looking up accounts and creating a transfer
   * @param {ParsedTransactionData} parsedData - The parsed transfer data from the NLP function
   */
  const handleTransferTransaction = async (parsedData: ParsedTransactionData) => {
    try {
      if (!parsedData.amount || parsedData.amount <= 0) {
        throw new Error("Transfer amount must be greater than zero");
      }
      
      if (!parsedData.source_account && !parsedData.destination_account) {
        throw new Error("Could not determine source or destination account from your message");
      }
      
      // Fetch all user accounts to match against the parsed account names
      const { data: userResponse } = await supabase.auth.getUser();
      if (!userResponse?.user) {
        throw new Error("User not authenticated");
      }
      
      interface AccountData {
        account_id: string;
        name: string;
        currency: string;
      }
      
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('account_id, name, currency')
        .eq('user_id', userResponse.user.id);
        
      if (accountsError) {
        throw new Error(`Error fetching accounts: ${accountsError.message}`);
      }
      
      if (!accounts || accounts.length === 0) {
        throw new Error("You don't have any accounts set up. Please create accounts first.");
      }
      
      // Function to find best matching account
      const findMatchingAccount = (searchTerm: string | undefined): AccountData | null => {
        if (!searchTerm) return null;
        
        // Normalize the search term
        const normalizedSearch = searchTerm.toLowerCase().trim();
        
        // First try exact match
        const exactMatch = accounts.find(account => 
          account.name.toLowerCase() === normalizedSearch
        );
        
        if (exactMatch) return exactMatch;
        
        // Then try contains match
        const containsMatch = accounts.find(account => 
          account.name.toLowerCase().includes(normalizedSearch) ||
          normalizedSearch.includes(account.name.toLowerCase())
        );
        
        return containsMatch || null;
      };
      
      // Find source and destination accounts
      const sourceAccount = findMatchingAccount(parsedData.source_account);
      const destinationAccount = findMatchingAccount(parsedData.destination_account);
      
      // If we can't find both accounts but have at least two accounts, use default logic
      if ((!sourceAccount || !destinationAccount) && accounts.length >= 2) {
        // If we found one account, use it and pick another account for the other side
        if (sourceAccount && !destinationAccount) {
          const destAccount = accounts.find(a => a.account_id !== sourceAccount.account_id);
          if (destAccount) {
            await executeTransfer(sourceAccount.account_id, destAccount.account_id, parsedData);
            return;
          }
        } else if (!sourceAccount && destinationAccount) {
          const srcAccount = accounts.find(a => a.account_id !== destinationAccount.account_id);
          if (srcAccount) {
            await executeTransfer(srcAccount.account_id, destinationAccount.account_id, parsedData);
            return;
          }
        } else {
          // If we couldn't find either account, use the first two accounts
          await executeTransfer(accounts[0].account_id, accounts[1].account_id, parsedData);
          return;
        }
      } else if (sourceAccount && destinationAccount) {
        // We found both accounts
        await executeTransfer(sourceAccount.account_id, destinationAccount.account_id, parsedData);
        return;
      }
      
      // If we get here, we couldn't determine the accounts to use
      throw new Error(
        "Could not determine which accounts to use for the transfer. " +
        "Please specify the source and destination accounts more clearly."
      );
    } catch (error) {
      console.error("Error processing transfer:", error);
      throw error; // Re-throw to be caught by the main handler
    }
  };
  
  /**
   * Executes a transfer between the specified accounts
   */
  const executeTransfer = async (sourceAccountId: string, destinationAccountId: string, parsedData: ParsedTransactionData) => {
    // Format date to YYYY-MM-DD
    const date = parsedData.date || new Date().toISOString().split("T")[0];
    
    // Execute the transfer
    const result = await createTransferTransaction(
      sourceAccountId,
      destinationAccountId,
      parsedData.amount,
      date,
      parsedData.description || "Transfer between accounts",
      null // no notes
    );
    
    // Show success message
    toast({
      title: "Transfer Successful",
      description: `${parsedData.amount} transferred between accounts`,
    });
    
    // Clear input
    setInput("");
    
    // Notify other components about the new transaction
    console.log("Dispatching 'refresh-transactions' event.");
    document.dispatchEvent(new CustomEvent('refresh-transactions'));
    
    // Call the provided callback function
    if (onTransactionAdded) {
      onTransactionAdded();
    }
  };

  // --- Render ---
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t bg-background">
      {/* Input field container */}
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe transaction... (e.g., 'Spent ₦5000 on fuel yesterday' or 'Transfer ₦5000 from savings to checking')"
          disabled={isProcessing} // Disable input while processing
          // Add padding-right if preview timer is visible to prevent overlap
          className={`pr-4 ${isPreviewMode ? 'border-blue-500 pr-12' : ''}`} // Adjusted padding
          // Allow Enter key to submit, but not Shift+Enter
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault(); // Prevent newline in input
              handleSubmit(e); // Trigger submission
            }
          }}
          // Cancel voice preview timer on focus or click
          onFocus={handleInputInteraction}
          onClick={handleInputInteraction}
          aria-label="Transaction description input"
        />
        {/* Preview countdown timer display */}
        {isPreviewMode && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full pointer-events-none">
            {previewTimeLeft}s
          </div>
        )}
      </div>
      {/* Voice input button */}
      <VoiceInput onTextCaptured={handleVoiceInput} disabled={isProcessing || isPreviewMode} />
      {/* Submit button */}
      <Button type="submit" size="icon" disabled={isProcessing || !input.trim()} aria-label="Submit transaction">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};

export default ChatInput;
