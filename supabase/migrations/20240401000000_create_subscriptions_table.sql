-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'CUSTOM')),
  next_billing_date DATE NOT NULL,
  category_id UUID REFERENCES public.categories(category_id),
  category_name TEXT,
  category_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_days INTEGER NOT NULL DEFAULT 3,
  provider_id UUID, -- Removed foreign key reference to fix circular dependency
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Add RLS policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger for subscriptions
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();