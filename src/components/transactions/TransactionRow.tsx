import { ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Transaction } from "@/types/transaction";
import { formatDate } from "@/utils/formatters";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TransactionRowProps {
  transaction: Transaction;
  onTransactionUpdate: () => void;
}

const PROPS_BASE_CURRENCY = "NGN";

const TransactionRow = ({ transaction, onTransactionUpdate }: TransactionRowProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ category_id: string; name: string; type: string }[]>([]);
  const [categoryError, setCategoryError] = useState<Error | null>(null);
  const { formatPossiblyConvertedCurrency, exchangeRates } = useCurrency();
  const [editedTransaction, setEditedTransaction] = useState({
    description: transaction.description,
    name: transaction.name || transaction.description,
    amount: transaction.amount,
    category_name: transaction.description,
    category_type: transaction.category_type?.toLowerCase() || 'expense',
    date: transaction.date.split('T')[0],
    notes: transaction.notes || '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('category_id, category_name')
          .order('category_name');

        if (error) {
          console.error('Error fetching categories:', error);
          setCategoryError(error);
          return;
        }
        
        if (data && Array.isArray(data)) {
          const rawData = data as unknown;
          
          const safeData = rawData as Array<{
            category_id: string;
            name: string;
            description?: string | null;
          }>;
          
          const typedCategories = safeData.map(category => ({
            category_id: category.category_id,
            name: category.name,
            type: 'expense'
          }));
          setCategories(typedCategories);
        } else {
          setCategories([]);
        }
      } catch (err) {
        console.error('Exception when fetching categories:', err);
        setCategoryError(err instanceof Error ? err : new Error('Unknown error'));
      }
    };

    fetchCategories();
  }, []);

  const convertNgnToUsd = (amountNgn: number): number | null => {
    const ngnRate = exchangeRates?.[PROPS_BASE_CURRENCY];
    if (ngnRate && typeof ngnRate === 'number' && ngnRate > 0) {
      return amountNgn / ngnRate;
    }
    console.warn(`Rate for ${PROPS_BASE_CURRENCY} not available for conversion.`);
    return null;
  };

  const handleEditSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      let categoryId = null;
      
      const existingCategory = categories.find(
        c => c.name.toLowerCase() === editedTransaction.description.toLowerCase() && 
             c.type.toLowerCase() === editedTransaction.category_type.toLowerCase()
      );
      
      if (existingCategory) {
        categoryId = existingCategory.category_id;
      } else {
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: editedTransaction.description,
            user_id: transaction.user_id,
            type: editedTransaction.category_type
          })
          .select()
          .single();
        
        if (categoryError) {
          console.error('Error creating category:', categoryError);
          throw categoryError;
        }
        
        if (newCategory) {
          categoryId = newCategory.category_id;
        } else {
          throw new Error('Failed to create category');
        }
      }
      
      const formattedDate = new Date(editedTransaction.date).toISOString();
      
      const updateData = {
        description: editedTransaction.description,
        name: editedTransaction.name,
        amount: parseFloat(String(editedTransaction.amount)),
        date: formattedDate,
        category_id: categoryId,
        notes: editedTransaction.notes,
        updated_at: new Date().toISOString()
      };
      
      const { error: transactionError } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('transaction_id', transaction.transaction_id);

      if (transactionError) {
        console.error('Error updating transaction:', transactionError);
        throw transactionError;
      }

      toast({
        title: "Transaction updated",
        description: "Transaction has been updated successfully",
      });
      
      setEditDialogOpen(false);
      onTransactionUpdate();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('transaction_id', transaction.transaction_id);

      if (error) {
        throw error;
      }

      toast({
        title: "Transaction deleted",
        description: "Transaction has been deleted successfully",
      });
      
      setDeleteDialogOpen(false);
      onTransactionUpdate();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <TableRow key={transaction.transaction_id} className="border-b border-muted hover:bg-muted/20 transition-colors">
        <TableCell className="font-medium py-3">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${transaction.category_type?.toLowerCase() === "expense" ? "bg-red-100" : "bg-emerald-100"} shrink-0`}>
              {transaction.category_type?.toLowerCase() === "expense" ? (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="truncate">{transaction.name || `Bought ${transaction.description}`}</span>
              {transaction.notes && (
                <span className="text-xs text-muted-foreground truncate">{transaction.notes}</span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap py-3 text-left pl-4">{transaction.category_name || 'Uncategorized'}</TableCell>
        <TableCell className="whitespace-nowrap py-3">{formatDate(transaction.date)}</TableCell>
        <TableCell className="whitespace-nowrap py-3">
          {(() => {
            const amountInUsd = convertNgnToUsd(transaction.amount);
            
            if (amountInUsd === null) {
              return <span className="text-muted-foreground text-xs">Loading...</span>;
            }

            const isExpense = transaction.category_type?.toLowerCase() === "expense";
            const amountClass = isExpense
              ? "text-red-500 font-medium"
              : "text-emerald-500 font-medium";
            
            const formattedAmount = formatPossiblyConvertedCurrency(amountInUsd);

            return (
              <span className={amountClass}>
                {formattedAmount}
              </span>
            );
          })()}
        </TableCell>
        <TableCell className="py-3">
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 text-red-500" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editedTransaction.name}
                onChange={(e) => 
                  setEditedTransaction({
                    ...editedTransaction,
                    name: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={editedTransaction.description}
                onChange={(e) => 
                  setEditedTransaction({
                    ...editedTransaction,
                    description: e.target.value,
                    category_name: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={editedTransaction.amount}
                onChange={(e) => setEditedTransaction({ ...editedTransaction, amount: parseFloat(e.target.value) || 0 })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_type" className="text-right">
                Type
              </Label>
              <Select
                value={editedTransaction.category_type}
                onValueChange={(value) =>
                  setEditedTransaction({
                    ...editedTransaction,
                    category_type: value,
                  })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_name" className="text-right">
                Category
              </Label>
              <Select
                value={editedTransaction.category_name}
                onValueChange={(value) =>
                  setEditedTransaction({
                    ...editedTransaction,
                    category_name: value,
                    description: value,
                  })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select or enter category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(cat => cat.type === editedTransaction.category_type)
                    .map(category => (
                      <SelectItem key={category.category_id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={editedTransaction.date}
                onChange={(e) => 
                  setEditedTransaction({
                    ...editedTransaction,
                    date: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Input
                id="notes"
                value={editedTransaction.notes}
                onChange={(e) => 
                  setEditedTransaction({
                    ...editedTransaction,
                    notes: e.target.value,
                  })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this transaction? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransactionRow;
