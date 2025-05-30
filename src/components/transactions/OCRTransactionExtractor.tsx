import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createTransaction, createTransferTransaction } from "@/services/transactionService";
import { fetchAccounts, getDefaultAccount } from "@/services/accountService";
import { CalendarIcon, PlusCircle, Search, ArrowLeftRight, Check } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Account } from "@/types/account";
import { TransactionInput } from "@/types/transaction";
import { supabase, callEdgeFunction } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OCRTransactionExtractorProps {
  ocrText: string;
  onTransactionCreated: () => void;
}

// Interface for parsed transaction data from Groq AI
interface ParsedTransactionData {
  description: string;
  amount: number;
  category_name: string;
  category_type: string;
  date?: string;
  is_transfer?: boolean;
  source_account?: string;
  destination_account?: string;
  account_name?: string;
}

// Regex patterns for extracting financial information
const AMOUNT_REGEX = /(?:NGN|₦|N)?\s*([0-9,]+\.[0-9]{2})/g;
const DATE_REGEX = /(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})|(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{2,4})|(\d{1,2}\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{2,4})|(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/gi;
const DESCRIPTION_KEYWORDS = [
  'payment', 'transfer', 'deposit', 'withdrawal', 'purchase', 'subscription',
  'salary', 'income', 'expense', 'bill', 'invoice', 'receipt', 'statement',
  'water', 'electricity', 'narration', 'beneficiary', 'annual'
];

/**
 * Preprocess OCR text to fix common recognition errors, especially for currency amounts
 */
const preprocessOcrText = (text: string): string => {
  if (!text) return '';
  
  let processed = text;
  
  // Replace letter 'O' with digit '0' in numeric contexts
  processed = processed.replace(/([0-9,\.]*)(O)([0-9,\.]*)/g, '$10$3');
  processed = processed.replace(/([0-9,\.]*)(O,O)(O[0-9,\.]*)/g, '$10,0$3');
  processed = processed.replace(/([0-9,\.]*)([O]{2,})([0-9,\.]*)/g, (match, p1, p2, p3) => {
    return p1 + '0'.repeat(p2.length) + p3;
  });
  
  // Fix specific Nigerian currency OCR errors
  processed = processed.replace(/NI\s*(O*,*O*O*O*\.O*O*)/gi, 'N10$1');
  processed = processed.replace(/NI\s*([0-9,\.]+)/gi, 'N1$1');
  processed = processed.replace(/N\s*I\s*([0-9,\.O]+)/gi, 'N1$1');
  processed = processed.replace(/N\s+([0-9,\.]+)/g, 'N$1'); // Remove space after N
  
  // Fix comma/period issues in amounts
  processed = processed.replace(/(\d+)[,\.](\d{3})(?!\d)/g, '$1,$2');
  processed = processed.replace(/(\d+)[,\.](\d{2})(?!\d)/g, '$1.$2');
  
  return processed;
};

const OCRTransactionExtractor = ({ ocrText, onTransactionCreated }: OCRTransactionExtractorProps) => {
  const [extractedAmounts, setExtractedAmounts] = useState<string[]>([]);
  const [extractedDates, setExtractedDates] = useState<string[]>([]);
  const [possibleDescriptions, setPossibleDescriptions] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentTab, setCurrentTab] = useState("ai");
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransactionData[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<ParsedTransactionData | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  // Transaction form values - only needed for edits to AI-detected transactions
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleDateString('en-CA');
  });
  const [accountId, setAccountId] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [categoryName, setCategoryName] = useState('Uncategorized');
  const [categoryType, setCategoryType] = useState('expense');
  
  // Transfer transaction form values
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  
  const { toast } = useToast();
  
  // Helper function to clean and validate narration text
  const cleanNarrationText = (text: string): string => {
    if (!text) return '';
    
    // Remove "Narration:" prefix if it exists
    let cleaned = text.replace(/^narration:\s*/i, '');
    
    // Check if the narration is just an amount
    const amountPattern = /^(?:NGN|N|\$|€|£)?\s*[\d,]+(?:\.\d{2})?$/i;
    if (amountPattern.test(cleaned)) {
      console.log('Narration appears to be just an amount, ignoring:', cleaned);
      return '';
    }
    
    // Check for common non-descriptive values
    const nonDescriptiveValues = ['payment', 'transaction', 'transfer', 'withdrawal', 'deposit'];
    if (nonDescriptiveValues.includes(cleaned.toLowerCase())) {
      console.log('Narration is non-descriptive, ignoring:', cleaned);
      return '';
    }
    
    return cleaned;
  };
  
  // Process OCR text when it changes
  useEffect(() => {
    if (!ocrText) return;
    
    // Debug currency detection with test cases
    if (process.env.NODE_ENV === 'development') {
      testCurrencyDetection();
    }
    
    // Preprocess the OCR text to fix common recognition errors
    const processedOcrText = preprocessOcrText(ocrText);
    console.log("Original OCR text:", ocrText.substring(0, 200));
    console.log("Preprocessed OCR text:", processedOcrText.substring(0, 200));
    
    // Extract financial data using regex patterns
    extractFinancialData(processedOcrText);
    
    // Process with Groq AI
    processWithGroqAI(processedOcrText);
    
    // Load user accounts
    loadAccounts();
  }, [ocrText]);
  
  // Debug function to test currency detection with problematic OCR readings
  const testCurrencyDetection = () => {
    const testCases = [
      "NI O,OOO.OO", // Should detect as 10,000.00
      "N1O,OOO.OO",  // Should detect as 10,000.00
      "N IO,OOO.OO", // Should detect as 10,000.00
      "₦ I0,000.00", // Should detect as 10,000.00
      "N 1,OOO.OO",  // Should detect as 1,000.00
      "NGN 1,000.00", // Standard format
      "Amount: NGN 5,000.00", // With label
      "N5,000", // Without decimals
      "N 5,000,00" // European format with comma as decimal
    ];
    
    console.log("===== TESTING CURRENCY DETECTION =====");
    testCases.forEach(testCase => {
      const processed = preprocessOcrText(testCase);
      console.log(`Original: "${testCase}" -> Processed: "${processed}"`);
      
      // Extract amounts using our extraction function
      const amounts = Array.from(processed.matchAll(/(?:N|₦|NGN)(?:\s*)(I|1)(?:\s*)(?:O|0),(?:O|0)(?:O|0)(?:O|0)\.(?:O|0)(?:O|0)/gi))
        .map(match => match[0])
        .filter(Boolean);
      
      if (amounts.length > 0) {
        console.log(`   Detected with Nigerian pattern: ${amounts[0]}`);
      }
      
      // Try normal patterns too
      const normalAmounts = Array.from(processed.matchAll(/(?:NGN|₦|N)\s*([\d,]+(?:\.\d{2})?)/gi))
        .map(match => match[0])
        .filter(Boolean);
        
      if (normalAmounts.length > 0) {
        console.log(`   Detected with standard pattern: ${normalAmounts[0]}`);
      }
      
      // Get the final value we would use
      const extractedAmounts = extractAmounts(processed);
      if (extractedAmounts.length > 0) {
        console.log(`   Final parsed amount: ${extractedAmounts[0]}`);
      } else {
        console.log(`   FAILED TO PARSE`);
      }
      console.log("-----------------------------------");
    });
    console.log("===== END CURRENCY DETECTION TEST =====");
  };
  
  // Add the categorizeByDescription helper function
  const categorizeByDescription = (description: string): { category: string, type: string } => {
    const lowerDesc = description.toLowerCase();
    
    // Transfer indicators
    if (lowerDesc.includes('transfer') || lowerDesc.includes('sent') || 
        lowerDesc.includes('remittance') || lowerDesc.includes('beneficiary')) {
      return { category: 'Transfer', type: 'TRANSFER' };
    }
    
    // Utilities
    if (lowerDesc.includes('water') || lowerDesc.includes('electricity') || 
        lowerDesc.includes('power') || lowerDesc.includes('bill') ||
        lowerDesc.includes('utility') || lowerDesc.includes('internet') ||
        lowerDesc.includes('wifi') || lowerDesc.includes('broadband')) {
      return { category: 'Utilities', type: 'EXPENSE' };
    }
    
    // Transport
    if (lowerDesc.includes('bus') || lowerDesc.includes('taxi') || 
        lowerDesc.includes('uber') || lowerDesc.includes('bolt') || 
        lowerDesc.includes('ride') || lowerDesc.includes('train') || 
        lowerDesc.includes('transport') || lowerDesc.includes('fare') ||
        lowerDesc.includes('fuel') || lowerDesc.includes('petrol')) {
      return { category: 'Transport', type: 'EXPENSE' };
    }
    
    // Food/Dining
    if (lowerDesc.includes('food') || lowerDesc.includes('restaurant') || 
        lowerDesc.includes('meal') || lowerDesc.includes('cafe') || 
        lowerDesc.includes('lunch') || lowerDesc.includes('dinner') ||
        lowerDesc.includes('breakfast') || lowerDesc.includes('snack')) {
      return { category: 'Dining', type: 'EXPENSE' };
    }
    
    // Groceries
    if (lowerDesc.includes('grocery') || lowerDesc.includes('supermarket') || 
        lowerDesc.includes('market') || lowerDesc.includes('store') ||
        lowerDesc.includes('shopping')) {
      return { category: 'Groceries', type: 'EXPENSE' };
    }
    
    // Income/Salary
    if (lowerDesc.includes('salary') || lowerDesc.includes('wage') || 
        lowerDesc.includes('income') || lowerDesc.includes('payment received') ||
        lowerDesc.includes('allowance') || lowerDesc.includes('bonus')) {
      return { category: 'Salary', type: 'INCOME' };
    }
    
    // Default
    return { category: 'Uncategorized', type: 'EXPENSE' };
  };
  
  // Extract amounts as a standalone function for testing
  const extractAmounts = (text: string): string[] => {
    // Simplified amount patterns focusing on accuracy over complexity
    const patterns = [
      // Primary pattern: currency symbol followed by amount with optional decimal
      // This pattern will match N24000.00, NGN 5,000.00, ₦1,234.56
      /(?:NGN|₦|N)\s*([\d,]+(?:\.\d{2})?)/gi,
      
      // Secondary pattern: amount followed by currency name
      /([\d,]+(?:\.\d{2})?)\s*(?:NGN|naira)/gi,
      
      // Amount near transaction keywords
      /(?:amount|total|payment|fee|charge|bill)\s*(?:[:]\s*)?([\d,]+(?:\.\d{2})?)/gi,
      
      // Fallback for any number with exactly 2 decimal places (common in financial contexts)
      /\b([\d,]+\.\d{2})\b/g
    ];
    
    let foundAmounts: string[] = [];
    
    // Try each pattern in order of priority
    for (const pattern of patterns) {
      if (!pattern.flags.includes('g')) {
        console.warn('RegExp without global flag used with matchAll:', pattern);
        continue;
      }
      
      const matches = Array.from(text.matchAll(pattern))
        .map(match => match[1])
        .filter(Boolean)
        .map(amount => {
          // Simple cleaning - just remove commas and ensure decimal point
          let cleaned = amount.replace(/,/g, '');
          
          // Replace 'O' with '0' in numeric contexts (common OCR error)
          cleaned = cleaned.replace(/O/gi, '0');
          
          return cleaned;
        });
        
      if (matches.length > 0) {
        console.log(`Found amounts using pattern ${pattern}:`, matches);
        foundAmounts = [...foundAmounts, ...matches];
      }
    }
    
    // Deduplicate and sort by value (largest first, as it's likely the main amount)
    return [...new Set(foundAmounts)]
      .sort((a, b) => parseFloat(b) - parseFloat(a));
  };
  
  // Update the extractFinancialData method
  const extractFinancialData = (text: string) => {
    // Extract amounts using the improved method
    const amountMatches = extractAmounts(text);
    setExtractedAmounts([...new Set(amountMatches)]);
    
    // Extract dates
    const dateMatches = Array.from(text.matchAll(DATE_REGEX))
      .map(match => match[0])
      .filter(Boolean);
    setExtractedDates([...new Set(dateMatches)]);
    
    // Extract possible descriptions
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const descriptionsFound = lines.filter(line => 
      DESCRIPTION_KEYWORDS.some(keyword => 
        line.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    setPossibleDescriptions([...new Set(descriptionsFound)]);
  };
  
  // Parse transaction data using the Supabase Edge Function
  const parseTransactionWithAI = async (segment: string, contextData: { 
    regexAmount?: number, 
    regexDate?: string, 
    narrationText?: string 
  }) => {
    console.log('Sending OCR segment to parse-transaction-groq function:', segment);
    
    try {
      // Call the edge function with proper error handling
      const { data: parsedData, error: parseError } = await callEdgeFunction('parse-transaction-groq', {
        text: segment,
        context_amount: contextData.regexAmount,
        context_date: contextData.regexDate,
        context_narration: contextData.narrationText
      });
      
      if (parseError) {
        console.error('Error calling parse-transaction-groq function:', parseError);
        // Use local fallback parser if edge function fails
        return createLocalParsedTransaction(segment, contextData);
      }
      
      // Handle errors within the function's response
      if (parsedData && parsedData.error) {
        console.error('Error from parse-transaction-groq function:', parsedData);
        // Use local fallback parser if edge function fails
        return createLocalParsedTransaction(segment, contextData);
      }
      
      // Validate response data
      if (
        !parsedData || 
        typeof parsedData.description !== 'string' || 
        typeof parsedData.amount !== 'number' || 
        typeof parsedData.category_name !== 'string' || 
        typeof parsedData.category_type !== 'string'
      ) {
        console.error('Invalid data structure received from function:', parsedData);
        // Use local fallback parser if edge function returns invalid data
        return createLocalParsedTransaction(segment, contextData);
      }
      
      return parsedData;
    } catch (error) {
      console.error('Error calling parse-transaction-groq function:', error);
      // Use local fallback parser if edge function throws
      return createLocalParsedTransaction(segment, contextData);
    }
  };
  
  // Fallback parser when the edge function fails
  const createLocalParsedTransaction = (text: string, contextData: {
    regexAmount?: number,
    regexDate?: string,
    narrationText?: string
  }): ParsedTransactionData | null => {
    try {
      console.log('Using local fallback parser for transaction data');
      
      // Extract description from text
      let description = '';
      
      // Look for "NARRATION" section specifically
      const narrationMatch = text.match(/narration(?:\s*:)?\s*([^\n\r.]+)/i);
      if (narrationMatch && narrationMatch[1] && narrationMatch[1].trim().length > 3) {
        description = narrationMatch[1].trim();
        console.log('Found narration in text:', description);
      } 
      // Check for "Annual Water Bill" specifically (from the example)
      else if (text.toLowerCase().includes('annual water bill')) {
        description = 'Annual Water Bill';
        console.log('Found "Annual Water Bill" in text');
      }
      // Check context data
      else if (contextData.narrationText && contextData.narrationText.trim().length > 3) {
        description = contextData.narrationText;
        console.log('Using context narration:', description);
      } 
      // Look for beneficiary or purpose
      else {
        const beneficiaryMatch = text.match(/beneficiary(?:\s*:)?\s*([^\n\r.]+)/i);
        const purposeMatch = text.match(/purpose(?:\s*:)?\s*([^\n\r.]+)/i);
        const paymentForMatch = text.match(/payment for(?:\s*:)?\s*([^\n\r.]+)/i);
        const oneOffPaymentMatch = text.match(/one off payment(?:\s*:)?\s*([^\n\r.]+)/i);
        
        if (beneficiaryMatch && beneficiaryMatch[1] && beneficiaryMatch[1].trim().length > 3) {
          // Check if this is a real name, not just "Access Bank" etc.
          const bankName = beneficiaryMatch[1].trim();
          // If it has "Bank" in the name, prefix with "To:" for clarity
          if (bankName.toLowerCase().includes('bank')) {
            description = `To: ${bankName}`;
          } else {
            description = bankName;
          }
          console.log('Using beneficiary as description:', description);
        } else if (purposeMatch && purposeMatch[1] && purposeMatch[1].trim().length > 3) {
          description = purposeMatch[1].trim();
          console.log('Using purpose as description:', description);
        } else if (paymentForMatch && paymentForMatch[1] && paymentForMatch[1].trim().length > 3) {
          description = paymentForMatch[1].trim();
          console.log('Using "payment for" as description:', description);
        } else if (oneOffPaymentMatch) {
          // If we found "one off payment" but not the detail after it
          if (text.toLowerCase().includes('water') || text.toLowerCase().includes('utility')) {
            description = 'Water Bill Payment';
            console.log('Inferred water bill payment from context');
          } else {
            description = 'One-Off Payment';
            console.log('Using "One-Off Payment" as generic description');
          }
        } else {
          // Look through the text for any line that might be a good description
          const lines = text.split('\n');
          for (const line of lines) {
            const trimmedLine = line.trim();
            // Skip short lines or lines that are just labels or categories
            if (trimmedLine.length > 5 && 
                !trimmedLine.match(/^(sender|receiver|beneficiary|amount|narration|date|status|notice):?$/i) &&
                !trimmedLine.match(/^(transaction|receipt|payment)$/i)) {
              
              // Check if this line has any description-like keywords
              if (trimmedLine.toLowerCase().includes('water') || 
                  trimmedLine.toLowerCase().includes('bill') ||
                  trimmedLine.toLowerCase().includes('payment for') ||
                  trimmedLine.toLowerCase().includes('annual')) {
                description = trimmedLine;
                console.log('Found potential description in text line:', description);
                break;
              }
            }
          }
          
          // If we still don't have a description, use a default based on the text
          if (!description) {
            description = text.includes('annual water bill') ? 
              'Annual Water Bill' : 
              (text.split('\n')[0]?.trim() || 'Transaction');
            console.log('Using fallback description:', description);
          }
        }
      }
      
      // Use regex amount or extract from text
      let amount = contextData.regexAmount || 0;
      if (!amount) {
        const amountMatch = text.match(/(?:ngn|₦|n)\s*([\d,]+(?:\.\d{2})?)/i);
        if (amountMatch && amountMatch[1]) {
          amount = parseFloat(amountMatch[1].replace(/,/g, ''));
          console.log('Extracted amount from text:', amount);
        }
      }
      
      // Determine if this is a transfer
      const isTransfer = /transfer|sent|beneficiary|recipient/i.test(text);
      
      // Determine category based on the description and text content
      let category = 'Uncategorized';
      let categoryType = 'EXPENSE';
      
      if (isTransfer) {
        category = 'Transfer';
        categoryType = 'TRANSFER';
      } else if (/water|electricity|bill|utility/i.test(text) || /water|electricity|bill|utility/i.test(description)) {
        category = 'Utilities';
        console.log('Transaction appears to be a utility bill, categorizing accordingly');
      } else if (/transport|uber|bolt|taxi|fuel/i.test(text) || /transport|uber|bolt|taxi|fuel/i.test(description)) {
        category = 'Transport';
      } else if (/food|restaurant|meal|cafe/i.test(text) || /food|restaurant|meal|cafe/i.test(description)) {
        category = 'Dining';
      } else if (/grocery|supermarket|market|store/i.test(text) || /grocery|supermarket|market|store/i.test(description)) {
        category = 'Groceries';
      } else if (/salary|wage|income/i.test(text) || /salary|wage|income/i.test(description)) {
        category = 'Salary';
        categoryType = 'INCOME';
      }
      
      // Extract source and destination for transfers
      let sourceAccount = null;
      let destinationAccount = null;
      
      if (isTransfer) {
        const senderMatch = text.match(/sender(?:\s*:)?\s*([^\n\r.]+)/i);
        const receiverMatch = text.match(/(?:receiver|beneficiary)(?:\s*:)?\s*([^\n\r.]+)/i);
        
        if (senderMatch && senderMatch[1]) {
          sourceAccount = senderMatch[1].trim();
          console.log('Extracted sender:', sourceAccount);
        }
        
        if (receiverMatch && receiverMatch[1]) {
          destinationAccount = receiverMatch[1].trim();
          console.log('Extracted recipient:', destinationAccount);
        }
      }
      
      return {
        description,
        amount,
        category_name: category,
        category_type: categoryType,
        date: contextData.regexDate,
        is_transfer: isTransfer,
        source_account: sourceAccount,
        destination_account: destinationAccount
      };
    } catch (error) {
      console.error('Error in local fallback parser:', error);
      return null;
    }
  };
  
  const processWithGroqAI = async (processedText = ocrText) => {
    // Skip if no text or already processing
    if (!processedText.trim() || isProcessingAI) return;
    
    console.log("============== TRANSACTION EXTRACTION PROCESS ==============");
    console.log("Starting transaction extraction with OCR text obtained from OCR.space");
    console.log("OCR Text length:", processedText.length);
    console.log("First 200 characters of OCR text:", processedText.substring(0, 200));
    
    setIsProcessingAI(true);
    setParsedTransactions([]);
    setSelectedTransaction(null);
    
    // Extract dates
    const extractedDateMatches = Array.from(processedText.matchAll(DATE_REGEX))
      .map(match => match[0])
      .filter(Boolean);
    
    console.log('Raw extracted dates:', extractedDateMatches);
    
    // Get the most likely date (first detected date or today)
    const regexDate = extractedDateMatches.length > 0 
      ? formatAndValidateDate(extractedDateMatches[0]) 
      : new Date().toLocaleDateString('en-CA');
    
    console.log('Formatted date for AI processing:', regexDate);
    
    // Get the largest amount as the primary transaction amount
    const extractedAmounts = extractAmounts(processedText);
    const regexAmount = extractedAmounts.length > 0 ? parseFloat(extractedAmounts[0]) : undefined;
    console.log('Extracted primary amount:', regexAmount);
    
    // Simplified narration extraction - focus on explicit narration markers
    const narrationRegex = /(?:narration|purpose|description|reference)[\s:]+([^\n\r.]+)/gi;
    const narrationMatches = Array.from(processedText.matchAll(narrationRegex));
    
    // Get the first match that isn't just a generic term
    let narrationText = '';
    if (narrationMatches.length > 0 && narrationMatches[0][1]) {
      narrationText = narrationMatches[0][1].trim();
      
      // Filter out generic descriptions
      const genericTerms = ['payment', 'transaction', 'transfer', 'online', 'receipt'];
      if (genericTerms.some(term => narrationText.toLowerCase() === term)) {
        narrationText = '';
      }
    }
    
    console.log('Extracted narration:', narrationText);
    
    try {
      // Split the OCR text into logical segments but with simpler approach
      const segments = splitTextIntoSegments(processedText);
      const parsedResults: ParsedTransactionData[] = [];
      
      // Process the most relevant segment first (one with amount or narration)
      const sortedSegments = [...segments].sort((a, b) => {
        const aHasAmount = extractAmounts(a).length > 0;
        const bHasAmount = extractAmounts(b).length > 0;
        const aHasNarration = a.toLowerCase().includes('narration');
        const bHasNarration = b.toLowerCase().includes('narration');
        
        // Prioritize segments with both amount and narration
        if ((aHasAmount && aHasNarration) && !(bHasAmount && bHasNarration)) return -1;
        if (!(aHasAmount && aHasNarration) && (bHasAmount && bHasNarration)) return 1;
        
        // Then prioritize segments with amounts
        if (aHasAmount && !bHasAmount) return -1;
        if (!aHasAmount && bHasAmount) return 1;
        
        // Then prioritize segments with narration
        if (aHasNarration && !bHasNarration) return -1;
        if (!aHasNarration && bHasNarration) return 1;
        
        // Longer segments might contain more complete information
        return b.length - a.length;
      });
      
      // Context data for AI processing
      const contextData = {
        regexAmount,
        regexDate,
        narrationText
      };
      
      // Process each segment with the parser
      for (const segment of sortedSegments) {
        if (segment.trim().length < 10) continue; // Skip very short segments
        
        // Use the new parseTransactionWithAI function
        const parsedData = await parseTransactionWithAI(segment, contextData);
        
        if (!parsedData) {
          console.warn('Failed to parse segment with AI, continuing to next segment');
          continue;
        }
        
        // Use extracted narration if available
        if (narrationText) {
          parsedData.description = narrationText;
        }
        
        // Always use the detected amount if available and significantly larger
        // (Some receipts have small fees or taxes that shouldn't override the main amount)
        if (regexAmount && (!parsedData.amount || regexAmount > parsedData.amount * 1.5)) {
          console.log(`Overriding amount ${parsedData.amount} with larger detected amount ${regexAmount}`);
          parsedData.amount = regexAmount;
        }
        
        // Always use the detected date if available
        if (regexDate) {
          parsedData.date = regexDate;
        }
        
        // Identify if this is a utility bill based on keywords
        if (
          (narrationText && /water|electricity|internet|power|utility|bill/i.test(narrationText)) ||
          (segment && /water|electricity|internet|power|utility|bill/i.test(segment))
        ) {
          console.log('Transaction appears to be a utility bill, categorizing accordingly');
          parsedData.category_name = 'Utilities';
          parsedData.category_type = 'EXPENSE';
        }
        
        // Add to parsed results if it looks valid
        if (parsedData.description && parsedData.amount > 0) {
          // Check for duplicates but with simpler logic
          const isDuplicate = parsedResults.some(existing => 
            Math.abs(existing.amount - parsedData.amount) < 0.01
          );
          
          if (!isDuplicate) {
            console.log('Adding parsed transaction:', JSON.stringify(parsedData));
            parsedResults.push(parsedData);
          }
        }
        
        // If we've found a good transaction with a significant amount, stop processing
        if (parsedResults.length > 0 && 
            parsedResults[0].amount > 0 && 
            parsedResults[0].description && 
            parsedResults[0].description !== 'Transaction') {
          break;
        }
      }
      
      // Sort transactions by amount (descending) to prioritize the main transaction
      const sortedTransactions = parsedResults.sort((a, b) => b.amount - a.amount);
      setParsedTransactions(sortedTransactions);
      
      // If we found transactions, show a notification
      if (sortedTransactions.length > 0) {
        toast({
          title: "Transactions Found",
          description: `Found ${sortedTransactions.length} potential transactions in the document.`,
          variant: "default",
        });
      } else {
        toast({
          title: "No Transactions Found",
          description: "Could not identify any transactions in the document.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error processing with Groq AI:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process the document with AI.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingAI(false);
    }
  };
  
  // Simplified text segmentation that focuses on transaction-relevant sections
  const splitTextIntoSegments = (text: string): string[] => {
    const segments: string[] = [];
    
    // Remove common footer content that might confuse extraction
    const cleanedText = text.replace(/this is an authentic receipt.+/i, '')
                           .replace(/for further inquiries.+/i, '')
                           .replace(/generated from.+banking/i, '')
                           .replace(/email customer.+/i, '');
    
    // First split by blank lines (most receipts use these as separators)
    const blocks = cleanedText.split(/\n\s*\n/);
    
    // Process each block
    for (const block of blocks) {
      if (block.trim().length < 5) continue;
      
      // Check if this block has transaction-relevant keywords
      const isRelevant = /amount|total|payment|narration|description|transaction|beneficiary|sender|bill/i.test(block);
      
      if (isRelevant) {
        // This is a high-priority segment, add it first
        segments.unshift(block.trim());
      } else {
        // Lower priority segment
        segments.push(block.trim());
      }
    }
    
    // If no good segments found, fallback to line-by-line with minimum filtering
    if (segments.length === 0) {
      const lines = cleanedText.split('\n');
      let currentSegment: string[] = [];
      
      for (const line of lines) {
        if (line.trim().length > 0) {
          currentSegment.push(line.trim());
        } else if (currentSegment.length > 0) {
          segments.push(currentSegment.join(' '));
          currentSegment = [];
        }
      }
      
      if (currentSegment.length > 0) {
        segments.push(currentSegment.join(' '));
      }
    }
    
    return segments;
  };
  
  // Extract and format date from text
  const extractDateFromText = (text: string): string | null => {
    try {
      // Try to parse date in various formats
      const dateMatches = text.match(DATE_REGEX);
      if (!dateMatches) return null;
      
      const dateStr = dateMatches[0];
      return formatAndValidateDate(dateStr);
      } catch (error) {
        console.error('Error parsing date:', error);
      return null;
    }
  };
  
  // Format and validate date string to YYYY-MM-DD
  const formatAndValidateDate = (dateStr: string): string => {
    try {
      console.log(`Formatting date string: "${dateStr}"`);
      
      // Handle complex date formats with day of week, month name, day with suffix, and time
      // Example: "Tuesday, May 20th, 2025 | 3:55 PM"
      const complexDatePattern = /(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})(?:\s*\|?\s*\d{1,2}:\d{2}\s*(?:AM|PM)?)?/i;
      
      const complexMatch = dateStr.match(complexDatePattern);
      if (complexMatch) {
        const fullText = complexMatch[0];
        const day = parseInt(complexMatch[1]);
        const year = parseInt(complexMatch[2]);
        
        // Extract month name from the full matched text
        const monthPattern = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;
        const monthMatch = fullText.match(monthPattern);
        
        if (monthMatch && day && year) {
          const monthName = monthMatch[1].toLowerCase();
          
          // Map month names to numbers
          const monthMap: {[key: string]: string} = {
            'january': '01', 'february': '02', 'march': '03', 'april': '04',
            'may': '05', 'june': '06', 'july': '07', 'august': '08',
            'september': '09', 'october': '10', 'november': '11', 'december': '12',
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 
            'oct': '10', 'nov': '11', 'dec': '12'
          };
          
          const month = monthMap[monthName];
          if (month) {
            const paddedDay = day.toString().padStart(2, '0');
            const formattedDate = `${year}-${month}-${paddedDay}`;
            console.log(`Complex date format detected. Parsed "${dateStr}" to "${formattedDate}"`);
            
            const testDate = new Date(formattedDate);
            if (!isNaN(testDate.getTime())) {
              return formattedDate;
            }
          }
        }
      }
      
      // FIRST try to parse "DD Month YYYY" format (e.g., "3 April 2025")
      // This needs to come first to ensure it has priority
      const monthNamePattern = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/;
      const monthMatch = dateStr.match(monthNamePattern);
      if (monthMatch) {
        const day = monthMatch[1].padStart(2, '0');
        let month;
        
        // Map month names to numbers
        const monthMap: {[key: string]: string} = {
          'january': '01', 'february': '02', 'march': '03', 'april': '04',
          'may': '05', 'june': '06', 'july': '07', 'august': '08',
          'september': '09', 'october': '10', 'november': '11', 'december': '12',
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
          'jun': '06', 'jul': '07', 'aug': '08', 'sep': '09', 
          'oct': '10', 'nov': '11', 'dec': '12'
        };
        
        const monthName = monthMatch[2].toLowerCase();
        month = monthMap[monthName];
        
        if (month) {
          const year = monthMatch[3];
          const formattedDate = `${year}-${month}-${day}`;
          console.log(`Month name format detected. Parsed "${dateStr}" to "${formattedDate}"`);
          
          const testDate = new Date(formattedDate);
          if (!isNaN(testDate.getTime())) {
            return formattedDate;
          }
        }
      }
      
      // THEN try to parse with Date.parse (less reliable for format-specific parsing)
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        const result = dateObj.toISOString().split('T')[0];
        console.log(`Standard date format detected. Parsed "${dateStr}" to "${result}"`);
        return result;
      }
      
      // THEN try to parse common formats DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
      const dmyMatch = dateStr.match(/(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})/);
      if (dmyMatch) {
        const [_, day, month, year] = dmyMatch;
        // Convert 2-digit year to 4-digit
        const fullYear = year.length === 2 ? `20${year}` : year;
        // Create a date using YYYY-MM-DD format
        const formattedDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log(`DMY format detected. Parsed "${dateStr}" to "${formattedDate}"`);
        
        const testDate = new Date(formattedDate);
        if (!isNaN(testDate.getTime())) {
          return formattedDate;
        }
      }
      
      // Last resort: use today's date
      const today = new Date().toLocaleDateString('en-CA');
      console.log(`Could not parse "${dateStr}", using today's date: ${today}`);
      return today;
    } catch (error) {
      console.error('Error formatting date:', error);
      // Fallback to today's date if parsing fails
      return new Date().toLocaleDateString('en-CA');
    }
  };
  
  const loadAccounts = async () => {
    try {
      const accountsList = await fetchAccounts();
      setAccounts(accountsList);
      
      // Set the first account as default if exists
      if (accountsList.length > 0) {
        setAccountId(accountsList[0].account_id);
        setSourceAccountId(accountsList[0].account_id);
        if (accountsList.length > 1) {
          setDestinationAccountId(accountsList[1].account_id);
        } else {
          setDestinationAccountId(accountsList[0].account_id);
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts",
        variant: "destructive",
      });
    }
  };
  
  const selectAmount = (value: string) => {
    if (currentTab === "transfer") {
      setTransferAmount(value);
    } else {
      setAmount(value);
    }
  };
  
  const selectDate = (dateString: string) => {
    const formattedDate = formatAndValidateDate(dateString);
    setDate(formattedDate);
  };
  
  const selectDescription = (text: string) => {
    if (currentTab === "transfer") {
      setTransferDescription(text);
    } else {
      setDescription(text);
    }
  };
  
  const selectParsedTransaction = (transaction: ParsedTransactionData) => {
    console.log('Selected transaction before modification:', JSON.stringify(transaction));
    
    // Create a copy of the transaction to avoid mutating the original
    const enhancedTransaction = { ...transaction };
    
    // Look for transfer indicators in the OCR text
    const transferIndicators = [
      'transfer',
      'sent to',
      'beneficiary',
      'recipient',
      'otherbank-transfer',
      'from account to account'
    ];
    
    const isLikelyTransfer = transferIndicators.some(indicator => 
      ocrText.toLowerCase().includes(indicator)
    );
    
    // If transaction looks like a transfer but isn't marked as one
    if (isLikelyTransfer && !enhancedTransaction.is_transfer) {
      console.log('Transaction appears to be a transfer based on OCR text');
      
      // Look for sender and recipient information
      const senderMatches = Array.from(ocrText.matchAll(/(?:sender|from)[:\s]+([^\n\r]+)/gi));
      const recipientMatches = Array.from(ocrText.matchAll(/(?:beneficiary|recipient|to)[:\s]+([^\n\r]+)/gi));
      
      if (senderMatches.length > 0 && senderMatches[0][1]) {
        const senderName = senderMatches[0][1].trim();
        const senderAccount = findMatchingAccount(senderName);
        if (senderAccount) {
          console.log('Found sender information, converting to transfer');
          enhancedTransaction.is_transfer = true;
          enhancedTransaction.category_type = 'TRANSFER';
          enhancedTransaction.category_name = 'Transfer';
          enhancedTransaction.source_account = senderName;
          setSourceAccountId(senderAccount.account_id);
        }
      }
      
      if (recipientMatches.length > 0 && recipientMatches[0][1]) {
        const recipientName = recipientMatches[0][1].trim();
        const recipientAccount = findMatchingAccount(recipientName);
        if (recipientAccount) {
          console.log('Found recipient information, converting to transfer');
          enhancedTransaction.is_transfer = true;
          enhancedTransaction.category_type = 'TRANSFER';
          enhancedTransaction.category_name = 'Transfer';
          enhancedTransaction.destination_account = recipientName;
          setDestinationAccountId(recipientAccount.account_id);
        }
      }
    }
    
    // If there's a strong narration text, use it for the description
    if (possibleDescriptions.length > 0) {
      // Find the most relevant description from extracted possibilities
      const bestDescription = possibleDescriptions.find(desc => 
        desc.toLowerCase().includes('narration:') || 
        desc.toLowerCase().includes('purpose:') ||
        desc.toLowerCase().includes('reference:') ||
        desc.toLowerCase().includes('description:')
      );
      
      if (bestDescription) {
        const cleanedDesc = cleanNarrationText(bestDescription);
        if (cleanedDesc && (!enhancedTransaction.description || 
            enhancedTransaction.description === 'Transaction' || 
            enhancedTransaction.description === 'Unknown Transaction' || 
            enhancedTransaction.description.length < cleanedDesc.length * 0.7)) {
          console.log(`Overriding description with better narration: "${cleanedDesc}"`);
          enhancedTransaction.description = cleanedDesc;
          
          // Auto-categorize based on better description
          enhancedTransaction.category_name = categorizeByDescription(cleanedDesc).category;
          enhancedTransaction.category_type = categorizeByDescription(cleanedDesc).type;
        }
      }
    }
    
    // Ensure date is correctly parsed and set
    if (enhancedTransaction.date) {
      enhancedTransaction.date = formatAndValidateDate(enhancedTransaction.date);
      console.log(`Normalized transaction date: ${enhancedTransaction.date}`);
    }
    
    console.log('Enhanced transaction:', JSON.stringify(enhancedTransaction));
    
    setSelectedTransaction(enhancedTransaction);
    
    // Set form values for editing
    setDescription(enhancedTransaction.description);
    setAmount(enhancedTransaction.amount.toString());
    setTransactionType(enhancedTransaction.category_type.toLowerCase() === 'income' ? 'income' : 'expense');
    setCategoryName(enhancedTransaction.category_name || 'Uncategorized');
    setCategoryType(enhancedTransaction.category_type?.toLowerCase() || 'expense');
    
    // If it's a transfer, set transfer form values and switch to transfer tab
    if (enhancedTransaction.is_transfer) {
      setCurrentTab("transfer");
      setTransferDescription(enhancedTransaction.description);
      setTransferAmount(enhancedTransaction.amount.toString());
      
      // Find accounts that match source and destination from parsed data
      if (enhancedTransaction.source_account || enhancedTransaction.destination_account) {
        const sourceAccount = findMatchingAccount(enhancedTransaction.source_account);
        const destAccount = findMatchingAccount(enhancedTransaction.destination_account);
        
        if (sourceAccount) setSourceAccountId(sourceAccount.account_id);
        if (destAccount) setDestinationAccountId(destAccount.account_id);
      }
      
      // Set date if provided, with improved date handling
      if (enhancedTransaction.date) {
        const parsedDate = formatAndValidateDate(enhancedTransaction.date);
        setDate(parsedDate);
        console.log(`Setting transfer date to: ${parsedDate} (from ${enhancedTransaction.date})`);
      }
    } else {
      // For regular transactions, stay on AI tab but update form values
      setCurrentTab("ai");
      
      // Set account if mentioned
      if (enhancedTransaction.account_name) {
        const matchingAccount = findMatchingAccount(enhancedTransaction.account_name);
        if (matchingAccount) setAccountId(matchingAccount.account_id);
      }
      
      // Set date if provided, with improved date handling
      if (enhancedTransaction.date) {
        const parsedDate = formatAndValidateDate(enhancedTransaction.date);
        setDate(parsedDate);
        console.log(`Setting transaction date to: ${parsedDate} (from ${enhancedTransaction.date})`);
      }
    }
  };
  
  // Find a matching account by name
  const findMatchingAccount = (searchTerm?: string): Account | null => {
    if (!searchTerm || !accounts.length) return null;
    
    const searchLower = searchTerm.toLowerCase();
    
    // First try exact match
    const exactMatch = accounts.find(account => 
      account.name.toLowerCase() === searchLower
    );
    
    if (exactMatch) return exactMatch;
    
    // Then try partial match
    const partialMatch = accounts.find(account => 
      account.name.toLowerCase().includes(searchLower) || 
      searchLower.includes(account.name.toLowerCase())
    );
    
    return partialMatch || null;
  };
  
  const createTransactionFromSelected = async () => {
    if (!selectedTransaction) {
      toast({
        title: "No Transaction Selected",
        description: "Please select a transaction first",
        variant: "destructive",
      });
      return;
    }
    
    try {
      if (selectedTransaction.is_transfer || selectedTransaction.category_type === "TRANSFER") {
        // For transfers - use edited values
        if (!sourceAccountId || !destinationAccountId) {
      toast({
            title: "Missing Accounts",
            description: "Please select source and destination accounts",
            variant: "destructive",
          });
          return;
        }
        
        // Use the edited values from the transfer form
        const finalDate = date;
        const finalDescription = transferDescription;
        const finalAmount = parseFloat(transferAmount);
        
        if (isNaN(finalAmount) || finalAmount <= 0) {
      toast({
            title: "Invalid Amount",
            description: "Please enter a valid amount",
        variant: "destructive",
      });
          return;
        }
        
        console.log(`Creating transfer with description: ${finalDescription}, amount: ${finalAmount}, date: ${finalDate}`);
        
        await createTransferTransaction(
          sourceAccountId,
          destinationAccountId,
          finalAmount,
          finalDate,
          finalDescription
        );
      } else {
        // For regular transactions - use edited values
        if (!accountId) {
      toast({
            title: "Missing Account",
            description: "Please select an account",
        variant: "destructive",
      });
      return;
    }
    
        // Use the edited values
        const finalDate = date;
        const finalDescription = description;
        const finalAmount = parseFloat(amount);
        
        if (isNaN(finalAmount) || finalAmount <= 0) {
          toast({
            title: "Invalid Amount",
            description: "Please enter a valid amount",
            variant: "destructive",
          });
          return;
        }
        
        console.log(`Creating transaction with description: ${finalDescription}, amount: ${finalAmount}, date: ${finalDate}, category: ${categoryName}`);
        
        const transactionData: TransactionInput = {
          description: finalDescription,
          amount: Math.abs(finalAmount),
          date: finalDate,
          account_id: accountId,
          type: transactionType,
          category_name: categoryName,
          category_type: categoryType.toUpperCase(),
        };
        
        await createTransaction(transactionData);
      }
      
      toast({
        title: "Success",
        description: "Transaction created successfully",
        variant: "default",
      });
      
      // Remove from list
      setParsedTransactions(parsedTransactions.filter(t => t !== selectedTransaction));
      setSelectedTransaction(null);
      
      // Notify parent component
      onTransactionCreated();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
    }
  };
  
  // Filter parsed transactions based on search text
  const filteredTransactions = searchText.trim()
    ? parsedTransactions.filter(transaction =>
        transaction.description.toLowerCase().includes(searchText.toLowerCase()) ||
        transaction.category_name.toLowerCase().includes(searchText.toLowerCase()) ||
        transaction.amount.toString().includes(searchText)
      )
    : parsedTransactions;
  
  console.log('Rendering transactions:', parsedTransactions);
  
  // First, add a function to toggle transaction type
  const toggleTransactionType = () => {
    if (selectedTransaction) {
      // Create a copy to modify
      const updatedTransaction = { ...selectedTransaction };
      
      if (updatedTransaction.is_transfer) {
        // Convert from transfer to regular transaction
        console.log('Converting from transfer to regular transaction');
        updatedTransaction.is_transfer = false;
        updatedTransaction.category_type = transactionType.toUpperCase();
        updatedTransaction.category_name = categoryName || 'Uncategorized';
        
        // Clear transfer-specific fields
        delete updatedTransaction.source_account;
        delete updatedTransaction.destination_account;
        
        // Update UI state
        setSelectedTransaction(updatedTransaction);
        setCurrentTab("ai");
      } else {
        // Convert from regular to transfer
        console.log('Converting from regular transaction to transfer');
        updatedTransaction.is_transfer = true;
        updatedTransaction.category_type = "TRANSFER";
        updatedTransaction.category_name = "Transfer";
        
        // Update UI state
        setSelectedTransaction(updatedTransaction);
        setCurrentTab("transfer");
        
        // Set transfer description to match regular transaction description
        setTransferDescription(description);
        setTransferAmount(amount);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="ai">
            AI Detected Transactions
          </TabsTrigger>
          <TabsTrigger value="transfer">
            Transfer
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai" className="space-y-4">
          {isProcessingAI ? (
            <Card>
              <CardContent className="py-6">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  <p>Processing document with AI...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Detected Transactions Card */}
                <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex justify-between items-center">
                      <span>Detected Transactions</span>
                      <div className="relative w-[200px]">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search transactions..."
                          className="pl-8"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction, idx) => (
                        <div
                          key={`transaction-${idx}`}
                          className={`p-3 border rounded-md cursor-pointer hover:border-primary transition-colors ${
                            selectedTransaction === transaction ? 'border-primary bg-primary/5' : ''
                          }`}
                          onClick={() => selectParsedTransaction(transaction)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {transaction.category_name} • {transaction.date || 'Today'}
                              </p>
                            </div>
                            <div className="flex items-center">
                              {transaction.is_transfer && (
                                <ArrowLeftRight className="h-4 w-4 mr-1 text-blue-500" />
                              )}
                              <span className={`font-medium ${
                                transaction.category_type === 'INCOME'
                                  ? 'text-green-600'
                                  : transaction.is_transfer
                                  ? 'text-blue-600'
                                  : 'text-red-600'
                              }`}>
                                {transaction.category_type === 'INCOME' ? '+' : ''}
                                ₦{transaction.amount.toLocaleString('en-NG', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </span>
                            </div>
                          </div>
                          
                          {transaction.is_transfer && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {transaction.source_account && transaction.destination_account ? (
                                <>From {transaction.source_account} to {transaction.destination_account}</>
                              ) : (
                                <>Transfer transaction</>
                              )}
                            </div>
                          )}
                          
                          {transaction.account_name && !transaction.is_transfer && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Account: {transaction.account_name}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        No transactions match your search
                      </p>
                  )}
                  
                  {selectedTransaction && (
                    <div className="mt-4">
                      <div className="flex flex-col space-y-4 p-4 border rounded-md bg-muted/50">
                        <h3 className="font-medium">Selected Transaction Details</h3>
                        
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Transaction description"
                          />
                      </div>
                        
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                          />
                      </div>
                        
                <div className="space-y-2">
                          <Label>Transaction Type</Label>
                  <Select
                    value={transactionType}
                            onValueChange={(value: 'income' | 'expense') => {
                              setTransactionType(value);
                              setCategoryType(value);
                            }}
                  >
                    <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                          <Label>Category</Label>
                          <Select
                            value={categoryName}
                            onValueChange={setCategoryName}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                              <SelectItem value="Transport">Transport</SelectItem>
                              <SelectItem value="Dining">Dining</SelectItem>
                              <SelectItem value="Groceries">Groceries</SelectItem>
                              <SelectItem value="Utilities">Utilities</SelectItem>
                              <SelectItem value="Entertainment">Entertainment</SelectItem>
                              <SelectItem value="Shopping">Shopping</SelectItem>
                              <SelectItem value="Healthcare">Healthcare</SelectItem>
                              <SelectItem value="Education">Education</SelectItem>
                              <SelectItem value="Housing">Housing</SelectItem>
                              <SelectItem value="Salary">Salary</SelectItem>
                              <SelectItem value="Gift">Gift</SelectItem>
                              <SelectItem value="Transfer">Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                </div>
                
                <div className="space-y-2">
                          <Label>Account</Label>
                          <Select
                            value={accountId}
                            onValueChange={setAccountId}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((account) => (
                                <SelectItem key={account.account_id} value={account.account_id}>
                                  {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                </div>
                
                <div className="space-y-2">
                          <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(new Date(date), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date ? new Date(date) : undefined}
                        onSelect={(selectedDate) => {
                          if (selectedDate) {
                                    setDate(selectedDate.toLocaleDateString('en-CA'));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                        <div className="space-y-2 mt-4">
                          <Button 
                            variant="outline"
                            className="w-full"
                            onClick={toggleTransactionType}
                          >
                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                            This is a transfer between accounts
                          </Button>
                </div>
                
                        <Button onClick={createTransactionFromSelected}>
                          <Check className="mr-2 h-4 w-4" />
                  Create Transaction
                </Button>
                      </div>
                    </div>
                  )}
            </CardContent>
          </Card>
          
              {/* Helper Cards with AI Detection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
              <CardHeader>
                    <CardTitle>Detected Amounts</CardTitle>
              </CardHeader>
              <CardContent>
                    {extractedAmounts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {extractedAmounts.map((amount, idx) => (
                          <Button
                            key={`amount-${idx}`}
                            variant="outline"
                            size="sm"
                            onClick={() => selectAmount(amount)}
                          >
                            {amount}
                          </Button>
                        ))}
                    </div>
                    ) : (
                      <p className="text-muted-foreground">No amounts detected</p>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Detected Dates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {extractedDates.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {extractedDates.map((date, idx) => (
                          <Button
                            key={`date-${idx}`}
                            variant="outline"
                            size="sm"
                            onClick={() => selectDate(date)}
                          >
                            {date}
                          </Button>
                  ))}
                </div>
                    ) : (
                      <p className="text-muted-foreground">No dates detected</p>
                    )}
              </CardContent>
            </Card>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Create Transfer</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Transfer description"
                    value={transferDescription}
                    onChange={(e) => setTransferDescription(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(new Date(date), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date ? new Date(date) : undefined}
                        onSelect={(selectedDate) => {
                          if (selectedDate) {
                            setDate(selectedDate.toLocaleDateString('en-CA'));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sourceAccount">From Account</Label>
                  <Select
                    value={sourceAccountId}
                    onValueChange={setSourceAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.account_id} value={account.account_id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="destinationAccount">To Account</Label>
                  <Select
                    value={destinationAccountId}
                    onValueChange={setDestinationAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.account_id} value={account.account_id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  type="button" 
                  className="w-full"
                  onClick={createTransactionFromSelected}
                >
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Create Transfer
                </Button>
                
                {/* Add a button to convert transfer to regular transaction */}
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full mt-2"
                  onClick={toggleTransactionType}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Not a transfer? Convert to regular transaction
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {/* OCR Text Lines for Description */}
          {ocrText && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Receipt Lines (Click to use as Description)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {ocrText.split(/\r?\n/).filter(line => line.trim().length > 0).map((line, idx) => (
                    <div
                      key={`ocrline-${idx}`}
                      className={`p-2 border rounded-md cursor-pointer transition-colors ${
                        transferDescription === line ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                      }`}
                      onClick={() => setTransferDescription(line)}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OCRTransactionExtractor; 