
import { useEffect, useState, useCallback, useRef } from "react";
import { Table, TableBody } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Transaction } from "@/types/transaction";
import TransactionRow from "@/components/transactions/TransactionRow";
import TransactionTableHeader from "@/components/transactions/TransactionTableHeader";
import TransactionEmptyState from "@/components/transactions/TransactionEmptyState";
import TransactionLoading from "@/components/transactions/TransactionLoading";
import { fetchTransactions } from "@/services/transactionService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePeriodPicker } from "@/components/ui/date-period-picker";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

interface TransactionsTableProps {
  limit?: number; // Optional limit for dashboard view
}

const TransactionsTable = ({ limit }: TransactionsTableProps) => {
  // State management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { toast } = useToast();

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to apply filters to transactions
  const applyFilters = useCallback((data: Transaction[]) => {
    let filteredData = [...data];
    console.log("Total transactions before filtering:", filteredData.length);
    
    if (dateRange?.from && dateRange?.to) {
      console.log("Applying date range filter:", {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      });
      
      // Set time to start of day for from date and end of day for to date
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      
      filteredData = filteredData.filter(transaction => {
        // Ensure we have a valid date string
        if (!transaction.date) {
          console.warn("Transaction missing date:", transaction);
          return false;
        }
        
        try {
          // Parse the transaction date string to a Date object
          let transactionDate;
          
          // Handle different date formats safely
          if (typeof transaction.date === 'string') {
            // First, ensure we're working with just the date part (YYYY-MM-DD)
            // This handles both ISO strings and date-only strings
            const dateStr = transaction.date.split('T')[0];
            // Create a date object at noon to avoid timezone issues
            transactionDate = new Date(`${dateStr}T12:00:00Z`);
          } else {
            transactionDate = new Date(transaction.date);
          }
          
          // Check if the date is valid
          if (isNaN(transactionDate.getTime())) {
            console.warn(`Invalid date found: ${transaction.date}`);
            return false;
          }
          
          // Normalize the transaction date to start of day for proper comparison
          const normalizedDate = new Date(transactionDate);
          normalizedDate.setHours(0, 0, 0, 0);
          
          // Debug logging to help diagnose the issue
          console.log("Comparing dates:", {
            transaction: transaction.description,
            transactionDate: normalizedDate.toISOString(),
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString(),
            isInRange: normalizedDate >= fromDate && normalizedDate <= toDate
          });
          
          return normalizedDate >= fromDate && normalizedDate <= toDate;
        } catch (error) {
          console.error(`Error processing date: ${transaction.date}`, error);
          return false;
        }
      });
      
      console.log("Transactions after date filtering:", filteredData.length);
    }
    
    if (selectedCategory) {
      console.log("Applying category filter:", selectedCategory);
      filteredData = filteredData.filter(transaction => 
        transaction.category_id === selectedCategory || 
        transaction.category_name === selectedCategory
      );
      console.log("Transactions after category filtering:", filteredData.length);
    }
    
    return filteredData;
  }, [dateRange, selectedCategory]);

  // Function to fetch transactions data
  const fetchData = useCallback(async () => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Check if component is still mounted before updating state
    let isMounted = true;
    
    try {
      // Set loading state and clear any previous errors
      setLoading(true);
      setError(null);
      
      console.log("Fetching transactions...");
      const data = await fetchTransactions(abortController.signal);
      
      // Check if component is still mounted and request wasn't aborted
      if (!isMounted || abortController.signal.aborted) {
        console.log('Component unmounted or request aborted during fetch');
        return;
      }
      
      console.log("Fetched transactions count:", data.length);
      console.log("Sample transaction:", data.length > 0 ? data[0] : "No transactions");
      
      // Apply filters to the fetched data
      const filteredData = applyFilters(data);
      
      // Update state with the filtered data
      setTransactions(filteredData);
    } catch (error) {
      // Only process error if component is still mounted
      if (!isMounted) return;
      
      // Handle abort errors separately
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      
      // Handle other errors
      console.error('Error in fetchTransactions:', error);
      setError("Failed to fetch transactions. Please try again later.");
      setTransactions([]);
      
      toast({
        title: "Error",
        description: "Failed to fetch transactions. Please try again later.",
        variant: "destructive",
      });
    } finally {
      // Only update loading state if component is still mounted
      if (isMounted) {
        setLoading(false);
      }
    }
    
    // Return cleanup function that sets isMounted to false
    return () => {
      isMounted = false;
    };
  }, [applyFilters, toast]);

  // Effect to fetch data when component mounts or dependencies change
  useEffect(() => {
    // Create a cleanup function to track if component is still mounted
    let isMounted = true;
    
    // Initial data fetch
    const initialFetch = async () => {
      const cleanup = await fetchData();
      // Only run the cleanup if component is still mounted
      return () => {
        if (isMounted && cleanup) {
          cleanup();
        }
      };
    };
    
    const cleanupPromise = initialFetch();
    
    // Set up event listener for refresh events
    const handleRefresh = () => {
      console.log("Refresh event triggered in TransactionsTable");
      if (isMounted) {
        fetchData();
      }
    };

    // Set up event listener for add transaction events from TransactionEmptyState
    const handleAddTransaction = () => {
      console.log("Add transaction event triggered in TransactionsTable");
      // Here you would typically open a dialog or modal to add a transaction
      // For now, we'll just trigger a refresh to ensure any new transactions are displayed
      if (isMounted) {
        fetchData();
      }
    };

    document.addEventListener('refresh', handleRefresh);
    document.addEventListener('add-transaction', handleAddTransaction);
    
    // Cleanup function
    return () => {
      // Mark component as unmounted
      isMounted = false;
      
      // Abort any in-flight requests when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Run any cleanup from fetchData
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
      
      // Remove event listeners
      document.removeEventListener('refresh', handleRefresh);
      document.removeEventListener('add-transaction', handleAddTransaction);
    };
  }, [fetchData]);

  // Effect to refetch data when filters change
  useEffect(() => {
    fetchData();
  }, [dateRange, selectedCategory, fetchData]);

  // Handler for transaction updates
  const handleTransactionUpdate = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  // When limit is provided (dashboard view), show only the most recent transactions
  // Otherwise use pagination (transactions page view)
  const paginatedTransactions = limit 
    ? transactions.slice(0, limit)
    : transactions.slice(startIndex, endIndex);

  // Render loading state
  if (loading) {
    return <TransactionLoading />;
  }

  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="text-lg font-medium text-red-500">
          {error}
        </div>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  // Render main component
  return (
    <Card className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardContent className="p-0">
        <div className="space-y-6 p-6">
          {/* Only show filtering and pagination controls on the full transactions page */}
          {!limit && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 bg-slate-50/80 dark:bg-slate-900/50 p-5 rounded-lg border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <label htmlFor="page-size" className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Rows per page:
                </label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="page-size" className="w-[180px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm">
                    <SelectValue placeholder="Select page size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <label htmlFor="date-period" className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Filter by period:
                </label>
                <DatePeriodPicker
                  id="date-period"
                  onChange={setDateRange}
                  className="bg-white dark:bg-slate-800 rounded-md shadow-sm"
                />
              </div>
              
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <label htmlFor="category-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Filter by category:
                </label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger id="category-filter" className="w-[180px] bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {/* Get unique categories from transactions */}
                    {Array.from(new Set(transactions.map(t => t.category_name))).filter(Boolean).sort().map(category => (
                      <SelectItem key={category} value={category as string}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Table with improved styling */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <Table>
              <TransactionTableHeader />
              <TableBody>
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8">
                      <TransactionEmptyState />
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((transaction) => (
                    <TransactionRow 
                      key={transaction.transaction_id} 
                      transaction={transaction} 
                      onTransactionUpdate={handleTransactionUpdate}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination controls with improved styling */}
          {!limit && transactions.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-slate-50/80 dark:bg-slate-900/50 p-5 rounded-lg border border-slate-200/80 dark:border-slate-700/50 shadow-sm">
              <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{startIndex + 1}</span> to <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(endIndex, transactions.length)}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{transactions.length}</span> transactions
              </div>
              <div className="flex gap-3 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Previous
                </Button>
                <span className="py-2 px-4 border border-slate-300 dark:border-slate-700 rounded-md text-sm font-medium bg-white dark:bg-slate-800 shadow-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsTable;
