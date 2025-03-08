import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { searchTransactionsByDescription } from '@/services/searchService';
import { Transaction } from '@/types/transaction';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TransactionAutocompleteProps {
  onSelect: (transaction: Transaction) => void;
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function TransactionAutocomplete({
  onSelect,
  placeholder = 'Search transactions...',
  className,
  value = '',
  onChange,
}: TransactionAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update internal state when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Search for transactions when input value changes
  useEffect(() => {
    const searchTransactions = async () => {
      if (inputValue.trim().length < 2) {
        setTransactions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchTransactionsByDescription(inputValue);
        setTransactions(results);
      } catch (error) {
        console.error('Error searching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchTransactions, 300);
    return () => clearTimeout(debounceTimer);
  }, [inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleSelect = (transaction: Transaction) => {
    setInputValue(transaction.description);
    if (onChange) {
      onChange(transaction.description);
    }
    onSelect(transaction);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Handle Tab key for selection
    if (e.key === 'Tab' && transactions.length > 0 && open) {
      e.preventDefault();
      handleSelect(transactions[0]);
    }
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={cn("w-full", className)}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
        </div>
      )}
      
      {open && inputValue.trim().length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
          <Command className="rounded-md overflow-hidden">
            <CommandList>
              {transactions.length === 0 ? (
                <CommandEmpty>{loading ? 'Searching...' : 'No results found'}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {transactions.map((transaction) => (
                    <CommandItem
                      key={transaction.transaction_id}
                      onSelect={() => handleSelect(transaction)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <p>{transaction.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.date).toLocaleDateString()} - {transaction.amount.toFixed(2)}
                        </p>
                      </div>
                      {inputValue === transaction.description && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}