import { useEffect, useState } from "react";
import { Table, TableBody } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Transaction } from "@/types/transaction";
import TransactionRow from "@/components/transactions/TransactionRow";
import TransactionTableHeader from "@/components/transactions/TransactionTableHeader";
import TransactionEmptyState from "@/components/transactions/TransactionEmptyState";
import TransactionLoading from "@/components/transactions/TransactionLoading";
import { fetchTransactions } from "@/services/transactionService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PaginatedTransactionsTableProps {
  limit?: number;
}

const PaginatedTransactionsTable = ({ limit: initialLimit }: PaginatedTransactionsTableProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(initialLimit || 10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const { toast } = useToast();

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchQuery
      ? transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (transaction.category_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesCategory = categoryFilter
      ? (transaction.category_name || "").toLowerCase() === categoryFilter.toLowerCase()
      : true;

    return matchesSearch && matchesCategory;
  });

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  const loadTransactions = async () => {
    try {
      console.log("Fetching transactions...");
      const data = await fetchTransactions();
      setTransactions(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
      console.error('Error in fetchTransactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    
    const handleRefresh = () => {
      console.log("Refresh event triggered in PaginatedTransactionsTable");
      loadTransactions();
    };

    document.addEventListener('refresh', handleRefresh);
    
    return () => {
      document.removeEventListener('refresh', handleRefresh);
    };
  }, []);

  const handleTransactionUpdate = () => {
    loadTransactions();
  };

  const uniqueCategories = Array.from(
    new Set(transactions.map(t => t.category_name || "Uncategorized"))
  ).sort();

  if (loading) {
    return <TransactionLoading />;
  }

  if (transactions.length === 0) {
    return <TransactionEmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-4">
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-xs"
          />
          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              setCategoryFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category.toLowerCase()}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPageSize(Number(value));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Items per page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 per page</SelectItem>
            <SelectItem value="25">25 per page</SelectItem>
            <SelectItem value="50">50 per page</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TransactionTableHeader />
        <TableBody>
          {paginatedTransactions.map((transaction) => (
            <TransactionRow 
              key={transaction.transaction_id} 
              transaction={transaction} 
              onTransactionUpdate={handleTransactionUpdate}
            />
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min(pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaginatedTransactionsTable;