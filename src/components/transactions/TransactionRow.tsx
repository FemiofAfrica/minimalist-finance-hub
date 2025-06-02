import { ArrowDownRight, ArrowUpRight, Pencil, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Transaction } from "@/types/transaction";
import { formatDate } from "@/utils/formatters";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAccounts } from '@/services/accountService';
import { deleteTransaction, deleteTransferTransactions } from '@/services/transactionService';

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
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [categoryError, setCategoryError] = useState<Error | null>(null);
  const { formatPossiblyConvertedCurrency, exchangeRates } = useCurrency();
  const [accounts, setAccounts] = useState([]);
  const [editedTransaction, setEditedTransaction] = useState({
    description: transaction.description ?? '',
    amount: transaction.amount,
    name: transaction.category_name ?? '',
    type: transaction.category_type?.toLowerCase() || 'expense',
    date: transaction.date.split('T')[0],
    notes: transaction.notes || '',
    account_id: transaction.account_id || '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('category_id, name, type')
          .order('name');

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
            type: string;
            description?: string | null;
          }>;
          
          // Deduplicate categories by name and type
          const categoryMap = new Map();
          safeData.forEach(category => {
            const key = `${category.name.toLowerCase()}-${category.type.toLowerCase()}`;
            if (!categoryMap.has(key)) {
              categoryMap.set(key, category);
            }
          });
          
          const typedCategories = Array.from(categoryMap.values()).map(category => ({
            category_id: category.category_id,
            name: category.name,
            type: category.type.toLowerCase()
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

  useEffect(() => {
    fetchAccounts().then(setAccounts);
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
        c => c.name.toLowerCase() === editedTransaction.name.toLowerCase() && 
             c.type.toLowerCase() === editedTransaction.type.toLowerCase() &&
             !c.category_id.startsWith('temp-') // Ignore temporary categories
      );
      
      if (existingCategory) {
        categoryId = existingCategory.category_id;
      } else {
        // Always create a new category if we're here
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: editedTransaction.name,
            user_id: transaction.user_id,
            type: editedTransaction.type
          })
          .select('category_id')
          .single();
        
        if (categoryError) {
          console.error('Error creating category:', categoryError);
          throw categoryError;
        }
        
        if (newCategory) {
          categoryId = newCategory.category_id;
          // Update our local categories with the new ID
          setCategories(prev => {
            const filtered = prev.filter(c => 
              !(c.name.toLowerCase() === editedTransaction.name.toLowerCase() && 
                c.type.toLowerCase() === editedTransaction.type.toLowerCase())
            );
            return [...filtered, {
              category_id: newCategory.category_id,
              name: editedTransaction.name,
              type: editedTransaction.type
            }];
          });
        } else {
          throw new Error('Failed to create category');
        }
      }
      
      const formattedDate = new Date(editedTransaction.date).toISOString();
      
      const updateData = {
        description: editedTransaction.description,
        amount: parseFloat(String(editedTransaction.amount)),
        date: formattedDate,
        category_id: categoryId,
        notes: editedTransaction.notes,
        account_id: editedTransaction.account_id,
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
      
      // Check if this is a transfer transaction
      if (transaction.type === 'transfer' && transaction.linked_transaction_id) {
        // Handle deleting transfer transactions
        await deleteTransferTransactions(
          transaction.transaction_id,
          transaction.linked_transaction_id
        );
      } else {
        // Handle deleting regular transactions with proper balance updates
        await deleteTransaction(transaction.transaction_id);
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
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Prepare data for Combobox ---
  // Filter categories based on selected type for the dropdown
  const filteredCategoriesByType = categories.filter(
      cat => cat.type === editedTransaction.type
  );
  // Get the current search term/value from state
  const currentCategorySearch = editedTransaction.name.trim();
  // Check if the current input exactly matches an existing category for the current type
  const exactMatchExists = filteredCategoriesByType.some(
      cat => cat.name.toLowerCase() === currentCategorySearch.toLowerCase()
  );
  // Determine whether to show the "Create" option
  const showCreateOption = currentCategorySearch !== "" && !exactMatchExists;
  
  // Process for adding a new category
  const handleCreateCategory = (categoryName: string) => {
    const newCategoryName = categoryName.trim();
    const currentCategoryType = editedTransaction.type;
    
    if (newCategoryName) {
      // Create a temporary category object with a unique ID
      const newCategoryObj = {
        category_id: `temp-${Date.now()}`,
        name: newCategoryName,
        type: currentCategoryType
      };
      
      // Add to the local categories state
      setCategories(prev => [...prev, newCategoryObj]);
      
      // Update the transaction with the new category
      setEditedTransaction(prevState => ({
        ...prevState,
        name: newCategoryName
      }));
      
      console.log(`Adding new category: ${newCategoryName} (${currentCategoryType})`);
    }
    
    // Close the popover
    setCategoryPopoverOpen(false);
  };

  return (
    <>
      <TableRow key={transaction.transaction_id} className="border-b border-muted hover:bg-muted/20 transition-colors">
        <TableCell className="font-medium py-3 text-left">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
              transaction.type === "transfer" 
                ? transaction.description?.toLowerCase().includes("to ") 
                  ? "bg-red-100" 
                  : "bg-emerald-100"
                : transaction.type?.toLowerCase() === "expense" 
                  ? "bg-red-100" 
                  : "bg-emerald-100"
            } shrink-0`}>
              {transaction.type === "transfer" 
                ? transaction.description?.toLowerCase().includes("to ") 
                  ? <ArrowDownRight className="w-4 h-4 text-red-500" /> 
                  : <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                : transaction.type?.toLowerCase() === "expense" 
                  ? <ArrowDownRight className="w-4 h-4 text-red-500" /> 
                  : <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              }
            </div>
            <div className="flex flex-col">
              <span className="truncate text-left">{transaction.description}</span>
              {transaction.notes && (
                <span className="text-xs text-muted-foreground truncate text-left">{transaction.notes}</span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap py-3 text-left">
          <div className="text-left pl-4">
            {transaction.type === "transfer" ? "Transfer" : (transaction.category_name || 'Uncategorized')}
          </div>
        </TableCell>
        <TableCell className="whitespace-nowrap py-3 text-left">
          {formatDate(transaction.date)}
        </TableCell>
        <TableCell className="whitespace-nowrap py-3 text-left">
          {(() => {
            const amountInUsd = convertNgnToUsd(transaction.amount);
            
            if (amountInUsd === null) {
              return <span className="text-muted-foreground text-xs">Loading...</span>;
            }

            // Determine color based on transaction type and direction
            let amountClass = "";
            if (transaction.type === "transfer") {
              amountClass = transaction.description?.toLowerCase().includes("to ")
                ? "text-red-500 font-medium"
                : "text-emerald-500 font-medium";
            } else {
              amountClass = transaction.type?.toLowerCase() === "expense"
                ? "text-red-500 font-medium"
                : "text-emerald-500 font-medium";
            }
            
            const formattedAmount = formatPossiblyConvertedCurrency(amountInUsd);

            return (
              <span className={amountClass}>
                {formattedAmount}
              </span>
            );
          })()}
        </TableCell>
        <TableCell className="py-3 text-left">
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
            <DialogDescription>
              Make changes to your transaction details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-center">
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
              <Label htmlFor="amount" className="text-center">
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
              <Label htmlFor="type" className="text-center">
                Type
              </Label>
              <Select
                value={editedTransaction.type}
                onValueChange={(value) =>
                  setEditedTransaction({
                    ...editedTransaction,
                    type: value,
                    name: ''
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
              <Label htmlFor="name" className="text-center">
                Category
              </Label>
              <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryPopoverOpen}
                    className="col-span-3 justify-between font-normal"
                  >
                    {editedTransaction.name || "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                   <Command
                     onValueChange={(searchValue) => {
                       setEditedTransaction(prevState => ({
                         ...prevState,
                         name: searchValue 
                       }));
                     }}
                   >
                    <CommandInput 
                      placeholder="Search or type new category..." 
                      onValueChange={(value) => {
                        setEditedTransaction(prevState => ({
                          ...prevState,
                          name: value
                        }));
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {currentCategorySearch && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CommandItem
                                  value={currentCategorySearch}
                                  onSelect={() => handleCreateCategory(currentCategorySearch)}
                                  className="cursor-pointer hover:bg-secondary"
                                >
                                  <span className="flex items-center mr-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                      <path d="M12 5v14"></path>
                                      <path d="M5 12h14"></path>
                                    </svg>
                                  </span>
                                  Create "<span className="font-medium">{currentCategorySearch}</span>"
                                </CommandItem>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Create a new {editedTransaction.type} category</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {!currentCategorySearch && "No category found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {filteredCategoriesByType.map((category) => (
                            <CommandItem
                              key={category.category_id}
                              value={category.name}
                              onSelect={(currentValue) => {
                                setEditedTransaction({
                                  ...editedTransaction,
                                  name: category.name, 
                                })
                                setCategoryPopoverOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  editedTransaction.name.toLowerCase() === category.name.toLowerCase()
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {category.name}
                            </CommandItem>
                          ))}
                        {showCreateOption && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CommandItem
                                  key={currentCategorySearch}
                                  value={currentCategorySearch}
                                  onSelect={() => handleCreateCategory(currentCategorySearch)}
                                  className="cursor-pointer hover:bg-secondary"
                                >
                                  <span className="flex items-center mr-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                      <path d="M12 5v14"></path>
                                      <path d="M5 12h14"></path>
                                    </svg>
                                  </span>
                                  Create "<span className="font-medium">{currentCategorySearch}</span>"
                                </CommandItem>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Create a new {editedTransaction.type} category</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                         )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-center">
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
              <Label htmlFor="notes" className="text-center">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="account_id" className="text-center">
                Account
              </Label>
              <Select
                value={editedTransaction.account_id}
                onValueChange={(value) => setEditedTransaction({ ...editedTransaction, account_id: value })}
              >
                <SelectTrigger className="col-span-3">
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
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
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
