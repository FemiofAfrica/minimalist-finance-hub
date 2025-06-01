import React, { useState } from 'react';
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Send, Mic, CreditCard, Tag, Calendar, PiggyBank } from 'lucide-react';

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

interface ParsedTransaction {
  description: string;
  amount: number;
  originalAmount: number;
  category_name: string;
  category_type: string;
  type: string;
  formattedAmount: string;
  currency: string;
  date: string;
  is_transfer: boolean;
  source_account: string;
  destination_account: string;
  confidence: number;
}

interface TransactionParserDemoProps {
  selectedCurrency: Currency;
}

// Helper function for parsing relative dates
function parseRelativeDate(text: string, baseDate = new Date()): string {
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const lowerText = text.toLowerCase();

  if (lowerText.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  if (lowerText.includes("last week")) {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return lastWeek.toISOString().split('T')[0];
  }

  if (lowerText.includes("last month")) {
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    if (lastMonth.getDate() < today.getDate()) {
      lastMonth.setDate(0);
    }
    return lastMonth.toISOString().split('T')[0];
  }
  
  if (lowerText.includes("today")) {
    return today.toISOString().split('T')[0];
  }

  if (lowerText.includes("monday") || lowerText.includes("mon")) {
    const lastMonday = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    lastMonday.setDate(diff);
    return lastMonday.toISOString().split('T')[0];
  }

  return today.toISOString().split('T')[0];
}

// Helper function for categorizing transactions
function categorizeTransaction(text: string): { category: string, type: string } {
  if (!text) return { category: "Uncategorized", type: "expense" };
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("bus") || lowerText.includes("taxi") || lowerText.includes("uber") || 
      lowerText.includes("bolt") || lowerText.includes("transport") || lowerText.includes("fuel")) {
    return { category: "Transport", type: "expense" };
  }
  
  if (lowerText.includes("water") || lowerText.includes("electricity") || lowerText.includes("bill") || 
      lowerText.includes("utility")) {
    return { category: "Utilities", type: "expense" };
  }
  
  if (lowerText.includes("food") || lowerText.includes("restaurant") || lowerText.includes("cafe") || 
      lowerText.includes("meal")) {
    return { category: "Dining", type: "expense" };
  }
  
  if (lowerText.includes("grocery") || lowerText.includes("supermarket") || lowerText.includes("shopping")) {
    return { category: "Groceries", type: "expense" };
  }
  
  if (lowerText.includes("salary") || lowerText.includes("wage") || lowerText.includes("income") || 
      lowerText.includes("received")) {
    return { category: "Salary", type: "income" };
  }
  
  if (lowerText.includes("transfer") || lowerText.includes("sent") || 
      (lowerText.includes("from") && lowerText.includes("to"))) {
    return { category: "Transfer", type: "transfer" };
  }
  
  return { category: "Miscellaneous", type: "expense" };
}

// Fallback transaction parser
function parseTransaction(text: string, selectedCurrency: Currency) {
  const lowerText = text.toLowerCase();
  
  const parsed = {
    description: text.slice(0, 50),
    amount: 0,
    category_name: "Miscellaneous",
    category_type: "expense",
    date: parseRelativeDate(text),
    account_name: "Default Account",
    is_transfer: false,
    source_account: "",
    destination_account: "",
    originalCurrency: selectedCurrency.code,
    originalAmount: 0
  };
  
  // Extract amount with various formats
  let amountMatch;
  
  if ((amountMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:million|m)/i))) {
    parsed.amount = parseFloat(amountMatch[1]) * 1000000;
  } else if ((amountMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:thousand|k)/i))) {
    parsed.amount = parseFloat(amountMatch[1]) * 1000;
  } else if ((amountMatch = lowerText.match(/(?:₦|#|ngn|n|€|\$|£|¥)?\s*(\d+(?:,\d{3})*(?:,\d{1,2})?)/i))) {
    if (/,\d{1,2}$/.test(amountMatch[1])) {
      const europeanFormat = amountMatch[1].replace(/,(\d{1,2})$/, '.$1');
      const cleanNumber = europeanFormat.replace(/\./g, '');
      parsed.amount = parseFloat(cleanNumber);
    } else {
      const cleanNumber = amountMatch[1].replace(/,/g, '');
      parsed.amount = parseFloat(cleanNumber);
    }
  } else if ((amountMatch = lowerText.match(/(?:₦|#|ngn|n|€|\$|£|¥)?\s*(\d+(?:\.\d+)?)/i))) {
    parsed.amount = parseFloat(amountMatch[1]);
  } else if ((amountMatch = lowerText.match(/\b(\d+(?:,\d+)*(?:\.\d+)?)\b/))) {
    parsed.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  if (parsed.amount === 0) {
    const numberMatches = lowerText.match(/\d+/g);
    if (numberMatches && numberMatches.length > 0) {
      parsed.amount = parseInt(numberMatches[0], 10);
    }
  }
  
  if (parsed.amount > 0 && parsed.amount < 10000 && lowerText.includes('k')) {
    if (lowerText.match(/\b\d+\s*k\b/i)) {
      parsed.amount *= 1000;
    }
  }
  
  if (parsed.amount > 1000000000) {
    parsed.amount = parsed.amount / 1000;
  }
  
  parsed.originalAmount = parsed.amount;
  
  const { category, type } = categorizeTransaction(text);
  parsed.category_name = category;
  parsed.category_type = type;
  
  if (type === "transfer") {
    parsed.is_transfer = true;
    const sourceMatch = lowerText.match(/(?:from|out of|source)\s+(.*?)(?:account|wallet|card|to|$)/i);
    if (sourceMatch && sourceMatch[1]) {
      parsed.source_account = sourceMatch[1].trim();
    } else {
      parsed.source_account = "Main Account";
    }
    
    const destMatch = lowerText.match(/(?:to|into|destination)\s+(.*?)(?:account|wallet|card|$)/i);
    if (destMatch && destMatch[1]) {
      parsed.destination_account = destMatch[1].trim();
    } else {
      parsed.destination_account = "Savings";
    }
  }
  
  return parsed;
}

const TransactionParserDemo: React.FC<TransactionParserDemoProps> = ({ selectedCurrency }) => {
  const [transactionInput, setTransactionInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransaction, setParsedTransaction] = useState<ParsedTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      console.log('[Demo] Parsing transaction:', transactionInput);
      
      // Try to use local Groq proxy for real categorization
      let parsedResult;
      try {
        // Use the local groq-proxy server for categorization
        const response = await fetch('/api/categorize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: transactionInput,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const apiResult = await response.json();
        console.log('[Demo] Groq categorization response:', apiResult);
        
        if (apiResult.success) {
          // Convert the API result to ParsedTransaction format
          const amount = apiResult.amount || apiResult.extractedAmount || extractAmountFromText(transactionInput);
          const formattedAmount = selectedCurrency.symbol + amount.toLocaleString();
          
          parsedResult = {
            description: transactionInput,
            amount: amount,
            originalAmount: amount,
            category_name: apiResult.category_name || apiResult.category || 'Miscellaneous',
            category_type: apiResult.category_type || 'expense',
            type: apiResult.category_type || 'expense',
            formattedAmount: formattedAmount,
            currency: selectedCurrency.code,
            date: parseRelativeDate(transactionInput),
            is_transfer: apiResult.category_type === 'transfer',
            source_account: apiResult.source_account || '',
            destination_account: apiResult.destination_account || '',
            confidence: apiResult.confidence || 0.9
          };
        } else {
          throw new Error('API categorization failed');
        }
      } catch (apiError) {
        console.warn('[Demo] API categorization failed, using fallback:', apiError);
        
        // Fallback to local parsing
        const fallbackResult = parseTransaction(transactionInput, selectedCurrency);
        
        // Convert fallback result to ParsedTransaction format
        const formattedAmount = selectedCurrency.symbol + fallbackResult.amount.toLocaleString();
        
        parsedResult = {
          description: fallbackResult.description,
          amount: fallbackResult.amount,
          originalAmount: fallbackResult.originalAmount,
          category_name: fallbackResult.category_name,
          category_type: fallbackResult.category_type,
          type: fallbackResult.category_type,
          formattedAmount: formattedAmount,
          currency: selectedCurrency.code,
          date: fallbackResult.date,
          is_transfer: fallbackResult.is_transfer,
          source_account: fallbackResult.source_account,
          destination_account: fallbackResult.destination_account,
          confidence: 0.7
        };
      }

      console.log('[Demo] Final parsed result:', parsedResult);
      setParsedTransaction(parsedResult);
      
    } catch (error) {
      console.error('[Demo] Transaction parsing error:', error);
      setError('Failed to parse transaction. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to extract amount from text
  const extractAmountFromText = (text: string): number => {
    const lowerText = text.toLowerCase();
    let amount = 0;
    
    // Check for "k" format
    const kMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*k\b/i);
    if (kMatch) {
      amount = parseFloat(kMatch[1]) * 1000;
    } else {
      // Check for regular numbers
      const numberMatch = lowerText.match(/(\d+(?:,\d+)*(?:\.\d+)?)/);
      if (numberMatch) {
        amount = parseFloat(numberMatch[1].replace(/,/g, ''));
      }
    }
    
    return amount;
  };

  return (
    <Card className="p-4 md:p-6 lg:p-8 overflow-hidden">
      <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Transaction Parser</h3>
      <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 leading-relaxed">
        Describe your transaction in plain language and see how Kpege understands it.
      </p>
      
      <div className="mb-4 md:mb-6">
        <form onSubmit={handleTransactionSubmit} className="flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            <Input 
              value={transactionInput}
              onChange={(e) => setTransactionInput(e.target.value)}
              placeholder={`E.g., Spent 5000 ${selectedCurrency.code} on groceries yesterday`}
              disabled={isProcessing}
              className="flex-1 text-sm md:text-base"
            />
            <div className="flex space-x-2">
              <Button 
                type="submit"
                size="icon"
                disabled={!transactionInput.trim() || isProcessing}
                className="h-10 w-10 bg-green-700 hover:bg-green-800 text-white flex-shrink-0"
              >
                <Send className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                disabled={isProcessing}
                className="h-10 w-10 flex-shrink-0"
                variant="outline"
              >
                <Mic className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
          
          {isProcessing && (
            <div className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">
              Processing your transaction...
            </div>
          )}
        </form>
      </div>
      
      {parsedTransaction && (
        <div className="bg-slate-50 rounded-lg p-3 md:p-4">
          <h4 className="font-medium mb-3 md:mb-4 text-sm md:text-base">Parsed Transaction</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="flex items-start gap-2 md:gap-3">
              <CreditCard className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Description</p>
                <p className="font-medium text-sm md:text-base break-words">{parsedTransaction.description}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 md:gap-3">
              <PiggyBank className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Amount</p>
                <p className="font-medium text-sm md:text-base">{selectedCurrency.symbol}{parsedTransaction.amount.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 md:gap-3">
              <Tag className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Category</p>
                <p className="font-medium text-sm md:text-base">{parsedTransaction.category_name}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2 md:gap-3">
              <Calendar className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Date</p>
                <p className="font-medium text-sm md:text-base">{parsedTransaction.date}</p>
              </div>
            </div>
            
            {parsedTransaction.is_transfer && (
              <>
                <div className="flex items-start gap-2 md:gap-3">
                  <CreditCard className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">From</p>
                    <p className="font-medium text-sm md:text-base break-words">{parsedTransaction.source_account}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 md:gap-3">
                  <CreditCard className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">To</p>
                    <p className="font-medium text-sm md:text-base break-words">{parsedTransaction.destination_account}</p>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-3 md:mt-4 flex justify-center sm:justify-end">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setParsedTransaction(null)}
              className="text-xs md:text-sm"
            >
              Reset
            </Button>
          </div>
        </div>
      )}
      
      {!parsedTransaction && !isProcessing && (
        <div className="bg-slate-50 rounded-lg p-3 md:p-4 text-center">
          <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">Enter a transaction description to see the parsed result</p>
          <div className="text-xs md:text-sm text-muted-foreground">
            <p className="font-medium mb-2">Try these examples:</p>
            <ul className="list-disc list-inside space-y-1 text-left max-w-xs mx-auto">
              <li>Spent 5000 on groceries yesterday</li>
              <li>Received 150000 salary today</li>
              <li>Paid 25000 for rent on Monday</li>
              <li>Transfer 10000 from savings to checking</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
};

export default TransactionParserDemo; 