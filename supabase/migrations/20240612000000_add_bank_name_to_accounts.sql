-- Add bankName column to accounts table
ALTER TABLE public.accounts ADD COLUMN institution TEXT;
ALTER TABLE public.accounts ADD COLUMN bank_name TEXT;
ALTER TABLE public.accounts ADD COLUMN account_number TEXT;
ALTER TABLE public.accounts ADD COLUMN is_default BOOLEAN DEFAULT false;
ALTER TABLE public.accounts ADD COLUMN custom_tags TEXT[]; 