
import { ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Transaction } from "@/types/transaction";
import { formatNaira } from "@/utils/formatters";
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
    date: transaction.date.split('T')[0], // Convert the date string to YYYY-MM-DD format
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
      
      // First, check if we need to update the category
      let categoryId = null;
      
      // Find the category ID based on name and type
      const category = categories.find(
        c => c.category_name === editedTransaction.category_name && 
             c.category_type === editedTransaction.category_type
      );
      
      // If category exists, use its ID
      if (category) {
        categoryId = category.category_id;
      } else {
        // If category doesn't exist, create a new one
        const { data, error } = await supabase
          .from('categories')
          .insert({
            category_name: editedTransaction.category_name,
            category_type: editedTransaction.category_type
          })
          .select('category_id')
          .single();
        
        if (error) {
          throw error;
        }
        
        categoryId = data.category_id;
      }
      
      // Format the date for PostgreSQL timestamp
      const formattedDate = new Date(editedTransaction.date).toISOString();
      
      // Update the transaction in Supabase
      const { error } = await supabase
        .from('transactions')
        .update({
          description: editedTransaction.description,
          amount: parseFloat(String(editedTransaction.amount)),
          date: formattedDate, // Send as ISO string for PostgreSQL timestamp
          category_id: categoryId,
          category_name: editedTransaction.category_name,
          category_type: editedTransaction.category_type
        })
        .eq('transaction_id', transaction.transaction_id);

      if (error) {
        throw error;
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
      <TableRow key={transaction.transaction_id}>
        <TableCell className="font-medium">
          <div className="flex items-center space-x-2">
            {transaction.category_type === "EXPENSE" ? (
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            ) : (
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            )}
            <span>{transaction.description}</span>
          </div>
        </TableCell>
        <TableCell>{transaction.category_name || 'Uncategorized'}</TableCell>
        <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
        <TableCell className="text-right">
          <span
            className={
              transaction.category_type === "EXPENSE"
                ? "text-red-500"
                : "text-emerald-500"
            }
          >
            {transaction.category_type === "EXPENSE" ? "-" : "+"}
            {formatNaira(transaction.amount)}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end space-x-2">
            <Button variant="ghost" size="icon" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 text-red-500" />
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
                onChange={(e) => 
                  setEditedTransaction({
                    ...editedTransaction,
                    description: e.target.value,
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
                onChange={(e) => 
                  setEditedTransaction({
                    ...editedTransaction,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
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
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category_name" className="text-right">
                Category
              </Label>
              <Input
                id="category_name"
                value={editedTransaction.category_name}
                onChange={(e) => 
                  setEditedTransaction({
                    ...editedTransaction,
                    category_name: e.target.value,
                  })
                }
                className="col-span-3"
                placeholder="Enter category name"
              />
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

      {/* Delete Confirmation Dialog */}
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
