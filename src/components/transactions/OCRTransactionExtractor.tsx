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
import { supabase } from "@/integrations/supabase/client";
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
const DATE_REGEX = /(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4})|(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{2,4})|(\d{1,2}\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{2,4})/gi;
const DESCRIPTION_KEYWORDS = [
  'payment', 'transfer', 'deposit', 'withdrawal', 'purchase', 'subscription',
  'salary', 'income', 'expense', 'bill', 'invoice', 'receipt', 'statement',
  'water', 'electricity', 'narration', 'beneficiary', 'annual'
];

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
    return now.toISOString().split('T')[0];
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
  
  // Process OCR text when it changes
  useEffect(() => {
    if (!ocrText) return;
    
    // Extract financial data using regex patterns
    extractFinancialData(ocrText);
    
    // Process with Groq AI
    processWithGroqAI();
    
    // Load user accounts
    loadAccounts();
  }, [ocrText]);
  
  const extractFinancialData = (text: string) => {
    // Extract amounts
    const amountMatches = Array.from(text.matchAll(AMOUNT_REGEX))
      .map(match => match[1])
      .filter(Boolean)
      .map(amount => amount.replace(/,/g, ''));
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
  
  const processWithGroqAI = async () => {
    // Skip if no text or already processing
    if (!ocrText.trim() || isProcessingAI) return;
    
    setIsProcessingAI(true);
    setParsedTransactions([]);
    setSelectedTransaction(null);
    
    // Extract dates more thoroughly
    const extractedDateMatches = Array.from(ocrText.matchAll(DATE_REGEX))
      .map(match => match[0])
      .filter(Boolean);
    
    console.log('Raw extracted dates:', extractedDateMatches);
    
    // Get the most likely date (first detected date or today)
    const regexDate = extractedDateMatches.length > 0 
      ? formatAndValidateDate(extractedDateMatches[0]) 
      : new Date().toISOString().split('T')[0];
    
    console.log('Formatted date for AI processing:', regexDate);
    
    // Extract amount from text
    const regexAmount = extractedAmounts[0] ? parseFloat(extractedAmounts[0]) : undefined;
    
    // Look for narration keywords with enhanced pattern
    const narrationRegex = /(?:narration|purpose|description|reference|note|memo)\s*[:\-]?\s*([^\n\r.]+)|(?<=\bnarration\b\s+)([^\n\r.]+)/i;
    const narrationMatch = ocrText.match(narrationRegex);
    let narrationText = narrationMatch ? (narrationMatch[1] || narrationMatch[2]).trim() : '';

    // Also look for NARRATION without colon that might be followed directly by the text
    if (!narrationText) {
      const additionalNarrationRegex = /\b(?:NARRATION|DESCRIPTION)\b\s+([A-Za-z][\w\s]+)/i;
      const additionalMatch = ocrText.match(additionalNarrationRegex);
      if (additionalMatch && additionalMatch[1]) {
        narrationText = additionalMatch[1].trim();
      }
    }

    // If still no narration, try looking for key words/phrases in the text
    if (!narrationText) {
      // Look for phrases that might indicate the purpose of the transaction
      const keyPhrases = ['Annual Water Bill', 'Electricity Bill', 'Internet Payment', 'Rent Payment', 'Salary'];
      for (const phrase of keyPhrases) {
        if (ocrText.includes(phrase)) {
          narrationText = phrase;
          console.log(`Found key phrase in text: "${phrase}"`);
          break;
        }
      }
    }
    
    console.log('Final extracted narration:', narrationText);
    console.log('Final extracted date:', regexDate);
    
    try {
      // Break the OCR text into paragraphs or sentences for processing
      const segments = splitTextIntoSegments(ocrText);
      const parsedResults: ParsedTransactionData[] = [];
      
      // Process each segment with Groq AI
      for (const segment of segments) {
        if (segment.trim().length < 10) continue; // Skip very short segments
        
        console.log('Sending OCR segment to parse-transaction-groq function:', segment);
        
        // Call Supabase Edge Function to process the text, passing enhanced context
        const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-transaction-groq', {
          body: {
            text: segment,
            context_amount: regexAmount,
            context_date: regexDate,
            context_narration: narrationText
          }
        });
        
        if (parseError) {
          console.error('Supabase function invocation error:', parseError);
          continue;
        }
        
        // Handle errors within the function's response
        if (parsedData && parsedData.error) {
          console.error('Error from parse-transaction-groq function:', parsedData);
          continue;
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
          continue;
        }
        
        // DIRECT OVERRIDE: Always use narration as description if it exists
        if (narrationText) {
          console.log(`CRITICAL: Directly overriding description with narration: "${narrationText}"`);
          parsedData.description = narrationText;
          
          // Auto-categorize based on narration content
          const lowerNarration = narrationText.toLowerCase();
          
          // Enhanced categorization logic with more keywords for each category
          if (lowerNarration.includes('water') || lowerNarration.includes('electricity') || 
              lowerNarration.includes('power') || lowerNarration.includes('bill')) {
            console.log('Auto-categorizing as Utilities based on narration content');
            parsedData.category_name = 'Utilities';
            parsedData.category_type = 'EXPENSE';
          } else if (lowerNarration.includes('bus') || lowerNarration.includes('taxi') || 
                     lowerNarration.includes('uber') || lowerNarration.includes('bolt') || 
                     lowerNarration.includes('train') || lowerNarration.includes('transport') || 
                     lowerNarration.includes('fare') || lowerNarration.includes('ride')) {
            console.log('Auto-categorizing as Transport based on narration content');
            parsedData.category_name = 'Transport';
            parsedData.category_type = 'EXPENSE';
          } else if (lowerNarration.includes('food') || lowerNarration.includes('restaurant') || 
                     lowerNarration.includes('meal') || lowerNarration.includes('cafe') || 
                     lowerNarration.includes('lunch') || lowerNarration.includes('dinner')) {
            console.log('Auto-categorizing as Dining based on narration content');
            parsedData.category_name = 'Dining';
            parsedData.category_type = 'EXPENSE';
          } else if (lowerNarration.includes('grocery') || lowerNarration.includes('supermarket') || 
                     lowerNarration.includes('market') || lowerNarration.includes('store')) {
            console.log('Auto-categorizing as Groceries based on narration content');
            parsedData.category_name = 'Groceries';
            parsedData.category_type = 'EXPENSE';
          } else if (lowerNarration.includes('salary') || lowerNarration.includes('wage') || 
                     lowerNarration.includes('income') || lowerNarration.includes('payment received')) {
            console.log('Auto-categorizing as Salary based on narration content');
            parsedData.category_name = 'Salary';
            parsedData.category_type = 'INCOME';
          }
        }
        
        // Fallback: use regex values if AI returns empty/invalid
        if ((!parsedData.amount || parsedData.amount <= 0) && regexAmount) {
          parsedData.amount = regexAmount;
        }
        
        // Always use the detected date if available
        if (regexDate) {
          parsedData.date = regexDate;
        } else if (parsedData.date) {
          parsedData.date = formatAndValidateDate(parsedData.date);
        }
        
        // Add to parsed results if it looks valid
        if (parsedData.description && parsedData.amount > 0) {
          // Avoid duplicates with similar descriptions and amounts
          const isDuplicate = parsedResults.some(existing => 
            Math.abs(existing.amount - parsedData.amount) < 0.01 &&
            existing.description.toLowerCase().includes(parsedData.description.toLowerCase().substring(0, 10))
          );
          
          if (!isDuplicate) {
            // Print the transaction to console for debugging
            console.log('Adding parsed transaction:', JSON.stringify(parsedData));
            parsedResults.push(parsedData);
          }
        }
      }
      
      // Apply narration to all transactions one more time as a final check
      if (narrationText && parsedResults.length > 0) {
        // Override first transaction (or any that look generic)
        parsedResults.forEach(transaction => {
          if (transaction.description === 'Transaction' || 
              transaction.description === 'Unknown Transaction' ||
              transaction.description.toLowerCase().includes('online') ||
              transaction.description.toLowerCase().includes('payment')) {
            console.log(`Post-processing: Replacing generic description "${transaction.description}" with narration "${narrationText}"`);
            transaction.description = narrationText;
            
            // Also categorize if it's still uncategorized
            if (transaction.category_name === 'Uncategorized') {
              const lowerNarration = narrationText.toLowerCase();
              
              // Comprehensive categorization logic
              if (lowerNarration.includes('water') || lowerNarration.includes('electricity') || 
                  lowerNarration.includes('power') || lowerNarration.includes('bill')) {
                transaction.category_name = 'Utilities';
                transaction.category_type = 'EXPENSE';
              } else if (lowerNarration.includes('bus') || lowerNarration.includes('taxi') || 
                         lowerNarration.includes('uber') || lowerNarration.includes('bolt') || 
                         lowerNarration.includes('train') || lowerNarration.includes('transport') || 
                         lowerNarration.includes('fare') || lowerNarration.includes('ride')) {
                transaction.category_name = 'Transport';
                transaction.category_type = 'EXPENSE';
              } else if (lowerNarration.includes('food') || lowerNarration.includes('restaurant') || 
                         lowerNarration.includes('meal') || lowerNarration.includes('cafe') || 
                         lowerNarration.includes('lunch') || lowerNarration.includes('dinner')) {
                transaction.category_name = 'Dining';
                transaction.category_type = 'EXPENSE';
              } else if (lowerNarration.includes('grocery') || lowerNarration.includes('supermarket') || 
                         lowerNarration.includes('market') || lowerNarration.includes('store')) {
                transaction.category_name = 'Groceries';
                transaction.category_type = 'EXPENSE';
              } else if (lowerNarration.includes('salary') || lowerNarration.includes('wage') || 
                         lowerNarration.includes('income') || lowerNarration.includes('payment received')) {
                transaction.category_name = 'Salary';
                transaction.category_type = 'INCOME';
              }
            }
          }
        });
      }
      
      // Set the parsed transactions for display
      setParsedTransactions(parsedResults);
      
      // If we found transactions, show a notification
      if (parsedResults.length > 0) {
        toast({
          title: "Transactions Found",
          description: `Found ${parsedResults.length} potential transactions in the document.`,
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
  
  // Split OCR text into meaningful segments for processing
  const splitTextIntoSegments = (text: string): string[] => {
    // First try to split by obvious separators
    const segments: string[] = [];
    
    // Try splitting by lines with just dashes, stars, etc. (common in receipts)
    const lines = text.split('\n');
    let currentSegment: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this is a separator line
      if (
        /^[-_=*]{3,}$/.test(trimmedLine) ||  // Line with just separators
        /^total:?\s+/i.test(trimmedLine) ||   // Line starting with "Total"
        /^subtotal:?\s+/i.test(trimmedLine) || // Line starting with "Subtotal"
        /^tax:?\s+/i.test(trimmedLine) ||     // Line starting with "Tax"
        /^amount:?\s+/i.test(trimmedLine) ||  // Line starting with "Amount"
        /^date:?\s+/i.test(trimmedLine)       // Line starting with "Date"
      ) {
        // End the current segment and start a new one
        if (currentSegment.length > 0) {
          segments.push(currentSegment.join(' '));
          currentSegment = [];
        }
        // Add this line as its own segment if it contains useful information
        if (!/^[-_=*]{3,}$/.test(trimmedLine)) {
          segments.push(trimmedLine);
        }
      } else if (trimmedLine.length > 0) {
        // Add non-empty lines to the current segment
        currentSegment.push(trimmedLine);
      }
    }
    
    // Add the last segment if it exists
    if (currentSegment.length > 0) {
      segments.push(currentSegment.join(' '));
    }
    
    // If we couldn't split effectively, fallback to sentence splitting
    if (segments.length <= 1) {
      return text
        .replace(/\n/g, ' ')
        .split(/[.!?]+/)
        .filter(s => s.trim().length > 10);
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
      const today = new Date().toISOString().split('T')[0];
      console.log(`Could not parse "${dateStr}", using today's date: ${today}`);
      return today;
    } catch (error) {
      console.error('Error formatting date:', error);
      // Fallback to today's date if parsing fails
      return new Date().toISOString().split('T')[0];
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
    
    // If there's a strong narration text, use it for the description
    if (possibleDescriptions.length > 0) {
      // Find the most relevant description from extracted possibilities
      const bestDescription = possibleDescriptions.find(desc => 
        desc.toLowerCase().includes('water') || 
        desc.toLowerCase().includes('bill') ||
        desc.toLowerCase().includes('annual') ||
        desc.toLowerCase().includes('narration')
      );
      
      if (bestDescription && (!enhancedTransaction.description || enhancedTransaction.description === 'Transaction' || 
          enhancedTransaction.description === 'Unknown Transaction' || 
          enhancedTransaction.description.length < bestDescription.length * 0.7)) {
        console.log(`Overriding description with better narration: "${bestDescription}"`);
        enhancedTransaction.description = bestDescription;
        
        // Auto-categorize based on better description
        const lowerDesc = bestDescription.toLowerCase();
        if (lowerDesc.includes('water') || lowerDesc.includes('electricity') || lowerDesc.includes('bill')) {
          enhancedTransaction.category_name = 'Utilities';
          enhancedTransaction.category_type = 'EXPENSE';
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
      setDescription(enhancedTransaction.description);
      setAmount(enhancedTransaction.amount.toString());
      setTransactionType(enhancedTransaction.category_type.toLowerCase() === 'income' ? 'income' : 'expense');
      setCategoryName(enhancedTransaction.category_name || 'Uncategorized');
      setCategoryType(enhancedTransaction.category_type?.toLowerCase() || 'expense');
      
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
      if (selectedTransaction.is_transfer) {
        // For transfers
        if (!sourceAccountId || !destinationAccountId) {
          toast({
            title: "Missing Accounts",
            description: "Please select source and destination accounts",
            variant: "destructive",
          });
          return;
        }
        
        // Ensure we use the selected date or the parsed date from the transaction
        const finalDate = selectedTransaction.date || date;
        console.log(`Creating transfer with date: ${finalDate}`);
        
        await createTransferTransaction(
          sourceAccountId,
          destinationAccountId,
          selectedTransaction.amount,
          finalDate,
          selectedTransaction.description
        );
      } else {
        // For regular transactions
        if (!accountId) {
          toast({
            title: "Missing Account",
            description: "Please select an account",
            variant: "destructive",
          });
          return;
        }
        
        // Ensure we use the selected date or the parsed date from the transaction
        const finalDate = selectedTransaction.date || date;
        console.log(`Creating transaction with date: ${finalDate}`);
        
        const transactionData: TransactionInput = {
          description: selectedTransaction.description,
          amount: Math.abs(selectedTransaction.amount),
          date: finalDate,
          account_id: accountId,
          type: selectedTransaction.category_type.toLowerCase() === 'income' ? 'income' : 'expense',
          category_name: selectedTransaction.category_name || 'Uncategorized',
          category_type: selectedTransaction.category_type || 'EXPENSE',
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
                            value={selectedTransaction.description}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Input
                            value={selectedTransaction.category_name}
                            readOnly
                            className="bg-muted"
                          />
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
                                    setDate(selectedDate.toISOString().split('T')[0]);
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
                            setDate(selectedDate.toISOString().split('T')[0]);
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