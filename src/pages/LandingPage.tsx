import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ChevronDown, Send, Upload, Mic, CreditCard, Tag, Calendar, PiggyBank, Check, Globe, Search } from 'lucide-react';

// Currency configuration - expanded with more options
const currencies = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', country: 'Nigeria', countries: ['Nigeria'] },
  { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States', countries: ['United States', 'Puerto Rico', 'Ecuador', 'El Salvador', 'Panama', 'Zimbabwe'] },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'European Union', countries: ['Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Austria', 'Belgium', 'Greece', 'Portugal', 'Ireland', 'Finland', 'Slovakia', 'Slovenia', 'Luxembourg', 'Lithuania', 'Latvia', 'Estonia', 'Cyprus', 'Malta', 'Montenegro', 'European Union'] },
  { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom', countries: ['United Kingdom', 'England', 'Scotland', 'Wales', 'Northern Ireland'] },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India', countries: ['India', 'Bhutan'] },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', country: 'South Africa', countries: ['South Africa', 'Namibia', 'Lesotho', 'Eswatini'] },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', country: 'Ghana', countries: ['Ghana'] },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', country: 'Kenya', countries: ['Kenya'] },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', country: 'Australia', countries: ['Australia', 'Kiribati', 'Nauru', 'Tuvalu'] },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', country: 'Canada', countries: ['Canada'] },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan', countries: ['Japan'] },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', country: 'China', countries: ['China', 'People\'s Republic of China'] },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', country: 'Brazil', countries: ['Brazil'] },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', country: 'United Arab Emirates', countries: ['United Arab Emirates', 'Dubai', 'Abu Dhabi'] },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', country: 'Egypt', countries: ['Egypt'] },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', country: 'Mexico', countries: ['Mexico'] },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', country: 'Saudi Arabia', countries: ['Saudi Arabia'] },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', country: 'Singapore', countries: ['Singapore'] },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', country: 'Russia', countries: ['Russia', 'Russian Federation'] },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', country: 'Switzerland', countries: ['Switzerland', 'Liechtenstein'] },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', country: 'Turkey', countries: ['Turkey'] },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', country: 'Sweden', countries: ['Sweden'] },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', country: 'Norway', countries: ['Norway'] },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', country: 'Denmark', countries: ['Denmark', 'Greenland', 'Faroe Islands'] },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', country: 'Poland', countries: ['Poland'] },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', country: 'Czech Republic', countries: ['Czech Republic', 'Czechia'] },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', country: 'Hungary', countries: ['Hungary'] },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', country: 'Romania', countries: ['Romania'] },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', country: 'Bulgaria', countries: ['Bulgaria'] },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', country: 'Croatia', countries: ['Croatia'] },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', country: 'Israel', countries: ['Israel'] },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', country: 'South Korea', countries: ['South Korea'] },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', country: 'Thailand', countries: ['Thailand'] },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', country: 'Indonesia', countries: ['Indonesia'] },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', country: 'Malaysia', countries: ['Malaysia'] },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', country: 'Philippines', countries: ['Philippines'] },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', country: 'Vietnam', countries: ['Vietnam'] },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', country: 'Pakistan', countries: ['Pakistan'] },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', country: 'Bangladesh', countries: ['Bangladesh'] },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', country: 'New Zealand', countries: ['New Zealand', 'Cook Islands', 'Niue', 'Pitcairn Islands', 'Tokelau'] }
];

// Helper function to get last Monday's date
function getLastMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const lastMonday = new Date(today.setDate(diff));
  return lastMonday.toISOString().split('T')[0];
}

// Parse relative dates like "yesterday", "last week" from text
function parseRelativeDate(text: string, baseDate = new Date()): string {
  // Create a date object representing the start of the baseDate (local time)
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const lowerText = text.toLowerCase(); // Case-insensitive matching

  // Check for relative terms
  if (lowerText.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  if (lowerText.includes("last week")) {
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return lastWeek.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  if (lowerText.includes("last month")) {
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    // Adjust day if necessary (e.g., March 31st -> Feb 28th/29th)
    if (lastMonth.getDate() < today.getDate()) {
      lastMonth.setDate(0); // Go to the last day of the previous month
    }
    return lastMonth.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }
  
  if (lowerText.includes("today")) {
    return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  if (lowerText.includes("monday") || lowerText.includes("mon")) {
    return getLastMonday();
  }

  // Default to today if no date found
  return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Helper function for categorizing transactions based on description
function categorizeTransaction(text: string): { category: string, type: string } {
  if (!text) return { category: "Uncategorized", type: "expense" };
  
  const lowerText = text.toLowerCase();
  
  // Transport category
  if (lowerText.includes("bus") || 
      lowerText.includes("taxi") || 
      lowerText.includes("uber") || 
      lowerText.includes("bolt") || 
      lowerText.includes("ride") || 
      lowerText.includes("train") || 
      lowerText.includes("transport") || 
      lowerText.includes("fare") || 
      lowerText.includes("fuel") || 
      lowerText.includes("petrol") || 
      lowerText.includes("flight")) {
    return { category: "Transport", type: "expense" };
  }
  
  // Utilities category
  if (lowerText.includes("water") || 
      lowerText.includes("electricity") || 
      lowerText.includes("power") || 
      lowerText.includes("gas") || 
      lowerText.includes("internet") || 
      lowerText.includes("wifi") || 
      lowerText.includes("bill") || 
      lowerText.includes("utility")) {
    return { category: "Utilities", type: "expense" };
  }
  
  // Food/Dining category
  if (lowerText.includes("food") || 
      lowerText.includes("restaurant") || 
      lowerText.includes("cafe") || 
      lowerText.includes("meal") || 
      lowerText.includes("lunch") || 
      lowerText.includes("dinner") || 
      lowerText.includes("breakfast")) {
    return { category: "Dining", type: "expense" };
  }
  
  // Groceries category
  if (lowerText.includes("grocery") || 
      lowerText.includes("supermarket") || 
      lowerText.includes("market") || 
      lowerText.includes("store") || 
      lowerText.includes("shopping")) {
    return { category: "Groceries", type: "expense" };
  }
  
  // Housing category
  if (lowerText.includes("rent") || 
      lowerText.includes("mortgage") || 
      lowerText.includes("housing") || 
      lowerText.includes("accommodation")) {
    return { category: "Housing", type: "expense" };
  }
  
  // Income category
  if (lowerText.includes("salary") || 
      lowerText.includes("wage") || 
      lowerText.includes("income") || 
      lowerText.includes("payment received") || 
      lowerText.includes("deposit") ||
      lowerText.includes("received")) {
    return { category: "Salary", type: "income" };
  }
  
  // Transfer category
  if (lowerText.includes("transfer") || 
      lowerText.includes("sent") || 
      lowerText.includes("remittance") ||
      (lowerText.includes("from") && lowerText.includes("to"))) {
    return { category: "Transfer", type: "transfer" };
  }
  
  // Default
  return { category: "Miscellaneous", type: "expense" };
}

// Sample parsing function
function parseTransaction(text: string, selectedCurrency: typeof currencies[0]) {
  const lowerText = text.toLowerCase();
  
  // Initialize with default values
  const parsed = {
    description: text.slice(0, 50),
    amount: 0,
    category_name: "Miscellaneous",
    category_type: "expense",
    date: parseRelativeDate(text),
    account_name: "Default Account",
    is_transfer: false,
    source_account: "",
    destination_account: ""
  };
  
  // --- Extract amount, handling millions, thousands, etc. ---
  let amountMatch;
  
  // Check for "million" or "m" format
  if ((amountMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:million|m)/i))) {
    parsed.amount = parseFloat(amountMatch[1]) * 1000000;
  }
  // Check for "thousand" or "k" format
  else if ((amountMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:thousand|k)/i))) {
    parsed.amount = parseFloat(amountMatch[1]) * 1000;
  }
  // Check for currency symbol followed by number
  else if ((amountMatch = lowerText.match(/(?:₦|#|ngn|n)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i))) {
    parsed.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  // Check for number followed by currency
  else if ((amountMatch = lowerText.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:naira|ngn)/i))) {
    parsed.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  // Just find any number as a fallback
  else if ((amountMatch = lowerText.match(/(\d+(?:,\d+)*(?:\.\d+)?)/))) {
    parsed.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  // --- Extract description ---
  // Try to extract a meaningful description
  if (lowerText.includes("for")) {
    const purposeMatch = lowerText.match(/(?:for|on)\s+(.*?)(?:on|at|yesterday|today|last|in|from|to|$)/i);
    if (purposeMatch && purposeMatch[1]) {
      parsed.description = purposeMatch[1].trim();
    }
  }
  
  // --- Determine category and type ---
  const { category, type } = categorizeTransaction(text);
  parsed.category_name = category;
  parsed.category_type = type;
  
  // If it's a transfer, set the flag and extract accounts
  if (type === "transfer") {
    parsed.is_transfer = true;
    
    // Extract source account
    const sourceMatch = lowerText.match(/(?:from|out of|source)\s+(.*?)(?:account|wallet|card|to|$)/i);
    if (sourceMatch && sourceMatch[1]) {
      parsed.source_account = sourceMatch[1].trim();
    } else {
      parsed.source_account = "Main Account";
    }
    
    // Extract destination account
    const destMatch = lowerText.match(/(?:to|into|destination)\s+(.*?)(?:account|wallet|card|$)/i);
    if (destMatch && destMatch[1]) {
      parsed.destination_account = destMatch[1].trim();
    } else {
      parsed.destination_account = "Savings";
    }
  }
  
  // Return the parsed data
  return parsed;
}

const LandingPage: React.FC = () => {
  // State for transaction parser demo
  const [transactionInput, setTransactionInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTransaction, setParsedTransaction] = useState(null);
  
  // State for receipt scanner functionality
  const [isDragging, setIsDragging] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    total?: string;
    category?: string;
    source?: string;
    isLoading?: boolean;
    message?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Currency selection state - with localStorage persistence
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    // Try to get saved currency from localStorage
    const savedCurrency = localStorage.getItem('kpege-selected-currency');
    if (savedCurrency) {
      try {
        const parsed = JSON.parse(savedCurrency);
        // Validate that the parsed object has the expected properties
        if (parsed && parsed.code && parsed.symbol && parsed.name) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing saved currency:', e);
      }
    }
    // Default to NGN if no saved currency or parsing error
    return currencies[0];
  });
  const [showCurrencySelector, setShowCurrencySelector] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Ref for the demo section to allow scrolling to it
  const demoSectionRef = useRef<HTMLElement>(null);
  
  // Save selected currency to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kpege-selected-currency', JSON.stringify(selectedCurrency));
  }, [selectedCurrency]);
  
  // Filter currencies based on search query
  const filteredCurrencies = currencies.filter(currency => {
    const query = searchQuery.toLowerCase();
    if (currency.name.toLowerCase().includes(query) || 
        currency.code.toLowerCase().includes(query)) {
      return true;
    }
    
    // Search through all countries associated with this currency
    return currency.countries.some(country => 
      country.toLowerCase().includes(query)
    );
  });
  
  // Start demo by selecting currency
  const selectCurrency = (currency: typeof currencies[0]) => {
    setSelectedCurrency(currency);
    setSearchQuery("");
    setIsDropdownOpen(false);
    // If coming directly from currency selector, hide it
    if (showCurrencySelector) {
      setShowCurrencySelector(false);
    }
    // Reset any existing demo data
    setParsedTransaction(null);
    setReceiptData(null);
  };
  
  // Scroll to demo section when Learn More is clicked
  const scrollToDemo = () => {
    if (demoSectionRef.current) {
      demoSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Handle transaction input submission
  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionInput.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    // Simulate API processing delay
    setTimeout(() => {
      const result = parseTransaction(transactionInput, selectedCurrency);
      setParsedTransaction(result);
      setIsProcessing(false);
    }, 1000);
  };
  
  // Process the receipt file (mock functionality)
  const processReceiptFile = (file: File) => {
    // Check if file is an image or PDF
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please upload an image or PDF file');
      return;
    }
    
    setIsProcessing(true);
    
    // Process differently based on file type
    if (file.type === 'application/pdf') {
      // For PDF files
      processPdfReceipt(file);
    } else {
      // For image files
      processImageReceipt(file);
    }
  };
  
  // Process image receipt (existing functionality)
  const processImageReceipt = (file: File) => {
    // Simulate processing delay
    setTimeout(() => {
      // Mock data - in a real app, this would come from receipt processing
      const mockReceiptData = {
        total: `${selectedCurrency.symbol}${(Math.random() * 100).toFixed(2)}`,
        category: ['Groceries', 'Dining', 'Transportation', 'Shopping'][Math.floor(Math.random() * 4)],
        source: 'Image'
      };
      
      setReceiptData(mockReceiptData);
      setIsProcessing(false);
    }, 1500);
  };
  
  // Process PDF receipt (new functionality)
  const processPdfReceipt = (file: File) => {
    // Create a message to show PDF processing is happening
    setReceiptData({ isLoading: true, message: "Processing PDF..." });
    
    // In a real implementation, we would use a PDF.js or similar library
    // For this demo, we'll simulate processing with a longer delay
    setTimeout(() => {
      // Mock data with different range for PDFs to show it's different
      const mockReceiptData = {
        total: `${selectedCurrency.symbol}${(Math.random() * 200 + 50).toFixed(2)}`,
        category: ['Groceries', 'Dining', 'Transportation', 'Shopping', 'Utilities', 'Entertainment'][Math.floor(Math.random() * 6)],
        source: 'PDF'
      };
      
      setReceiptData(mockReceiptData);
      setIsProcessing(false);
    }, 2500);
  };
  
  // Handle file drop for receipt scanner
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processReceiptFile(files[0]);
    }
  };
  
  // Handle file selection via browse button
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processReceiptFile(files[0]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-4 py-16 md:py-24 text-center">
      <div className="mb-8">
          <img 
            src="/main-kpege-logo.svg" 
            alt="Kpege Dashboard Preview" 
            className="h-20 md:h-24 mx-auto" 
          />
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold max-w-5xl mb-6">
          <span className="text-green-700">Finance</span>, finally made simple
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-10">
          Experience peace of mind and clarity with every transaction. 
          Take control of your money, effortlessly.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <Link to="/login">
            <Button size="lg" className="bg-green-700 hover:bg-green-800 text-white px-8 py-6 text-lg">
              Start using Kpege
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="lg" 
            className="px-8 py-6 text-lg"
            onClick={scrollToDemo}
          >
            Try a Demo First
          </Button>
        </div>
        

      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why choose Kpege?</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Built for clarity and peace of mind. No more financial anxiety.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="rounded-full bg-green-100 w-12 h-12 flex items-center justify-center mb-6">
                <Upload className="h-6 w-6 text-green-700" />
              </div>
              <h3 className="text-xl font-bold mb-3">Easy Import</h3>
              <p className="text-muted-foreground">
                Connect your accounts or upload statements. We'll handle the rest.
              </p>
            </Card>
            
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="rounded-full bg-green-100 w-12 h-12 flex items-center justify-center mb-6">
                <Send className="h-6 w-6 text-green-700" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Insights</h3>
              <p className="text-muted-foreground">
                Understand your spending patterns with AI-powered insights.
              </p>
            </Card>
            
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="rounded-full bg-green-100 w-12 h-12 flex items-center justify-center mb-6">
                <ChevronDown className="h-6 w-6 text-green-700" />
              </div>
              <h3 className="text-xl font-bold mb-3">Financial Clarity</h3>
              <p className="text-muted-foreground">
                See your financial health at a glance with intuitive dashboards.
              </p>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Feature Trial Section */}
      <section ref={demoSectionRef} className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Try it yourself</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience Kpege's powerful features without creating an account.
            </p>
          </div>
          
          {/* Currency Selector */}
          {showCurrencySelector && (
            <div className="max-w-2xl mx-auto mb-16">
              <Card className="p-8">
                <h3 className="text-2xl font-bold mb-6 text-center">Choose your currency</h3>
                <p className="text-muted-foreground text-center mb-8">
                  Select your local currency to see how Kpege works with your financial data.
                </p>
                
                <div className="relative w-full max-w-md mx-auto mb-8">
                  <div className="relative">
                    <div 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <div className="flex items-center">
                        {selectedCurrency && (
                          <>
                            <span className="text-xl font-bold mr-2">{selectedCurrency.symbol}</span>
                            <span>{selectedCurrency.name} ({selectedCurrency.code})</span>
                          </>
                        )}
                      </div>
                      <ChevronDown className="h-5 w-5" />
                    </div>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="text"
                              placeholder="Search by currency or country name..."
                              className="pl-10"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="text-xs text-center mt-1 text-muted-foreground">
                            Try searching for your country (e.g., "Germany", "India")
                          </div>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto">
                          {filteredCurrencies.length > 0 ? (
                            filteredCurrencies.map(currency => (
                              <div 
                                key={currency.code}
                                className={`flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer ${
                                  selectedCurrency.code === currency.code ? 'bg-green-50' : ''
                                }`}
                                onClick={() => selectCurrency(currency)}
                              >
                                <div className="flex items-center">
                                  <span className="text-lg font-bold mr-2">{currency.symbol}</span>
                                  <div>
                                    <div>{currency.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {currency.country}
                                      {currency.countries.length > 1 && (
                                        <button 
                                          className="ml-1 text-green-700 hover:underline focus:outline-none"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            alert(`${currency.name} is used in: ${currency.countries.join(', ')}`);
                                          }}
                                        >
                                          + {currency.countries.length - 1} more
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {selectedCurrency.code === currency.code && (
                                  <Check className="h-5 w-5 text-green-700" />
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-muted-foreground">
                              No currencies found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                  <Button 
                    className="bg-green-700 hover:bg-green-800 text-white px-8 py-6"
                    onClick={() => selectCurrency(selectedCurrency)}
                  >
                    <Globe className="mr-2 h-5 w-5" />
                    Continue with {selectedCurrency.name}
                  </Button>
                </div>
              </Card>
            </div>
          )}
          
          {!showCurrencySelector && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Transaction Parser Demo */}
              <Card className="p-8 overflow-hidden">
                <h3 className="text-2xl font-bold mb-4">Transaction Parser</h3>
                <p className="text-muted-foreground mb-6">
                  Describe your transaction in plain language and see how Kpege understands it.
                </p>
                
                <div className="mb-6">
                  <form onSubmit={handleTransactionSubmit} className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input 
                        value={transactionInput}
                        onChange={(e) => setTransactionInput(e.target.value)}
                        placeholder={`E.g., Spent 5000 ${selectedCurrency.code} on groceries yesterday`}
                        disabled={isProcessing}
                        className="flex-1"
                      />
                      <Button 
                        type="submit"
                        size="icon"
                        disabled={!transactionInput.trim() || isProcessing}
                        className="h-10 w-10 bg-green-700 hover:bg-green-800 text-white"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        disabled={isProcessing}
                        className="h-10 w-10"
                        variant="outline"
                      >
                        <Mic className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    {isProcessing && (
                      <div className="text-sm text-muted-foreground">
                        Processing your transaction...
                      </div>
                    )}
                  </form>
                </div>
                
                {parsedTransaction && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-medium mb-4">Parsed Transaction</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-green-700" />
                        <div>
                          <p className="text-sm text-muted-foreground">Description</p>
                          <p className="font-medium">{parsedTransaction.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-green-700" />
                        <div>
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="font-medium">{selectedCurrency.symbol}{parsedTransaction.amount.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-700" />
                        <div>
                          <p className="text-sm text-muted-foreground">Category</p>
                          <p className="font-medium">{parsedTransaction.category_name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-700" />
                        <div>
                          <p className="text-sm text-muted-foreground">Date</p>
                          <p className="font-medium">{parsedTransaction.date}</p>
                        </div>
                      </div>
                      
                      {parsedTransaction.is_transfer && (
                        <>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-green-700" />
                            <div>
                              <p className="text-sm text-muted-foreground">From</p>
                              <p className="font-medium">{parsedTransaction.source_account}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-green-700" />
                            <div>
                              <p className="text-sm text-muted-foreground">To</p>
                              <p className="font-medium">{parsedTransaction.destination_account}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setParsedTransaction(null)}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
                
                {!parsedTransaction && !isProcessing && (
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <p className="text-muted-foreground">Enter a transaction description to see the parsed result</p>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>Try these examples:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-left ml-4">
                        <li>Spent 5000 on groceries yesterday</li>
                        <li>Received 150000 salary today</li>
                        <li>Paid 25000 for rent on Monday</li>
                        <li>Transfer 10000 from savings to checking</li>
                      </ul>
                    </div>
                  </div>
                )}
              </Card>
              
              {/* Receipt Scanner Demo */}
              <Card className="p-8">
                <h3 className="text-2xl font-bold mb-4">Receipt Scanner</h3>
                <p className="text-muted-foreground mb-6">
                  Upload a receipt to see how Kpege automatically extracts and categorizes your expenses.
                </p>
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 ${
                    isDragging ? 'border-green-700 bg-green-50' : 'border-slate-200'
                  } ${receiptData && !receiptData.isLoading ? 'opacity-50' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center">
                    <Upload className={`h-12 w-12 mb-4 ${isDragging ? 'text-green-700' : 'text-slate-300'}`} />
                    <p className="text-muted-foreground mb-2">Drag & drop your receipt or</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                    >
                      Browse Files
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports JPG, PNG, GIF, and PDF files
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Total</h4>
                    {isProcessing || (receiptData && receiptData.isLoading) ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 rounded-full bg-green-700 animate-pulse"></div>
                        <p className="text-sm text-muted-foreground">Processing...</p>
                      </div>
                    ) : (
                      <p className="text-lg font-bold">
                        {receiptData ? receiptData.total : `${selectedCurrency.symbol}0.00`}
                        {!receiptData && <span className="text-sm text-muted-foreground block">Upload a receipt to see</span>}
                      </p>
                    )}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Category</h4>
                    {isProcessing || (receiptData && receiptData.isLoading) ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 rounded-full bg-green-700 animate-pulse"></div>
                        <p className="text-sm text-muted-foreground">Processing...</p>
                      </div>
                    ) : (
                      <p className="text-lg font-bold">
                        {receiptData ? receiptData.category : '-'}
                        {!receiptData && <span className="text-sm text-muted-foreground block">Auto-categorization</span>}
                      </p>
                    )}
                  </div>
                </div>
                
                {receiptData && receiptData.source && (
                  <div className="mt-4 bg-slate-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      Processed from {receiptData.source} file
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}
          
          {/* Currency Change Option */}
          {!showCurrencySelector && (
            <div className="mt-8 text-center">
              <Button 
                variant="outline" 
                onClick={() => setShowCurrencySelector(true)}
                className="text-sm"
              >
                <Globe className="mr-2 h-4 w-4" />
                Change currency from {selectedCurrency.name}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Your currency preference is saved for future visits
              </p>
            </div>
          )}
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What our users say</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands of people who have transformed their relationship with money.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-200 mr-4"></div>
                <div>
                  <h4 className="font-bold">Sarah J.</h4>
                  <p className="text-sm text-muted-foreground">Freelancer</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "Kpege has completely changed how I manage my business finances. I finally feel in control."
              </p>
            </Card>
            
            <Card className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-200 mr-4"></div>
                <div>
                  <h4 className="font-bold">Michael T.</h4>
                  <p className="text-sm text-muted-foreground">Small Business Owner</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "The insights have helped me cut unnecessary expenses and save over $500 a month."
              </p>
            </Card>
            
            <Card className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-200 mr-4"></div>
                <div>
                  <h4 className="font-bold">Lisa R.</h4>
                  <p className="text-sm text-muted-foreground">Student</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                "As a student, I needed something simple yet powerful. Kpege is exactly that - it's perfect."
              </p>
            </Card>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-green-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to transform your finances?</h2>
          <p className="text-xl max-w-3xl mx-auto mb-8">
            Join Kpege today and experience the clarity and confidence that comes with knowing exactly where your money goes.
          </p>
          
          <div className="max-w-md mx-auto">
            <div className="flex mb-4">
              <Input 
                type="email" 
                placeholder="Enter your email address" 
                className="rounded-r-none bg-white text-black"
              />
              <Button className="rounded-l-none bg-green-900 hover:bg-green-950">
                Get Started
              </Button>
            </div>
            <p className="text-sm text-green-100">
              Free 14-day trial. No credit card required.
            </p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-300">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-8 md:mb-0">
              <img src="/kpege-logo-light.svg" alt="Kpege" className="h-10 mb-4" />
              <p className="max-w-xs text-slate-400">
                Making financial management calm and simple.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h4 className="font-bold mb-4">Product</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white">Features</a></li>
                  <li><a href="#" className="hover:text-white">Pricing</a></li>
                  <li><a href="#" className="hover:text-white">Security</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-4">Company</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white">About</a></li>
                  <li><a href="#" className="hover:text-white">Blog</a></li>
                  <li><a href="#" className="hover:text-white">Careers</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-4">Resources</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white">Help Center</a></li>
                  <li><a href="#" className="hover:text-white">Contact</a></li>
                  <li><a href="#" className="hover:text-white">Privacy</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p>© 2023 Kpege. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-white">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                </svg>
              </a>
              <a href="#" className="hover:text-white">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"></path>
                </svg>
              </a>
              <a href="#" className="hover:text-white">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage; 