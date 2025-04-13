import React, { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input"; // Assuming shadcn/ui Input
import { Button } from "@/components/ui/button"; // Assuming shadcn/ui Button
import { supabase } from "@/integrations/supabase/client"; // Supabase client instance
import { useToast } from "@/hooks/use-toast"; // Custom toast hook
import VoiceInput from "@/components/VoiceInput"; // Your VoiceInput component
import { Database } from "@/integrations/supabase/types";
import { Transaction } from "@/types/transaction";

interface ChatInputProps {
  onTransactionAdded?: (transaction?: Transaction) => void; // Optional callback after successful addition
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

      // --- Validate Successful Response Data ---
      // Check if the expected data structure is present after a successful call
      // Simplify type checking to avoid excessive type nesting
      if (!parsedData) {
        throw new Error('No data received from server');
      }

      // Validate required fields individually to avoid deep type instantiation
      if (typeof parsedData.description !== 'string') {
        throw new Error('Invalid or missing transaction description');
      }
      if (typeof parsedData.amount !== 'number') {
        throw new Error('Invalid or missing transaction amount');
      }
      if (typeof parsedData.category_name !== 'string') {
        throw new Error('Invalid or missing category name');
      }
      if (typeof parsedData.category_type !== 'string') {
        throw new Error('Invalid or missing category type');
      }
      if (typeof parsedData.date !== 'string') {
        throw new Error('Invalid or missing transaction date');
      }

      // Basic sanity checks (server should handle most validation, but good for robustness)
      if (!parsedData.description) throw new Error('Transaction description is empty.');
      if (isNaN(parsedData.amount) || parsedData.amount < 0) throw new Error('Invalid transaction amount received.');
      if (!parsedData.category_name) throw new Error('Transaction category is missing.');
      if (!['INCOME', 'EXPENSE'].includes(parsedData.category_type)) throw new Error('Invalid transaction type received.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedData.date)) throw new Error('Invalid date format received.');


      console.log('Successfully parsed transaction data:', parsedData);

      // --- Category Handling ---
      // Check if the category exists in the database
      const categoryTypeLower = parsedData.category_type.toLowerCase() as Database['public']['Enums']['transaction_type'];
      const { data: existingCategory, error: categoryError } = await supabase
        .from('categories')
        .select('category_id') // Only select the ID
        .eq('name', parsedData.category_name) // Match name field instead of category_name
        .maybeSingle(); // Expect 0 or 1 result
    
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
    
        // Fix the category insertion by mapping category_name to name field
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

      const { data: defaultAccount } = await supabase
        .from('accounts')
        .select('account_id')
        .eq('user_id', userResponse.user.id)
        .single();

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
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message here..."
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>{msg.content}</li>
        ))}
      </ul>
    </div>
  );
};

export default ChatInput;
