import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ChevronDown, Send, Upload, Mic, CreditCard, Tag, Calendar, PiggyBank, Check, Globe, Search } from 'lucide-react';
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import NavBar from "@/components/ui/NavBar";
import TransactionParserDemo from "@/components/demo/TransactionParserDemo";
import ReceiptScannerDemo from "@/components/demo/ReceiptScannerDemo";
import ErrorBoundary from "@/components/demo/ErrorBoundary";

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

// Modified version of parseTransaction to use the categorization API
function parseTransaction(text: string, selectedCurrency: typeof currencies[0], convertFn?: (amount: number) => number) {
  console.log("[Demo] Parsing transaction:", text);
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
    destination_account: "",
    originalCurrency: selectedCurrency.code,
    originalAmount: 0
  };
  
  // --- Extract amount, handling millions, thousands, etc. ---
  let amountMatch;
  
  // Check for "million" or "m" format
  if ((amountMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:million|m)/i))) {
    parsed.amount = parseFloat(amountMatch[1]) * 1000000;
    console.log(`[Demo] Parsed million format: ${amountMatch[1]} -> ${parsed.amount}`);
  }
  // Check for "thousand" or "k" format (highest priority for common shorthand)
  else if ((amountMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:thousand|k)/i))) {
    parsed.amount = parseFloat(amountMatch[1]) * 1000;
    console.log(`[Demo] Parsed thousand format: ${amountMatch[1]} -> ${parsed.amount}`);
  }
  // Check for currency symbol followed by number - WITH EUROPEAN STYLE DECIMAL COMMA
  else if ((amountMatch = lowerText.match(/(?:₦|#|ngn|n|€|\$|£|¥)?\s*(\d+(?:,\d{3})*(?:,\d{1,2})?)/i))) {
    // Check if the comma is likely a decimal point (comma followed by 1 or 2 digits at end)
    if (/,\d{1,2}$/.test(amountMatch[1])) {
      // European style: replace last comma with period
      const europeanFormat = amountMatch[1].replace(/,(\d{1,2})$/, '.$1');
      // Remove any thousands separators (which would be periods in European format)
      const cleanNumber = europeanFormat.replace(/\./g, '');
      parsed.amount = parseFloat(cleanNumber);
      console.log(`[Demo] Parsed European decimal format: ${amountMatch[1]} -> ${parsed.amount}`);
    } else {
      // US/UK style: commas are thousand separators
      const cleanNumber = amountMatch[1].replace(/,/g, '');
      parsed.amount = parseFloat(cleanNumber);
      console.log(`[Demo] Parsed US/UK format with commas: ${amountMatch[1]} -> ${parsed.amount}`);
    }
  }
  // Check for currency symbol followed by number with dot decimal
  else if ((amountMatch = lowerText.match(/(?:₦|#|ngn|n|€|\$|£|¥)?\s*(\d+(?:\.\d+)?)/i))) {
    parsed.amount = parseFloat(amountMatch[1]);
    console.log(`[Demo] Parsed currency format: ${amountMatch[1]} -> ${parsed.amount}`);
  }
  // Check for number followed by currency
  else if ((amountMatch = lowerText.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:naira|ngn|euro|euros|dollar|dollars|pounds|yen)/i))) {
    parsed.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    console.log(`[Demo] Parsed number with currency name: ${amountMatch[1]} -> ${parsed.amount}`);
  }
  // Check for plain numbers
  else if ((amountMatch = lowerText.match(/\b(\d+(?:,\d+)*(?:\.\d+)?)\b/))) {
    parsed.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    console.log(`[Demo] Parsed plain number: ${amountMatch[1]} -> ${parsed.amount}`);
  }
  
  // If no match was found, try a simpler more aggressive approach
  if (parsed.amount === 0) {
    // Just look for any numbers in the text
    const numberMatches = lowerText.match(/\d+/g);
    if (numberMatches && numberMatches.length > 0) {
      // Use the first number sequence found
      parsed.amount = parseInt(numberMatches[0], 10);
      console.log(`[Demo] Parsed using fallback number extraction: ${numberMatches[0]} -> ${parsed.amount}`);
    }
  }
  
  // Check for 'k' character after a number (as a fallback) for amounts like "200k"
  if (parsed.amount > 0 && parsed.amount < 10000 && lowerText.includes('k')) {
    if (lowerText.match(/\b\d+\s*k\b/i)) {
      parsed.amount *= 1000;
      console.log(`[Demo] Applied 'k' multiplier: ${parsed.amount / 1000} -> ${parsed.amount}`);
    }
  }
  
  // Cap unreasonably large amounts to prevent display issues
  // In a real-world financial app, we might want to confirm these with the user
  if (parsed.amount > 1000000000) { // Greater than 1 billion
    console.log(`[Demo] Amount was too large (${parsed.amount}), capping to reasonable value`);
    parsed.amount = parsed.amount / 1000; // Divide by 1000 to get a more reasonable number
    console.log(`[Demo] Capped amount to: ${parsed.amount}`);
  }
  
  // Store the original amount before any conversion
  parsed.originalAmount = parsed.amount;
  
  // Apply currency conversion if a conversion function is provided
  if (convertFn && parsed.amount > 0) {
    const convertedAmount = convertFn(parsed.amount);
    // Only apply conversion if it's not drastically changing the amount
    // (this helps catch errors in conversion rates)
    if (convertedAmount < parsed.amount * 100 && convertedAmount > parsed.amount / 100) {
      parsed.amount = convertedAmount;
      console.log(`[Demo] Applied currency conversion: ${parsed.originalAmount} -> ${parsed.amount}`);
    } else {
      console.log(`[Demo] Skipped suspicious currency conversion: would change ${parsed.amount} to ${convertedAmount}`);
    }
  }
  
  // --- Extract description ---
  // Try to extract a meaningful description
  let description = "";
  
  // Check for phrases like "sent to", "paid to", "for", etc.
  const paymentPatterns = [
    /(?:sent|paid|gave|transfer(?:ed)?|spend|spent)\s+(?:to|for)?\s+([^0-9]+?)(?:for|on|at|yesterday|today|last|in|from|to|$)/i,
    /for\s+([^0-9]+?)(?:on|at|yesterday|today|last|in|from|to|$)/i,
    /on\s+([^0-9]+?)(?:at|yesterday|today|last|in|from|to|$)/i
  ];
  
  for (const pattern of paymentPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      description = match[1].trim();
      console.log(`[Demo] Extracted description using pattern: ${description}`);
      break;
    }
  }
  
  // If we found a description, use it
  if (description) {
    parsed.description = description;
  } else if (parsed.description === text.slice(0, 50)) {
    // If we're still using the default description, try to find a better one
    const descriptionKeywords = ['bought', 'paid', 'spent', 'purchased', 'payment', 'received', 'transfer'];
    for (const keyword of descriptionKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        const parts = text.split(keyword);
        if (parts.length > 1) {
          description = parts[1].trim().split(/\s+/).slice(0, 5).join(' ');
          console.log(`[Demo] Extracted description using keyword '${keyword}': ${description}`);
          parsed.description = description;
          break;
        }
      }
    }
  }
  
  // Use our categorization function with a note about Groq integration
  console.log(`[Demo] GROQ API would be used here for categorization in production`);
  
  // Call the categorizeTransaction function as a fallback
  // In production, this would be replaced with an API call to /api/categorize
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
  
  console.log(`[Demo] Final parsed transaction:`, parsed);
  
  // Return the parsed data
  return parsed;
}

const LandingPage: React.FC = () => {
  // Get authentication status from context
  const { user, loading } = useAuth();
  
  // Access the currency context
  const { 
    currentCurrency, 
    supportedCurrencies, 
    convertFromBase, 
    formatPossiblyConvertedCurrency,
    isLiveConversionEnabled,
    setCurrentCurrency,
    toggleLiveConversion
  } = useCurrency();
  
  // Currency selection state - with localStorage persistence
  const [selectedCurrency, setSelectedCurrencyState] = useState(() => {
    // Try to get saved currency from localStorage
    const savedCurrencyCode = localStorage.getItem('kpege-selected-currency');
    if (savedCurrencyCode) {
      try {
        // Find the currency in the currencies array
        const found = currencies.find(c => c.code === savedCurrencyCode);
        if (found) return found;
      } catch (e) {
        console.error('Error parsing saved currency:', e);
      }
    }
    // Default to the first currency if no saved currency or parsing error
    return currencies[0];
  });
  const [showCurrencySelector, setShowCurrencySelector] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Ref for the demo section to allow scrolling to it
  const demoSectionRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  
  // Derived authentication status
  const isAuthenticated = !!user;
  
  // Effect to sync the selected currency with the currency context
  useEffect(() => {
    // Find the corresponding currency in the supportedCurrencies array
    const contextCurrency = supportedCurrencies.find(c => c.code === selectedCurrency.code);
    if (contextCurrency) {
      setCurrentCurrency(contextCurrency);
    }
  }, [selectedCurrency, setCurrentCurrency, supportedCurrencies]);
  
  // Save selected currency to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kpege-selected-currency', selectedCurrency.code);
  }, [selectedCurrency]);
  
  // Scroll to features section
  const scrollToFeatures = () => {
    if (featuresRef.current) {
      featuresRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Scroll to demo section when Learn More is clicked
  const scrollToDemo = () => {
    if (demoSectionRef.current) {
      demoSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
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
    setSelectedCurrencyState(currency);
    setSearchQuery("");
    setIsDropdownOpen(false);
    // If coming directly from currency selector, hide it
    if (showCurrencySelector) {
      setShowCurrencySelector(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#e8f1df]">
      {/* Navigation Bar */}
      <NavBar 
        isAuthenticated={isAuthenticated}
        onFeaturesClick={scrollToFeatures}
        showFeatures={true}
      />

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] md:min-h-screen px-4 py-8 md:py-0 text-center relative bg-[#e8f1df]">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold max-w-4xl mx-auto mb-6 leading-tight">
            Personal Finance Management Made Simple with <span className="text-green-700">Kpege</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed">
            Eliminate financial stress and gain complete visibility into your money habits. 
            Track expenses, visualize trends, and achieve your financial goals effortlessly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 max-w-md sm:max-w-none mx-auto">
            {isAuthenticated ? (
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium">
                  Control Your Money Now
                </Button>
              </Link>
            )}
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-medium hover:border-green-700 hover:text-green-700 transition-colors"
              onClick={scrollToDemo}
            >
              See Kpege in Action
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section ref={featuresRef} className="py-16 md:py-20 lg:min-h-screen lg:flex lg:flex-col lg:items-center lg:justify-center px-4 text-center relative bg-[#e8f1df]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">Why choose Kpege?</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Kpege helps you manage money without stress.
              No spreadsheets. No manual math. Just clarity and confidence.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Card className="p-6 md:p-8 transition-all hover:translate-y-[-2px] hover:shadow-lg">
              <div className="rounded-full bg-white w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                <Upload className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Easy Transaction Input</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Use natural language or voice commands to record expenses. Snap a photo of a receipt or send a chat; Kpege's smart AI processes it all and updates your records automatically.
              </p>
            </Card>
            
            <Card className="p-6 md:p-8 transition-all hover:translate-y-[-2px] hover:shadow-lg">
              <div className="rounded-full bg-white w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                <Send className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">AI-Powered Financial Insights</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Kpege analyzes your income and spending habits to give you personalized insights. Get alerts, trends, and budgeting suggestions to help you stay in control.
              </p>
            </Card>
            
            <Card className="p-6 md:p-8 transition-all hover:translate-y-[-2px] hover:shadow-lg">
              <div className="rounded-full bg-white w-12 h-12 md:w-14 md:h-14 flex items-center justify-center mb-4 md:mb-6 mx-auto">
                <PiggyBank className="h-6 w-6 md:h-7 md:w-7 text-green-700" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Unified Financial Dashboard</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                View your total financial position in one place. See all your accounts, balances, subscriptions, transactions and categories, updated easily and in real time.
              </p>
            </Card>
          </div>
        </div>
        
        <div className="flex justify-center mt-12 md:mt-16">
          <button 
            onClick={scrollToDemo}
            className="text-sm md:text-base text-green-700 flex items-center gap-2 hover:opacity-80 transition-opacity font-medium"
          >
            <span>Try it yourself</span>
            <ChevronDown className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </div>
      </section>
      
      {/* Feature Trial Section */}
      <section ref={demoSectionRef} className="py-16 md:py-20 bg-[#e8f1df]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">Try it yourself</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Experience Kpege's powerful features without creating an account.
            </p>
          </div>
          
          {/* Currency Selector */}
          {showCurrencySelector && (
            <div className="max-w-2xl mx-auto mb-12">
              <Card className="p-6 md:p-8">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center">Choose your Local Currency</h3>
                <p className="text-sm sm:text-base text-muted-foreground text-center mb-6 md:mb-8 leading-relaxed">
                  Kpege supports multiple currencies so you can manage money in your own context.
                </p>
                
                <div className="relative w-full max-w-md mx-auto mb-6 md:mb-8">
                  <div className="relative">
                    <div 
                      className="flex items-center justify-between p-3 md:p-4 border rounded-lg cursor-pointer hover:border-green-300 transition-colors"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        {selectedCurrency && (
                          <>
                            <span className="text-lg md:text-xl font-bold mr-2 flex-shrink-0">{selectedCurrency.symbol}</span>
                            <span className="text-sm md:text-base truncate">{selectedCurrency.name} ({selectedCurrency.code})</span>
                          </>
                        )}
                      </div>
                      <ChevronDown className="h-5 w-5 flex-shrink-0 ml-2" />
                    </div>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="text"
                              placeholder="Search by currency or country name..."
                              className="pl-10 text-sm"
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
                                <div className="flex items-center min-w-0 flex-1">
                                  <span className="text-base md:text-lg font-bold mr-2 flex-shrink-0">{currency.symbol}</span>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm md:text-base font-medium truncate">{currency.name}</div>
                                    <div className="text-xs text-muted-foreground truncate">
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
                                  <Check className="h-5 w-5 text-green-700 flex-shrink-0" />
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                              No currencies found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-center">
                  <Button 
                    className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white px-6 md:px-8 py-3 md:py-4 text-sm md:text-base font-medium"
                    onClick={() => selectCurrency(selectedCurrency)}
                  >
                    <Globe className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                    Continue with {selectedCurrency.name}
                  </Button>
                </div>
              </Card>
            </div>
          )}
          
          {!showCurrencySelector && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
              {/* Transaction Parser Demo */}
              <ErrorBoundary 
                fallbackTitle="Transaction Parser Demo Unavailable"
                fallbackMessage="The transaction parser demo is temporarily experiencing issues. Please try again later."
              >
                <TransactionParserDemo selectedCurrency={selectedCurrency} />
              </ErrorBoundary>
              
              {/* Receipt Scanner Demo */}
              <ErrorBoundary 
                fallbackTitle="Receipt Scanner Demo Unavailable"
                fallbackMessage="The receipt scanner demo is temporarily experiencing issues. Please try again later."
              >
                <ReceiptScannerDemo 
                  selectedCurrency={currentCurrency}
                  isLiveConversionEnabled={isLiveConversionEnabled}
                  currentCurrency={currentCurrency}
                  convertFromBase={convertFromBase}
                  currencies={supportedCurrencies}
                />
              </ErrorBoundary>
            </div>
          )}
          
          {/* Currency Change Option */}
          {!showCurrencySelector && (
            <div className="mt-6 md:mt-8 text-center">
              <Button 
                variant="outline" 
                onClick={() => setShowCurrencySelector(true)}
                className="text-xs md:text-sm"
              >
                <Globe className="mr-2 h-3 w-3 md:h-4 md:w-4" />
                Change currency from {currentCurrency.name}
              </Button>
              <div className="flex flex-col items-center mt-3 md:mt-4">
                <p className="text-xs text-muted-foreground">
                  Your currency preference is saved for future visits
                </p>
                <div className="flex items-center mt-2 space-x-2">
                  <button 
                    onClick={toggleLiveConversion}
                    className={`relative inline-flex h-5 w-9 md:h-6 md:w-11 items-center rounded-full transition-colors ${
                      isLiveConversionEnabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span 
                      className={`inline-block h-3 w-3 md:h-4 md:w-4 transform rounded-full bg-white transition ${
                        isLiveConversionEnabled ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'
                      }`} 
                    />
                  </button>
                  <span className="text-xs">
                    {isLiveConversionEnabled 
                      ? 'Live currency conversion ON' 
                      : 'Live currency conversion OFF'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6">What Real Users Say About Kpege</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Join many other users who've taken control of their finances with Kpege
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Card className="p-6 md:p-8">
              <div className="flex items-center mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-200 mr-3 md:mr-4 flex-shrink-0"></div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm md:text-base">Sarah J.</h4>
                  <p className="text-xs md:text-sm text-muted-foreground">Freelancer</p>
                </div>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                "Kpege has completely changed how I manage my business finances. I finally feel in control."
              </p>
            </Card>
            
            <Card className="p-6 md:p-8">
              <div className="flex items-center mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-200 mr-3 md:mr-4 flex-shrink-0"></div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm md:text-base">Anjola T.</h4>
                  <p className="text-xs md:text-sm text-muted-foreground">Small Business Owner</p>
                </div>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                "The insights have helped me cut unnecessary expenses and save over $200 a month."
              </p>
            </Card>
            
            <Card className="p-6 md:p-8">
              <div className="flex items-center mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-200 mr-3 md:mr-4 flex-shrink-0"></div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm md:text-base">Lisa R.</h4>
                  <p className="text-xs md:text-sm text-muted-foreground">International Student</p>
                </div>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                "As a student, I needed something simple to track my expenses on-the-go. Kpege is exactly that - it's perfect."
              </p>
            </Card>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-green-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 leading-tight">Transform Your Relationship With Money Today</h2>
          <p className="text-base sm:text-lg md:text-xl max-w-3xl mx-auto mb-6 md:mb-8 leading-relaxed">
            Join Kpege today and experience the clarity and confidence that comes with knowing exactly where your money goes.
          </p>
          
          <div className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 mb-3 md:mb-4">
              <Input 
                type="email" 
                placeholder="Enter your email address" 
                className="sm:rounded-r-none bg-white text-black text-sm md:text-base"
              />
              <Button className="sm:rounded-l-none bg-green-900 hover:bg-green-950 text-sm md:text-base font-medium">
                Get Started
              </Button>
            </div>
            <p className="text-xs md:text-sm text-green-100">
              Free for now. No credit card required.
            </p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 md:py-10 bg-slate-900 text-slate-300">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <img src="/kpege-logo-light.svg" alt="Kpege" className="h-6 md:h-8 mb-2 md:mb-3" />
              <p className="max-w-xs text-xs md:text-sm text-slate-400 leading-relaxed">
                Making financial management simple and effortless.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              <div>
                <h4 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Product</h4>
                <ul className="space-y-1 md:space-y-1.5">
                  <li><a href="#" onClick={(e) => { e.preventDefault(); scrollToFeatures(); }} className="text-xs hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Security</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Company</h4>
                <ul className="space-y-1 md:space-y-1.5">
                  <li><Link to="/about" className="text-xs hover:text-white transition-colors">About</Link></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Blog</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Careers</a></li>
                </ul>
              </div>
              
              <div className="col-span-2 md:col-span-1">
                <h4 className="font-bold mb-2 md:mb-3 text-xs md:text-sm">Resources</h4>
                <ul className="space-y-1 md:space-y-1.5">
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Contact</a></li>
                  <li><a href="#" className="text-xs hover:text-white transition-colors">Privacy</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-6 md:mt-8 pt-4 md:pt-6 flex flex-col md:flex-row justify-between items-center border-t border-slate-800">
            <p className="text-xs">© 2025 Kpege. All rights reserved.</p>
            <div className="flex space-x-4 mt-3 md:mt-0">
              <a href="https://x.com/usekpege" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"></path>
                </svg>
              </a>
              <a href="https://www.instagram.com/usekpege" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                <svg className="h-4 w-4 md:h-5 md:w-5" fill="currentColor" viewBox="0 0 24 24">
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