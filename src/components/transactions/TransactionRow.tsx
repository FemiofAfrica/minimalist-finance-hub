
import { ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Transaction } from "@/types/transaction";
import { formatNaira, formatDate } from "@/utils/formatters";
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

const TransactionRow = ({ transaction, onTransactionUpdate }: TransactionRowProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<{ category_id: string; category_name: string; category_type: string }[]>([]);
  const [editedTransaction, setEditedTransaction] = useState({
    description: transaction.description,
    amount: transaction.amount,
    category_name: transaction.category_name || 'Uncategorized',
    category_type: transaction.category_type || 'EXPENSE',
    date: transaction.date.split('T')[0], // Convert to YYYY-MM-DD format
  });
  const { toast } = useToast();

  // Fetch categories for the dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('category_id, category_name, category_type');
      
      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }
      
      setCategories(data || []);
    };

    fetchCategories();
  }, []);

  const handleEditSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // First, handle the category
      let categoryId = null;
      
      // Find if category exists
      const existingCategory = categories.find(
        c => c.category_name === editedTransaction.category_name && 
             c.category_type === editedTransaction.category_type
      );
      
      if (existingCategory) {
        categoryId = existingCategory.category_id;
      } else {
        // Create new category if it doesn't exist
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            category_name: editedTransaction.category_name,
            category_type: editedTransaction.category_type
          })
          .select('category_id')
          .single();
        
        if (categoryError) {
          throw categoryError;
        }
        
        categoryId = newCategory.category_id;
      }
      
      // Format the date for PostgreSQL timestamp
      const formattedDate = new Date(editedTransaction.date).toISOString();
      
      // Update the transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({
          description: editedTransaction.description,
          amount: parseFloat(String(editedTransaction.amount)),
          date: formattedDate,
          category_id: categoryId,
          category_name: editedTransaction.category_name,
          category_type: editedTransaction.category_type
        })
        .eq('transaction_id', transaction.transaction_id);

      if (transactionError) {
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
        description: "Failed to update transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      
      // Delete the transaction from Supabase
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
      <TableRow key={transaction.transaction_id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200">
        <TableCell className="font-medium py-4">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center justify-center w-9 h-9 rounded-full ${transaction.category_type === "EXPENSE" ? "bg-red-100 dark:bg-red-900/20" : "bg-emerald-100 dark:bg-emerald-900/20"} shrink-0 shadow-sm transition-transform duration-200 hover:scale-110`}>
              {transaction.category_type === "EXPENSE" ? (
                <ArrowDownRight className="w-5 h-5 text-red-500 dark:text-red-400" />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              )}
            </div>
            <span className="truncate font-medium text-slate-800 dark:text-slate-200">{transaction.description}</span>
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap py-4 text-left pl-4">
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
            {transaction.category_name || 'Uncategorized'}
          </span>
        </TableCell>
        <TableCell className="whitespace-nowrap py-4 text-slate-600 dark:text-slate-400 font-medium">{formatDate(transaction.date)}</TableCell>
        <TableCell className="whitespace-nowrap py-4">
          <span
            className={
              transaction.category_type === "EXPENSE"
                ? "text-red-500 dark:text-red-400 font-semibold"
                : "text-emerald-500 dark:text-emerald-400 font-semibold"
            }
          >
            {transaction.category_type === "EXPENSE" ? "-" : "+"}
            {formatNaira(transaction.amount)}
          </span>
        </TableCell>
        <TableCell className="py-4">
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors duration-200" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={editedTransaction.description}
                onChange={(e) => setEditedTransaction({...editedTransaction, description: e.target.value})}
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
                onChange={(e) => setEditedTransaction({...editedTransaction, amount: parseFloat(e.target.value)})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Input
                id="category"
                value={editedTransaction.category_name}
                onChange={(e) => setEditedTransaction({...editedTransaction, category_name: e.target.value})}
                className="col-span-3"
                list="categories"
              />
              <datalist id="categories">
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_name} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Type
              </Label>
              <Select
                value={editedTransaction.category_type}
                onValueChange={(value) => setEditedTransaction({...editedTransaction, category_type: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
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
                onChange={(e) => setEditedTransaction({...editedTransaction, date: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this transaction? This action cannot be undone.</p>
            <div className="mt-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
              <p><strong>Description:</strong> {transaction.description}</p>
              <p><strong>Amount:</strong> {formatNaira(transaction.amount)}</p>
              <p><strong>Date:</strong> {formatDate(transaction.date)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransactionRow;
