-- Add account_id column to cards table
ALTER TABLE IF EXISTS public.cards 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(account_id) ON DELETE SET NULL;

-- Create index on the account_id column for faster lookups
CREATE INDEX IF NOT EXISTS idx_cards_account_id ON public.cards(account_id); 