-- Add name column to transactions table
ALTER TABLE public.transactions ADD COLUMN name TEXT;

-- Create an index on the name column for faster lookups
CREATE INDEX idx_transactions_name ON public.transactions(name);