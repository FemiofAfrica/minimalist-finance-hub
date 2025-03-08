-- Create subscription providers table
CREATE TABLE IF NOT EXISTS public.subscription_providers (
  provider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(category_id),
  category_name TEXT,
  logo_url TEXT,
  website TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id)
);

-- Add foreign key constraint to subscriptions table after both tables exist
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_provider_id_fkey
FOREIGN KEY (provider_id)
REFERENCES public.subscription_providers(provider_id);

-- Add RLS policies for subscription providers
ALTER TABLE public.subscription_providers ENABLE ROW LEVEL SECURITY;

-- Everyone can view subscription providers
CREATE POLICY "Everyone can view subscription providers"
  ON public.subscription_providers
  FOR SELECT
  USING (true);

-- Only authenticated users can insert subscription providers
CREATE POLICY "Authenticated users can insert subscription providers"
  ON public.subscription_providers
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only the creator can update their own subscription providers
CREATE POLICY "Users can update their own subscription providers"
  ON public.subscription_providers
  FOR UPDATE
  USING (auth.uid() = created_by_user_id);

-- Only the creator can delete their own subscription providers
CREATE POLICY "Users can delete their own subscription providers"
  ON public.subscription_providers
  FOR DELETE
  USING (auth.uid() = created_by_user_id);

-- Insert some popular subscription providers
INSERT INTO public.subscription_providers (name, category_name, is_popular, website, logo_url)
VALUES 
  ('Netflix', 'Entertainment', TRUE, 'https://www.netflix.com', 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico'),
  ('Spotify', 'Entertainment', TRUE, 'https://www.spotify.com', 'https://www.scdn.co/i/_global/favicon.png'),
  ('Amazon Prime', 'Entertainment', TRUE, 'https://www.amazon.com/prime', 'https://www.amazon.com/favicon.ico'),
  ('Disney+', 'Entertainment', TRUE, 'https://www.disneyplus.com', 'https://static-assets.bamgrid.com/product/disneyplus/favicons/favicon.ico'),
  ('Apple TV+', 'Entertainment', TRUE, 'https://tv.apple.com', 'https://www.apple.com/favicon.ico'),
  ('YouTube Premium', 'Entertainment', TRUE, 'https://www.youtube.com/premium', 'https://www.youtube.com/favicon.ico'),
  ('Microsoft 365', 'Productivity', TRUE, 'https://www.microsoft.com/microsoft-365', 'https://www.microsoft.com/favicon.ico'),
  ('Adobe Creative Cloud', 'Productivity', TRUE, 'https://www.adobe.com/creativecloud.html', 'https://www.adobe.com/favicon.ico'),
  ('Google One', 'Cloud Storage', TRUE, 'https://one.google.com', 'https://www.google.com/favicon.ico'),
  ('iCloud+', 'Cloud Storage', TRUE, 'https://www.apple.com/icloud', 'https://www.apple.com/favicon.ico'),
  ('Dropbox', 'Cloud Storage', TRUE, 'https://www.dropbox.com', 'https://www.dropbox.com/static/30168/images/favicon.ico'),
  ('Hulu', 'Entertainment', TRUE, 'https://www.hulu.com', 'https://www.hulu.com/favicon.ico'),
  ('HBO Max', 'Entertainment', TRUE, 'https://www.hbomax.com', 'https://www.hbomax.com/favicon.ico'),
  ('Paramount+', 'Entertainment', TRUE, 'https://www.paramountplus.com', 'https://www.paramountplus.com/favicon.ico'),
  ('Peacock', 'Entertainment', TRUE, 'https://www.peacocktv.com', 'https://www.peacocktv.com/favicon.ico'),
  ('Slack', 'Productivity', TRUE, 'https://slack.com', 'https://slack.com/favicon.ico'),
  ('Zoom', 'Productivity', TRUE, 'https://zoom.us', 'https://zoom.us/favicon.ico'),
  ('GitHub Pro', 'Development', TRUE, 'https://github.com', 'https://github.com/favicon.ico'),
  ('PlayStation Plus', 'Gaming', TRUE, 'https://www.playstation.com/en-us/ps-plus', 'https://www.playstation.com/favicon.ico'),
  ('Xbox Game Pass', 'Gaming', TRUE, 'https://www.xbox.com/en-US/xbox-game-pass', 'https://www.xbox.com/favicon.ico');