import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createTransaction, createTransferTransaction } from "@/services/transactionService";
import { fetchAccounts, getDefaultAccount } from "@/services/accountService";
import { CalendarIcon, PlusCircle, Search, ArrowLeftRight } from "lucide-react";
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
const DATE_REGEX = /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{2,4})/gi;
const DESCRIPTION_KEYWORDS = [
  'payment', 'transfer', 'deposit', 'withdrawal', 'purchase', 'subscription',
  'salary', 'income', 'expense', 'bill', 'invoice', 'receipt', 'statement'
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
  
  // Transaction form values
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
    
    // Extract the first detected amount and date as context for the AI
    const regexAmount = extractedAmounts[0] ? parseFloat(extractedAmounts[0]) : undefined;
    const regexDate = extractedDates[0] ? extractDateFromText(extractedDates[0]) : undefined;
    
    try {
      // Break the OCR text into paragraphs or sentences for processing
      const segments = splitTextIntoSegments(ocrText);
      const parsedResults: ParsedTransactionData[] = [];
      
      // Process each segment with Groq AI
      for (const segment of segments) {
        if (segment.trim().length < 10) continue; // Skip very short segments
        
        console.log('Sending OCR segment to parse-transaction-groq function:', segment);
        
        // Call Supabase Edge Function to process the text, passing regex values as context
        const { data: parsedData, error: parseError } = await supabase.functions.invoke('parse-transaction-groq', {
          body: {
            text: segment,
            context_amount: regexAmount,
            context_date: regexDate,
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
        
        // Fallback: use regex values if AI returns empty/invalid
        if ((!parsedData.amount || parsedData.amount <= 0) && regexAmount) {
          parsedData.amount = regexAmount;
        }
        if ((!parsedData.date || parsedData.date === '') && regexDate) {
          parsedData.date = regexDate;
        }
        
        // Add to parsed results if it looks valid
        if (parsedData.description && parsedData.amount > 0) {
          parsedResults.push(parsedData);
        }
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
  
  // Extract date from text
  const extractDateFromText = (text: string): string | null => {
    const dateMatches = Array.from(text.matchAll(DATE_REGEX))
      .map(match => match[0])
      .filter(Boolean);
    
    if (dateMatches.length > 0) {
      try {
        // Try to parse the first date found
        const parsedDate = new Date(dateMatches[0]);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }
    
    return null;
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
    // Accept the string directly (YYYY-MM-DD)
    setDate(dateString);
  };
  
  const selectDescription = (text: string) => {
    if (currentTab === "transfer") {
      setTransferDescription(text);
    } else {
      setDescription(text);
    }
  };
  
  const selectParsedTransaction = (transaction: ParsedTransactionData) => {
    setSelectedTransaction(transaction);
    
    // If it's a transfer, set transfer form values
    if (transaction.is_transfer) {
      setCurrentTab("transfer");
      setTransferDescription(transaction.description);
      setTransferAmount(transaction.amount.toString());
      
      // Find accounts that match source and destination from parsed data
      if (transaction.source_account || transaction.destination_account) {
        const sourceAccount = findMatchingAccount(transaction.source_account);
        const destAccount = findMatchingAccount(transaction.destination_account);
        
        if (sourceAccount) setSourceAccountId(sourceAccount.account_id);
        if (destAccount) setDestinationAccountId(destAccount.account_id);
      }
    } else {
      // Set regular transaction form values
      setCurrentTab("manual");
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setTransactionType(transaction.category_type.toLowerCase() === 'income' ? 'income' : 'expense');
      setCategoryName(transaction.category_name || 'Uncategorized');
      setCategoryType(transaction.category_type?.toLowerCase() || 'expense');
      
      // Set account if mentioned
      if (transaction.account_name) {
        const matchingAccount = findMatchingAccount(transaction.account_name);
        if (matchingAccount) setAccountId(matchingAccount.account_id);
      }
    }
    
    // Set date if provided
    if (transaction.date) {
      setDate(transaction.date);
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
  
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount || !date || !accountId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const transactionData: TransactionInput = {
        description,
        amount: transactionType === 'expense' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
        date: date,
        account_id: accountId,
        type: transactionType,
        category_name: categoryName,
        category_type: categoryType.toUpperCase(),
      };
      
      await createTransaction(transactionData);
      
      toast({
        title: "Success",
        description: "Transaction created successfully",
        variant: "default",
      });
      
      // Reset form
      setDescription('');
      setAmount('');
      setDate(() => {
        const now = new Date();
        return now.toISOString().split('T')[0];
      });
      setCategoryName('Uncategorized');
      setCategoryType('expense');
      
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
  
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transferDescription || !transferAmount || !date || !sourceAccountId || !destinationAccountId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (sourceAccountId === destinationAccountId) {
      toast({
        title: "Invalid Transfer",
        description: "Source and destination accounts must be different",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createTransferTransaction(
        sourceAccountId,
        destinationAccountId,
        Math.abs(parseFloat(transferAmount)),
        date,
        transferDescription
      );
      
      toast({
        title: "Success",
        description: "Transfer created successfully",
        variant: "default",
      });
      
      // Reset form
      setTransferDescription('');
      setTransferAmount('');
      setDate(() => {
        const now = new Date();
        return now.toISOString().split('T')[0];
      });
      
      // Notify parent component
      onTransactionCreated();
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast({
        title: "Error",
        description: "Failed to create transfer",
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
  
  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="ai">
            AI Detection
          </TabsTrigger>
          <TabsTrigger value="manual">
            Manual Entry
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
              {parsedTransactions.length > 0 ? (
                <Card>
                  <CardHeader>
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
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-6">
                    <div className="text-center">
                      <p>No transactions detected. Try using manual entry or check OCR quality.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* --- New: OCR Text Line-by-Line Selection --- */}
              {ocrText && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Receipt Lines (Click to use as Description)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {ocrText.split(/\r?\n/).filter(line => line.trim().length > 0).map((line, idx) => (
                        <div
                          key={`ocrline-${idx}`}
                          className={`p-2 border rounded-md cursor-pointer transition-colors ${
                            (currentTab === 'transfer' ? transferDescription : description) === line ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                          }`}
                          onClick={() => selectDescription(line)}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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
        
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Create Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction-type">Transaction Type</Label>
                  <Select
                    value={transactionType}
                    onValueChange={(value) => setTransactionType(value as 'income' | 'expense')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Transaction description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
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
                  <Label htmlFor="account">Account</Label>
                  <Select
                    value={accountId}
                    onValueChange={setAccountId}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={categoryName}
                    onValueChange={setCategoryName}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                      <SelectItem value="Groceries">Groceries</SelectItem>
                      <SelectItem value="Dining">Dining</SelectItem>
                      <SelectItem value="Salary">Salary</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                      <SelectItem value="Utilities">Utilities</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                      <SelectItem value="Shopping">Shopping</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Housing">Housing</SelectItem>
                      <SelectItem value="Insurance">Insurance</SelectItem>
                      <SelectItem value="Gift">Gift</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button type="submit" className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Transaction
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {possibleDescriptions.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Possible Transaction Descriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {possibleDescriptions.map((desc, idx) => (
                    <div 
                      key={`desc-${idx}`}
                      className="p-2 border rounded-md cursor-pointer hover:bg-muted"
                      onClick={() => selectDescription(desc)}
                    >
                      {desc}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Create Transfer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransferSubmit} className="space-y-4">
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
                
                <Button type="submit" className="w-full">
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Create Transfer
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OCRTransactionExtractor; 